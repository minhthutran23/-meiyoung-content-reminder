const fs = require('fs');
const path = require('path');
const { sendReminder } = require('./mailer');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const SENT_LOG_PATH = path.join(__dirname, '..', 'data', 'sent.json');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const TOLERANCE_MINUTES = 14;

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

/**
 * Cau truc data/schedule.json (nhieu kenh):
 * {
 *   "<brandKey>": {
 *     "label": "Ten hien thi cua kenh",
 *     "months": { "<YYYY-MM>": { "startDate": "...", "rows": [...] } }
 *   },
 *   ...
 * }
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
        const [hh, mm] = row.time.split(':').map(Number);
        d.setUTCHours(hh, mm, 0, 0);
        all.push({ ...row, brandKey, brandLabel, monthKey, scheduledVN: d });
      });
    });
  });
  return all;
}

async function main() {
  const nowVN = new Date(Date.now() + VN_OFFSET_MS);
  const fullSchedule = readJson(SCHEDULE_PATH, {});
  const sentLog = readJson(SENT_LOG_PATH, {});
  const posts = getAllPosts(fullSchedule);

  const due = posts.filter((p) => {
    const diffMin = (nowVN.getTime() - p.scheduledVN.getTime()) / 60000;
    return diffMin >= 0 && diffMin <= TOLERANCE_MINUTES;
  });

  if (due.length === 0) {
    console.log(`[check] ${nowVN.toISOString()} (VN) — khong co bai nao den gio.`);
    return;
  }

  let changed = false;
  for (const post of due) {
    const sentKey = `${post.brandKey}-${post.monthKey}-day${post.day}-${isoDateVN(post.scheduledVN)}`;
    if (sentLog[sentKey]) continue;
    try {
      await sendReminder({ ...post, date: post.scheduledVN });
      sentLog[sentKey] = true;
      changed = true;
      console.log(`[check] Da gui nhac lich: [${post.brandLabel}] Ngay ${post.day} — ${post.idea}`);
    } catch (err) {
      console.error(`[check] Gui that bai [${post.brandLabel}] Ngay ${post.day}:`, err.message);
    }
  }
  if (changed) writeJson(SENT_LOG_PATH, sentLog);
}

main().catch((err) => {
  console.error('[check] Loi khong mong doi:', err);
  process.exit(1);
});
