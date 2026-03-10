import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import useEditorStore from '@/hooks/use-editor-store';
import useAuth from '@/hooks/use-auth';
import { projects } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const tools = [
  { id: 'select', icon: 'MousePointer2', label: 'Выделение (V)', key: 'v' },
  { id: 'cut', icon: 'Scissors', label: 'Разрезка (C)', key: 'c' },
  { id: 'slip', icon: 'GripHorizontal', label: 'Сдвиг (Y)', key: 'y' },
  { id: 'text', icon: 'Type', label: 'Текст (T)', key: 't' },
  { id: 'hand', icon: 'Hand', label: 'Рука (H)', key: 'h' },
  { id: 'zoom', icon: 'Search', label: 'Масштаб (Z)', key: 'z' },
];

const Toolbar = () => {
  const { project, getProjectData, setActivePanel } = useEditorStore();
  const { user, isAuthenticated, loadProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTool, setActiveTool] = useState('select');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadProfile(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) setShowProjectMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = useCallback(async () => {
    if (!project.id || !isAuthenticated) return;
    setSaving(true);
    try {
      const data = getProjectData();
      const persistableAssets = data.assets.filter(a => a.url && !a.url.startsWith('blob:'));
      const validAssetIds = new Set(persistableAssets.map(a => a.id));
      const cleanTracks = data.tracks.map(t => ({
        ...t,
        clips: t.clips.filter(c => !c.assetId || validAssetIds.has(c.assetId)),
      }));
      await projects.save({
        id: project.id,
        name: data.project.name,
        project_data: {
          tracks: cleanTracks,
          assets: persistableAssets,
          project: { name: data.project.name, width: data.project.width, height: data.project.height, fps: data.project.fps, duration: data.project.duration },
          exportSettings: data.exportSettings,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  }, [project.id, isAuthenticated, getProjectData]);

  const handleNewProject = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await projects.create('Новый проект');
      if (res.project?.id) navigate(`/editor/${res.project.id}`);
    } catch { /* ignore */ }
    setShowProjectMenu(false);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    if (!autoSaveEnabled || !project.id || !isAuthenticated) return;
    autoSaveRef.current = setInterval(() => {
      handleSave();
    }, 2 * 60 * 1000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [autoSaveEnabled, project.id, isAuthenticated, handleSave]);

  return (
    <div className="h-10 flex items-center justify-between px-3 border-b border-border" style={{ background: 'hsl(var(--editor-panel))' }}>
      <div className="flex items-center gap-2">
        <div ref={projectMenuRef} className="flex items-center gap-1.5 mr-3 relative">
          <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-secondary/50 transition-colors">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <Icon name="Film" size={11} className="text-primary" />
            </div>
            <span className="text-xs font-semibold">VideoForge</span>
            <Icon name="ChevronDown" size={10} className="text-muted-foreground" />
          </button>
          {showProjectMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-md border border-border shadow-lg" style={{ background: 'hsl(var(--popover))' }}>
              <div className="p-1">
                <button onClick={() => { navigate('/dashboard'); setShowProjectMenu(false); }} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-secondary/50">
                  <Icon name="FolderOpen" size={11} /> Мои проекты
                </button>
                <button onClick={handleNewProject} className="flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-secondary/50">
                  <Icon name="FilePlus" size={11} /> Новый проект
                </button>
                <div className="border-t border-border my-1" />
                <button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded hover:bg-secondary/50">
                  <span className="flex items-center gap-2">
                    <Icon name="Timer" size={11} /> Автосохранение
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${autoSaveEnabled ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {autoSaveEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <Separator orientation="vertical" className="h-5 bg-border/50" />

        <div className="flex items-center gap-0.5 ml-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="nle-button"><Icon name="Undo2" size={12} /></button>
            </TooltipTrigger>
            <TooltipContent><p className="text-[10px]">Отменить (Ctrl+Z)</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="nle-button"><Icon name="Redo2" size={12} /></button>
            </TooltipTrigger>
            <TooltipContent><p className="text-[10px]">Повторить (Ctrl+Shift+Z)</p></TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-5 bg-border/50" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSave}
              disabled={saving || !project.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Icon
                name={saved ? 'Check' : saving ? 'Loader2' : 'Save'}
                size={13}
                className={saving ? 'animate-spin' : ''}
              />
              {saved ? 'Сохранено!' : saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </TooltipTrigger>
          <TooltipContent><p className="text-[10px]">Сохранить проект (Ctrl+S)</p></TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-0.5">
        {tools.map(tool => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool(tool.id)}
                className={`nle-button ${activeTool === tool.id ? 'active' : ''}`}
              >
                <Icon name={tool.icon} size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent><p className="text-[10px]">{tool.label}</p></TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">
          {project.width}×{project.height} | {project.fps}fps
        </span>
        <Separator orientation="vertical" className="h-5 bg-border/50" />

        <button
          onClick={() => setActivePanel('export')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
        >
          <Icon name="Film" size={13} />
          Создать видео
        </button>

        <Separator orientation="vertical" className="h-5 bg-border/50" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => navigate('/shop')} className="nle-button flex items-center gap-1">
              <Icon name="Store" size={11} />
              <span className="text-[10px]">Магазин</span>
            </button>
          </TooltipTrigger>
          <TooltipContent><p className="text-[10px]">Магазин эффектов</p></TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="h-5 bg-border/50" />
        {isAuthenticated && user ? (
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-secondary/50 transition-colors">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-[10px]">{user.name}</span>
          </button>
        ) : (
          <button onClick={() => navigate('/auth')} className="nle-button active flex items-center gap-1">
            <Icon name="LogIn" size={11} />
            <span className="text-[10px]">Войти</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toolbar;