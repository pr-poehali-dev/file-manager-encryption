import { useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/icon';
import useEditorStore from '@/hooks/use-editor-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import type { ExportSettings } from '@/types/editor';

interface ExportPreset {
  id: string;
  icon: string;
  label: string;
  desc: string;
  settings: Partial<ExportSettings>;
}

const presets: ExportPreset[] = [
  {
    id: 'social',
    icon: 'Share2',
    label: 'Соцсети',
    desc: 'YouTube, VK, Instagram, TikTok',
    settings: { format: 'mp4', quality: 'high', resolution: '1920x1080', fps: 30, codec: 'H.264', bitrate: 8000 },
  },
  {
    id: 'email',
    icon: 'Mail',
    label: 'Отправка по почте',
    desc: 'Лёгкий файл до 25 МБ',
    settings: { format: 'mp4', quality: 'low', resolution: '1280x720', fps: 24, codec: 'H.264', bitrate: 2000 },
  },
  {
    id: 'website',
    icon: 'Globe',
    label: 'Вставка на сайт',
    desc: 'WebM, быстрая загрузка',
    settings: { format: 'webm', quality: 'medium', resolution: '1920x1080', fps: 30, codec: 'VP9', bitrate: 4000 },
  },
  {
    id: 'maxquality',
    icon: 'Sparkles',
    label: 'Максимальное качество',
    desc: 'Без потерь, архив, монтаж',
    settings: { format: 'mp4', quality: 'ultra', resolution: '3840x2160', fps: 30, codec: 'H.264', bitrate: 20000 },
  },
  {
    id: 'gif',
    icon: 'Image',
    label: 'GIF-анимация',
    desc: 'Мемы, стикеры, превью',
    settings: { format: 'gif', quality: 'low', resolution: '480x270', fps: 12, codec: 'gif', bitrate: 0 },
  },
  {
    id: 'custom',
    icon: 'Settings',
    label: 'Свои настройки',
    desc: 'Полный контроль параметров',
    settings: {},
  },
];

const qualities: Array<{ value: ExportSettings['quality']; label: string; desc: string; resolution: string }> = [
  { value: 'low', label: 'Низкое', desc: '720p', resolution: '1280x720' },
  { value: 'medium', label: 'Среднее', desc: '1080p', resolution: '1920x1080' },
  { value: 'high', label: 'Высокое', desc: '1080p HQ', resolution: '1920x1080' },
  { value: 'ultra', label: 'Ультра', desc: '4K', resolution: '3840x2160' },
];

const formats: Array<{ value: ExportSettings['format']; label: string; desc: string }> = [
  { value: 'mp4', label: 'MP4 (H.264)', desc: 'Универсальный' },
  { value: 'webm', label: 'WebM (VP9)', desc: 'Для веба' },
  { value: 'gif', label: 'GIF', desc: 'Анимация' },
];

const ExportPanel = () => {
  const { exportSettings, setExportSettings, project, tracks, assets } = useEditorStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');
  const [exportActualFormat, setExportActualFormat] = useState('');
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [resultFileName, setResultFileName] = useState('');
  const [resultSize, setResultSize] = useState(0);
  const [activePreset, setActivePreset] = useState('social');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rendererRef = useRef<any>(null);

  const clipCount = tracks.reduce((sum, t) => sum + t.clips.length, 0);

  const selectPreset = useCallback((preset: ExportPreset) => {
    setActivePreset(preset.id);
    if (preset.id !== 'custom' && Object.keys(preset.settings).length > 0) {
      setExportSettings(preset.settings);
    }
  }, [setExportSettings]);

  const handleExport = useCallback(async () => {
    if (clipCount === 0) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportStage('Подготовка...');
    setExportActualFormat('');
    setExportDone(false);
    setExportError('');
    setResultUrl('');

    try {
      let VideoRendererClass;
      try {
        const mod = await import('@/lib/video-renderer');
        VideoRendererClass = mod.VideoRenderer;
      } catch (importErr) {
        console.error('Dynamic import failed, reloading page:', importErr);
        window.location.reload();
        return;
      }
      const renderer = new VideoRendererClass();
      rendererRef.current = renderer;

      setExportStage('Инициализация...');
      await renderer.init();

      const result = await renderer.render(
        tracks,
        assets,
        exportSettings,
        (progress, stage) => {
          setExportProgress(Math.round(progress * 100));
          setExportStage(stage);
          if (stage.includes('MP4')) setExportActualFormat('MP4');
          else if (stage.includes('WebM')) setExportActualFormat('WebM');
          else if (stage.includes('GIF')) setExportActualFormat('GIF');
        }
      );

      const ext = result.fileName.split('.').pop() || exportSettings.format;
      const safeName = (project.name || 'video').replace(/[^\w\sа-яёА-ЯЁ-]/gi, '').trim().replace(/\s+/g, '_') || 'video';
      const projectFileName = `${safeName}.${ext}`;

      setResultUrl(result.url);
      setResultFileName(projectFileName);
      setResultSize(result.blob.size);
      setExportDone(true);
      renderer.terminate();
      rendererRef.current = null;
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(err instanceof Error ? err.message : 'Ошибка рендеринга');
      if (rendererRef.current) {
        rendererRef.current.terminate();
        rendererRef.current = null;
      }
    }

    setIsExporting(false);
  }, [tracks, assets, exportSettings, clipCount]);

  const handleCancel = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.terminate();
      rendererRef.current = null;
    }
    setIsExporting(false);
    setExportProgress(0);
    setExportStage('');
  }, []);

  const handleDownload = useCallback(() => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = resultFileName || `video.${exportSettings.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultUrl, resultFileName, exportSettings.format]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isGif = exportSettings.format === 'gif';
  const resultIsGif = resultFileName?.endsWith('.gif');

  return (
    <div className="flex flex-col h-full editor-panel rounded-lg overflow-hidden">
      <div className="editor-panel-header px-3 py-1.5 flex items-center gap-2">
        <Icon name="Film" size={14} />
        <span className="text-xs font-medium">Экспорт видео</span>
      </div>

      <ScrollArea className="flex-1 editor-scrollbar">
        <div className="p-3 space-y-3">
          <div className="p-2 rounded text-center" style={{ background: 'hsl(var(--editor-bg))' }}>
            <div className="text-lg font-semibold">{project.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {project.width}×{project.height} &bull; {project.fps}fps &bull; {clipCount} клипов
            </div>
          </div>

          {exportDone ? (
            <div className="space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                <Icon name="Check" size={28} className="text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{resultIsGif ? 'GIF готов!' : 'Видео готово!'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {resultFileName} &bull; {formatSize(resultSize)}
                </p>
              </div>

              {resultUrl && (
                <div className="rounded-lg overflow-hidden border border-border" style={{ background: 'hsl(var(--editor-bg))' }}>
                  {resultIsGif ? (
                    <img
                      src={resultUrl}
                      alt="GIF preview"
                      className="w-full max-h-[200px] object-contain"
                      style={{ background: '#000' }}
                    />
                  ) : (
                    <video
                      src={resultUrl}
                      controls
                      className="w-full max-h-[200px]"
                      style={{ background: '#000' }}
                    />
                  )}
                </div>
              )}

              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="Download" size={16} />
                {resultIsGif ? 'Скачать GIF' : 'Скачать видео'}
              </button>

              <button
                onClick={() => { setExportDone(false); setResultUrl(''); setExportError(''); }}
                className="nle-button w-full py-2 text-[10px]"
              >
                Назад к настройкам
              </button>
            </div>
          ) : isExporting ? (
            <div className="space-y-3 py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Icon name="Clapperboard" size={24} className="text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">{exportStage}</p>
                <p className="text-2xl font-bold mt-1">{exportProgress}%</p>
              </div>
              {exportActualFormat && (
                <div className="flex items-center justify-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    exportActualFormat === 'MP4' ? 'bg-emerald-500/20 text-emerald-400' :
                    exportActualFormat === 'GIF' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {exportActualFormat}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {exportSettings.resolution} · {exportSettings.fps} FPS
                  </span>
                </div>
              )}
              <Progress value={exportProgress} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center">
                Рендеринг выполняется прямо в браузере
              </p>
              <button
                onClick={handleCancel}
                className="nle-button w-full py-2 text-[10px] text-destructive"
              >
                Отменить
              </button>
            </div>
          ) : (
            <>
              {exportError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                  <Icon name="AlertCircle" size={14} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Ошибка рендеринга</p>
                    <p className="text-[10px] mt-0.5 opacity-80">{exportError}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Для чего экспортируем?</Label>
                <div className="grid grid-cols-1 gap-1 mt-1.5">
                  {presets.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p)}
                      className={`flex items-center gap-2.5 p-2 rounded text-left transition-colors ${activePreset === p.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}`}
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${activePreset === p.id ? 'bg-primary-foreground/15' : 'bg-background/50'}`}>
                        <Icon name={p.icon} size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{p.label}</div>
                        <div className={`text-[9px] truncate ${activePreset === p.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {activePreset !== 'custom' && (
                <div className="px-2 py-1.5 rounded text-[10px] text-muted-foreground" style={{ background: 'hsl(var(--editor-bg))' }}>
                  <div className="flex items-center justify-between">
                    <span>Формат:</span>
                    <span className="font-medium text-foreground">{exportSettings.format.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span>Разрешение:</span>
                    <span className="font-medium text-foreground">{exportSettings.resolution}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span>FPS:</span>
                    <span className="font-medium text-foreground">{exportSettings.fps}</span>
                  </div>
                  {!isGif && (
                    <div className="flex items-center justify-between mt-0.5">
                      <span>Битрейт:</span>
                      <span className="font-medium text-foreground">{exportSettings.bitrate} kbps</span>
                    </div>
                  )}
                </div>
              )}

              {activePreset === 'custom' && (
                <>
                  <Separator className="bg-border/50" />

                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Формат</Label>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      {formats.map(f => (
                        <button
                          key={f.value}
                          onClick={() => {
                            const codec = f.value === 'mp4' ? 'H.264' : f.value === 'webm' ? 'VP9' : 'gif';
                            setExportSettings({ format: f.value, codec });
                          }}
                          className={`p-2 rounded text-center transition-colors ${exportSettings.format === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}`}
                        >
                          <div className="text-xs font-medium">{f.label}</div>
                          <div className={`text-[9px] ${exportSettings.format === f.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isGif && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Качество</Label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {qualities.map(q => (
                          <button
                            key={q.value}
                            onClick={() => setExportSettings({ quality: q.value, resolution: q.resolution })}
                            className={`p-2 rounded text-left transition-colors ${exportSettings.quality === q.value ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'}`}
                          >
                            <div className="text-xs font-medium">{q.label}</div>
                            <div className="text-[9px] opacity-70">{q.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Разрешение</Label>
                      <Input
                        value={exportSettings.resolution}
                        onChange={e => setExportSettings({ resolution: e.target.value })}
                        placeholder="1920x1080"
                        className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">FPS</Label>
                      <Input
                        type="number"
                        value={exportSettings.fps}
                        onChange={e => setExportSettings({ fps: parseInt(e.target.value) || 30 })}
                        className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                      />
                    </div>
                  </div>

                  {!isGif && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Битрейт (kbps)</Label>
                      <Input
                        type="number"
                        value={exportSettings.bitrate}
                        onChange={e => setExportSettings({ bitrate: parseInt(e.target.value) || 8000 })}
                        className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                      />
                    </div>
                  )}
                </>
              )}

              <Separator className="bg-border/50" />

              <button
                onClick={handleExport}
                disabled={clipCount === 0}
                className="w-full py-3 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Icon name="Rocket" size={16} />
                {isGif ? 'Создать GIF' : 'Создать видео'}
              </button>

              {clipCount === 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Добавьте файлы на таймлайн, чтобы создать видео
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ExportPanel;