export interface TVAppConfig {
  apiBaseUrl: string;
  marvinServiceUrl: string;
  appId: string;
  enableDRM: boolean;
  defaultCountry?: string;
}

export interface DeviceStatus {
  id: string;
  isActivated: boolean;
  location: { id: string; name: string; code: string } | null;
  activatedAt: string | null;
}

export interface Channel {
  id: string;
  name: string;
  logo?: string;
  number?: string;
  category?: string;
  currentProgram?: ProgramInfo;
  url?: string;
}

export interface ProgramInfo {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  catchup?: boolean;
}

export interface EPGEvent {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  catchup?: boolean;
}

export interface StreamInfo {
  src: string;
  type: 'application/x-mpegURL' | 'application/dash+xml';
  contentProtection?: {
    widevine?: { licenseAcquisitionURL: string };
    fairplay?: { licenseUrl: string; certificateURL: string };
  };
}

export interface DRMConfig {
  type: 'widevine' | 'fairplay' | 'none';
  licenseAcquisitionURL?: string;
  certificateURL?: string;
}

// App State
export type Screen = 'login' | 'player' | 'config' | 'epg';

export interface AppState {
  screen: Screen;
  token: string | null;
  deviceId: string | null;
  channels: Channel[];
  favorites: string[];
  currentChannel: Channel | null;
}
