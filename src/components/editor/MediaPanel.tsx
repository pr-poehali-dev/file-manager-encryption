import { useRef, useCallback, useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import useEditorStore from '@/hooks/use-editor-store';
import useAuth from '@/hooks/use-auth';
import { media as mediaApi, shop } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ShopPurchase {
  slug: string;
  name: string;
  category: string;
  icon: string;
  features: string[];
  purchased_at: string;
}

const baseEffects = [
  { category: 'Цветокоррекция', items: [
    { name: 'Яркость', icon: 'Sun', free: true },
    { name: 'Контраст', icon: 'Contrast', free: true },
    { name: 'Насыщенность', icon: 'Palette', free: true },
    { name: 'Температура', icon: 'Thermometer', free: true },
  ]},
  { category: 'Стилизация', items: [
    { name: 'Размытие', icon: 'Droplets', free: true },
    { name: 'Резкость', icon: 'Focus', free: true },
    { name: 'Виньетка', icon: 'Circle', free: true },
    { name: 'Шум', icon: 'Waves', free: true },
    { name: 'Глитч', icon: 'Zap', free: true },
  ]},
];

const baseTransitions = [
  { name: 'Растворение', icon: 'Blend', duration: '0.5с', free: true },
  { name: 'Слайд влево', icon: 'ArrowLeft', duration: '0.5с', free: true },
  { name: 'Слайд вправо', icon: 'ArrowRight', duration: '0.5с', free: true },
  { name: 'Слайд вверх', icon: 'ArrowUp', duration: '0.5с', free: true },
  { name: 'Слайд вниз', icon: 'ArrowDown', duration: '0.5с', free: true },
  { name: 'Масштаб', icon: 'ZoomIn', duration: '0.7с', free: true },
  { name: 'Затемнение', icon: 'Moon', duration: '0.8с', free: true },
  { name: 'Засветка', icon: 'Sun', duration: '0.6с', free: true },
];

const baseTextPresets = [
  { name: 'Заголовок', icon: 'Type', desc: 'Крупный текст по центру', free: true },
  { name: 'Субтитры', icon: 'Subtitles', desc: 'Текст внизу экрана', free: true },
  { name: 'Нижняя третья', icon: 'PanelBottom', desc: 'Плашка с именем', free: true },
  { name: 'Титры', icon: 'ScrollText', desc: 'Конечные титры', free: true },
  { name: 'Выноска', icon: 'MessageSquare', desc: 'Всплывающая подпись', free: true },
];

const formatSize = (bytes: number): string => {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' ГБ';
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' МБ';
  if (bytes > 1e3) return (bytes / 1e3).toFixed(1) + ' КБ';
  return bytes + ' Б';
};

const formatDuration = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const typeIcon = (type: string) => {
  switch (type) {
    case 'video': return 'Film';
    case 'audio': return 'Music';
    case 'image': return 'Image';
    default: return 'File';
  }
};

const typeColor = (type: string) => {
  switch (type) {
    case 'video': return 'text-blue-400';
    case 'audio': return 'text-green-400';
    case 'image': return 'text-orange-400';
    default: return 'text-muted-foreground';
  }
};

const getMediaDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const el = file.type.startsWith('audio/') ? new Audio() : document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      const dur = isFinite(el.duration) ? el.duration : 10;
      URL.revokeObjectURL(url);
      resolve(dur);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(10);
    };
    el.src = url;
  });
};

const DIRECT_UPLOAD_LIMIT = 2 * 1024 * 1024;
const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;
const CHUNK_SIZE = 2 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/x-m4a', wma: 'audio/x-ms-wma', opus: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mkv: 'video/x-matroska', wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp', mpeg: 'video/mpeg',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', tiff: 'image/tiff',
};
const getFileMime = (file: File) => {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[ext] || 'application/octet-stream';
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const MediaPanel = () => {
  const { assets, addAsset, removeAsset, setDraggingAsset, addClipFromAsset, getCompatibleTrack, currentTime, setCurrentTime, project, addClip, selectedClipId, updateClip, setPreviewFilter } = useEditorStore();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [loadedProjectId, setLoadedProjectId] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<ShopPurchase[]>([]);
  const [purchasesLoaded, setPurchasesLoaded] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryFiles, setLibraryFiles] = useState<Array<{id: number; file_name: string; file_type: string; mime_type: string; file_size: number; duration: number; width: number; height: number; cdn_url: string; created_at: string}>>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [uploadErrors, setUploadErrors] = useState<Array<{name: string; error: string; file: File; assetId: string; duration: number; attempt: number; retrying: boolean; oversized?: boolean}>>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { current: number; total: number }>>({});

  useEffect(() => {
    if (!isAuthenticated || !project.id) return;
    if (loadedProjectId === project.id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mediaApi.list(project.id).then((data: any) => {
      if (data.files) {
        for (const f of data.files) {
          const existing = useEditorStore.getState().assets;
          if (existing.some(a => a.id === `server_${f.id}`)) continue;
          addAsset({
            name: f.file_name,
            type: f.file_type,
            url: f.cdn_url,
            duration: f.duration || 0,
            size: f.file_size,
            width: f.width,
            height: f.height,
          });
          const lastAsset = useEditorStore.getState().assets;
          const added = lastAsset[lastAsset.length - 1];
          if (added) {
            useEditorStore.setState((s) => ({
              assets: s.assets.map(a => a.id === added.id ? { ...a, id: `server_${f.id}` } : a)
            }));
          }
        }
      }
      setLoadedProjectId(project.id!);
    }).catch(() => setLoadedProjectId(project.id!));
  }, [isAuthenticated, project.id, loadedProjectId, addAsset]);

  useEffect(() => {
    if (!isAuthenticated || purchasesLoaded) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shop.myItems().then((data: any) => {
      if (data.items) {
        setPurchases(data.items.map((i: ShopPurchase) => ({
          slug: i.slug,
          name: i.name,
          category: i.category,
          icon: i.icon,
          features: i.features || [],
          purchased_at: i.purchased_at,
        })));
      }
      setPurchasesLoaded(true);
    }).catch(() => setPurchasesLoaded(true));
  }, [isAuthenticated, purchasesLoaded]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const doUpload = useCallback(async (file: File, assetId: string, duration: number, attempt: number) => {
    setUploading(prev => prev.includes(assetId) ? prev : [...prev, assetId]);
    try {
      const b64 = await fileToBase64(file);
      const pid = useEditorStore.getState().project.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await mediaApi.upload({
        file_data: b64,
        file_name: file.name,
        mime_type: getFileMime(file),
        duration,
        project_id: pid,
      });
      if (res.file?.cdn_url) {
        const newId = `server_${res.file.id}`;
        useEditorStore.setState((s) => ({
          assets: s.assets.map(a => a.id === assetId ? { ...a, url: res.file.cdn_url, id: newId } : a),
          tracks: s.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.assetId === assetId ? { ...c, assetId: newId } : c),
          })),
        }));
      }
      setUploadErrors(prev => prev.filter(x => x.assetId !== assetId));
      return true;
    } catch (e) {
      console.error(`Upload failed (attempt ${attempt}):`, e);
      if (attempt < 3) {
        const delay = attempt * 3000;
        setUploadErrors(prev => {
          const existing = prev.find(x => x.assetId === assetId);
          if (existing) return prev.map(x => x.assetId === assetId ? { ...x, attempt, retrying: true } : x);
          return [...prev, { name: file.name, error: String(e), file, assetId, duration, attempt, retrying: true }];
        });
        await new Promise(r => setTimeout(r, delay));
        return doUpload(file, assetId, duration, attempt + 1);
      }
      setUploadErrors(prev => {
        const existing = prev.find(x => x.assetId === assetId);
        if (existing) return prev.map(x => x.assetId === assetId ? { ...x, attempt, retrying: false } : x);
        return [...prev, { name: file.name, error: String(e), file, assetId, duration, attempt, retrying: false }];
      });
      return false;
    } finally {
      setUploading(prev => prev.filter(id => id !== assetId));
    }
  }, []);

  const doChunkedUpload = useCallback(async (file: File, assetId: string, duration: number) => {
    console.log('[Chunked] Starting upload:', file.name, 'size:', file.size, 'mime:', getFileMime(file), 'chunks:', Math.ceil(file.size / CHUNK_SIZE));
    setUploading(prev => prev.includes(assetId) ? prev : [...prev, assetId]);
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setUploadProgress(prev => ({ ...prev, [assetId]: { current: 0, total: totalChunks } }));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initRes: any = await mediaApi.chunkedInit({
        file_name: file.name,
        mime_type: getFileMime(file),
        file_size: file.size,
        total_chunks: totalChunks,
      });
      const uploadId = initRes.upload_id;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const chunkB64 = await blobToBase64(chunk);

        let sent = false;
        for (let attempt = 0; attempt < 3 && !sent; attempt++) {
          try {
            await mediaApi.chunkedPart({ upload_id: uploadId, chunk_index: i, chunk_data: chunkB64 });
            sent = true;
          } catch {
            if (attempt === 2) throw new Error(`Не удалось загрузить часть ${i + 1}/${totalChunks}`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        setUploadProgress(prev => ({ ...prev, [assetId]: { current: i + 1, total: totalChunks } }));
      }

      const pid = useEditorStore.getState().project.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completeRes: any = await mediaApi.chunkedComplete({
        upload_id: uploadId,
        duration,
        project_id: pid,
      });

      if (completeRes.file?.cdn_url) {
        const newId = `server_${completeRes.file.id}`;
        useEditorStore.setState((s) => ({
          assets: s.assets.map(a => a.id === assetId ? { ...a, url: completeRes.file.cdn_url, id: newId } : a),
          tracks: s.tracks.map(t => ({
            ...t,
            clips: t.clips.map(c => c.assetId === assetId ? { ...c, assetId: newId } : c),
          })),
        }));
      }
      setUploadErrors(prev => prev.filter(x => x.assetId !== assetId));
    } catch (e: unknown) {
      const errMsg = e && typeof e === 'object' && 'error' in e ? (e as { error: string }).error : String(e);
      console.error('Chunked upload failed:', errMsg, e);
      setUploadErrors(prev => [...prev, {
        name: file.name,
        error: String(e),
        file,
        assetId,
        duration,
        attempt: 3,
        retrying: false,
      }]);
    } finally {
      setUploading(prev => prev.filter(id => id !== assetId));
      setUploadProgress(prev => { const n = { ...prev }; delete n[assetId]; return n; });
    }
  }, []);

  const retryUpload = useCallback((assetId: string) => {
    const err = uploadErrors.find(x => x.assetId === assetId);
    if (!err) return;
    setUploadErrors(prev => prev.filter(x => x.assetId !== assetId));
    if (err.file.size > DIRECT_UPLOAD_LIMIT) {
      doChunkedUpload(err.file, err.assetId, err.duration);
    } else {
      doUpload(err.file, err.assetId, err.duration, 1);
    }
  }, [uploadErrors, doUpload, doChunkedUpload]);

  const dismissError = useCallback((assetId: string) => {
    setUploadErrors(prev => prev.filter(x => x.assetId !== assetId));
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    let type: 'video' | 'audio' | 'image' = 'video';
    if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('image/')) type = 'image';

    const duration = await getMediaDuration(file);
    const localUrl = URL.createObjectURL(file);

    const asset = addAsset({
      name: file.name,
      type,
      url: localUrl,
      duration,
      size: file.size,
    });

    if (!isAuthenticated) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadErrors(prev => [...prev, {
        name: file.name,
        error: `Файл слишком большой (${formatSize(file.size)}). Макс: 150 МБ`,
        file,
        assetId: asset.id,
        duration,
        attempt: 3,
        retrying: false,
        oversized: true,
      }]);
      return;
    }

    if (file.size > DIRECT_UPLOAD_LIMIT) {
      doChunkedUpload(file, asset.id, duration);
    } else {
      doUpload(file, asset.id, duration, 1);
    }
  }, [addAsset, isAuthenticated, doUpload, doChunkedUpload]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await uploadFile(file);
    }
    e.target.value = '';
  }, [uploadFile]);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/') && !file.type.startsWith('audio/') && !file.type.startsWith('image/')) continue;
      await uploadFile(file);
    }
  }, [uploadFile]);

  const handleDoubleClick = useCallback((asset: typeof assets[0]) => {
    const trackId = getCompatibleTrack(asset.type);
    addClipFromAsset(asset, trackId, currentTime);
    setCurrentTime(currentTime);
  }, [addClipFromAsset, getCompatibleTrack, currentTime, setCurrentTime]);

  const handleRemoveAsset = useCallback(async (assetId: string) => {
    if (assetId.startsWith('server_')) {
      const serverId = parseInt(assetId.replace('server_', ''));
      mediaApi.remove(serverId).catch(() => {});
    }
    removeAsset(assetId);
  }, [removeAsset]);

  const handleOpenLibrary = useCallback(async () => {
    if (!isAuthenticated) return;
    setLibraryOpen(true);
    setLibraryLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await mediaApi.list();
      if (data.files) setLibraryFiles(data.files);
    } catch {
      setLibraryFiles([]);
    } finally {
      setLibraryLoading(false);
    }
  }, [isAuthenticated]);

  const handleAddFromLibrary = useCallback((file: typeof libraryFiles[0]) => {
    const existing = useEditorStore.getState().assets;
    if (existing.some(a => a.id === `server_${file.id}`)) return;
    addAsset({
      name: file.file_name,
      type: file.file_type as 'video' | 'audio' | 'image',
      url: file.cdn_url,
      duration: file.duration || 0,
      size: file.file_size,
      width: file.width,
      height: file.height,
    });
    const lastAsset = useEditorStore.getState().assets;
    const added = lastAsset[lastAsset.length - 1];
    if (added) {
      useEditorStore.setState((s) => ({
        assets: s.assets.map(a => a.id === added.id ? { ...a, id: `server_${file.id}` } : a)
      }));
    }
  }, [addAsset]);

  const handleDeleteFromLibrary = useCallback(async (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const serverId = `server_${fileId}`;
    if (assets.some(a => a.id === serverId)) removeAsset(serverId);
    setLibraryFiles(prev => prev.filter(f => f.id !== fileId));
    mediaApi.remove(fileId).catch(() => {});
  }, [assets, removeAsset]);

  const handleApplyEffect = useCallback((effectName: string) => {
    if (!selectedClipId) return;
    const state = useEditorStore.getState();
    let clip = null;
    for (const t of state.tracks) {
      clip = t.clips.find(c => c.id === selectedClipId);
      if (clip) break;
    }
    if (!clip) return;

    const existingFilters = clip.filters || [];
    const alreadyHas = existingFilters.some(f => f.name === effectName);
    if (alreadyHas) return;

    updateClip(selectedClipId, {
      filters: [...existingFilters, {
        id: `filter_${Date.now()}`,
        name: effectName,
        type: effectName.toLowerCase(),
        params: { intensity: 50 },
      }],
    });
  }, [selectedClipId, updateClip]);

  const handleApplyTransition = useCallback((transitionName: string, duration: number) => {
    if (!selectedClipId) return;
    updateClip(selectedClipId, {
      transition: { type: transitionName.toLowerCase(), duration },
    });
  }, [selectedClipId, updateClip]);

  const handleAddText = useCallback((presetName: string) => {
    const trackId = getCompatibleTrack('text');
    const textDefaults: Record<string, { text: string; fontSize: number }> = {
      'Заголовок': { text: 'Заголовок', fontSize: 72 },
      'Субтитры': { text: 'Субтитры', fontSize: 24 },
      'Нижняя третья': { text: 'Имя автора', fontSize: 28 },
      'Титры': { text: 'Титры', fontSize: 36 },
      'Выноска': { text: 'Примечание', fontSize: 18 },
    };
    const defaults = textDefaults[presetName] || { text: presetName, fontSize: 36 };
    addClip(trackId, {
      type: 'text',
      startTime: currentTime,
      duration: 5,
      name: presetName,
      text: defaults.text,
      fontSize: defaults.fontSize,
      fontColor: '#ffffff',
    });
  }, [getCompatibleTrack, addClip, currentTime]);

  const purchasedEffects = purchases.filter(p => p.category === 'effects');
  const purchasedTransitions = purchases.filter(p => p.category === 'transitions');
  const purchasedTitles = purchases.filter(p => p.category === 'titles');
  const purchasedAudio = purchases.filter(p => p.category === 'audio');
  const purchasedFeatures = purchases.filter(p => p.category === 'features');

  return (
    <div className="flex flex-col h-full editor-panel rounded-lg overflow-hidden">
      <Tabs defaultValue="media" className="flex flex-col h-full">
        <div className="editor-panel-header px-2 py-1">
          <TabsList className="h-7 bg-transparent gap-0.5">
            <TabsTrigger value="media" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Медиа</TabsTrigger>
            <TabsTrigger value="effects" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Эффекты</TabsTrigger>
            <TabsTrigger value="transitions" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Переходы</TabsTrigger>
            <TabsTrigger value="text" className="text-[10px] h-6 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Текст</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="media"
          className="flex-1 m-0 flex flex-col min-h-0"
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleFileDrop}
        >
          <div className="px-2 py-1.5">
            {isDraggingOver || uploading.length > 0 ? (
              <button onClick={handleImport} className={`w-full flex items-center justify-center gap-1.5 nle-button py-1.5 border border-dashed transition-colors ${isDraggingOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'}`}>
                <Icon name={uploading.length > 0 ? 'Loader2' : 'Plus'} size={12} className={uploading.length > 0 ? 'animate-spin' : ''} />
                <span>{isDraggingOver ? 'Отпустите файлы сюда' : `Загрузка (${uploading.length})...`}</span>
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center justify-center gap-1.5 nle-button py-1.5 border border-dashed transition-colors border-border hover:border-primary">
                    <Icon name="Plus" size={12} />
                    <span>Импорт медиа</span>
                    <Icon name="ChevronDown" size={10} className="ml-auto opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  <DropdownMenuItem onClick={handleImport} className="gap-2 cursor-pointer">
                    <Icon name="HardDrive" size={14} />
                    <span>С компьютера</span>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    <DropdownMenuItem onClick={handleOpenLibrary} className="gap-2 cursor-pointer">
                      <Icon name="Cloud" size={14} />
                      <span>Из моих файлов</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <input ref={fileInputRef} type="file" accept="video/*,audio/*,image/*" multiple onChange={handleFileChange} className="hidden" />
          </div>
          {uploadErrors.length > 0 && (
            <div className="px-2 pb-1 space-y-1">
              {uploadErrors.map((err) => (
                <div key={err.assetId} className={`flex items-center gap-1.5 text-[10px] px-2 py-1.5 rounded ${err.oversized ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>
                  {err.retrying ? (
                    <Icon name="Loader2" size={12} className="animate-spin shrink-0" />
                  ) : err.oversized ? (
                    <Icon name="FileWarning" size={12} className="shrink-0" />
                  ) : (
                    <Icon name="AlertTriangle" size={12} className="shrink-0" />
                  )}
                  <span className="truncate flex-1">
                    {err.retrying ? `Повтор (${err.attempt}/3)... ${err.name}` : err.oversized ? `${err.name} — слишком большой (макс 150 МБ)` : `Ошибка: ${err.name}`}
                  </span>
                  {!err.retrying && !err.oversized && (
                    <button onClick={() => retryUpload(err.assetId)} className="shrink-0 hover:text-red-300 transition-colors" title="Повторить">
                      <Icon name="RotateCw" size={12} />
                    </button>
                  )}
                  {!err.retrying && (
                    <button onClick={() => dismissError(err.assetId)} className={`shrink-0 transition-colors ${err.oversized ? 'hover:text-yellow-300' : 'hover:text-red-300'}`} title="Скрыть">
                      <Icon name="X" size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="px-2 pb-1 space-y-1">
              {Object.entries(uploadProgress).map(([id, p]) => {
                const asset = assets.find(a => a.id === id);
                const pct = Math.round((p.current / p.total) * 100);
                return (
                  <div key={id} className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-1.5 rounded">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name="Upload" size={12} className="shrink-0" />
                      <span className="truncate flex-1">{asset?.name || 'Файл'}</span>
                      <span className="shrink-0">{pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-blue-500/20 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <ScrollArea className="flex-1 px-2 editor-scrollbar">
            <div className="grid grid-cols-2 gap-1.5 pb-2">
              {assets.map(asset => (
                <div key={asset.id} className="group relative bg-secondary/50 rounded p-1.5 cursor-grab hover:bg-secondary transition-colors active:cursor-grabbing" draggable onDragStart={(e) => { e.dataTransfer.setData('application/json', JSON.stringify(asset)); e.dataTransfer.effectAllowed = 'copy'; setDraggingAsset(asset); }} onDragEnd={() => setDraggingAsset(null)} onDoubleClick={() => handleDoubleClick(asset)}>
                  <div className="aspect-video rounded flex items-center justify-center mb-1 overflow-hidden relative" style={{ background: 'hsl(var(--editor-bg))' }}>
                    {asset.type === 'image' && asset.url ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : asset.type === 'video' && asset.url ? (
                      <video src={asset.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <Icon name={typeIcon(asset.type)} size={20} className={typeColor(asset.type)} />
                    )}
                    {uploading.includes(asset.id) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Icon name="Loader2" size={16} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] truncate">{asset.name}</div>
                  <div className="text-[9px] text-muted-foreground flex justify-between">
                    <span>{asset.duration > 0 ? formatDuration(asset.duration) : '—'}</span>
                    <span>{asset.size ? formatSize(asset.size) : ''}</span>
                  </div>
                  <button onClick={() => handleRemoveAsset(asset.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <Icon name="X" size={8} />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="effects" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full px-2 py-1 editor-scrollbar">
            {!selectedClipId && (
              <div className="text-[10px] text-muted-foreground text-center py-3 px-2">
                Выделите клип на таймлайне, чтобы применить эффект
              </div>
            )}

            {baseEffects.map(group => (
              <div key={group.category} className="mb-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">{group.category}</div>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <div
                      key={item.name}
                      onClick={() => handleApplyEffect(item.name)}
                      onMouseEnter={() => selectedClipId && setPreviewFilter(item.name)}
                      onMouseLeave={() => setPreviewFilter(null)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedClipId ? 'hover:bg-secondary/50' : 'opacity-50 cursor-default'}`}
                    >
                      <Icon name={item.icon} size={12} className="text-muted-foreground" />
                      <span className="text-xs">{item.name}</span>
                      <span className="ml-auto text-[8px] text-green-400">FREE</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {purchasedEffects.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                  <Icon name="ShoppingBag" size={10} className="text-primary" /> Из магазина
                </div>
                <div className="space-y-0.5">
                  {purchasedEffects.map(p => (
                    <div key={p.slug} className="mb-2">
                      <div
                        onClick={() => handleApplyEffect(p.name)}
                        onMouseEnter={() => selectedClipId && setPreviewFilter(p.name)}
                        onMouseLeave={() => setPreviewFilter(null)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${selectedClipId ? 'hover:bg-secondary/50' : 'opacity-50 cursor-default'}`}
                      >
                        <Icon name={p.icon || 'Palette'} size={12} className="text-primary" />
                        <span className="text-xs font-medium">{p.name}</span>
                        <span className="ml-auto text-[8px] text-primary">PRO</span>
                      </div>
                      {p.features.length > 0 && (
                        <div className="pl-7 space-y-0.5">
                          {p.features.map((f, i) => (
                            <div
                              key={i}
                              onClick={() => handleApplyEffect(f)}
                              onMouseEnter={() => selectedClipId && setPreviewFilter(f)}
                              onMouseLeave={() => setPreviewFilter(null)}
                              className={`text-[10px] px-2 py-1 rounded cursor-pointer transition-colors ${selectedClipId ? 'hover:bg-secondary/30 text-muted-foreground' : 'opacity-50 cursor-default text-muted-foreground'}`}
                            >
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {purchasedFeatures.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                  <Icon name="Cpu" size={10} className="text-yellow-400" /> Расширения
                </div>
                <div className="space-y-0.5">
                  {purchasedFeatures.map(p => (
                    <div key={p.slug} className="flex items-center gap-2 px-2 py-1.5 rounded bg-yellow-500/5">
                      <Icon name={p.icon || 'Cpu'} size={12} className="text-yellow-400" />
                      <div>
                        <div className="text-xs font-medium">{p.name}</div>
                        <div className="text-[9px] text-muted-foreground">Активировано</div>
                      </div>
                      <Icon name="CheckCircle" size={10} className="ml-auto text-green-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="transitions" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full px-2 py-1 editor-scrollbar">
            {!selectedClipId && (
              <div className="text-[10px] text-muted-foreground text-center py-3 px-2">
                Выделите клип на таймлайне, чтобы добавить переход
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              {baseTransitions.map(tr => (
                <div
                  key={tr.name}
                  onClick={() => handleApplyTransition(tr.name, parseFloat(tr.duration))}
                  className={`flex flex-col items-center gap-1 p-2 rounded bg-secondary/30 cursor-pointer transition-colors ${selectedClipId ? 'hover:bg-secondary/50' : 'opacity-50 cursor-default'}`}
                >
                  <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: 'hsl(var(--editor-bg))' }}>
                    <Icon name={tr.icon} size={16} className="text-primary" />
                  </div>
                  <span className="text-[10px]">{tr.name}</span>
                  <span className="text-[9px] text-muted-foreground">{tr.duration}</span>
                </div>
              ))}
            </div>

            {purchasedTransitions.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                  <Icon name="ShoppingBag" size={10} className="text-primary" /> Из магазина
                </div>
                {purchasedTransitions.map(p => (
                  <div key={p.slug} className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-primary/5">
                      <Icon name={p.icon || 'Sparkles'} size={12} className="text-primary" />
                      <span className="text-xs font-medium">{p.name}</span>
                      <span className="ml-auto text-[8px] text-primary">PRO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {p.features.map((f, i) => (
                        <div
                          key={i}
                          onClick={() => handleApplyTransition(f, 0.5)}
                          className={`flex flex-col items-center gap-0.5 p-1.5 rounded bg-secondary/20 text-center cursor-pointer transition-colors ${selectedClipId ? 'hover:bg-secondary/40' : 'opacity-50 cursor-default'}`}
                        >
                          <Icon name={p.icon || 'Sparkles'} size={12} className="text-primary/60" />
                          <span className="text-[9px]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="text" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full px-2 py-1 editor-scrollbar">
            <div className="space-y-1.5">
              {baseTextPresets.map(tp => (
                <div
                  key={tp.name}
                  onClick={() => handleAddText(tp.name)}
                  className="flex items-center gap-2 p-2 rounded bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'hsl(var(--editor-bg))' }}>
                    <Icon name={tp.icon} size={14} className="text-purple-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium">{tp.name}</div>
                    <div className="text-[9px] text-muted-foreground">{tp.desc}</div>
                  </div>
                </div>
              ))}

              {purchasedTitles.length > 0 && (
                <div className="mt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                    <Icon name="ShoppingBag" size={10} className="text-primary" /> Из магазина
                  </div>
                  {purchasedTitles.map(p => (
                    <div key={p.slug} className="mb-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-primary/5">
                        <Icon name={p.icon || 'Type'} size={12} className="text-primary" />
                        <span className="text-xs font-medium">{p.name}</span>
                        <span className="ml-auto text-[8px] text-primary">PRO</span>
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {p.features.map((f, i) => (
                          <div
                            key={i}
                            onClick={() => handleAddText(f)}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/30 cursor-pointer transition-colors"
                          >
                            <Icon name="Type" size={10} className="text-purple-400/60" />
                            <span className="text-[10px]">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {purchasedAudio.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                    <Icon name="Music" size={10} className="text-green-400" /> Музыка (магазин)
                  </div>
                  {purchasedAudio.map(p => (
                    <div key={p.slug} className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/5">
                      <Icon name={p.icon || 'Music'} size={12} className="text-green-400" />
                      <div>
                        <div className="text-xs font-medium">{p.name}</div>
                        <div className="text-[9px] text-muted-foreground">{p.features.length} элементов</div>
                      </div>
                      <Icon name="CheckCircle" size={10} className="ml-auto text-green-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Icon name="Cloud" size={16} />
              Мои файлы
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 mb-2">
            {(['all', 'image', 'video', 'audio'] as const).map(f => (
              <button
                key={f}
                onClick={() => setLibraryFilter(f)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${libraryFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}`}
              >
                {f === 'all' ? 'Все' : f === 'image' ? 'Фото' : f === 'video' ? 'Видео' : 'Аудио'}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {libraryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : libraryFiles.filter(f => libraryFilter === 'all' || f.file_type === libraryFilter).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {libraryFiles.length === 0 ? 'У вас пока нет загруженных файлов' : 'Нет файлов этого типа'}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pr-3">
                {libraryFiles
                  .filter(f => libraryFilter === 'all' || f.file_type === libraryFilter)
                  .map(file => {
                    const alreadyAdded = assets.some(a => a.id === `server_${file.id}`);
                    return (
                      <div
                        key={file.id}
                        onClick={() => !alreadyAdded && handleAddFromLibrary(file)}
                        className={`group relative rounded p-1.5 transition-colors ${alreadyAdded ? 'bg-primary/10 opacity-60 cursor-default' : 'bg-secondary/50 hover:bg-secondary cursor-pointer'}`}
                      >
                        <div className="aspect-video rounded flex items-center justify-center mb-1 overflow-hidden" style={{ background: 'hsl(var(--editor-bg))' }}>
                          {file.file_type === 'image' ? (
                            <img src={file.cdn_url} alt={file.file_name} className="w-full h-full object-cover" />
                          ) : file.file_type === 'video' ? (
                            <video src={file.cdn_url} className="w-full h-full object-cover" muted />
                          ) : (
                            <Icon name={typeIcon(file.file_type)} size={20} className={typeColor(file.file_type)} />
                          )}
                          {alreadyAdded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon name="Check" size={16} className="text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] truncate">{file.file_name}</div>
                        <div className="text-[9px] text-muted-foreground flex justify-between">
                          <span>{file.duration > 0 ? formatDuration(file.duration) : '—'}</span>
                          <span>{formatSize(file.file_size)}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFromLibrary(file.id, e)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <Icon name="X" size={8} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaPanel;