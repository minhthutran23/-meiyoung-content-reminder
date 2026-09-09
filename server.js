require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { parseWorkbook } = require('./parseExcel');
const scheduler = require('./scheduler');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
app.use(express.json());

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Thieu hoac sai x-admin-token.' });
  }
  next();
}

function readSchedule() {
  if (!fs.existsSync(SCHEDULE_PATH)) return {};
  return JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'));
}
function writeSchedule(data) {
  fs.mkdirSync(path.dirname(SCHEDULE_PATH), { recursive: true });
  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Tai file Excel cho mot thang. Vi du goi bang curl (xem README).
app.post('/upload', requireAdmin, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Thieu file (field "file").' });
    const startDate = req.body.startDate; // 'YYYY-MM-DD', ngay cua "Ngay 1"
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: 'Thieu hoac sai dinh dang truong "startDate" (YYYY-MM-DD).' });
    }
    const rows = parseWorkbook(req.file.buffer);
    const monthKey = startDate.slice(0, 7); // '2026-09'
    const schedule = readSchedule();
    schedule[monthKey] = { startDate, rows };
    writeSchedule(schedule);
    res.json({ ok: true, monthKey, count: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Xem nhanh lich hom nay / ngay mai — dung de kiem tra he thong dang hoat dong dung.
app.get('/status', requireAdmin, (req, res) => {
  const all = scheduler.getAllPosts();
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
  const tmrwIso = tmrw.toISOString().slice(0, 10);
  const fmt = (p) => ({ day: p.day, date: p.date.toISOString().slice(0, 10), time: p.time, idea: p.idea, platform: p.platform });
  res.json({
    today: all.filter((p) => p.date.toISOString().slice(0, 10) === todayIso).map(fmt),
    tomorrow: all.filter((p) => p.date.toISOString().slice(0, 10) === tmrwIso).map(fmt),
    months_loaded: Object.keys(readSchedule()),
  });
});

app.get('/', (req, res) => res.send('Meiyoung email reminder dang chay.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] Dang chay tai cong ${PORT}`);
  scheduler.start();
});
