const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { sendReminder } = require('./mailer');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const SENT_LOG_PATH = path.join(__dirname, '..', 'data', 'sent.json');

function readJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Ghep startDate + day -> tra ve mang bai post kem ngay thuc te, gop tu tat ca cac thang da luu. */
function getAllPosts() {
  const plans = readJson(SCHEDULE_PATH, {}); // { "2026-09": {startDate, rows} }
  let all = [];
  Object.entries(plans).forEach(([monthKey, plan]) => {
    const start = new Date(plan.startDate + 'T00:00:00');
    plan.rows.forEach((row) => {
      const d = new Date(start);
      d.setDate(d.getDate() + (row.day - 1));
      all.push({ ...row, monthKey, date: d });
    });
  });
  return all;
}

async function checkAndSend() {
  const now = new Date();
  const nowIso = isoDate(now);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const nowHM = `${hh}:${mm}`;

  const due = getAllPosts().filter((p) => isoDate(p.date) === nowIso && p.time === nowHM);
  if (due.length === 0) return;

  const sentLog = readJson(SENT_LOG_PATH, {});
  for (const post of due) {
    const sentKey = `${post.monthKey}-${post.day}-${nowIso}`;
    if (sentLog[sentKey]) continue; // da gui roi, tranh gui trung
    try {
      await sendReminder(post);
      sentLog[sentKey] = true;
      writeJson(SENT_LOG_PATH, sentLog);
    } catch (e) {
      console.error(`[scheduler] Gui email that bai cho ngay ${post.day}:`, e.message);
    }
  }
}

function start() {
  cron.schedule('* * * * *', () => {
    checkAndSend().catch((e) => console.error('[scheduler] loi checkAndSend:', e.message));
  });
  console.log('[scheduler] Da khoi dong — kiem tra lich moi phut.');
}

module.exports = { start, getAllPosts, SCHEDULE_PATH };
