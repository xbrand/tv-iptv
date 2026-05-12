'use client';
import { useEffect, useCallback, useRef } from 'react';

export type TVKey =
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | 'Enter' | 'Backspace' | 'Escape'
  | 'MediaPlayPause' | 'MediaPlay' | 'MediaPause'
  | 'ChannelUp' | 'ChannelDown'
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'Play' | 'Pause' | 'Stop' | 'FastForward' | 'Rewind'
  | 'Info' | 'Guide' | 'Menu'
  | 'Exit' | 'Home';

export interface TVRemoteHandlers {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onBack?: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onDigit?: (d: string) => void;
  onPlayPause?: () => void;
  onInfo?: () => void;
  onExit?: () => void;
}

function keyToTVKey(key: string): TVKey | null {
  const map: Record<string, TVKey> = {
    ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
    Enter: 'Enter', Backspace: 'Backspace', Escape: 'Escape',
    MediaPlayPause: 'MediaPlayPause',
    ChannelUp: 'ChannelUp', ChannelDown: 'ChannelDown',
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    Play: 'Play', Pause: 'Pause', Stop: 'Stop',
    FastForward: 'FastForward', Rewind: 'Rewind',
    Info: 'Info', Guide: 'Guide', Menu: 'Menu',
    Exit: 'Exit', Home: 'Home',
  };
  return map[key] ?? null;
}

export function useTVRemote(handlers: TVRemoteHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKey = useCallback((e: KeyboardEvent) => {
    const key = keyToTVKey(e.key);
    if (!key) return;

    // Prevent default scroll behavior for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
    }

    switch (key) {
      case 'ArrowUp':       handlersRef.current.onArrowUp?.();       break;
      case 'ArrowDown':     handlersRef.current.onArrowDown?.();     break;
      case 'ArrowLeft':     handlersRef.current.onArrowLeft?.();     break;
      case 'ArrowRight':    handlersRef.current.onArrowRight?.();    break;
      case 'Enter':         handlersRef.current.onEnter?.();         break;
      case 'Backspace':
      case 'Escape':        handlersRef.current.onBack?.();          break;
      case 'ChannelUp':     handlersRef.current.onChannelUp?.();     break;
      case 'ChannelDown':   handlersRef.current.onChannelDown?.();   break;
      case 'MediaPlayPause':
      case 'Play':
      case 'Pause':         handlersRef.current.onPlayPause?.();     break;
      case 'Info':         handlersRef.current.onInfo?.();          break;
      case 'Exit':
      case 'Home':         handlersRef.current.onExit?.();          break;
      default:
        if (/^[0-9]$/.test(key)) handlersRef.current.onDigit?.(key);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}