import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cosmos-iptv-secret-key-change-in-production';

export const prisma = new PrismaClient();

interface Channel {
  id: string;
  name: string;
  logo?: string;
  category?: string;
  url: string;
}

// Demo channels for testing
const DEMO_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'Sky Sports Main', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Sky_Sports_logo_2017.svg', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch2', name: 'Cosmos News 24', category: 'News', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch3', name: 'Cinema Premium', category: 'Entertainment', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch4', name: 'Nature Wild HD', category: 'Documentary', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch5', name: 'BBC One', category: 'News', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch6', name: 'CNN International', category: 'News', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch7', name: 'Eurosport 1', category: 'Sports', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch8', name: 'HBO', category: 'Entertainment', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch9', name: 'National Geographic', category: 'Documentary', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch10', name: 'Discovery Channel', category: 'Documentary', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch11', name: 'ITV 1', category: 'Entertainment', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
  { id: 'ch12', name: 'Channel 4', category: 'Entertainment', url: 'https://test-streams.muslab.com/play/live.test/live.test/live.m3u8' },
];

// Demo EPG programs
interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  category?: string;
  isLive: boolean;
}

function generateEPGPrograms(): EPGProgram[] {
  const programs: EPGProgram[] = [];
  const now = new Date();
  
  DEMO_CHANNELS.forEach(channel => {
    // Generate 6 hours of programs for each channel
    for (let i = 0; i < 12; i++) {
      const startTime = new Date(now.getTime() + i * 30 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
      
      const categories = ['Sports', 'News', 'Entertainment', 'Documentary', 'Movie', 'Drama'];
      const titles = {
        'Sports': ['Premier League Live', 'Golf Highlights', 'Tennis Open', 'Formula 1 Race'],
        'News': ['World News Update', 'Business Report', 'Weather Forecast', 'Sports News'],
        'Entertainment': ['Late Night Show', 'Comedy Central', 'Reality TV', 'Game Show'],
        'Documentary': ['Nature Documentary', 'History Channel', 'Science Explore', 'Travel Guide'],
        'Movie': ['Feature Film', 'Classic Movie', 'Premiere Night', 'Movie Marathon'],
        'Drama': ['TV Series Episode', 'Soap Opera', 'Crime Drama', 'Medical Drama'],
      };
      
      const category = channel.category || 'Entertainment';
      const possibleTitles = titles[category as keyof typeof titles] || titles['Entertainment'];
      const title = possibleTitles[Math.floor(Math.random() * possibleTitles.length)];
      
      programs.push({
        id: `${channel.id}-prog-${i}`,
        channelId: channel.id,
        title: i === 0 ? `${title} (Live)` : title,
        description: `A ${category.toLowerCase()} program showing on ${channel.name}`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: 30,
        category,
        isLive: i === 0,
      });
    }
  });
  
  return programs;
}

// POST /api/auth/access-code — validate M3U code, return {token, channels}
router.post('/access-code', async (req: Request, res: Response) => {
  const { code } = req.body;
  
  if (!code || code.trim() === '') {
    return res.status(400).json({ error: 'Access code is required' });
  }
  
  // In production, this would validate against a database of valid codes
  // For MVP, we accept any code >= 4 characters
  if (code.trim().length < 4) {
    return res.status(401).json({ error: 'Invalid access code' });
  }
  
  const token = jwt.sign({ type: 'access-code', code }, JWT_SECRET, { expiresIn: '30d' });
  
  res.json({
    token,
    channels: DEMO_CHANNELS,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

// POST /api/auth/provider-login — Xtream Codes auth, return {token, channels}
router.post('/provider-login', async (req: Request, res: Response) => {
  const { host, port, username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // In production, this would authenticate against Xtream Codes API
  // For MVP, we accept any non-empty credentials
  if (username.trim().length === 0 || password.trim().length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({
    type: 'xtream',
    username,
    host: host || 'localhost',
    port: port || '8080',
  }, JWT_SECRET, { expiresIn: '30d' });
  
  res.json({
    token,
    channels: DEMO_CHANNELS,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

// GET /api/channels — return {channels: Channel[]}
router.get('/channels', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ channels: DEMO_CHANNELS });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/epg — return {programs: EPGProgram[]}
router.get('/epg', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const programs = generateEPGPrograms();
    res.json({ programs });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/favorites — return {favorites: string[]}
router.get('/favorites', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    // In production, this would fetch from database
    res.json({ favorites: ['ch1', 'ch3'] }); // Demo favorites
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/favorites — body {channelIds: string[]}, return {ok: true}
router.post('/favorites', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const { channelIds } = req.body;
    
    if (!Array.isArray(channelIds)) {
      return res.status(400).json({ error: 'channelIds must be an array' });
    }
    
    // In production, this would save to database
    res.json({ ok: true, favorites: channelIds });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/config/m3u — body {m3uUrl: string}, return {ok: true}
router.post('/config/m3u', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const { m3uUrl } = req.body;
    
    if (!m3uUrl || m3uUrl.trim() === '') {
      return res.status(400).json({ error: 'm3uUrl is required' });
    }
    
    // In production, this would validate and store the M3U URL
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /api/config/xtream — body {host, port, username, password}, return {ok: true}
router.post('/config/xtream', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const { host, port, username, password } = req.body;
    
    if (!host || !username || !password) {
      return res.status(400).json({ error: 'host, username, and password are required' });
    }
    
    // In production, this would test connection to Xtream and store credentials
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/subscription — return {plan, expiresAt}
router.get('/subscription', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({
      plan: 'Premium',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
