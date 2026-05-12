import { Request, Response, Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

const MARVIN_BASE = process.env.MARVIN_BASE_URL || 'https://marvin.bcms-cdn.prod.aws.kpn.com';
const MARVIN_USER = process.env.MARVIN_USERNAME || '';
const MARVIN_PASS = process.env.MARVIN_PASSWORD || '';

// POST /api/marvin/auth
router.post('/auth', async (req: Request, res: Response) => {
  const { username = MARVIN_USER, password = MARVIN_PASS } = req.body;
  try {
    const fres = await fetch(`${MARVIN_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await fres.json() as any;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Marvin auth failed', detail: String(err) });
  }
});

// POST /api/marvin/auth/refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  try {
    const fres = await fetch(`${MARVIN_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await fres.json() as any;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Marvin refresh failed', detail: String(err) });
  }
});

// GET /api/marvin/channels
router.get('/channels', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  try {
    const fres = await fetch(`${MARVIN_BASE}/channels`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await fres.json() as any;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch channels', detail: String(err) });
  }
});

// POST /api/marvin/channels/detail
router.post('/channels/detail', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { ip, deviceid, channel, type } = req.body as {
    ip?: string; deviceid?: string; channel?: string; type?: string;
  };
  try {
    const fres = await fetch(`${MARVIN_BASE}/channels/detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ip, deviceid, channel, type }),
    });
    const data = await fres.json() as any;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch channel detail', detail: String(err) });
  }
});

// GET /api/marvin/epg
router.get('/epg', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { channelIds, from, to } = req.query as { channelIds?: string; from?: string; to?: string };
  try {
    const params = new URLSearchParams();
    if (channelIds) params.set('channelIds', channelIds);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const fres = await fetch(`${MARVIN_BASE}/epg?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await fres.json() as any;
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch EPG', detail: String(err) });
  }
});

export default router;