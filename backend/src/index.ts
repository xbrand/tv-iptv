import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import devicesRouter from './routes/devices.js';
import locationsRouter from './routes/locations.js';
import m3uRouter from './routes/m3u.js';
import marvinRouter from './routes/marvin.js';
import authRouter from './routes/auth.js';

export const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/devices', devicesRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/m3u', m3uRouter);
app.use('/api/marvin', marvinRouter);
app.use('/api/auth', authRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`TV IPTV Backend running on http://localhost:${PORT}`));