import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Public test M3U — IPTV Public test playlist (free tier, no guarantee of uptime)
const PUBLIC_M3U_URL = 'https://raw.githubusercontent.com/phreene/IPTV/main/test.m3u';

async function main() {
  console.log('Seeding database...');

  // Create a default location with the public M3U
  const location = await prisma.location.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Demo Location',
      code: 'DEMO',
      m3uUrl: PUBLIC_M3U_URL,
      defaultM3U: true,
    },
  });

  // Create a test device (pre-registered for easy testing)
  // Device ID: test-tizen-001, Code: 123456
  await prisma.device.upsert({
    where: { uniqueId: 'test-tizen-001' },
    update: {},
    create: {
      uniqueId: 'test-tizen-001',
      deviceType: 'tizen',
      name: 'Test TV Device',
      activationCode: '123456',
      isActivated: false,
    },
  });

  // Create a WebOS test device
  await prisma.device.upsert({
    where: { uniqueId: 'test-webos-001' },
    update: {},
    create: {
      uniqueId: 'test-webos-001',
      deviceType: 'webos',
      name: 'Test WebOS Device',
      activationCode: '654321',
      isActivated: false,
    },
  });

  console.log(`Seeded location: ${location.name} (code: ${location.code})`);
  console.log('Seeded test devices:');
  console.log('  test-tizen-001  → activation code: 123456');
  console.log('  test-webos-001  → activation code: 654321');
  console.log('Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());