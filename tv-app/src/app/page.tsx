'use client';
import { useState, useEffect, useRef } from 'react';
import { initSpatialNavigation, FocusContext, useFocusable, setFocus } from '../lib/spatial-nav';
import type { Channel, EPGEvent } from '../lib/types';
import * as api from '../lib/api';

// ─── Init once on mount ───────────────────────────────────────────────────────
// (SpatialNavigation.init moved into the main component below)

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

// ─── NumpadKey ───────────────────────────────────────────────────────────────
function NumpadKey({
  value,
  onPress,
  wide,
  action,
  focusKey,
}: {
  value: string;
  onPress: () => void;
  wide?: boolean;
  action?: boolean;
  focusKey: string;
}) {
  const { ref, focused } = useFocusable({ focusKey });
  return (
    <div
      ref={ref}
      onClick={onPress}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 64,
        background: action ? 'var(--color-primary)' : 'var(--color-surface-2)',
        border: `2px solid ${focused ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 10,
        fontSize: value === '⌫' ? '1.25rem' : '1.5rem',
        fontWeight: 600,
        color: action ? '#fff' : 'var(--color-text)',
        cursor: 'pointer',
        gridColumn: wide ? 'span 2' : undefined,
        transform: focused ? 'scale(1.04)' : 'scale(1)',
        boxShadow: focused ? '0 0 0 3px rgba(255,106,61,0.35), 0 0 20px rgba(255,106,61,0.2)' : 'none',
        transition: 'transform 150ms ease, border-color 150ms, box-shadow 150ms',
        userSelect: 'none',
      }}
    >
      {value}
    </div>
  );
}

// ─── ActivationScreen ────────────────────────────────────────────────────────
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
  const containerKey = 'activation';

  const FOCUS_KEYS = {
    registerBtn: 'activation-register-btn',
    codeDigit0: 'activation-digit-0',
    codeDigit1: 'activation-digit-1',
    codeDigit2: 'activation-digit-2',
    codeDigit3: 'activation-digit-3',
    codeDigit4: 'activation-digit-4',
    codeDigit5: 'activation-digit-5',
    activateBtn: 'activation-activate-btn',
    numpad0: 'numpad-0', numpad1: 'numpad-1', numpad2: 'numpad-2',
    numpad3: 'numpad-3', numpad4: 'numpad-4', numpad5: 'numpad-5',
    numpad6: 'numpad-6', numpad7: 'numpad-7', numpad8: 'numpad-8',
    numpad9: 'numpad-9', numpadBack: 'numpad-back',
  };

  // Container ref
  const { ref: containerRef } = useFocusable({ focusKey: containerKey, trackChildren: true });

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  function appendDigit(d: string) {
    const next = [...code];
    const empty = next.indexOf('');
    if (empty !== -1) { next[empty] = d; setCode(next); }
  }

  function backspace() {
    const lastFilled = [...code].reverse().findIndex(c => c !== '');
    if (lastFilled >= 0) {
      const idx = 5 - lastFilled;
      const next = [...code];
      next[idx] = '';
      setCode(next);
    }
  }

  async function handleRegister() {
    setRegistering(true);
    setErrorMsg('');
    try {
      const result = await api.registerDevice(deviceId, detectType()) as any;
      console.log('[TV-IPTV] register result:', result);
      if (result.deviceId && result.activationCode) {
        setDeviceId2(result.deviceId);
        setCode(result.activationCode.split(''));
      } else {
        setErrorMsg('No activation code returned — check backend is running on :3001');
      }
    } catch (e: any) {
      console.error('[TV-IPTV] register error:', e);
      setErrorMsg(e.message || 'Registration failed');
    }
    setRegistering(false);
  }

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

  function detectType(): string {
    if ('webOS' in (window as any)) return 'webos';
    if ('tizen' in (window as any)) return 'tizen';
    if (/Android TV|SHIELD/i.test(navigator.userAgent)) return 'android';
    return 'web';
  }

  // digit refs — called at consistent positions in hook order.
  // Hidden digit divs are registered with SN so layout is stable when they appear.
  const digit0 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit0, focusable: false });
  const digit1 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit1, focusable: false });
  const digit2 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit2, focusable: false });
  const digit3 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit3, focusable: false });
  const digit4 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit4, focusable: false });
  const digit5 = useFocusable({ focusKey: FOCUS_KEYS.codeDigit5, focusable: false });
  const digitRefs = [digit0, digit1, digit2, digit3, digit4, digit5];

  const { ref: registerRef, focused: registerFocused } = useFocusable({ focusKey: FOCUS_KEYS.registerBtn, focusable: !deviceId2 });
  const { ref: activateRef, focused: activateFocused } = useFocusable({
    focusKey: FOCUS_KEYS.activateBtn,
    focusable: !!(deviceId2 && code.every(c => c !== '')),
  });

  return (
    <FocusContext.Provider value={containerKey}>
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '2rem' }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>TV-IPTV</div>

        <div className="card" style={{ textAlign: 'center', minWidth: 400 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>Device ID</p>
          <p style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.1em', marginBottom: '1.5rem' }}>
            {formatDeviceId(deviceId)}
          </p>

          {!deviceId2 ? (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Enter the 6-digit activation code from the portal
              </p>
              <button
                ref={registerRef}
                className="btn btn-primary"
                onClick={handleRegister}
                disabled={registering}
                style={{
                  transform: registerFocused ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: registerFocused ? '0 0 0 3px rgba(255,106,61,0.35), 0 0 20px rgba(255,106,61,0.2)' : 'none',
                  transition: 'transform 150ms, box-shadow 150ms',
                }}
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
                  <div
                    key={i}
                    ref={digitRefs[i].ref}
                    className={`code-digit${d ? ' filled' : ''}`}
                    style={{
                      borderColor: digitRefs[i].focused ? 'var(--color-primary)' : d ? 'var(--color-primary)' : 'var(--color-border)',
                      background: digitRefs[i].focused ? 'rgba(255,106,61,0.1)' : d ? 'rgba(255,106,61,0.1)' : undefined,
                    }}
                  >
                    {d || '_'}
                  </div>
                ))}
              </div>

              <div className="numpad" style={{ margin: '0 auto 1.5rem' }}>
                {numpadKeys.map((k, i) => {
                  if (k === '') return <div key={i} />;
                  const fk = k === '⌫' ? FOCUS_KEYS.numpadBack : (FOCUS_KEYS as any)[`numpad${k}`];
                  return (
                    <NumpadKey
                      key={i}
                      value={k}
                      focusKey={fk}
                      action={k === '⌫'}
                      wide={k === '⌫'}
                      onPress={() => k === '⌫' ? backspace() : appendDigit(k)}
                    />
                  );
                })}
              </div>

              {status === 'error' && (
                <div className="callout callout-danger" style={{ marginBottom: '1rem', justifyContent: 'center' }}>
                  {errorMsg}
                </div>
              )}

              <button
                ref={activateRef}
                className="btn btn-primary"
                onClick={handleActivate}
                disabled={status === 'loading' || code.some(c => c === '')}
                style={{
                  width: '100%',
                  transform: activateFocused ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: activateFocused ? '0 0 0 3px rgba(255,106,61,0.35), 0 0 20px rgba(255,106,61,0.2)' : 'none',
                  transition: 'transform 150ms, box-shadow 150ms',
                }}
              >
                {status === 'loading' ? 'Activating...' : 'Activate'}
              </button>
            </>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── ChannelCard ─────────────────────────────────────────────────────────────
function ChannelCard({
  channel,
  focusKey,
  onSelect,
}: {
  channel: Channel;
  focusKey: string;
  onSelect: () => void;
}) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onSelect,
  });

  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem 0.75rem',
        background: focused ? 'rgba(255,106,61,0.08)' : 'var(--color-surface)',
        border: `2px solid ${focused ? 'var(--color-primary)' : 'transparent'}`,
        borderRadius: 16,
        cursor: 'pointer',
        transform: focused ? 'scale(1.04)' : 'scale(1)',
        boxShadow: focused ? '0 0 0 3px rgba(255,106,61,0.35), 0 0 20px rgba(255,106,61,0.2)' : 'none',
        transition: 'transform 150ms ease, border-color 150ms, box-shadow 150ms, background 150ms',
        minHeight: 100,
        minWidth: 100,
        position: 'relative',
      }}
    >
      {channel.logo ? (
        <img src={channel.logo} alt={channel.name} style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 6, background: 'var(--color-surface-2)', padding: 4 }} />
      ) : (
        <div style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-surface-2)', borderRadius: 6 }}>
          {channel.name.charAt(0)}
        </div>
      )}
      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.3, maxWidth: 90, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {channel.name}
      </span>
      {channel.currentProgram && (
        <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {channel.currentProgram.title}
        </span>
      )}
    </div>
  );
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────
const DEMO_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'BBC One', category: 'News', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/BBC_Old_Logo.png' },
  { id: 'ch2', name: 'CNN', category: 'News', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/CNN_logo_Accepted_2016.png' },
  { id: 'ch3', name: 'Sky Sports', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Sky_Sports_logo_2017.svg' },
  { id: 'ch4', name: 'Eurosport', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Eurosport_Logo.svg' },
  { id: 'ch5', name: 'HBO', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_logo_2021.svg' },
  { id: 'ch6', name: 'Netflix', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg' },
  { id: 'ch7', name: 'National Geographic', category: 'Documentary', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Natgeologo.svg' },
  { id: 'ch8', name: 'Discovery', category: 'Documentary', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Discovery_Channel_Logo.svg' },
  { id: 'ch9', name: 'BBC Two', category: 'News', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/BBC_Two_logo_2019.svg' },
  { id: 'ch10', name: 'ITV', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/ITV_logo_2019.svg' },
  { id: 'ch11', name: 'Channel 4', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Channel_4_logo_2016.svg' },
  { id: 'ch12', name: 'Five', category: 'Entertainment', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Channel_5_logo_2016.svg' },
];

function HomeScreen({
  token,
  onPlay,
  onOpenEPG,
}: {
  token: string;
  onPlay: (channel: Channel) => void;
  onOpenEPG: () => void;
}) {
  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [filtered, setFiltered] = useState<Channel[]>(DEMO_CHANNELS);
  const [categories, setCategories] = useState<string[]>(['All', 'Favorites', 'News', 'Sports', 'Entertainment', 'Documentary']);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const COLS = 4;
  const homeKey = 'home';

  useEffect(() => {
    const stored = localStorage.getItem('tv_favorites');
    if (stored) setFavorites(new Set(JSON.parse(stored)));
    loadChannels();
  }, []);

  async function loadChannels() {
    setLoading(true);
    try {
      const deviceId2 = localStorage.getItem('tv_device_id2') || '';
      const m3uText = await api.getM3UDevice(deviceId2);
      const parsed = parseM3U(m3uText);
      if (parsed.length > 0) {
        setChannels(parsed);
        setFiltered(parsed);
        const cats = ['All', 'Favorites', ...new Set(parsed.map(c => c.category || 'Other'))];
        setCategories(cats);
      }
    } catch { /* fall back to demo channels */ }
    setLoading(false);
  }

  function parseM3U(text: string): Channel[] {
    const lines = text.split('\n');
    const chs: Channel[] = [];
    let current: Partial<Channel> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF:')) {
        const nameMatch = trimmed.match(/tvg-name="([^"]*)"/);
        const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
        const groupMatch = trimmed.match(/group-title="([^"]*)"/);
        current = {
          id: nameMatch?.[1] || `ch-${chs.length + 1}`,
          name: nameMatch?.[1] || `Channel ${chs.length + 1}`,
          logo: logoMatch?.[1],
          category: groupMatch?.[1],
        };
      } else if (trimmed && !trimmed.startsWith('#')) {
        current.id = current.id || `ch-${chs.length + 1}`;
        chs.push(current as Channel);
        current = {};
      }
    }
    return chs;
  }

  function filterChannels(cat: string) {
    setActiveCategory(cat);
    if (cat === 'All') setFiltered(channels);
    else if (cat === 'Favorites') setFiltered(channels.filter(c => favorites.has(c.id)));
    else setFiltered(channels.filter(c => c.category === cat));
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

  const { ref: homeRef } = useFocusable({ focusKey: homeKey, trackChildren: true });
  const { ref: epgBtnRef, focused: epgBtnFocused } = useFocusable({ focusKey: 'home-epg-btn', onEnterPress: onOpenEPG });

  return (
    <FocusContext.Provider value={homeKey}>
      <div ref={homeRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>TV-IPTV</div>
          <button
            ref={epgBtnRef}
            onClick={onOpenEPG}
            style={{
              background: epgBtnFocused ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
              border: `1px solid ${epgBtnFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 10,
              padding: '0.5rem 1rem',
              color: 'var(--color-text)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transform: epgBtnFocused ? 'scale(1.04)' : 'scale(1)',
              boxShadow: epgBtnFocused ? '0 0 0 3px rgba(255,106,61,0.35)' : 'none',
              transition: 'all 150ms',
            }}
          >
            📺 Guide
          </button>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {categories.map(cat => {
            const catKey = `home-cat-${cat}`;
            const { ref: catRef, focused: catFocused } = useFocusable({ focusKey: catKey });
            return (
              <div
                key={cat}
                ref={catRef}
                onClick={() => filterChannels(cat)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: 999,
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  background: catFocused ? 'rgba(255,106,61,0.15)' : activeCategory === cat ? 'rgba(255,106,61,0.15)' : 'var(--color-surface-2)',
                  border: `1px solid ${catFocused ? 'var(--color-primary)' : activeCategory === cat ? 'var(--color-primary)' : 'transparent'}`,
                  color: catFocused ? 'var(--color-primary)' : activeCategory === cat ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transform: catFocused ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: catFocused ? '0 0 0 3px rgba(255,106,61,0.25)' : 'none',
                  transition: 'all 150ms',
                }}
              >
                {cat}
              </div>
            );
          })}
        </div>

        {/* Channel grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: '0.75rem',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '1rem',
        }}>
          {filtered.map((ch, i) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              focusKey={`home-channel-${i}`}
              onSelect={() => onPlay(ch)}
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
    </FocusContext.Provider>
  );
}

// ─── EPGScreen ──────────────────────────────────────────────────────────────
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
  const [timeOffset, setTimeOffset] = useState(0);
  const now = new Date();
  const baseTime = new Date(now.getTime() + timeOffset * 30 * 60 * 1000);
  const viewStart = new Date(baseTime);
  viewStart.setMinutes(0, 0, 0);

  const epgKey = 'epg';
  const { ref: epgRef } = useFocusable({ focusKey: epgKey, trackChildren: true });
  const { ref: backBtnRef, focused: backBtnFocused } = useFocusable({ focusKey: 'epg-back-btn', onEnterPress: onBack });

  useEffect(() => { loadEPG(); }, [timeOffset]);

  async function loadEPG() {
    setLoading(true);
    try {
      const data = await api.getEPG(token, {
        from: viewStart.toISOString(),
        to: new Date(viewStart.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      }) as any;
      setEpgEvents(data.events || data.epg || []);
    } catch { setEpgEvents([]); }
    setLoading(false);
  }

  function formatColTime(offset: number): string {
    const t = new Date(viewStart.getTime() + offset * 30 * 60 * 1000);
    return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const COLS = 6;
  const timeSlots = Array.from({ length: COLS }, (_, i) => i);

  return (
    <FocusContext.Provider value={epgKey}>
      <div ref={epgRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>TV Guide</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              ref={backBtnRef}
              onClick={onBack}
              style={{
                background: backBtnFocused ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                border: `1px solid ${backBtnFocused ? 'var(--color-primary)' : 'var(--color-border)'}`,
                borderRadius: 10,
                padding: '0.25rem 0.75rem',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transform: backBtnFocused ? 'scale(1.04)' : 'scale(1)',
                boxShadow: backBtnFocused ? '0 0 0 3px rgba(255,106,61,0.35)' : 'none',
                transition: 'all 150ms',
              }}
            >
              ← Back
            </button>
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
              {channels.slice(0, 12).map((ch, rowIdx) => {
                const rowKey = `epg-row-${rowIdx}`;
                const { ref: rowRef, focused: rowFocused } = useFocusable({
                  focusKey: rowKey,
                  onEnterPress: () => onPlay(ch),
                });
                return (
                  <div
                    key={ch.id}
                    ref={rowRef}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `160px repeat(${COLS}, 1fr)`,
                      gap: '0.375rem',
                      background: rowFocused ? 'rgba(255,106,61,0.08)' : 'transparent',
                      borderRadius: 6,
                      padding: '0.25rem 0.5rem',
                      border: `2px solid ${rowFocused ? 'var(--color-primary)' : 'transparent'}`,
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
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

// ─── PlayerScreen ─────────────────────────────────────────────────────────────
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

  const playerKey = 'player';
  const { ref: playerRef } = useFocusable({ focusKey: playerKey, trackChildren: true });
  const { ref: backBtnRef, focused: backBtnFocused } = useFocusable({ focusKey: 'player-back-btn', onEnterPress: onBack });

  useEffect(() => {
    let cancelled = false;
    async function loadAndPlay() {
      try {
        const deviceId2 = localStorage.getItem('tv_device_id2') || '';
        const token = localStorage.getItem('tv_token') || '';
        const streamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.src = streamUrl;
          videoRef.current.play().catch(console.error);
        }
        setPlaying(true);
      } catch (e) { console.error('Play error:', e); }
    }
    loadAndPlay();
    return () => { cancelled = true; };
  }, [channel]);

  function showControlsTemporarily() {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  }

  return (
    <FocusContext.Provider value={playerKey}>
      <div ref={playerRef} className="player-container" onClick={showControlsTemporarily}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          autoPlay
          onTimeUpdate={showControlsTemporarily}
        />

        {showControls && (
          <div className="player-overlay">
            {/* Top info */}
            <div className="player-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                ref={backBtnRef}
                onClick={onBack}
                style={{
                  background: backBtnFocused ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)',
                  border: `1px solid ${backBtnFocused ? 'var(--color-primary)' : 'transparent'}`,
                  borderRadius: 8,
                  padding: '0.25rem 0.5rem',
                  color: '#fff',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transform: backBtnFocused ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 150ms',
                }}
              >
                ← Back
              </button>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{channel.name}</div>
                {channel.currentProgram && (
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                    {channel.currentProgram.title}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom controls */}
            <div className="player-controls" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 30; }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                -30s
              </button>
              <button
                onClick={() => {
                  if (videoRef.current?.paused) videoRef.current.play();
                  else videoRef.current?.pause();
                }}
                style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '0.5rem 1.5rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
              >
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => { if (videoRef.current) videoRef.current.currentTime += 30; }}
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                +30s
              </button>
            </div>
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function TVAppPage() {
  const [screen, setScreen] = useState<Screen>('activation');
  const [token, setToken] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  useEffect(() => {
    setDeviceId(generateDeviceId());
    const savedToken = localStorage.getItem('tv_token');
    const savedDeviceId2 = localStorage.getItem('tv_device_id2');
    if (savedToken && savedDeviceId2) {
      setToken(savedToken);
      setScreen('home');
    }
    // initSpatialNavigation called synchronously at module level in lib/spatial-nav.ts
  }, []);

  function onActivated(newToken: string, newDeviceId: string) {
    setToken(newToken);
    setScreen('home');
  }

  function handlePlay(ch: Channel) {
    setCurrentChannel(ch);
    setScreen('player');
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
            onPlay={handlePlay}
            onOpenEPG={() => setScreen('epg')}
          />
        )}
        {screen === 'epg' && (
          <EPGScreen
            channels={DEMO_CHANNELS}
            token={token}
            onPlay={handlePlay}
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