const XLSX = require('xlsx');

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName =
    wb.SheetNames.find((n) => /content.*plan|30.*day/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  if (raw.length < 2) throw new Error('File rong hoac khong doc duoc du lieu.');

  const header = raw[0].map((h) => String(h).trim().toLowerCase());
  const col = {};
  header.forEach((h, i) => {
    if (h === 'day') col.day = i;
    else if (h === 'platform') col.platform = i;
    else if (h.includes('pillar')) col.pillar = i;
    else if (h === 'format') col.format = i;
    else if (h === 'content idea') col.idea = i;
    else if (h === 'visual idea') col.visual = i;
    else if (h.startsWith('caption')) col.caption = i;
    else if (h === 'cta') col.cta = i;
    else if (h === 'status') col.status = i;
    else if (h === 'time') col.time = i;
  });

  if (col.day === undefined || col.idea === undefined) {
    throw new Error('Khong tim thay cot "Day" va "Content idea" — kiem tra tieu de cot.');
  }
  if (col.time === undefined) {
    throw new Error(
      'File chua co cot "Time" (HH:mm). Them cot nay vao file Excel de he thong biet gio nhac cho tung bai.'
    );
  }

  const rows = raw
    .slice(1)
    .filter((r) => r[col.day] !== '' && r[col.day] != null)
    .map((r) => ({
      day: Number(r[col.day]),
      platform: r[col.platform] || '',
      pillar: r[col.pillar] || '',
      format: r[col.format] || '',
      idea: r[col.idea] || '',
      visual: r[col.visual] || '',
      caption: r[col.caption] || '',
      cta: r[col.cta] || '',
      status: col.status !== undefined ? r[col.status] || '' : '',
      time: String(r[col.time] || '').trim(),
    }));

  const badTime = rows.find((r) => !/^\d{1,2}:\d{2}$/.test(r.time));
  if (badTime) {
    throw new Error(`Gio dang cua Ngay ${badTime.day} khong dung dinh dang HH:mm: "${badTime.time}"`);
  }

  return rows;
}

module.exports = { parseWorkbook };
