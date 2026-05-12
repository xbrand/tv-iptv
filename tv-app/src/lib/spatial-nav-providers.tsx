'use client';
import { useEffect } from 'react';
import {
  SpatialNavigation as SN,
  FocusContext,
  useFocusable,
  setFocus,
  doesFocusableExist,
  getCurrentFocusKey,
  pause,
  resume,
  updateAllLayouts,
} from '@noriginmedia/norigin-spatial-navigation';

export {
  FocusContext,
  useFocusable,
  setFocus,
  doesFocusableExist,
  getCurrentFocusKey,
  pause,
  resume,
  updateAllLayouts,
};

let initialized = false;

export function initSpatialNavigation() {
  if (initialized) return;
  initialized = true;
  SN.init({
    debug: false,
    visualDebug: false,
    distanceCalculationMethod: 'center',
  });
}

export function SpatialNavProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSpatialNavigation();
    return () => {};
  }, []);

  return (
    <FocusContext.Provider value="root">
      {children}
    </FocusContext.Provider>
  );
}