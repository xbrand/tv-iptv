import type { DeviceStatus, StreamInfo, Channel, EPGEvent } from './types';

const API_BASE = 'http://localhost:3001';

export function setApiBase(url: string) {
  (globalThis as any).__apiBase = url;
}

function apiBase() {
  return (globalThis as any).__apiBase || API_BASE;
}

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tv_token');
}

// ─── Existing Device Auth ─────────────────────────────────────────────────────
export async function registerDevice(uniqueId: string, deviceType: string, name?: string) {
  const res = await fetch(`${apiBase()}/api/devices/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uniqueId, deviceType, name }),
  });
  return res.json();
}

export async function activateDevice(code: string, deviceId: string) {
  const res = await fetch(`${apiBase()}/api/devices/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceId }),
  });
  return res.json();
}

export async function getDeviceStatus(deviceId: string) {
  const res = await fetch(`${apiBase()}/api/devices/${deviceId}/status`);
  return res.json() as Promise<DeviceStatus>;
}

// ─── Auth Endpoints (NEW) ────────────────────────────────────────────────────
export async function authAccessCode(code: string) {
  const res = await fetch(`${apiBase()}/api/auth/access-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  return res.json() as Promise<{ token: string; channels: Channel[]; error?: string }>;
}

export async function authProviderLogin(host: string, port: string, username: string, password: string) {
  const res = await fetch(`${apiBase()}/api/auth/provider-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port, username, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  return res.json() as Promise<{ token: string; channels: Channel[]; error?: string }>;
}

// ─── Channels & EPG ──────────────────────────────────────────────────────────
export async function getChannels() {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/channels`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ channels: Channel[] }>;
}

export async function getEPG() {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/epg`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ programs: EPGEvent[] }>;
}

// ─── Favorites ───────────────────────────────────────────────────────────────
export async function getFavorites() {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/favorites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ favorites: string[] }>;
}

export async function setFavorites(channelIds: string[]) {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channelIds }),
  });
  return res.json() as Promise<{ ok: boolean }>;
}

// ─── Config ──────────────────────────────────────────────────────────────────
export async function configM3U(m3uUrl: string) {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/config/m3u`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ m3uUrl }),
  });
  return res.json() as Promise<{ ok: boolean }>;
}

export async function configXtream(host: string, port: string, username: string, password: string) {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/config/xtream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ host, port, username, password }),
  });
  return res.json() as Promise<{ ok: boolean }>;
}

// ─── Subscription ────────────────────────────────────────────────────────────
export async function getSubscription() {
  const token = getToken();
  const res = await fetch(`${apiBase()}/api/subscription`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json() as Promise<{ plan: string; expiresAt: string }>;
}

// ─── Existing M3U & Marvin ──────────────────────────────────────────────────
export async function getLocations() {
  const res = await fetch(`${apiBase()}/api/locations`);
  return res.json();
}

export async function getM3UCode(code: string) {
  const res = await fetch(`${apiBase()}/api/m3u/code/${code}`);
  if (!res.ok) throw new Error(`M3U not found for code: ${code}`);
  return res.text();
}

export async function getM3UDevice(deviceId: string) {
  const res = await fetch(`${apiBase()}/api/m3u/device/${deviceId}`);
  if (!res.ok) throw new Error(`M3U not found for device`);
  return res.text();
}

export async function getChannelStream(token: string, params: {
  ip?: string; deviceid?: string; channel?: string; type?: string;
}) {
  const res = await fetch(`${apiBase()}/api/marvin/channels/detail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });
  return res.json() as Promise<StreamInfo>;
}

export async function getEPGMarvin(token: string, params: { channelIds?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params.channelIds) qs.set('channelIds', params.channelIds);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  const res = await fetch(`${apiBase()}/api/marvin/epg?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
