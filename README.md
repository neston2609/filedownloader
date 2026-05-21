# SecureFiles

ระบบ file downloader สำหรับ SMB/SFTP พร้อม RBAC, subscription packages, และ ad banners  
สร้างด้วย Next.js 14, Prisma 5, NextAuth v5

---

## Requirements

- Node.js 18+
- PostgreSQL
- (Optional) FFmpeg — สำหรับ transcode วิดีโอ

---

## การติดตั้ง

```bash
npm install
cp .env.example .env
# แก้ไขค่าใน .env ให้ถูกต้อง
npx prisma migrate deploy
npm run build
npm start
```

---

## Environment Variables

| Variable | ตัวอย่าง | คำอธิบาย |
|----------|----------|-----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Connection string ของ PostgreSQL |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Secret สำหรับ JWT session (สุ่มสร้างใหม่ทุกครั้ง) |
| `NEXTAUTH_URL` | `https://your-domain.com` | URL หลักของเว็บ — ใช้ใน email links และ auth callbacks |

---

## การเพิ่ม URL / Domain ใหม่

ต้องการให้เข้าถึงเว็บผ่าน domain ใหม่ (เช่น เพิ่ม custom domain หรือ public domain ต่อจาก localhost) ทำตามขั้นตอนนี้:

### 1. แก้ `.env` บน server

เปลี่ยน `NEXTAUTH_URL` เป็น domain หลักที่ต้องการ:

```env
NEXTAUTH_URL="https://your-new-domain.com"
```

> ใส่ได้แค่ **URL เดียว** — เลือก domain หลักที่ใช้ส่งอีเมล (email verification, reset password)

### 2. แก้ `next.config.js` — เพิ่ม domain ใน `allowedOrigins`

Next.js มี CSRF protection สำหรับ Server Actions — domain ที่ไม่อยู่ใน whitelist จะถูก block:

```js
// next.config.js
experimental: {
  serverActions: {
    allowedOrigins: [
      'localhost:8000',
      'your-new-domain.com',      // เพิ่มตรงนี้ (ไม่ต้องมี https://)
    ],
  },
},
```

### 3. (ถ้าใช้ reverse proxy) แก้ nginx / Caddy

เพิ่ม domain ใหม่ใน virtual host ให้ชี้มาที่ port เดิม เช่น nginx:

```nginx
server {
    server_name old-domain.com your-new-domain.com;
    ...
}
```

### 4. Restart server

```bash
npm run build
npm start
# หรือถ้าใช้ PM2
pm2 restart all
```

### สิ่งที่ไม่ต้องแก้

| ส่วน | เหตุผล |
|------|--------|
| `src/auth.ts` | มี `trustHost: true` — NextAuth รองรับหลาย host อัตโนมัติ |
| `src/lib/url.ts` | fallback ไปใช้ `X-Forwarded-Host` header ได้เองถ้าไม่มี `NEXTAUTH_URL` |
| Database / File URLs | เก็บเป็น path สัมพัทธ์ ไม่มี absolute URL hardcode |

---

## Development

```bash
npm run dev        # dev server ที่ http://localhost:3000
npx prisma studio  # GUI สำหรับ database
```
