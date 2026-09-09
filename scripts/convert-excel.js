const fs = require('fs');
const path = require('path');
const { parseWorkbook } = require('./parseExcel');

const SCHEDULE_PATH = path.join(__dirname, '..', 'data', 'schedule.json');

function main() {
  const [, , filePath, startDate, brandKey, brandLabel] = process.argv;
  if (!filePath || !startDate || !brandKey) {
    console.error('Cach dung: node scripts/convert-excel.js <file.xlsx> <YYYY-MM-DD> <brandKey> [brandLabel]');
    console.error('Vi du:     node scripts/convert-excel.js ./thang-10.xlsx 2026-10-14 meiyoung "Diary of Meiyoung"');
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    console.error('Ngay bat dau phai dung dinh dang YYYY-MM-DD, vi du 2026-10-14');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error('Khong tim thay file:', filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  let rows;
  try {
    rows = parseWorkbook(buffer);
  } catch (err) {
    console.error('❌ Loi doc file Excel:', err.message);
    process.exit(1);
  }

  const monthKey = startDate.slice(0, 7);
  const schedule = fs.existsSync(SCHEDULE_PATH)
    ? JSON.parse(fs.readFileSync(SCHEDULE_PATH, 'utf8'))
    : {};

  if (!schedule[brandKey]) schedule[brandKey] = { label: brandLabel || brandKey, months: {} };
  if (brandLabel) schedule[brandKey].label = brandLabel;
  schedule[brandKey].months[monthKey] = { startDate, rows };

  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(schedule, null, 2), 'utf8');

  console.log(`✅ Da doc ${rows.length} bai cho kenh "${schedule[brandKey].label}", luu vao data/schedule.json (thang ${monthKey}).`);
  console.log('\nTiep theo, chay 3 lenh sau de day len GitHub:');
  console.log('  git add data/schedule.json');
  console.log(`  git commit -m "Cap nhat lich ${brandKey} thang ${monthKey}"`);
  console.log('  git push');
}

main();
