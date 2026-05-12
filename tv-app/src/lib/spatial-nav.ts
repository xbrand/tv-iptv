import {
  SpatialNavigation,
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

export function initSpatialNavigation() {
  SpatialNavigation.init({
    debug: false,
    visualDebug: false,
    distanceCalculationMethod: 'center',
  });
}

export function safeSetFocus(focusKey: string) {
  if (doesFocusableExist(focusKey)) {
    setFocus(focusKey);
  }
}