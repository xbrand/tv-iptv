import { Request, Response, Router } from 'express';
import { prisma } from '../index.js';
import * as https from 'https';

const router = Router();

function ipInRange(ip: string, start: string, end: string): boolean {
  const toNum = (a: string) => a.split('.').map(Number).reduce((acc, b) => (acc << 8) + b, 0);
  try {
    return toNum(ip) >= toNum(start) && toNum(ip) <= toNum(end);
  } catch {
    return false;
  }
}

async function fetchM3U(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TV-IPTV/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) { fetchM3U(redirectUrl).then(resolve).catch(reject); return; }
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getM3UForLookup(identifier: string, type: 'ip' | 'code' | 'deviceId'): Promise<string | null> {
  let location = null;

  if (type === 'code') {
    location = await prisma.location.findUnique({ where: { code: identifier } });
  } else if (type === 'ip') {
    const locations = await prisma.location.findMany();
    location = locations.find(l => l.ipRangeStart && l.ipRangeEnd && ipInRange(identifier, l.ipRangeStart, l.ipRangeEnd))
      || locations.find(l => l.defaultM3U);
  } else if (type === 'deviceId') {
    const device = await prisma.device.findUnique({ where: { id: identifier }, include: { location: true } });
    location = device?.location ?? null;
  }

  if (!location) return null;

  if (location.m3uContent) return location.m3uContent;
  if (location.m3uUrl) return fetchM3U(location.m3uUrl);
  return null;
}

// GET /api/m3u/ip/:ip
router.get('/ip/:ip', async (req: Request, res: Response) => {
  const m3u = await getM3UForLookup(req.params.ip, 'ip');
  if (!m3u) return res.status(404).type('text/plain').send('No M3U found for this IP');
  res.type('application/vnd.apple.mpegurl').send(m3u);
});

// GET /api/m3u/code/:code
router.get('/code/:code', async (req: Request, res: Response) => {
  const m3u = await getM3UForLookup(req.params.code, 'code');
  if (!m3u) return res.status(404).type('text/plain').send('No M3U found for this code');
  res.type('application/vnd.apple.mpegurl').send(m3u);
});

// GET /api/m3u/device/:deviceId
router.get('/device/:deviceId', async (req: Request, res: Response) => {
  const m3u = await getM3UForLookup(req.params.deviceId, 'deviceId');
  if (!m3u) return res.status(404).type('text/plain').send('No M3U found for this device');
  res.type('application/vnd.apple.mpegurl').send(m3u);
});

export default router;