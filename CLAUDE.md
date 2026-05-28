# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server on http://localhost:8000
npm run build        # production build
npm start            # production server on port 8000
npm run lint         # ESLint

npm run db:push      # sync schema.prisma → PostgreSQL (no migration history)
npm run db:generate  # regenerate Prisma client after schema change
npm run db:seed      # create admin@securefiles.local / Admin@1234 + default affiliate settings
npm run db:studio    # Prisma Studio GUI
```

After any `schema.prisma` change: `db:push` then `db:generate` (or just `db:push` which auto-generates).

## Architecture

### Route groups
- `(auth)/` — public login/register pages (no session required)
- `(main)/` — all authenticated pages; `layout.tsx` enforces session and renders NavBar + BannerStrip

### Middleware (`src/middleware.ts`)
Runs on every non-API/static route. Redirects unauthenticated users to `/login`; redirects non-admins away from `/admin/*`. The matcher excludes `/api`, `/_next`, and static assets — API routes perform their own auth.

### Access control (`src/lib/access.ts`)
Two distinct checks used throughout:
- `checkCategoryBrowse(userId, categoryId, isAdmin)` — can the user *see* the category's file listing? (hidden categories are blocked; no membership check)
- `checkCategoryAccess(userId, categoryId, isAdmin)` — can the user *download or play* from this category? (checks active account, membership expiry, per-category grant OR group grant)

**Group path overrides per-category path:** If a category belongs to a `CategoryGroup`, the `UserGroupAccess` row (if it exists) takes precedence over `UserCategoryAccess` and has its own independent `expiresAt`.

### File service layer
Three protocols share the same interface pattern:
- `src/lib/smb.ts` — `@marsaud/smb2`
- `src/lib/ftp.ts` — `basic-ftp`
- `src/lib/scp.ts` — `ssh2-sftp-client`

Each exports `listXDirectory(...)` and `streamXFile(...)`. The browse/download/stream API routes try SMB → FTP → SCP in order until a matching `CategoryXPath` row is found.

### API routes
- `GET /api/browse` — lists directory (SMB/FTP/SCP), applies hide rules, uses `checkCategoryBrowse`
- `GET /api/stream` — streams video; native formats passthrough, others transcoded via `transcodeToMp4()` (ffmpeg). Uses `checkCategoryAccess`.
- `GET /api/download` — streams file as attachment. Uses `checkCategoryAccess`. Logs to `DownloadLog`.
- `GET /api/cover` — fetches `folder.jpg` from SMB/FTP/SCP for folder thumbnail previews

### Hide rules (`src/lib/hide.ts`)
`HideRule` rows (global `categoryId=null` or per-category) are loaded once and tested with `isHidden(name, isDirectory, rules)` before returning directory listings and before serving stream/download requests.

### Settings
`SiteSettings` is a singleton DB row (always one row, created on demand). `getSiteSettings()` / `getPublicSiteSettings()` in `src/lib/settings.ts`. The PATCH `/api/settings` route handles all fields; SMTP password is never returned to the client (replaced with `hasSmtpPassword` flag).

### Membership
`src/lib/membership.ts` — pure functions over `{ membershipStart, membershipMonths }`. `membershipMonths = null` means unlimited. Per-group expiry (`UserGroupAccess.expiresAt`) is independent of the global window.

### Uploads / static files
Uploaded files (banners, category images, QR codes) are stored under `storage/uploads/` and served by `GET /api/uploads/[...path]`. URLs are stored as `/uploads/...` and prefixed with `/api` when rendered.

### Key data relationships
```
CategoryGroup → Category (groupId)
             → MembershipPlan (groupId) — buying this plan grants UserGroupAccess
             → UserGroupAccess (groupId) — per-user group grant with own expiresAt

Category → CategorySmbPath / CategoryFtpPath / CategoryScpPath
         → UserCategoryAccess (per-user per-category grant)
         → HideRule (category-scoped, or null = global)
```

### Styling
Tailwind with a custom retro design token set defined in `tailwind.config.ts`. Custom colours: `retro-lime`, `retro-coral`, `retro-sky`, `retro-mint`, `retro-lemon`, `retro-grape`. Semantic tokens: `bg`, `bg2`, `paper`, `ink`, `ink2`, `mute`, `line`. Custom utilities: `btn-retro`, `shadow-hard`, `shadow-hard-sm`, `shadow-hard-lg`, `rounded-retro`.
