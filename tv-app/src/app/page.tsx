'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { initSpatialNavigation, FocusContext, useFocusable, pause, resume } from '../lib/spatial-nav';
import type { Channel, EPGEvent, Screen } from '../lib/types';
import * as api from '../lib/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateDeviceId(): string {
  if (typeof window === 'undefined') return 'web-' + Math.random().toString(36).slice(2);
  const stored = localStorage.getItem('tv_device_id');
  if (stored) return stored;
  const id = 'web-' + Math.random().toString(36).slice(2);
  localStorage.setItem('tv_device_id', id);
  return id;
}

// ─── Focusable Button Component ──────────────────────────────────────────────
function FocusButton({ 
  children, 
  focusKey, 
  onClick, 
  className = '',
  variant = 'primary',
  disabled = false 
}: { 
  children: React.ReactNode; 
  focusKey: string; 
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onClick });
  
  const baseClasses = 'flex items-center justify-center gap-3 rounded-lg font-label-lg transition-all duration-150 cursor-pointer';
  const variantClasses = {
    primary: `bg-secondary text-white hover:bg-secondary/90`,
    secondary: `bg-primary-container text-on-primary-container hover:brightness-110`,
    ghost: `bg-transparent border border-outline hover:bg-white/5`,
  };
  const focusClasses = focused && !disabled ? 'shadow-focus-glow scale-[1.02]' : '';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';
  
  return (
    <div
      ref={ref}
      onClick={disabled ? undefined : onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${focusClasses} ${disabledClasses} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Focusable Input Component ───────────────────────────────────────────────
function FocusInput({
  focusKey,
  placeholder,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  focusKey: string;
  placeholder?: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  className?: string;
}) {
  const { ref, focused } = useFocusable({ focusKey });
  
  return (
    <div
      ref={ref}
      className={`
        relative rounded-lg border bg-surface-container-lowest transition-all
        ${focused ? 'border-focus-glow shadow-focus-glow' : 'border-outline-variant'}
        ${className}
      `}
    >
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none py-4 px-5 text-lg text-on-surface focus:ring-0 outline-none"
      />
    </div>
  );
}

// ─── Screen 1: Login (service_selection_login) ────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [mode, setMode] = useState<'access-code' | 'provider'>('access-code');
  const [accessCode, setAccessCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamPort, setXtreamPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccessCodeLogin = async () => {
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.authAccessCode(accessCode);
      if (result.token) {
        localStorage.setItem('tv_token', result.token);
        localStorage.setItem('tv_channels', JSON.stringify(result.channels || []));
        onLogin(result.token);
      } else {
        setError(result.error || 'Invalid access code');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }
    setLoading(false);
  };

  const handleProviderLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const host = xtreamHost || 'localhost';
      const port = xtreamPort || '8080';
      const result = await api.authProviderLogin(host, port, username, password);
      if (result.token) {
        localStorage.setItem('tv_token', result.token);
        localStorage.setItem('tv_channels', JSON.stringify(result.channels || []));
        onLogin(result.token);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }
    setLoading(false);
  };

  return (
    <FocusContext.Provider value="login">
      <div className="fixed inset-0 z-0 nebula-bg">
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-margin-tv">
        {/* Brand Header */}
        <header className="mb-16 text-center">
          <h1 className="font-headline-lg text-headline-lg text-primary-fixed italic tracking-tighter mb-2">
            Cosmos IPTV
          </h1>
          <p className="font-label-lg text-label-lg text-on-surface-variant uppercase tracking-[0.2em]">
            Cinematic Streaming Experience
          </p>
        </header>

        {/* Selection Layout (Bento-style Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter-tv w-full max-w-6xl">
          {/* Access Code Section */}
          <div className="glass-panel rounded-xl p-10 flex flex-col transition-all duration-300 hover:bg-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary-container/20 rounded-lg">
                <span className="material-symbols-outlined text-primary-container text-4xl">location_on</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Enter Access Code</h2>
                <p className="text-on-surface-variant">For location-based M3U subscriptions</p>
              </div>
            </div>
            
            <div className="mt-auto">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-4 uppercase">Unique Access Key</label>
              <FocusInput
                focusKey="login-access-code"
                placeholder="e.g. COSMOS-772-X"
                value={accessCode}
                onChange={setAccessCode}
                className="mb-6"
              />
              <FocusButton
                focusKey="login-connect-btn"
                onClick={handleAccessCodeLogin}
                variant="primary"
                className="w-full py-5"
                disabled={loading}
              >
                <span>CONNECT TO SERVER</span>
                <span className="material-symbols-outlined">rocket_launch</span>
              </FocusButton>
            </div>
          </div>

          {/* Provider Login Section */}
          <div className="glass-panel rounded-xl p-10 flex flex-col transition-all duration-300 hover:bg-white/5">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-secondary-container/20 rounded-lg">
                <span className="material-symbols-outlined text-secondary text-4xl">vpn_key</span>
              </div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Provider Login</h2>
                <p className="text-on-surface-variant">Use your API account credentials</p>
              </div>
            </div>
            
            <div className="space-y-6 mt-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase">Host</label>
                  <FocusInput
                    focusKey="login-xtream-host"
                    placeholder="Host"
                    value={xtreamHost}
                    onChange={setXtreamHost}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase">Port</label>
                  <FocusInput
                    focusKey="login-xtream-port"
                    placeholder="8080"
                    value={xtreamPort}
                    onChange={setXtreamPort}
                  />
                </div>
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase">Username</label>
                <FocusInput
                  focusKey="login-username"
                  placeholder="Enter username"
                  value={username}
                  onChange={setUsername}
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2 uppercase">Password</label>
                <FocusInput
                  focusKey="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  type="password"
                />
              </div>
              <FocusButton
                focusKey="login-authorize-btn"
                onClick={handleProviderLogin}
                variant="secondary"
                className="w-full py-5"
                disabled={loading}
              >
                <span>AUTHORIZE ACCOUNT</span>
                <span className="material-symbols-outlined">verified_user</span>
              </FocusButton>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-8 glass-panel rounded-lg p-4 border border-error/50 bg-error-container/20">
            <p className="text-error text-center font-label-lg">{error}</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 flex items-center gap-12 text-on-surface-variant font-label-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>System v2.4.0 Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">public</span>
            <span>Server Region: North America</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            <span className="border-b border-transparent hover:border-on-surface-variant cursor-pointer transition-all">Contact Support</span>
          </div>
        </footer>
      </main>
    </FocusContext.Provider>
  );
}

// ─── Screen 2: Live TV Player (live_tv_player_epg_1) ────────────────────────
function LiveTVScreen({ 
  channels, 
  favorites, 
  onToggleFavorite, 
  onOpenConfig,
  onOpenEPG,
}: { 
  channels: Channel[]; 
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onOpenConfig: () => void;
  onOpenEPG: () => void;
}) {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Favorites', ...new Set(channels.map(c => c.category || 'Other'))];
  
  const filteredChannels = channels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || 
      (activeCategory === 'Favorites' && favorites.includes(ch.id)) ||
      ch.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <FocusContext.Provider value="player">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-[96px] hover:w-[280px] transition-all duration-300 bg-transparent backdrop-blur-xl border-r border-white/10 flex flex-col py-margin-tv z-50 group">
          <div className="px-6 mb-12 flex items-center gap-4 overflow-hidden">
            <span className="material-symbols-outlined text-primary-fixed text-4xl flex-shrink-0">rocket_launch</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h1 className="font-headline-lg text-headline-lg text-primary-fixed italic whitespace-nowrap">Cosmos IPTV</h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Premium Plan</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl text-primary-fixed border-l-4 border-primary-fixed bg-primary/10 transition-all duration-200">
              <span className="material-symbols-outlined text-2xl">live_tv</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Live TV</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed transition-all duration-200 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined text-2xl">movie</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Movies</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed transition-all duration-200 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined text-2xl">tv</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Series</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed transition-all duration-200 cursor-pointer" onClick={onOpenConfig}>
              <span className="material-symbols-outlined text-2xl">settings</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Settings</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-[96px] h-screen flex flex-row overflow-hidden flex-1">
          {/* Channel List Panel */}
          <section className="w-[400px] flex-shrink-0 flex flex-col bg-surface-container-lowest/50 backdrop-blur-md border-r border-white/5">
            <div className="p-8">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels..."
                  className="w-full bg-surface-container-highest/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed outline-none transition-all text-on-surface placeholder:text-outline/50"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="px-6 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-label-sm whitespace-nowrap transition-all ${
                    activeCategory === cat 
                      ? 'bg-primary-container text-on-primary-container' 
                      : 'bg-white/5 text-on-surface-variant hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Channel List */}
            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-12">
              {filteredChannels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  focusKey={`channel-${channel.id}`}
                  isFavorite={favorites.includes(channel.id)}
                  onSelect={() => setCurrentChannel(channel)}
                  onToggleFavorite={() => onToggleFavorite(channel.id)}
                  isActive={currentChannel?.id === channel.id}
                />
              ))}
            </div>
          </section>

          {/* Player Section */}
          <section className="flex-1 relative flex flex-col overflow-hidden">
            {/* Video Player */}
            <div className="flex-1 relative group cursor-pointer overflow-hidden">
              {currentChannel ? (
                <>
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-8xl text-primary-fixed/50">live_tv</span>
                      <p className="mt-4 text-primary-fixed text-xl font-label-lg">{currentChannel.name}</p>
                      {currentChannel.currentProgram && (
                        <p className="text-on-surface-variant mt-2">{currentChannel.currentProgram.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-24 h-24 rounded-full bg-primary-fixed/20 backdrop-blur-md border border-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary-fixed text-6xl">play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute top-8 left-8 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="font-label-lg text-label-lg text-white">
                      Live: {currentChannel.name}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-surface-container flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-8xl text-on-surface-variant/30">tv</span>
                    <p className="mt-4 text-on-surface-variant text-xl">Select a channel to watch</p>
                  </div>
                </div>
              )}
            </div>

            {/* EPG Overlay */}
            <div className="glass-panel p-8 border-t border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-8">
                  <h2 className="font-headline-md text-headline-md text-on-surface">EPG Guide</h2>
                  <div className="flex items-center gap-4 bg-white/5 p-1 rounded-lg">
                    <button className="px-4 py-2 bg-primary-container text-on-primary-container rounded-md font-label-lg text-label-lg">Today</button>
                    <button className="px-4 py-2 hover:bg-white/5 rounded-md font-label-lg text-label-lg transition-colors">Tomorrow</button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="w-12 h-12 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">skip_previous</span>
                  </button>
                  <button className="w-12 h-12 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined">skip_next</span>
                  </button>
                  <button onClick={onOpenEPG} className="px-6 py-3 glass-panel hover:bg-white/10 rounded-full font-label-lg transition-colors">
                    Full Guide
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-4 h-[200px] overflow-y-auto pr-4">
                <div className="flex flex-col gap-2">
                  {['20:00', '20:30', '21:00', '21:30', '22:00'].map(time => (
                    <div key={time} className="h-16 flex items-center px-4 font-label-lg text-label-lg text-on-surface-variant bg-white/5 rounded-lg">
                      {time}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2 h-16">
                    <div className="w-2/3 bg-primary-fixed/20 border border-primary-fixed/50 rounded-lg p-3 flex flex-col justify-center">
                      <p className="font-label-lg text-label-lg text-primary-fixed truncate">Live Program</p>
                      <p className="text-[10px] text-on-surface-variant">20:00 - 22:30</p>
                    </div>
                    <div className="w-1/3 glass-panel rounded-lg p-3 flex flex-col justify-center opacity-50">
                      <p className="font-label-lg text-label-lg truncate">Next Program</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* FAB */}
        <div className="fixed bottom-margin-tv right-margin-tv z-50 flex flex-col gap-4">
          <button className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full shadow-2xl flex items-center justify-center focus-glow transition-all active:scale-95 group">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Channel Card Component ──────────────────────────────────────────────────
function ChannelCard({ 
  channel, 
  focusKey, 
  isFavorite, 
  onSelect, 
  onToggleFavorite,
  isActive,
}: { 
  channel: Channel; 
  focusKey: string;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  isActive: boolean;
}) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onSelect });
  
  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={`
        group/channel p-4 rounded-xl glass-panel cursor-pointer transition-all duration-200 
        flex gap-4 border-2
        ${isActive ? 'border-primary-fixed bg-primary/10' : 'border-transparent hover:bg-white/5'}
        ${focused ? 'shadow-focus-glow scale-[1.02]' : ''}
      `}
    >
      <div className="w-24 h-14 rounded-lg bg-surface-container-high overflow-hidden relative flex-shrink-0">
        {channel.logo ? (
          <img src={channel.logo} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary-fixed font-bold text-xl">
            {channel.name.charAt(0)}
          </div>
        )}
        {channel.currentProgram && (
          <div className="absolute bottom-1 right-1 px-1 bg-error rounded text-[10px] font-bold text-white uppercase">Live</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-label-lg text-label-lg truncate text-on-surface">{channel.name}</h3>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="text-outline hover:text-yellow-400 transition-colors"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
              star
            </span>
          </button>
        </div>
        {channel.currentProgram && (
          <p className="text-label-sm text-on-surface-variant truncate">{channel.currentProgram.title}</p>
        )}
        {channel.currentProgram && (
          <div className="mt-2 w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-primary-fixed" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Screen 3: M3U Config (location_m3u_configuration) ───────────────────────
function ConfigScreen({ onBack }: { onBack: () => void }) {
  const [m3uUrl, setM3uUrl] = useState('');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamPort, setXtreamPort] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveM3U = async () => {
    if (!m3uUrl.trim()) return;
    setSaving(true);
    try {
      await api.configM3U(m3uUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save M3U config:', e);
    }
    setSaving(false);
  };

  const handleSaveXtream = async () => {
    if (!xtreamHost.trim() || !xtreamUsername.trim()) return;
    setSaving(true);
    try {
      await api.configXtream(xtreamHost, xtreamPort || '8080', xtreamUsername, xtreamPassword);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save Xtream config:', e);
    }
    setSaving(false);
  };

  return (
    <FocusContext.Provider value="config">
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <aside className="w-[280px] bg-surface-container-lowest border-r border-outline-variant flex flex-col">
          <div className="p-6 border-b border-outline-variant">
            <span className="font-headline-md text-headline-md text-secondary font-bold">Cosmos Admin</span>
            <span className="text-on-surface-variant text-sm block mt-1">v2.4.0</span>
          </div>
          
          <nav className="flex-1 p-4 flex flex-col gap-1">
            <button 
              onClick={onBack}
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-variant/50 transition-all duration-150"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back to Player</span>
            </button>
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg text-secondary-fixed font-bold border-l-4 border-secondary-container bg-secondary-container/5">
              <span className="material-symbols-outlined">map</span>
              <span>Location Management</span>
            </div>
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-variant/50 transition-all duration-150 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined">group</span>
              <span>User Management</span>
            </div>
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-variant/50 transition-all duration-150 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined">payments</span>
              <span>Revenue</span>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-margin-admin">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Location & M3U Config</h1>
              <p className="text-on-surface-variant max-w-2xl font-body-md">
                Configure geographic access points and synchronize master playlists across your global network infrastructure.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="bg-surface-container-high px-6 py-2.5 rounded-lg border border-outline-variant font-label-lg text-on-surface hover:bg-surface-container-highest transition-colors">
                Export Config
              </button>
              <button className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-lg font-label-lg shadow-lg hover:brightness-110 active:scale-95 transition-all">
                Create Location
              </button>
            </div>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-12 gap-gutter-admin">
            {/* Stats Cards */}
            <div className="col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-primary/10 rounded-lg text-primary">
                    <span className="material-symbols-outlined">public</span>
                  </span>
                  <span className="text-primary text-sm font-label-lg">+2 New</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">14 Active</h3>
                <p className="text-on-surface-variant font-label-sm">Global Service Locations</p>
              </div>
              <div className="mt-8 pt-4 border-t border-outline-variant/30 flex justify-between">
                <span className="text-on-surface-variant text-sm">Uptime: 99.98%</span>
                <span className="text-primary-fixed text-sm font-bold">Details</span>
              </div>
            </div>

            <div className="col-span-4 glass-panel p-6 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="p-2 bg-secondary/10 rounded-lg text-secondary">
                    <span className="material-symbols-outlined">sync_alt</span>
                  </span>
                  <span className="text-secondary text-sm font-label-lg">Stable</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface">1,242 Ch</h3>
                <p className="text-on-surface-variant font-label-sm">Total Synced Streams</p>
              </div>
              <div className="mt-8 pt-4 border-t border-outline-variant/30 flex justify-between">
                <span className="text-on-surface-variant text-sm">Last sync: 4m ago</span>
                <span className="text-secondary-fixed text-sm font-bold">Logs</span>
              </div>
            </div>

            <div className="col-span-4 glass-panel p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-8xl">signal_cellular_alt</span>
              </div>
              <div className="relative z-10">
                <h4 className="text-on-surface-variant font-label-sm uppercase tracking-widest mb-4">Network Load</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface">Traffic (Global)</span>
                      <span className="text-primary">68%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className="w-[68%] h-full bg-primary" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface">M3U Response</span>
                      <span className="text-secondary">420ms</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className="w-[45%] h-full bg-secondary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* M3U Configuration */}
            <div className="col-span-12 lg:col-span-6 glass-panel rounded-xl p-8">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">M3U Playlist URL</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-2">Playlist URL</label>
                  <FocusInput
                    focusKey="config-m3u-url"
                    placeholder="https://example.com/playlist.m3u8"
                    value={m3uUrl}
                    onChange={setM3uUrl}
                    className="w-full"
                  />
                </div>
                <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg flex items-start gap-4">
                  <span className="material-symbols-outlined text-secondary">info</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Changes to master configuration will propagate to all active locations during their next scheduled sync interval.
                  </p>
                </div>
                <div className="pt-4 flex justify-end gap-4">
                  <FocusButton
                    focusKey="config-discard-m3u"
                    onClick={() => setM3uUrl('')}
                    variant="ghost"
                    className="px-8 py-3"
                  >
                    Discard
                  </FocusButton>
                  <FocusButton
                    focusKey="config-save-m3u"
                    onClick={handleSaveM3U}
                    variant="primary"
                    className="px-8 py-3 bg-secondary"
                    disabled={saving || !m3uUrl.trim()}
                  >
                    {saving ? 'Saving...' : 'Save M3U'}
                  </FocusButton>
                </div>
              </div>
            </div>

            {/* Xtream Configuration */}
            <div className="col-span-12 lg:col-span-6 glass-panel rounded-xl p-8">
              <h3 className="font-headline-md text-headline-md text-on-surface mb-6">Xtream Codes Connection</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-2">Host</label>
                    <FocusInput
                      focusKey="config-xtream-host"
                      placeholder="panel.example.com"
                      value={xtreamHost}
                      onChange={setXtreamHost}
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-2">Port</label>
                    <FocusInput
                      focusKey="config-xtream-port"
                      placeholder="8080"
                      value={xtreamPort}
                      onChange={setXtreamPort}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-2">Username</label>
                  <FocusInput
                    focusKey="config-xtream-username"
                    placeholder="your_username"
                    value={xtreamUsername}
                    onChange={setXtreamUsername}
                  />
                </div>
                <div>
                  <label className="block text-on-surface-variant text-xs font-label-lg uppercase tracking-wider mb-2">Password</label>
                  <FocusInput
                    focusKey="config-xtream-password"
                    placeholder="••••••••"
                    value={xtreamPassword}
                    onChange={setXtreamPassword}
                    type="password"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-4">
                  <FocusButton
                    focusKey="config-discard-xtream"
                    onClick={() => { setXtreamHost(''); setXtreamPort(''); setXtreamUsername(''); setXtreamPassword(''); }}
                    variant="ghost"
                    className="px-8 py-3"
                  >
                    Discard
                  </FocusButton>
                  <FocusButton
                    focusKey="config-save-xtream"
                    onClick={handleSaveXtream}
                    variant="primary"
                    className="px-8 py-3 bg-secondary"
                    disabled={saving || !xtreamHost.trim() || !xtreamUsername.trim()}
                  >
                    {saving ? 'Connecting...' : 'Connect Xtream'}
                  </FocusButton>
                </div>
              </div>
            </div>
          </div>

          {/* Success Toast */}
          {saved && (
            <div className="fixed bottom-8 right-8 glass-panel rounded-lg p-4 border border-primary/50 bg-primary-container/20">
              <p className="text-primary-fixed font-label-lg">Configuration saved successfully!</p>
            </div>
          )}
        </main>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Screen 4: Split Pane EPG (epg_variant_split_pane_layout) ────────────────
function SplitPaneEPG({ 
  channels, 
  favorites, 
  onToggleFavorite, 
  onBack,
}: { 
  channels: Channel[]; 
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}) {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  return (
    <FocusContext.Provider value="epg-split">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-full w-[96px] hover:w-[280px] transition-all duration-300 bg-transparent backdrop-blur-xl border-r border-white/10 flex flex-col py-margin-tv z-50 group">
          <div className="px-6 mb-12 flex items-center gap-4 overflow-hidden">
            <span className="material-symbols-outlined text-primary-fixed text-4xl flex-shrink-0">rocket_launch</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h1 className="font-headline-lg text-headline-lg text-primary-fixed italic whitespace-nowrap">Cosmos IPTV</h1>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Premium Plan</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl text-primary-fixed border-l-4 border-primary-fixed bg-primary/10 transition-all duration-200 cursor-pointer" onClick={onBack}>
              <span className="material-symbols-outlined text-2xl">live_tv</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Live TV</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed transition-all duration-200 cursor-not-allowed opacity-50">
              <span className="material-symbols-outlined text-2xl">movie</span>
              <span className="font-label-lg text-label-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Movies</span>
            </div>
          </nav>
        </aside>

        {/* Main Content - Split Pane */}
        <main className="ml-[96px] h-screen flex flex-row overflow-hidden flex-1">
          {/* Left Column - Channel List (40%) */}
          <section className="w-[40%] flex-shrink-0 flex flex-col bg-surface-container-lowest/50 backdrop-blur-md border-r border-white/5">
            <div className="p-8">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input
                  type="text"
                  placeholder="Search channels..."
                  className="w-full bg-surface-container-highest/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed outline-none transition-all text-on-surface placeholder:text-outline/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-12">
              {channels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  focusKey={`epg-channel-${channel.id}`}
                  isFavorite={favorites.includes(channel.id)}
                  onSelect={() => setCurrentChannel(channel)}
                  onToggleFavorite={() => onToggleFavorite(channel.id)}
                  isActive={currentChannel?.id === channel.id}
                />
              ))}
            </div>
          </section>

          {/* Right Side - Player and EPG */}
          <section className="flex-1 flex flex-col overflow-hidden">
            {/* Video Player (Top) */}
            <div className="flex-1 relative group cursor-pointer overflow-hidden">
              {currentChannel ? (
                <>
                  <div className="w-full h-full bg-black flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-8xl text-primary-fixed/50">live_tv</span>
                      <p className="mt-4 text-primary-fixed text-xl font-label-lg">{currentChannel.name}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary-fixed/20 backdrop-blur-md border border-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary-fixed text-5xl">play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute top-6 left-6 flex items-center gap-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="font-label-sm text-label-sm text-white">Live: {currentChannel.name}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-surface-container flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-8xl text-on-surface-variant/30">tv</span>
                    <p className="mt-4 text-on-surface-variant text-xl">Select a channel</p>
                  </div>
                </div>
              )}
            </div>

            {/* Integrated EPG (Bottom) */}
            <div className="h-[350px] glass-panel p-6 border-t border-white/10 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <h2 className="font-headline-md text-headline-md text-on-surface">EPG Guide</h2>
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                    <button className="px-4 py-1.5 bg-primary-container text-on-primary-container rounded-md font-label-sm text-label-sm">Today</button>
                    <button className="px-4 py-1.5 hover:bg-white/5 rounded-md font-label-sm text-label-sm transition-colors text-on-surface-variant">Tomorrow</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="w-10 h-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-xl">skip_previous</span>
                  </button>
                  <button className="w-10 h-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-xl">skip_next</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <div className="flex flex-col gap-2">
                    {['20:00', '20:30', '21:00', '21:30', '22:00'].map(time => (
                      <div key={time} className="h-16 flex items-center px-3 font-label-sm text-label-sm text-on-surface-variant bg-white/5 rounded-lg">
                        {time}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2 h-16">
                      <div className="w-2/3 bg-primary-fixed/20 border border-primary-fixed/50 rounded-lg p-3 flex flex-col justify-center">
                        <p className="font-label-lg text-label-lg text-primary-fixed truncate">Live Program</p>
                        <p className="text-[10px] text-on-surface-variant">20:00 - 22:30</p>
                      </div>
                      <div className="w-1/3 glass-panel rounded-lg p-3 flex flex-col justify-center opacity-50">
                        <p className="font-label-lg text-label-lg truncate">Next</p>
                      </div>
                    </div>
                    <div className="flex gap-2 h-16">
                      <div className="w-full glass-panel rounded-lg p-3 flex flex-col justify-center">
                        <p className="font-label-lg text-label-lg text-on-surface truncate">Another Show</p>
                        <p className="text-[10px] text-on-surface-variant">20:30 - 21:00</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* FAB */}
        <div className="fixed bottom-margin-tv right-margin-tv z-50 flex flex-col gap-4">
          <button className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full shadow-2xl flex items-center justify-center focus-glow transition-all active:scale-95 group">
            <span className="material-symbols-outlined text-3xl">add</span>
          </button>
        </div>
      </div>
    </FocusContext.Provider>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────
const DEMO_CHANNELS: Channel[] = [
  { id: 'ch1', name: 'Sky Sports Main', category: 'Sports', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Sky_Sports_logo_2017.svg', currentProgram: { title: 'Premier League: MCI vs ARS', startTime: '', endTime: '' } },
  { id: 'ch2', name: 'Cosmos News 24', category: 'News', currentProgram: { title: 'Global Market Updates', startTime: '', endTime: '' } },
  { id: 'ch3', name: 'Cinema Premium', category: 'Entertainment', currentProgram: { title: 'Interstellar (2014)', startTime: '', endTime: '' } },
  { id: 'ch4', name: 'Nature Wild HD', category: 'Documentary', currentProgram: { title: 'The Great Migration', startTime: '', endTime: '' } },
  { id: 'ch5', name: 'BBC One', category: 'News', currentProgram: { title: 'Evening News', startTime: '', endTime: '' } },
  { id: 'ch6', name: 'CNN International', category: 'News', currentProgram: { title: 'World Report', startTime: '', endTime: '' } },
];

export default function CosmosIPTV() {
  const [screen, setScreen] = useState<Screen>('login');
  const [token, setToken] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('tv_token');
    const storedChannels = localStorage.getItem('tv_channels');
    const storedFavorites = localStorage.getItem('tv_favorites');
    
    if (storedToken) {
      setToken(storedToken);
      setScreen('player');
    }
    if (storedChannels) {
      try {
        const parsed = JSON.parse(storedChannels);
        if (parsed.length > 0) setChannels(parsed);
      } catch {}
    }
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch {}
    }
  }, []);

  const handleLogin = useCallback((newToken: string) => {
    setToken(newToken);
    setScreen('player');
  }, []);

  const handleToggleFavorite = useCallback((channelId: string) => {
    setFavorites(prev => {
      const next = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];
      localStorage.setItem('tv_favorites', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tv_token');
    localStorage.removeItem('tv_device_id2');
    setToken(null);
    setScreen('login');
  }, []);

  return (
    <>
      {screen === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}
      
      {screen === 'player' && (
        <LiveTVScreen
          channels={channels}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onOpenConfig={() => setScreen('config')}
          onOpenEPG={() => setScreen('epg')}
        />
      )}
      
      {screen === 'config' && (
        <ConfigScreen onBack={() => setScreen('player')} />
      )}
      
      {screen === 'epg' && (
        <SplitPaneEPG
          channels={channels}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onBack={() => setScreen('player')}
        />
      )}
    </>
  );
}
