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

async function sendReminder(post) {
  const transport = buildTransport();
  const subject = `🔔 Đến giờ đăng bài — ${post.idea}`;
  const html = `
    <div style="font-family:sans-serif; max-width:520px;">
      <h2 style="margin-bottom:4px;">${post.idea}</h2>
      <p style="color:#666; margin-top:0;">Ngày ${post.day} · ${post.time} · ${post.platform}</p>
      <p><b>Pillar:</b> ${post.pillar}<br><b>Định dạng:</b> ${post.format}</p>
      <p><b>Hình ảnh:</b> ${post.visual}</p>
      <p><b>Caption:</b><br>${post.caption}</p>
      <p><b>CTA:</b> ${post.cta}</p>
    </div>
  `;
  const info = await transport.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.REMINDER_EMAIL_TO,
    subject,
    html,
  });
  console.log('[mailer] Da gui email, messageId =', info.messageId);
  return info;
}

module.exports = { sendReminder };
