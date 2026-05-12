'use client';
import { useCallback, useRef } from 'react';
import type { StreamInfo, DRMConfig } from '../lib/types';

declare global {
  interface Window {
    webOS?: { deviceIdentifier: string; player: any };
    tizen?: { systeminfo: { getUniqueId(): Promise<string> }; tvplayer: any };
  }
}

export function useNativePlayer() {
  const playerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const detectPlatform = useCallback((): 'webos' | 'tizen' | 'android' | 'web' => {
    if (typeof window === 'undefined') return 'web';
    if ('webOS' in window) return 'webos';
    if ('tizen' in window) return 'tizen';
    if (/Android TV|SHIELD|AFTM/i.test(navigator.userAgent)) return 'android';
    return 'web';
  }, []);

  const getDeviceId = useCallback(async (): Promise<string> => {
    const platform = detectPlatform();

    if (platform === 'webos' && window.webOS?.deviceIdentifier) {
      return window.webOS.deviceIdentifier;
    }
    if (platform === 'tizen' && window.tizen?.systeminfo) {
      return await window.tizen.systeminfo.getUniqueId();
    }
    if (platform === 'android') {
      // Android TV — use a stored ANDROID_ID fallback
      let id = localStorage.getItem('android_device_id');
      if (!id) {
        id = 'android-' + Math.random().toString(36).slice(2);
        localStorage.setItem('android_device_id', id);
      }
      return id;
    }
    // Web fallback
    let id = localStorage.getItem('web_device_id');
    if (!id) {
      id = 'web-' + Math.random().toString(36).slice(2);
      localStorage.setItem('web_device_id', id);
    }
    return id;
  }, [detectPlatform]);

  const playStream = useCallback(async (
    streamInfo: StreamInfo,
    drmConfig?: DRMConfig,
    videoElement?: HTMLVideoElement
  ) => {
    const platform = detectPlatform();

    if (platform === 'tizen' && window.tizen?.tvplayer) {
      // Tizen native player
      playerRef.current = window.tizen.tvplayer;
      playerRef.current.play(streamInfo.src, {
        drm: drmConfig?.type === 'widevine' ? {
          type: 'widevine',
          licenseServer: drmConfig.licenseAcquisitionURL,
        } : undefined,
      });
      return;
    }

    if (platform === 'webos' && window.webOS?.player) {
      // WebOS native player
      playerRef.current = window.webOS.player;
      playerRef.current.play(streamInfo.src, {
        drm: drmConfig?.type === 'widevine' ? {
          type: 'widevine',
          licenseUrl: drmConfig.licenseAcquisitionURL,
        } : undefined,
      });
      return;
    }

    // Fallback: HTML5 video element with hls.js or native HLS
    const video = videoElement || document.createElement('video');
    videoRef.current = video;
    video.src = streamInfo.src;
    video.play().catch(console.error);
  }, [detectPlatform]);

  const stop = useCallback(() => {
    if (playerRef.current?.stop) {
      playerRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  }, []);

  return { detectPlatform, getDeviceId, playStream, stop };
}