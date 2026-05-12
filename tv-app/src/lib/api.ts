import type { DeviceStatus, StreamInfo } from './types';

const API_BASE = 'http://localhost:3001';

export function setApiBase(url: string) {
  (globalThis as any).__apiBase = url;
}

function apiBase() {
  return (globalThis as any).__apiBase || API_BASE;
}

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

export async function getEPG(token: string, params: { channelIds?: string; from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params.channelIds) qs.set('channelIds', params.channelIds);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  const res = await fetch(`${apiBase()}/api/marvin/epg?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}