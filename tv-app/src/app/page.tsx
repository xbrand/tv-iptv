'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTVRemote } from '../hooks/useTVRemote';
import { useNativePlayer } from '../hooks/useNativePlayer';
import type { Channel, EPGEvent } from '../lib/types';
import * as api from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = 'activation' | 'home' | 'epg' | 'player';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateDeviceId(): string {
  if (typeof window === 'undefined') return 'web-' + Math.random().toString(36).slice(2);
  const stored = localStorage.getItem('tv_device_id');
  if (stored) return stored;
  const id = 'web-' + Math.random().toString(36).slice(2);
  localStorage.setItem('tv_device_id', id);
  return id;
}

function formatDeviceId(id: string): string {
  return id.replace(/(.{4})/g, '$1-').replace(/-$/, '').toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Activation Screen ────────────────────────────────────────────────────────
function ActivationScreen({
  deviceId,
  onActivated,
}: {
  deviceId: string;
  onActivated: (token: string, deviceId: string) => void;
}) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [deviceId2, setDeviceId2] = useState('');
  const [registering, setRegistering] = useState(false);
  const focusIndex = code.indexOf('');

  useTVRemote({
    onDigit(d) {
      if (focusIndex === -1) return;
      const next = [...code];
      next[focusIndex] = d;
      setCode(next);
    },
    onBack() {
      const lastFilled = [...code].reverse().findIndex(c => c !== '');
      if (lastFilled >= 0) {
        const idx = 5 - lastFilled;
        const next = [...code];
        next[idx] = '';
        setCode(next);
      }
    },
    onEnter() {
      if (code.every(c => c !== '') && deviceId2) {
        handleActivate();
      }
    },
  });

  async function handleActivate() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const result = await api.activateDevice(code.join(''), deviceId2) as any;
      if (result.token) {
        localStorage.setItem('tv_token', result.token);
        localStorage.setItem('tv_device_id2', deviceId2);
        onActivated(result.token, deviceId2);
      } else {
        setStatus('error');
        setErrorMsg(result.error || 'Activation failed');
      }
    } catch (e: any) {
      setStatus('error');
      setErrorMsg(e.message || 'Network error');
    }
  }

  async function handleRegister() {
    setRegistering(true);
    try {
      const result = await api.registerDevice(deviceId, detectType()) as any;
      if (result.deviceId && result.activationCode) {
        setDeviceId2(result.deviceId);
        setCode(result.activationCode.split(''));
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Registration failed');
    }
    setRegistering(false);
  }

  function detectType(): string {
    if ('webOS' in window) return 'webos';
    if ('tizen' in window) return 'tizen';
    if (/Android TV|SHIELD/i.test(navigator.userAgent)) return 'android';
    return 'web';
  }

  return (
    <div className="activation-screen">
      <div className="activation-logo">TV-IPTV</div>

      <div className="card" style={{ textAlign: 'center', minWidth: 400 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          Device ID
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
          {formatDeviceId(deviceId)}
        </p>

        {!deviceId2 ? (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Enter the 6-digit activation code from the portal
            </p>
            <button
              className="btn btn-primary"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Get Activation Code'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Your code
            </p>
            <div className="code-display" style={{ marginBottom: '1.5rem' }}>
              {code.map((d, i) => (
                <div key={i} className={`code-digit${d ? ' filled' : ''}`}>{d || '_'}</div>
              ))}
            </div>

            <div className="numpad" style={{ margin: '0 auto 1.5rem' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => (
                k === '' ? <div key={i} /> :
                k === '⌫' ? (
                  <button key={i} className="numpad-key action" onClick={() => {
                    const lastFilled = [...code].reverse().findIndex(c => c !== '');
                    if (lastFilled >= 0) {
                      const idx = 5 - lastFilled;
                      const next = [...code];
                      next[idx] = '';
                      setCode(next);
                    }
                  }}>⌫</button>
                ) : (
                  <button key={i} className="numpad-key" onClick={() => {
                    const next = [...code];
                    const empty = next.indexOf('');
                    if (empty !== -1) { next[empty] = k; setCode(next); }
                  }}>{k}</button>
                )
              ))}
            </div>

            {status === 'error' && (
              <div className="callout callout-danger" style={{ marginBottom: '1rem', justifyContent: 'center' }}>
                {errorMsg}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleActivate}
              disabled={status === 'loading' || code.some(c => c === '')}
              style={{ width: '100%' }}
            >
              {status === 'loading' ? 'Activating...' : 'Activate'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Channel Card ────────────────────────────────────────────────────────────
function ChannelCard({
  channel,
  focused,
  selected,
  onSelect,
}: {
  channel: Channel;
  focused: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`channel-card${selected ? ' selected' : ''}${focused ? ' focus-ring' : ''}`}
      onClick={onSelect}
      style={focused ? { transform: 'scale(1.04)', zIndex: 1 } : {}}
      tabIndex={-1}
    >
      {channel.logo ? (
        <img src={channel.logo} alt={channel.name} className="channel-logo" />
      ) : (
        <div className="channel-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          {channel.name.charAt(0)}
        </div>
      )}
      <span className="channel-name">{channel.name}</span>
      {channel.currentProgram && (
        <span className="current-program">{channel.currentProgram.title}</span>
      )}
    </div>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen({
  token,
  onPlay,
  onOpenEPG,
}: {
  token: string;
  onPlay: (channel: Channel) => void;
  onOpenEPG: () => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filtered, setFiltered] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Grid navigation state
  const COLS = 4;
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tv_favorites');
    if (stored) setFavorites(new Set(JSON.parse(stored)));
  }, []);

  useEffect(() => {
    loadChannels();
  }, []);

  async function loadChannels() {
    setLoading(true);
    try {
      // Fetch M3U for the device
      const deviceId2 = localStorage.getItem('tv_device_id2') || '';
      const m3uText = await api.getM3UDevice(deviceId2);
      const parsed = parseM3U(m3uText);
      setChannels(parsed);
      setFiltered(parsed);

      const cats = ['All', 'Favorites', ...new Set(parsed.map(c => c.category || 'Other'))];
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load channels:', e);
      // Demo channels if no backend
      setChannels(DEMO_CHANNELS);
      setFiltered(DEMO_CHANNELS);
      setCategories(['All', 'Favorites', 'News', 'Sports', 'Entertainment']);
    }
    setLoading(false);
  }

  function parseM3U(text: string): Channel[] {
    const lines = text.split('\n');
    const channels: Channel[] = [];
    let current: Partial<Channel> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF:')) {
        const attrs = trimmed.slice('#EXTINF:'.length);
        const nameMatch = attrs.match(/tvg-name="([^"]*)"/);
        const logoMatch = attrs.match(/tvg-logo="([^"]*)"/);
        const groupMatch = attrs.match(/group-title="([^"]*)"/);
        const numMatch = attrs.match(/tvg-chnum="([^"]*)"/);
        current = {
          id: nameMatch?.[1] || `ch-${channels.length + 1}`,
          name: nameMatch?.[1] || `Channel ${channels.length + 1}`,
          logo: logoMatch?.[1],
          category: groupMatch?.[1],
          number: numMatch?.[1],
        };
      } else if (trimmed && !trimmed.startsWith('#')) {
        current.id = current.id || `ch-${channels.length + 1}`;
        channels.push(current as Channel);
        current = {};
      }
    }
    return channels;
  }

  function filterChannels(cat: string) {
    setActiveCategory(cat);
    if (cat === 'All') setFiltered(channels);
    else if (cat === 'Favorites') setFiltered(channels.filter(c => favorites.has(c.id)));
    else setFiltered(channels.filter(c => c.category === cat));
    setFocusedIndex(0);
  }

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('tv_favorites', JSON.stringify([...next]));
      return next;
    });
  }

  const cols = COLS;
  const rows = Math.ceil(filtered.length / cols);

  useTVRemote({
    onArrowUp() {
      if (focusedIndex >= cols) setFocusedIndex(i => i - cols);
    },
    onArrowDown() {
      if (focusedIndex + cols < filtered.length) setFocusedIndex(i => i + cols);
    },
    onArrowLeft() {
      if (focusedIndex % cols > 0) setFocusedIndex(i => i - 1);
    },
    onArrowRight() {
      if (focusedIndex % cols < cols - 1 && focusedIndex + 1 < filtered.length) setFocusedIndex(i => i + 1);
    },
    onEnter() {
      const ch = filtered[focusedIndex];
      if (ch) onPlay(ch);
    },
    onChannelUp() {
      if (focusedIndex >= cols) setFocusedIndex(i => i - cols);
      else setFocusedIndex(0);
    },
    onChannelDown() {
      if (focusedIndex + cols < filtered.length) setFocusedIndex(i => i + cols);
    },
    onDigit(d) {
      // Quick channel select: jump to channel number
      const num = parseInt(d);
      if (num >= 0 && num < filtered.length) {
        setFocusedIndex(num);
        onPlay(filtered[num]);
      }
    },
    onInfo() {
      const ch = filtered[focusedIndex];
      if (ch) toggleFavorite(ch.id);
    },
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>TV-IPTV</div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-surface" onClick={onOpenEPG} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem', minHeight: 44 }}>
            📺 Guide
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`category-chip${activeCategory === cat ? ' active' : ''}`}
            onClick={() => filterChannels(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Channel grid */}
      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: '0.75rem',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '1rem',
        }}
      >
        {filtered.map((ch, i) => (
          <ChannelCard
            key={ch.id}
            channel={ch}
            focused={i === focusedIndex}
            selected={favorites.has(ch.id)}
            onSelect={() => { setFocusedIndex(i); onPlay(ch); }}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
            No channels in this category
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '0.5rem 0' }}>
        <span>↑↓←→ Navigate</span>
        <span>OK Play</span>
        <span>Info ★ Favorite</span>
        <span>Guide EPG</span>
      </div>
    </div>
  );
}

// ─── EPG Screen ──────────────────────────────────────────────────────────────
function EPGScreen({
  channels,
  token,
  onPlay,
  onBack,
}: {
  channels: Channel[];
  token: string;
  onPlay: (channel: Channel) => void;
  onBack: () => void;
}) {
  const [epgEvents, setEpgEvents] = useState<EPGEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedRow, setFocusedRow] = useState(0);
  const [timeOffset, setTimeOffset] = useState(0); // 30-min increments
  const now = new Date();
  const baseTime = new Date(now.getTime() + timeOffset * 30 * 60 * 1000);
  const viewStart = new Date(baseTime);
  viewStart.setMinutes(0, 0, 0);

  useEffect(() => { loadEPG(); }, [timeOffset]);

  async function loadEPG() {
    setLoading(true);
    try {
      const data = await api.getEPG(token, {
        from: viewStart.toISOString(),
        to: new Date(viewStart.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      }) as any;
      if (data.events) setEpgEvents(data.events);
      else if (data.epg) setEpgEvents(data.epg);
      else setEpgEvents([]);
    } catch {
      setEpgEvents([]);
    }
    setLoading(false);
  }

  useTVRemote({
    onArrowUp() {
      if (focusedRow > 0) setFocusedRow(r => r - 1);
    },
    onArrowDown() {
      if (focusedRow < channels.length - 1) setFocusedRow(r => r + 1);
    },
    onArrowLeft() {
      setTimeOffset(o => o - 1);
    },
    onArrowRight() {
      setTimeOffset(o => o + 1);
    },
    onEnter() {
      const ch = channels[focusedRow];
      if (ch) onPlay(ch);
    },
    onBack,
  });

  function formatColTime(offset: number): string {
    const t = new Date(viewStart.getTime() + offset * 30 * 60 * 1000);
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const COLS = 6;
  const timeSlots = Array.from({ length: COLS }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>TV Guide</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => setTimeOffset(o => o - 1)}>◀</button>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', minWidth: 120, textAlign: 'center' }}>
            {viewStart.toLocaleDateString()} {formatColTime(0)}
          </span>
          <button className="btn btn-ghost" onClick={() => setTimeOffset(o => o + 1)}>▶</button>
          <button className="btn btn-surface" onClick={onBack} style={{ marginLeft: '0.5rem', fontSize: '0.875rem' }}>← Back</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div className="spinner" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, overflow: 'hidden' }}>
          {/* Time header */}
          <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(${COLS}, 1fr)`, gap: '0.375rem' }}>
            <div />
            {timeSlots.map(i => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--color-text-muted)', padding: '0.25rem 0' }}>
                {formatColTime(i)}
              </div>
            ))}
          </div>

          {/* Channel rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, overflowY: 'auto' }}>
            {channels.slice(0, 12).map((ch, rowIdx) => (
              <div
                key={ch.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `160px repeat(${COLS}, 1fr)`,
                  gap: '0.375rem',
                  background: rowIdx === focusedRow ? 'rgba(255,106,61,0.08)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.5rem',
                  border: rowIdx === focusedRow ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'background 150ms, border-color 150ms',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ch.name}
                </div>
                {timeSlots.map(slot => {
                  const ev = epgEvents.find(e =>
                    e.channelId === ch.id &&
                    new Date(e.startTime) <= new Date(viewStart.getTime() + (slot + 0.5) * 30 * 60 * 1000) &&
                    new Date(e.endTime) > new Date(viewStart.getTime() + slot * 30 * 60 * 1000)
                  );
                  return (
                    <div
                      key={slot}
                      style={{
                        height: 40,
                        background: ev ? 'var(--color-surface-2)' : 'var(--color-surface)',
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 0.375rem',
                        fontSize: '0.625rem',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        cursor: 'pointer',
                        border: ev?.catchup ? '1px solid var(--color-accent)' : '1px solid transparent',
                      }}
                      onClick={() => ev && onPlay(ch)}
                    >
                      {ev?.title || ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Player ──────────────────────────────────────────────────────────────────
function PlayerScreen({
  channel,
  onBack,
}: {
  channel: Channel;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [playing, setPlaying] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playStream } = useNativePlayer();

  useEffect(() => {
    let cancelled = false;
    async function loadAndPlay() {
      try {
        // Try Marvin channel detail first, fall back to placeholder
        const deviceId2 = localStorage.getItem('tv_device_id2') || '';
        const token = localStorage.getItem('tv_token') || '';
        const ip = '127.0.0.1';

        let streamUrl = `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`; // fallback test stream

        try {
          const info = await api.getChannelStream(token, {
            ip, deviceid: deviceId2, channel: channel.id, type: 'hls',
          }) as any;
          if (info?.resultCode === 0 && info.resultObj?.src) {
            streamUrl = info.resultObj.src;
          }
        } catch { /* use fallback */ }

        if (cancelled) return;
        await playStream({ src: streamUrl, type: 'application/x-mpegURL' }, undefined, videoRef.current || undefined);
        setPlaying(true);
      } catch (e) {
        console.error('Play error:', e);
      }
    }
    loadAndPlay();
    return () => { cancelled = true; };
  }, [channel]);

  function showControlsTemporarily() {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  }

  useTVRemote({
    onBack() { onBack(); },
    onPlayPause() {
      if (videoRef.current?.paused) {
        videoRef.current.play();
        setPlaying(true);
      } else {
        videoRef.current?.pause();
        setPlaying(false);
      }
      showControlsTemporarily();
    },
    onArrowLeft() {
      if (videoRef.current) videoRef.current.currentTime -= 10;
      showControlsTemporarily();
    },
    onArrowRight() {
      if (videoRef.current) videoRef.current.currentTime += 10;
      showControlsTemporarily();
    },
    onExit() { onBack(); },
  });

  return (
    <div
      className="player-container"
      onMouseMove={showControlsTemporarily}
      onClick={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
        autoPlay
        onTimeUpdate={() => showControlsTemporarily()}
      />

      {showControls && (
        <div className="player-overlay">
          {/* Top info */}
          <div className="player-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.25rem 0.5rem', minHeight: 36, fontSize: '0.875rem' }}>
              ← Back
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{channel.name}</div>
              {channel.currentProgram && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {channel.currentProgram.title}
                </div>
              )}
            </div>
          </div>

          {/* Bottom controls */}
          <div className="player-controls" style={{ justifyContent: 'center' }}>
            <button
              className="btn btn-surface"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 30;
              }}
              style={{ padding: '0.5rem 0.75rem', minHeight: 44, fontSize: '0.875rem' }}
            >
              -30s
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (videoRef.current?.paused) videoRef.current.play();
                else videoRef.current?.pause();
              }}
              style={{ padding: '0.5rem 1.5rem', minHeight: 44 }}
            >
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              className="btn btn-surface"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 30;
              }}
              style={{ padding: '0.5rem 0.75rem', minHeight: 44, fontSize: '0.875rem' }}
            >
              +30s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Demo Data ───────────────────────────────────────────────────────────────
const DEMO_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'BBC One', category: 'News', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/BBC_Old_Logo.png' },
  { id: 'ch2', name: 'CNN', category: 'News', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/CNN_logo_Accepted_2016.png' },
  { id: 'ch3', name: 'Sky Sports', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Sky_Sports_logo_2017.svg' },
  { id: 'ch4', name: 'Eurosport', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Eurosport_Logo.svg' },
  { id: 'ch5', name: 'HBO', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_logo_2021.svg' },
  { id: 'ch6', name: 'Netflix', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { id: 'ch7', name: 'National Geographic', category: 'Documentary', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg' },
  { id: 'ch8', name: 'Discovery', category: 'Documentary', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Discovery_Channel_Logo.svg' },
];

// ─── Main App ────────────────────────────────────────────────────────────────
export default function TVAppPage() {
  const [screen, setScreen] = useState<Screen>('activation');
  const [token, setToken] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  useEffect(() => {
    setDeviceId(generateDeviceId());

    // Check if already activated
    const savedToken = localStorage.getItem('tv_token');
    const savedDeviceId2 = localStorage.getItem('tv_device_id2');
    if (savedToken && savedDeviceId2) {
      setToken(savedToken);
      setScreen('home');
    }
  }, []);

  function onActivated(newToken: string, newDeviceId: string) {
    setToken(newToken);
    setScreen('home');
  }

  return (
    <div className="app-layout">
      <div className="app-main">
        {screen === 'activation' && (
          <ActivationScreen
            deviceId={deviceId}
            onActivated={onActivated}
          />
        )}

        {screen === 'home' && (
          <HomeScreen
            token={token}
            onPlay={(ch) => { setCurrentChannel(ch); setScreen('player'); }}
            onOpenEPG={() => setScreen('epg')}
          />
        )}

        {screen === 'epg' && (
          <EPGScreen
            channels={DEMO_CHANNELS}
            token={token}
            onPlay={(ch) => { setCurrentChannel(ch); setScreen('player'); }}
            onBack={() => setScreen('home')}
          />
        )}

        {screen === 'player' && currentChannel && (
          <PlayerScreen
            channel={currentChannel}
            onBack={() => setScreen('home')}
          />
        )}
      </div>
    </div>
  );
}