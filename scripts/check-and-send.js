const fs = require('fs');
const path = require('path');
const { sendDailyDigest, sendWeeklyDigest } = require('./mailer');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const SENT_LOG_PATH = path.join(__dirname, '..', 'data', 'sent.json');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const WEEKDAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
function isoDateVN(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function labelDateVN(d) {
  return `${WEEKDAY_VN[d.getUTCDay()]}, ${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}
function getChannels(platform) {
  return (platform || '').split(/\+|,|&/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Cau truc data/schedule.json (nhieu kenh):
 * { "<brandKey>": { "label": "...", "months": { "<YYYY-MM>": { "startDate": "...", "rows": [...] } } } }
 * Tra ve mang bai da "gian" theo tung nen tang (mot dong co 2 kenh -> 2 muc rieng), kem ngay thuc te (UTC, dai dien cho ngay VN).
 */
function getAllPosts(fullSchedule) {
  let all = [];
  Object.entries(fullSchedule).forEach(([brandKey, brand]) => {
    const brandLabel = brand.label || brandKey;
    Object.entries(brand.months || {}).forEach(([monthKey, plan]) => {
      const start = new Date(plan.startDate + 'T00:00:00Z');
      plan.rows.forEach((row) => {
        const d = new Date(start);
        d.setUTCDate(d.getUTCDate() + (row.day - 1));
        const channels = getChannels(row.platform);
        (channels.length ? channels : [row.platform || '—']).forEach((ch) => {
          all.push({ ...row, platform: ch, brandKey, brandLabel, monthKey, date: d });
        });
      });
    });
  });
  return all;
}

function startOfWeekUTC(d) {
  const r = new Date(d);
  const wd = r.getUTCDay();
  const diff = wd === 0 ? -6 : 1 - wd; // Thu 2 la dau tuan
  r.setUTCDate(r.getUTCDate() + diff);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

async function main() {
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);
  const todayIso = isoDateVN(nowVN);
  const fullSchedule = readJson(SCHEDULE_PATH, {});
  const sentLog = readJson(SENT_LOG_PATH, {});
  const allPosts = getAllPosts(fullSchedule);
  let changed = false;

  // ---- Bao sang (hom nay) ----
  const dailyKey = `daily-${todayIso}`;
  if (!sentLog[dailyKey]) {
    const todays = allPosts
      .filter((p) => isoDateVN(p.date) === todayIso)
      .sort((a, b) => a.time.localeCompare(b.time));
    if (todays.length > 0) {
      try {
        await sendDailyDigest(labelDateVN(nowVN), todays);
        console.log(`[check] Da gui bao sang cho ${todayIso} (${todays.length} bai).`);
      } catch (err) {
        console.error('[check] Gui bao sang that bai:', err.message);
      }
    } else {
      console.log(`[check] Hom nay (${todayIso}) khong co bai nao — khong gui bao sang.`);
    }
    sentLog[dailyKey] = true;
    changed = true;
  }

  // ---- Bao tuan (chi sang Thu 2, gio VN) ----
  if (nowVN.getUTCDay() === 1) {
    const weekStart = startOfWeekUTC(nowVN);
    const weekStartIso = isoDateVN(weekStart);
    const weeklyKey = `weekly-${weekStartIso}`;
    if (!sentLog[weeklyKey]) {
      const postsByDate = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + i);
        const iso = isoDateVN(d);
        postsByDate[labelDateVN(d)] = allPosts
          .filter((p) => isoDateVN(p.date) === iso)
          .sort((a, b) => a.time.localeCompare(b.time));
      }
      const weekEnd = new Date(weekStart); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const weekLabel = `${weekStart.getUTCDate()}/${weekStart.getUTCMonth() + 1} – ${weekEnd.getUTCDate()}/${weekEnd.getUTCMonth() + 1}`;
      try {
        await sendWeeklyDigest(weekLabel, postsByDate);
        console.log(`[check] Da gui bao tuan cho tuan ${weekStartIso}.`);
      } catch (err) {
        console.error('[check] Gui bao tuan that bai:', err.message);
      }
      sentLog[weeklyKey] = true;
      changed = true;
    }
  }

  if (changed) writeJson(SENT_LOG_PATH, sentLog);
}

main().catch((err) => {
  console.error('[check] Loi khong mong doi:', err);
  process.exit(1);
});
