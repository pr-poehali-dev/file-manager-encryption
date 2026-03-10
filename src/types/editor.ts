export type MediaType = 'video' | 'audio' | 'image' | 'text';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  duration: number;
  thumbnail?: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface TimelineClip {
  id: string;
  assetId?: string;
  type: MediaType;
  trackId: string;
  startTime: number;
  duration: number;
  offset: number;
  name: string;
  color?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: number;
  textShadow?: number;
  textStroke?: number;
  textStrokeColor?: string;
  textBg?: boolean;
  textBgColor?: string;
  textBgOpacity?: number;
  opacity: number;
  volume: number;
  speed: number;
  positionX?: number;
  positionY?: number;
  scale?: number;
  rotation?: number;
  fitMode?: 'contain' | 'cover' | 'fill';
  filters: ClipFilter[];
  transition?: ClipTransition;
  keyframes: Keyframe[];
}

export interface Track {
  id: string;
  name: string;
  type: MediaType;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  height: number;
  clips: TimelineClip[];
}

export interface ClipFilter {
  id: string;
  name: string;
  type: string;
  params: Record<string, number | string | boolean>;
}

export interface ClipTransition {
  type: string;
  duration: number;
}

export interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface ProjectSettings {
  id?: number;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'avi' | 'mov' | 'gif';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: string;
  fps: number;
  codec: string;
  bitrate: number;
}

export interface EditorState {
  project: ProjectSettings;
  tracks: Track[];
  assets: MediaAsset[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  snapEnabled: boolean;
  activePanel: string;
  exportSettings: ExportSettings;
  previewFilter: string | null;
}