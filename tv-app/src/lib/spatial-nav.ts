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

export { FocusContext, useFocusable, setFocus, doesFocusableExist, getCurrentFocusKey, pause, resume, updateAllLayouts };

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

// Auto-init on first useFocusable call — no useEffect needed
const originalUseFocusable = useFocusable;