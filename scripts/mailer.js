const nodemailer = require('nodemailer');

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function postRow(p) {
  return `<tr>
    <td style="padding:6px 10px; font-weight:700; white-space:nowrap;">${p.time}</td>
    <td style="padding:6px 10px; white-space:nowrap;">${p.platform}</td>
    <td style="padding:6px 10px; font-size:11px; text-transform:uppercase; color:#888; white-space:nowrap;">${p.brandLabel}</td>
    <td style="padding:6px 10px;">${p.idea}</td>
  </tr>`;
}

async function sendDailyDigest(dateLabel, posts) {
  const transport = buildTransport();
  const subject = `📋 Lịch đăng bài hôm nay — ${dateLabel} (${posts.length} bài)`;
  const html = `
    <div style="font-family:sans-serif; max-width:600px;">
      <h2 style="margin-bottom:4px;">Hôm nay (${dateLabel}) có ${posts.length} bài cần đăng</h2>
      <table style="border-collapse:collapse; width:100%; margin-top:12px;">
        <thead><tr style="text-align:left; border-bottom:2px solid #eee;">
          <th style="padding:6px 10px;">Giờ</th><th style="padding:6px 10px;">Kênh</th>
          <th style="padding:6px 10px;">Thương hiệu</th><th style="padding:6px 10px;">Nội dung</th>
        </tr></thead>
        <tbody>${posts.map(postRow).join('')}</tbody>
      </table>
    </div>`;
  const info = await transport.sendMail({ from: process.env.SMTP_USER, to: process.env.REMINDER_EMAIL_TO, subject, html });
  console.log('[mailer] Da gui bao sang, messageId =', info.messageId);
  return info;
}

async function sendWeeklyDigest(weekLabel, postsByDate) {
  const transport = buildTransport();
  const totalCount = Object.values(postsByDate).reduce((s, arr) => s + arr.length, 0);
  const subject = `🗓️ Lịch đăng bài tuần này — ${weekLabel} (${totalCount} bài)`;
  const dayBlocks = Object.entries(postsByDate).map(([dateLabel, posts]) => `
    <h3 style="margin:18px 0 6px;">${dateLabel} ${posts.length === 0 ? '— (không có bài)' : ''}</h3>
    ${posts.length ? `<table style="border-collapse:collapse; width:100%;">
      <tbody>${posts.map(postRow).join('')}</tbody>
    </table>` : ''}
  `).join('');
  const html = `
    <div style="font-family:sans-serif; max-width:600px;">
      <h2 style="margin-bottom:4px;">Tuần này (${weekLabel}) có ${totalCount} bài</h2>
      ${dayBlocks}
    </div>`;
  const info = await transport.sendMail({ from: process.env.SMTP_USER, to: process.env.REMINDER_EMAIL_TO, subject, html });
  console.log('[mailer] Da gui bao tuan, messageId =', info.messageId);
  return info;
}

module.exports = { sendDailyDigest, sendWeeklyDigest };
