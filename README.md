# TV-IPTV

IPTV streaming application for Samsung Tizen, LG WebOS, and Android TV.

## Project Structure

```
tv-iptv/
├── tv-app/         # Next.js 15 frontend (TV Web App)
├── backend/        # Express + Prisma API server
├── docker-compose.yml  # PostgreSQL (when deployed)
└── README.md
```

## Quick Start (Development)

### 1. Start the backend

```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts    # seeds demo location + test devices
npm run dev               # http://localhost:3001
```

### 2. Start the frontend

```bash
cd tv-app
npm install
npm run dev               # http://localhost:3000
```

### 3. Test activation (pre-seeded devices)

| Device ID | Activation Code |
|---|---|
| `test-tizen-001` | `123456` |
| `test-webos-001` | `654321` |

Or register a new device via the app UI.

## Backend API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/devices/register` | Register device, get activation code |
| POST | `/api/devices/activate` | Activate with code, returns JWT |
| GET | `/api/devices/:id/status` | Get device status |
| GET | `/api/locations` | List all locations |
| POST | `/api/locations` | Create location |
| GET | `/api/m3u/ip/:ip` | M3U by client IP |
| GET | `/api/m3u/code/:code` | M3U by location code |
| GET | `/api/m3u/device/:deviceId` | M3U by device |
| POST | `/api/marvin/channels/detail` | Get channel stream URL + DRM |
| GET | `/api/marvin/epg` | Get EPG data |

## Environment Variables

```env
PORT=3001
DATABASE_URL="file:./dev.db"     # SQLite for dev, PostgreSQL for prod
JWT_SECRET="your-secret"
CORS_ORIGINS="http://localhost:3000"
MARVIN_BASE_URL="https://marvin.bcms-cdn.prod.aws.kpn.com"
MARVIN_USERNAME=""
MARVIN_PASSWORD=""
```

## Deployment (Coolify)

### Backend
- **Build**: `npm install && npx prisma generate && npx prisma db push && npm run build`
- **Start**: `node --import tsx dist/index.js`
- **Port**: `3001`

### PostgreSQL
Set `DATABASE_URL` to your Coolify PostgreSQL connection string.

### Frontend
The Next.js app (`output: 'export'`) builds to `out/`. Serve as static files or proxy through the Express backend on the same port.

## TV Remote Keys

| Key | Action |
|---|---|
| ↑↓←→ | Navigate grid |
| OK / Enter | Select / Play |
| Backspace / Esc | Go back |
| Channel ± | Previous / next channel |
| 0–9 | Quick channel select |
| Info | Toggle favorite |
| Guide | Open EPG |