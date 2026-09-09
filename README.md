# Meiyoung Email Reminder

Server nho de doc file Excel ke hoach dang bai hang thang va tu dong gui
nhac lich qua **email**, chay tren VPS/server rieng cua ban. Don gian hon
nhieu so voi Zalo ZNS — khong can dang ky Official Account, khong can mau
tin duoc duyet, khong can OAuth.

## 1. Cai dat

```bash
npm install
cp .env.example .env
```

Mo `.env` va dien:

- `SMTP_USER` — email dung de GUI di
- `SMTP_PASS` — **App Password**, khong phai mat khau thuong (xem Buoc 2)
- `REMINDER_EMAIL_TO` — email se NHAN nhac lich (co the trung voi SMTP_USER)
- `ADMIN_TOKEN` — tu nghi mot chuoi dai, ngau nhien, dung de bao ve API upload

## 2. Neu dung Gmail: tao App Password (1 lan duy nhat)

1. Vao https://myaccount.google.com/security, bat **2-Step Verification**
   neu chua bat (bat buoc de tao App Password).
2. Vao https://myaccount.google.com/apppasswords
3. Chon "Mail" + ten thiet bi bat ky (vi du "Meiyoung reminder"), bam Tao.
4. Google se hien mot ma 16 ky tu — dan y nguyen vao `SMTP_PASS` (bo dau cach).

Neu dung Outlook/Yahoo/mail cua nha cung cap khac: sua `SMTP_HOST`/`SMTP_PORT`
trong `.env` theo thong tin SMTP cua ho, cach lay App Password tuong tu.

## 3. Chay server

```bash
npm start
```

Khuyen dung **pm2** de server tu khoi dong lai neu bi crash va chay ngam:

```bash
npm install -g pm2
pm2 start src/server.js --name meiyoung-reminder
pm2 save
```

## 4. Moi thang: tai file Excel len

File Excel giu nguyen cau truc cot cu (Day, Platform, Pillar, Format,
Content idea, Visual idea, Caption / Hook, CTA, Status) va **them mot cot
moi ten `Time`** (dinh dang `HH:mm`, 24 gio) o tung dong.

```bash
curl -X POST http://your-server:3000/upload \
  -H "x-admin-token: <ADMIN_TOKEN cua ban>" \
  -F "file=@/duong/dan/toi/file-thang-10.xlsx" \
  -F "startDate=2026-10-14"
```

Kiem tra nhanh lich hom nay/ngay mai:

```bash
curl http://your-server:3000/status -H "x-admin-token: <ADMIN_TOKEN cua ban>"
```

## 5. Cach hoat dong

- Moi phut, server kiem tra xem co bai nao trong lich dung ngay + dung gio
  hien tai khong. Neu co, no gui mot email nhac lich toi `REMINDER_EMAIL_TO`,
  kem day du idea / hinh anh / caption / CTA cua bai do.
- Moi bai chi gui **mot lan** (ghi lai trong `data/sent.json`), du server co
  khoi dong lai trong ngay.

## 6. Su co thuong gap

- **Loi "Invalid login" khi gui email**: ban dang dung mat khau Gmail
  thuong thay vi App Password, hoac chua bat 2-Step Verification.
- **Khong nhan duoc email**: kiem tra thu muc Spam; kiem tra log server
  (`pm2 logs meiyoung-reminder`) xem co bao loi khong.
- **Upload bao thieu cot "Time"**: mo file Excel, them cot `Time` voi gio
  dang du dinh cho tung ngay (vi du `12:00`, `19:00`).
