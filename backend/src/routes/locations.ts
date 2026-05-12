import { Request, Response, Router } from 'express';
import { prisma } from '../index.js';

const router = Router();

// GET /api/locations
router.get('/', async (_req: Request, res: Response) => {
  const locations = await prisma.location.findMany({ include: { _count: { select: { devices: true } } } });
  res.json(locations);
});

// POST /api/locations
router.post('/', async (req: Request, res: Response) => {
  const { name, address, code, ipRangeStart, ipRangeEnd, m3uUrl, m3uContent, defaultM3U } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

  // If defaultM3U is set, clear other defaults
  if (defaultM3U) {
    await prisma.location.updateMany({ data: { defaultM3U: false } });
  }

  const location = await prisma.location.create({
    data: { name, address, code, ipRangeStart, ipRangeEnd, m3uUrl, m3uContent, defaultM3U: defaultM3U ?? false },
  });
  res.json(location);
});

// PUT /api/locations/:id
router.put('/:id', async (req: Request, res: Response) => {
  const { name, address, code, ipRangeStart, ipRangeEnd, m3uUrl, m3uContent, defaultM3U } = req.body;

  if (defaultM3U) {
    await prisma.location.updateMany({ data: { defaultM3U: false } });
  }

  const location = await prisma.location.update({
    where: { id: req.params.id },
    data: { name, address, code, ipRangeStart, ipRangeEnd, m3uUrl, m3uContent, defaultM3U: defaultM3U ?? false },
  });
  res.json(location);
});

// DELETE /api/locations/:id
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.location.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// POST /api/locations/:id/devices — assign device to location
router.post('/:id/devices', async (req: Request, res: Response) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

  await prisma.device.update({ where: { id: deviceId }, data: { locationId: req.params.id } });
  res.json({ ok: true });
});

export default router;