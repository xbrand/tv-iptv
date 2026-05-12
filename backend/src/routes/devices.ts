import { Request, Response, Router } from 'express';
import { prisma } from '../index.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

// POST /api/devices/register — register a new device, return 6-digit code
router.post('/register', async (req: Request, res: Response) => {
  const { uniqueId, deviceType, name } = req.body;
  if (!uniqueId || !deviceType) {
    return res.status(400).json({ error: 'uniqueId and deviceType are required' });
  }

  // Generate 6-digit code
  const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

  let device = await prisma.device.findUnique({ where: { uniqueId } });

  if (device) {
    // Update existing device with new code
    device = await prisma.device.update({
      where: { uniqueId },
      data: { activationCode, deviceType, name, isActivated: false, token: null, activatedAt: null },
    });
  } else {
    device = await prisma.device.create({
      data: { uniqueId, deviceType, name, activationCode },
    });
  }

  res.json({ deviceId: device.id, activationCode });
});

// POST /api/devices/activate — activate with 6-digit code
router.post('/activate', async (req: Request, res: Response) => {
  const { code, deviceId } = req.body;
  if (!code || !deviceId) {
    return res.status(400).json({ error: 'code and deviceId are required' });
  }

  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  if (device.activationCode !== code) return res.status(401).json({ error: 'Invalid activation code' });

  const token = jwt.sign({ deviceId: device.id }, JWT_SECRET, { expiresIn: '30d' });

  await prisma.device.update({
    where: { id: deviceId },
    data: { isActivated: true, activatedAt: new Date(), token },
  });

  res.json({ token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
});

// GET /api/devices/:id/status
router.get('/:id/status', async (req: Request, res: Response) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
    include: { location: true },
  });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({
    id: device.id,
    isActivated: device.isActivated,
    location: device.location,
    activatedAt: device.activatedAt,
  });
});

// POST /api/devices/:id/deactivate
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  await prisma.device.update({
    where: { id: req.params.id },
    data: { isActivated: false, token: null, activatedAt: null, activationCode: null },
  });
  res.json({ ok: true });
});

export default router;