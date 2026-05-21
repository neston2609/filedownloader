# SecureFiles

ระบบ file downloader สำหรับองค์กร — เชื่อมต่อ SMB/SFTP, จัดการสิทธิ์แบบ RBAC, subscription packages, และ ad banners

**Tech stack:** Next.js 14 · Prisma 5 · NextAuth v5 · PostgreSQL · Tailwind CSS

---

## สารบัญ

- [Requirements](#requirements)
- [การติดตั้ง (ตั้งแต่ต้น)](#การติดตั้ง)
- [Environment Variables](#environment-variables)
- [การใช้งานครั้งแรก (Admin)](#การใช้งานครั้งแรก-admin)
- [การเพิ่ม URL / Domain ใหม่](#การเพิ่ม-url--domain-ใหม่)
- [โครงสร้าง Project](#โครงสร้าง-project)
- [Security Notes](#security-notes)
- [Development](#development)

---

## Requirements

| เครื่องมือ | เวอร์ชันขั้นต่ำ | หมายเหตุ |
|-----------|--------------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 14+ | ต้องสร้าง database ไว้ก่อน |
| FFmpeg | ใดก็ได้ | (optional) สำหรับ transcode วิดีโอ |

---

## การติดตั้ง

### ขั้นตอนที่ 1 — Clone โปรเจกต์

```bash
git clone https://github.com/neston2609/filedownloader.git
cd filedownloader
```

---

### ขั้นตอนที่ 2 — ติดตั้ง dependencies

```bash
npm install
```

---

### ขั้นตอนที่ 3 — ตั้งค่า Environment Variables

คัดลอกไฟล์ตัวอย่าง แล้วแก้ค่าให้ถูกต้อง:

```bash
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วแก้ไข:

```env
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@103.40.118.129:5432/download_db"
NEXTAUTH_SECRET="<สร้างด้วยคำสั่งด้านล่าง>"
NEXTAUTH_URL="http://localhost:8000"
```

**สร้าง `NEXTAUTH_SECRET`** (ต้องทำทุกครั้งที่ติดตั้งใหม่):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **อย่าใช้ค่าเดิมซ้ำ** — secret นี้ใช้เข้ารหัส session ทุก user

---

### ขั้นตอนที่ 4 — Push schema ขึ้น Database

สร้าง/อัปเดต table ทั้งหมดใน PostgreSQL:

```bash
npm run db:push
```

> ใช้ `db:push` แทน `migrate` เพราะ project นี้ใช้ PostgreSQL ที่มีอยู่แล้ว ไม่ต้องจัดการ migration history

---

### ขั้นตอนที่ 5 — Seed ข้อมูลเริ่มต้น

สร้าง admin account และ default settings:

```bash
npm run db:seed
```

Admin account เริ่มต้น:
| | |
|--|--|
| **Email** | `admin@securefiles.local` |
| **Password** | `Admin@1234` |

> ⚠️ **เปลี่ยน password ทันทีหลัง login ครั้งแรก**

---

### ขั้นตอนที่ 6 — Build และ Start

**Development** (hot reload):
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

เว็บจะเปิดที่ → **http://localhost:8000**

---

### (เสริม) รันด้วย PM2 บน Server

```bash
npm install -g pm2
npm run build
pm2 start npm --name "securefiles" -- start
pm2 save          # ให้ restart อัตโนมัติเมื่อ server reboot
pm2 startup       # ทำตามคำแนะนำที่ปรากฏ
```

---

## Environment Variables

| Variable | ตัวอย่าง | คำอธิบาย |
|----------|----------|-----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Connection string ของ PostgreSQL |
| `NEXTAUTH_SECRET` | _(สุ่มสร้าง 32 bytes)_ | Secret สำหรับ sign JWT session |
| `NEXTAUTH_URL` | `https://your-domain.com` | URL หลักของเว็บ — ใช้ใน email links และ auth callbacks |

---

## การใช้งานครั้งแรก (Admin)

หลัง login ด้วย admin account ให้ตั้งค่าตามลำดับนี้:

1. **Admin → SMB Servers** — เพิ่ม file server (SMB/SFTP) ที่ต้องการเชื่อมต่อ
2. **Admin → Categories** — สร้าง category แล้ว link แต่ละ category เข้ากับ SMB path
3. **Admin → Groups** — (optional) สร้าง group สำหรับจัดการสิทธิ์หลายหมวดพร้อมกัน
4. **Admin → Packages** — ตั้งค่า subscription package และราคา
5. **Admin → Settings → Affiliate** — ใส่ affiliate link สำหรับ redirect ก่อน download
6. **Admin → Users** — อนุมัติ user ที่สมัครเข้ามา และกำหนด category access

### Affiliate Link Flow

เมื่อ user กด Download:
1. เปิด affiliate URL ใน tab ใหม่ (popup-safe)
2. หลัง 300ms — download จริงเริ่มทำงาน
3. Priority: _Category link_ → _Global link_ → _ไม่ redirect_

---

## การเพิ่ม URL / Domain ใหม่

ต้องการให้เข้าถึงเว็บจาก domain อื่น (เช่น เพิ่ม public domain ต่อจาก localhost) ทำ **3 ขั้นตอน**:

### 1. แก้ `.env` — เปลี่ยน `NEXTAUTH_URL`

```env
NEXTAUTH_URL="https://your-new-domain.com"
```

> ใส่ได้แค่ **1 URL** — เลือก domain หลักที่ใช้ส่งอีเมล

### 2. แก้ `next.config.js` — เพิ่มใน `allowedOrigins`

Next.js ป้องกัน CSRF โดย block origin ที่ไม่อยู่ใน whitelist:

```js
serverActions: {
  allowedOrigins: [
    'localhost:8000',
    'your-new-domain.com',   // เพิ่มตรงนี้ (ไม่ต้องมี https://)
  ],
},
```

### 3. (ถ้าใช้ reverse proxy) แก้ nginx / Caddy

```nginx
server {
    server_name old-domain.com your-new-domain.com;
    # proxy_pass ไปที่ port เดิม...
}
```

### 4. Rebuild และ restart

```bash
npm run build
pm2 restart securefiles
# หรือถ้าไม่ใช้ PM2:
npm start
```

### สิ่งที่ **ไม่ต้องแก้**

| ส่วน | เหตุผล |
|------|--------|
| `src/auth.ts` | มี `trustHost: true` — NextAuth รองรับหลาย host อัตโนมัติ |
| `src/lib/url.ts` | fallback ไปใช้ `X-Forwarded-Host` header ได้เองถ้าไม่มี `NEXTAUTH_URL` |
| Database / File URLs | เก็บเป็น path สัมพัทธ์ ไม่มี absolute URL hardcode |

---

## โครงสร้าง Project

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # หน้า login
│   │   └── register/       # หน้าสมัครสมาชิก
│   ├── (main)/
│   │   ├── download/       # หน้า browse & download ไฟล์ (member)
│   │   └── admin/          # Admin dashboard
│   │       ├── users/      # จัดการ user และสิทธิ์
│   │       ├── servers/    # จัดการ SMB/SFTP servers
│   │       ├── categories/ # จัดการ categories และ paths
│   │       └── settings/   # Site settings, packages, banners, affiliate
│   └── api/
│       ├── auth/           # NextAuth handlers + register
│       ├── banners/        # Ad banner CRUD
│       ├── browse/         # Directory listing (SMB → Server)
│       ├── download/       # File streaming (SMB → Server → Client)
│       ├── stream/         # Video streaming
│       └── ...
├── components/             # Shared UI components
├── lib/
│   ├── prisma.ts           # Prisma singleton
│   ├── smb.ts              # SMB2 client wrapper
│   ├── settings.ts         # Site settings helpers
│   └── url.ts              # Base URL resolver
└── middleware.ts           # Route protection + RBAC
```

---

## Security Notes

- **SMB credentials ไม่ถึง browser** — การเข้าถึงไฟล์ proxy ผ่าน server ทั้งหมด
- **Raw SMB path ไม่ถูก expose** — client เห็นแค่ category/path ที่ได้รับสิทธิ์
- **Path traversal** ถูก sanitize ใน download API
- **Category access** ถูก double-check ที่ API layer แม้ middleware จะผ่านแล้ว
- Routes `/download` และ `/admin` ทั้งหมดป้องกันด้วย JWT middleware

---

## Development

```bash
npm run dev          # dev server ที่ http://localhost:8000 (hot reload)
npm run db:studio    # Prisma Studio — GUI สำหรับดู/แก้ไข database
npm run db:push      # sync schema กับ database (หลังแก้ schema.prisma)
npm run lint         # ตรวจ ESLint
```
