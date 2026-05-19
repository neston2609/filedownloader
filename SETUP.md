# SecureFiles — Setup Guide

## Prerequisites
- Node.js 18+
- Access to PostgreSQL at `103.40.118.129:5432`

## 1. Configure Environment

Edit `.env` and set your PostgreSQL password:
```
DATABASE_URL="postgresql://postgres:<YOUR_PASSWORD>@103.40.118.129:5432/download_db"
NEXTAUTH_SECRET="run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
NEXTAUTH_URL="http://localhost:3000"
```

## 2. Push Database Schema
```bash
npx prisma db push
```

## 3. Seed Initial Admin Account
```bash
npx prisma db seed
```
Default admin: `admin@securefiles.local` / `Admin@1234`
**Change the password immediately after first login.**

## 4. Run Development Server
```bash
npm run dev
```
Open http://localhost:3000

## 5. First Steps (Admin)

1. Log in with admin credentials
2. Go to **Admin → SMB Servers** and add your file server(s)
3. Go to **Admin → Categories** and create categories, linking each to an SMB path
4. Go to **Admin → Affiliate** and set your global affiliate link
5. Go to **Admin → Users** — approve new registrations and grant category permissions

## Architecture

```
src/
├── app/
│   ├── (auth)/login|register     # Public auth pages
│   ├── (main)/download           # Member file browser
│   ├── (main)/admin/...          # Admin dashboard
│   └── api/                      # REST API routes
│       ├── auth/register|[...nextauth]
│       ├── users/[id]/access     # Permission toggle
│       ├── smb/[id]/test         # Connectivity test
│       ├── categories/[id]/paths # SMB path management
│       ├── browse                # Directory listing (SMB→Server)
│       ├── download              # File streaming (SMB→Server→Client)
│       └── affiliate/resolve     # Affiliate URL resolution
├── lib/
│   ├── prisma.ts                 # Prisma singleton
│   ├── smb.ts                    # SMB2 client wrapper
│   └── utils.ts                  # Formatters / cn()
└── middleware.ts                  # Route protection + RBAC
```

## Security Notes

- SMB credentials never reach the browser — all access is proxied server-side
- File downloads stream through the Next.js server; raw SMB paths are never exposed
- All `/download` and `/admin` routes are protected by middleware JWT checks
- Category access is double-checked at the API layer even if middleware passes
- Path traversal is sanitized in the download API

## Affiliate Link Flow

1. User clicks **Download** on a file
2. `window.open(affiliateUrl, '_blank')` fires synchronously on the click event (popup-safe)
3. After 300ms, the actual file download is triggered via a hidden `<a>` tag
4. Priority: Category affiliate link → Global affiliate link → No redirect
