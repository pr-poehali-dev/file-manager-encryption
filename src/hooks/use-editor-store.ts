import { create } from 'zustand';
import { EditorState, Track, TimelineClip, MediaAsset, MediaType, ExportSettings } from '@/types/editor';

let clipCounter = 0;
const genId = () => `clip_${Date.now()}_${++clipCounter}`;
const genTrackId = () => `track_${Date.now()}_${++clipCounter}`;
const genAssetId = () => `asset_${Date.now()}_${++clipCounter}`;

interface EditorStore extends EditorState {
  addTrack: (type: MediaType) => string;
  removeTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  setTrackHeight: (trackId: string, height: number) => void;
  reorderTracks: (fromIndex: number, toIndex: number) => void;
  addClip: (trackId: string, clip: Partial<TimelineClip>) => void;
  addClipFromAsset: (asset: MediaAsset, trackId: string, startTime: number) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  selectClip: (clipId: string | null) => void;
  moveClip: (clipId: string, newStartTime: number) => void;
  moveClipToTrack: (clipId: string, targetTrackId: string, newStartTime: number) => void;
  resizeClip: (clipId: string, edge: 'left' | 'right', delta: number) => void;
  splitClip: (clipId: string, splitTime: number) => void;
  duplicateClip: (clipId: string) => void;
  addAsset: (asset: Omit<MediaAsset, 'id'>) => MediaAsset;
  removeAsset: (assetId: string) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setZoom: (zoom: number) => void;
  toggleSnap: () => void;
  setActivePanel: (panel: string) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  getCompatibleTrack: (assetType: MediaType) => string;
  selectedTrackId: string | null;
  selectTrack: (trackId: string | null) => void;
  draggingAsset: MediaAsset | null;
  setDraggingAsset: (asset: MediaAsset | null) => void;
  previewFilter: string | null;
  setPreviewFilter: (filter: string | null) => void;
  setProject: (project: Partial<EditorState['project']>) => void;
  resetEditor: (projectId?: number, projectName?: string) => void;
  getProjectData: () => { tracks: Track[]; project: EditorState['project']; exportSettings: EditorState['exportSettings']; assets: MediaAsset[] };
  loadProjectData: (data: { tracks?: Track[]; project?: Partial<EditorState['project']>; exportSettings?: Partial<EditorState['exportSettings']>; assets?: MediaAsset[] }) => void;
}

const defaultTracks: Track[] = [
  { id: 'v1', name: 'Видео 1', type: 'video', muted: false, locked: false, visible: true, height: 60, clips: [] },
  { id: 't1', name: 'Текст', type: 'text', muted: false, locked: false, visible: true, height: 45, clips: [] },
  { id: 'a1', name: 'Аудио 1', type: 'audio', muted: false, locked: false, visible: true, height: 50, clips: [] },
];

const useEditorStore = create<EditorStore>((set, get) => ({
  project: { name: 'Новый проект', width: 1920, height: 1080, fps: 30, duration: 30 },
  tracks: defaultTracks,
  assets: [],
  selectedClipId: null,
  selectedTrackId: null,
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  snapEnabled: true,
  activePanel: 'media',
  exportSettings: { format: 'mp4', quality: 'high', resolution: '1920x1080', fps: 30, codec: 'H.264', bitrate: 8000 },
  draggingAsset: null,
  previewFilter: null,

  setDraggingAsset: (asset) => set({ draggingAsset: asset }),

  setPreviewFilter: (filter) => set({ previewFilter: filter }),

  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  getCompatibleTrack: (assetType: MediaType) => {
    const state = get();
    const trackType = assetType === 'audio' ? 'audio' : assetType === 'text' ? 'text' : 'video';
    const compatible = state.tracks.find(t => t.type === trackType && !t.locked);
    if (compatible) return compatible.id;
    const id = genTrackId();
    set((s) => ({
      tracks: [...s.tracks, {
        id,
        name: `${trackType === 'video' ? 'Видео' : trackType === 'audio' ? 'Аудио' : 'Текст'} ${s.tracks.filter(t => t.type === trackType).length + 1}`,
        type: trackType,
        muted: false,
        locked: false,
        visible: true,
        height: trackType === 'audio' ? 50 : trackType === 'text' ? 45 : 60,
        clips: [],
      }],
    }));
    return id;
  },

  addTrack: (type) => {
    const id = genTrackId();
    set((state) => ({
      tracks: [...state.tracks, {
        id,
        name: `${type === 'video' ? 'Видео' : type === 'audio' ? 'Аудио' : 'Текст'} ${state.tracks.filter(t => t.type === type).length + 1}`,
        type,
        muted: false,
        locked: false,
        visible: true,
        height: type === 'audio' ? 50 : type === 'text' ? 45 : 60,
        clips: [],
      }],
    }));
    return id;
  },

  removeTrack: (trackId) => set((state) => ({
    tracks: state.tracks.filter(t => t.id !== trackId),
  })),

  toggleTrackMute: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t),
  })),

  toggleTrackLock: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, locked: !t.locked } : t),
  })),

  toggleTrackVisibility: (trackId) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, visible: !t.visible } : t),
  })),

  setTrackHeight: (trackId, height) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? { ...t, height: Math.max(30, Math.min(120, height)) } : t),
  })),

  reorderTracks: (fromIndex, toIndex) => set((state) => {
    const newTracks = [...state.tracks];
    const [moved] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, moved);
    return { tracks: newTracks };
  }),

  addClip: (trackId, clip) => set((state) => ({
    tracks: state.tracks.map(t => t.id === trackId ? {
      ...t,
      clips: [...t.clips, {
        id: genId(),
        type: clip.type || t.type,
        trackId,
        startTime: clip.startTime || 0,
        duration: clip.duration || 5,
        offset: 0,
        name: clip.name || 'Новый клип',
        opacity: 1,
        volume: 1,
        speed: 1,
        filters: [],
        keyframes: [],
        ...clip,
      } as TimelineClip],
    } : t),
  })),

  addClipFromAsset: (asset, trackId, startTime) => set((state) => {
    const track = state.tracks.find(t => t.id === trackId);
    if (!track || track.locked) return state;

    const duration = asset.type === 'image' ? 5 : (asset.duration || 5);
    const clipType = asset.type === 'text' ? 'text' : asset.type;

    const newClip: TimelineClip = {
      id: genId(),
      assetId: asset.id,
      type: clipType,
      trackId,
      startTime: Math.max(0, startTime),
      duration,
      offset: 0,
      name: asset.name,
      opacity: 1,
      volume: 1,
      speed: 1,
      filters: [],
      keyframes: [],
    };

    return {
      tracks: state.tracks.map(t => t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t),
    };
  }),

  removeClip: (clipId) => set((state) => ({
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.filter(c => c.id !== clipId),
    })),
    selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
  })),

  updateClip: (clipId, updates) => set((state) => ({
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c),
    })),
  })),

  selectClip: (clipId) => set({ selectedClipId: clipId }),

  moveClip: (clipId, newStartTime) => set((state) => ({
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, startTime: Math.max(0, newStartTime) } : c),
    })),
  })),

  moveClipToTrack: (clipId, targetTrackId, newStartTime) => set((state) => {
    let clipToMove: TimelineClip | null = null;
    const tracksWithout = state.tracks.map(t => {
      const clip = t.clips.find(c => c.id === clipId);
      if (clip) {
        clipToMove = { ...clip, trackId: targetTrackId, startTime: Math.max(0, newStartTime) };
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
      }
      return t;
    });
    if (!clipToMove) return state;

    const target = tracksWithout.find(t => t.id === targetTrackId);
    if (!target || target.locked) return state;

    return {
      tracks: tracksWithout.map(t =>
        t.id === targetTrackId ? { ...t, clips: [...t.clips, clipToMove!] } : t
      ),
    };
  }),

  resizeClip: (clipId, edge, delta) => set((state) => ({
    tracks: state.tracks.map(t => ({
      ...t,
      clips: t.clips.map(c => {
        if (c.id !== clipId) return c;
        if (edge === 'left') {
          const newStart = Math.max(0, c.startTime + delta);
          const actualDelta = newStart - c.startTime;
          const newDuration = c.duration - actualDelta;
          if (newDuration < 0.2) return c;
          return { ...c, startTime: newStart, duration: newDuration };
        } else {
          const newDuration = Math.max(0.2, c.duration + delta);
          return { ...c, duration: newDuration };
        }
      }),
    })),
  })),

  splitClip: (clipId, splitTime) => set((state) => {
    const newTracks = state.tracks.map(t => {
      const clipIndex = t.clips.findIndex(c => c.id === clipId);
      if (clipIndex === -1) return t;
      const clip = t.clips[clipIndex];
      const relativeTime = splitTime - clip.startTime;
      if (relativeTime <= 0.1 || relativeTime >= clip.duration - 0.1) return t;
      const clip1 = { ...clip, duration: relativeTime };
      const clip2 = { ...clip, id: genId(), startTime: splitTime, duration: clip.duration - relativeTime, offset: clip.offset + relativeTime, name: clip.name + ' (2)' };
      const newClips = [...t.clips];
      newClips.splice(clipIndex, 1, clip1, clip2);
      return { ...t, clips: newClips };
    });
    return { tracks: newTracks };
  }),

  duplicateClip: (clipId) => set((state) => ({
    tracks: state.tracks.map(t => {
      const clip = t.clips.find(c => c.id === clipId);
      if (!clip) return t;
      const newClip = { ...clip, id: genId(), startTime: clip.startTime + clip.duration + 0.1, name: clip.name + ' (копия)' };
      return { ...t, clips: [...t.clips, newClip] };
    }),
  })),

  addAsset: (asset) => {
    const newAsset = { ...asset, id: genAssetId() } as MediaAsset;
    set((state) => ({ assets: [...state.assets, newAsset] }));
    return newAsset;
  },

  removeAsset: (assetId) => set((state) => ({
    assets: state.assets.filter(a => a.id !== assetId),
  })),

  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setExportSettings: (settings) => set((state) => ({
    exportSettings: { ...state.exportSettings, ...settings },
  })),

  setProject: (project) => set((state) => ({
    project: { ...state.project, ...project },
  })),

  getProjectData: () => {
    const s = get();
    return { tracks: s.tracks, project: s.project, exportSettings: s.exportSettings, assets: s.assets };
  },

  loadProjectData: (data) => set((state) => ({
    tracks: data.tracks || state.tracks,
    assets: data.assets || state.assets,
    project: { ...state.project, ...(data.project || {}) },
    exportSettings: { ...state.exportSettings, ...(data.exportSettings || {}) },
    currentTime: 0,
    isPlaying: false,
    selectedClipId: null,
    selectedTrackId: null,
  })),

  resetEditor: (projectId, projectName) => set({
    project: { id: projectId, name: projectName || 'Новый проект', width: 1920, height: 1080, fps: 30, duration: 30 },
    tracks: [
      { id: 'v1', name: 'Видео 1', type: 'video' as MediaType, muted: false, locked: false, visible: true, height: 60, clips: [] },
      { id: 't1', name: 'Текст', type: 'text' as MediaType, muted: false, locked: false, visible: true, height: 45, clips: [] },
      { id: 'a1', name: 'Аудио 1', type: 'audio' as MediaType, muted: false, locked: false, visible: true, height: 50, clips: [] },
    ],
    assets: [],
    selectedClipId: null,
    selectedTrackId: null,
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    snapEnabled: true,
    activePanel: 'media',
    previewFilter: null,
  }),
}));

export default useEditorStore;