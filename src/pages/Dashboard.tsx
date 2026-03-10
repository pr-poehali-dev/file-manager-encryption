import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import useAuth from '@/hooks/use-auth';
import { wallet, projects, media } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: number;
  name: string;
  description: string;
  thumbnail_url: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  status: string;
  created_at: string;
}

interface Purchase {
  id: number;
  item_type: string;
  item_id: string;
  item_name: string;
  price: number;
  status: string;
  created_at: string;
}

const typeLabels: Record<string, string> = {
  topup: 'Пополнение',
  purchase: 'Покупка',
  bonus: 'Бонус',
  admin_credit: 'Начисление',
  admin_debit: 'Списание',
};

const typeColors: Record<string, string> = {
  topup: 'text-green-400',
  purchase: 'text-red-400',
  bonus: 'text-yellow-400',
  admin_credit: 'text-blue-400',
  admin_debit: 'text-orange-400',
};

const Dashboard = () => {
  const { user, isAuthenticated, logout, loadProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [balance, setBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [mediaFiles, setMediaFiles] = useState<Array<{id: number; file_name: string; file_type: string; mime_type: string; file_size: number; duration: number; width: number; height: number; cdn_url: string; created_at: string}>>([]);
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile().then(() => {
      if (!useAuth.getState().isAuthenticated) {
        navigate('/auth');
        return;
      }
      loadData();
    });
  }, []);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setBalance(user.balance);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, txRes, purRes, balRes, mediaRes] = await Promise.all([
        projects.list(),
        wallet.transactions(),
        wallet.purchases(),
        wallet.balance(),
        media.list(),
      ]);
      setMyProjects(projRes.projects || []);
      setTransactions(txRes.items || []);
      setPurchases(purRes.items || []);
      setBalance(balRes.balance || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMediaFiles((mediaRes as any).files || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;
    try {
      const res = await wallet.topup(amount);
      setBalance(res.balance);
      setTopupAmount('');
      loadData();
    } catch { /* ignore */ }
  };

  const handleCreateProject = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await projects.create('Новый проект');
      if (res.project?.id) {
        navigate(`/editor/${res.project.id}`);
      } else {
        loadData();
      }
    } catch { /* ignore */ }
  };

  const handleSaveName = async () => {
    if (editName.trim()) {
      await updateProfile({ name: editName.trim() });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleRenameProject = async () => {
    if (!renameProject || !renameValue.trim()) return;
    try {
      await projects.save({ id: renameProject.id, name: renameValue.trim() });
      setMyProjects(prev => prev.map(p => p.id === renameProject.id ? { ...p, name: renameValue.trim() } : p));
      toast({ title: 'Проект переименован', description: `Новое название: ${renameValue.trim()}` });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось переименовать проект', variant: 'destructive' });
    }
    setRenameProject(null);
  };

  const handleInlineSave = async (projectId: number) => {
    if (!editingName.trim()) return;
    setSavingName(true);
    try {
      await projects.save({ id: projectId, name: editingName.trim() });
      setMyProjects(prev => prev.map(p => p.id === projectId ? { ...p, name: editingName.trim() } : p));
      toast({ title: 'Название сохранено' });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить название', variant: 'destructive' });
    }
    setSavingName(false);
    setEditingProjectId(null);
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;
    const name = deleteProject.name;
    try {
      await projects.delete(deleteProject.id);
      setMyProjects(prev => prev.filter(p => p.id !== deleteProject.id));
      toast({ title: 'Проект удалён', description: `«${name}» удалён` });
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось удалить проект', variant: 'destructive' });
    }
    setDeleteProject(null);
  };

  const handleDeleteMedia = async (fileId: number) => {
    try {
      await media.remove(fileId);
      setMediaFiles(prev => prev.filter(f => f.id !== fileId));
    } catch { /* ignore */ }
  };

  const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setMediaUploading(true);
    for (const file of Array.from(files)) {
      try {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await media.upload({
          file_data: b64,
          file_name: file.name,
          mime_type: file.type,
        });
        if (res.file) {
          setMediaFiles(prev => [res.file, ...prev]);
        }
      } catch { /* ignore */ }
    }
    setMediaUploading(false);
    e.target.value = '';
  }, []);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--editor-bg))' }}>
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <header className="border-b border-border" style={{ background: 'hsl(var(--editor-panel))' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon name="Film" size={16} className="text-primary" />
              </div>
              <span className="font-semibold text-sm">VideoForge</span>
            </button>
            <Separator orientation="vertical" className="h-6 bg-border/50" />
            <span className="text-xs text-muted-foreground">Личный кабинет</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--editor-bg))' }}>
              <Icon name="Wallet" size={14} className="text-green-400" />
              <span className="text-sm font-semibold">{balance.toFixed(0)} ₽</span>
            </div>
            <button onClick={() => navigate('/shop')} className="nle-button flex items-center gap-1.5">
              <Icon name="Store" size={12} />
              <span>Магазин</span>
            </button>
            <button onClick={handleCreateProject} className="nle-button flex items-center gap-1.5">
              <Icon name="Clapperboard" size={12} />
              <span>Новый проект</span>
            </button>
            {user.role === 'admin' && (
              <button onClick={() => navigate('/admin')} className="nle-button flex items-center gap-1.5">
                <Icon name="Shield" size={12} />
                <span>Админ</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-medium">{user.name}</div>
                <div className="text-[10px] text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="nle-button">
              <Icon name="LogOut" size={12} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList className="bg-transparent gap-1">
            <TabsTrigger value="projects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="FolderOpen" size={12} className="mr-1.5" /> Мои проекты
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="Wallet" size={12} className="mr-1.5" /> Кошелёк
            </TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="ShoppingBag" size={12} className="mr-1.5" /> Покупки
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="Image" size={12} className="mr-1.5" /> Медиа ({mediaFiles.length})
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="User" size={12} className="mr-1.5" /> Профиль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects">
            <div className="editor-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Icon name="FolderOpen" size={16} /> Мои проекты
                </h2>
                <button onClick={handleCreateProject} className="nle-button active flex items-center gap-1.5">
                  <Icon name="Plus" size={12} /> Новый проект
                </button>
              </div>
              {myProjects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Film" size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">У вас пока нет проектов</p>
                  <p className="text-xs mt-1">Создайте первый проект или перейдите в редактор</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {myProjects.map(p => (
                    <div key={p.id} className="rounded-lg overflow-hidden group hover:ring-1 hover:ring-primary/50 transition-all relative" style={{ background: 'hsl(var(--editor-bg))' }}>
                      <div onClick={() => navigate(`/editor/${p.id}`)} className="aspect-video flex items-center justify-center cursor-pointer" style={{ background: 'hsl(var(--editor-panel-header))' }}>
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="Film" size={32} className="text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="p-3">
                        {editingProjectId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleInlineSave(p.id);
                                if (e.key === 'Escape') setEditingProjectId(null);
                              }}
                              className="h-7 text-sm bg-secondary/50 border-border"
                              autoFocus
                            />
                            <button
                              onClick={() => handleInlineSave(p.id)}
                              disabled={savingName || !editingName.trim()}
                              className="shrink-0 h-7 px-2.5 rounded text-[10px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Icon name={savingName ? 'Loader2' : 'Check'} size={11} className={savingName ? 'animate-spin' : ''} />
                              Сохранить
                            </button>
                            <button
                              onClick={() => setEditingProjectId(null)}
                              className="shrink-0 w-7 h-7 rounded flex items-center justify-center hover:bg-secondary/50"
                            >
                              <Icon name="X" size={11} className="text-muted-foreground" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/editor/${p.id}`)}>
                              <div
                                className="text-sm font-medium truncate hover:text-primary transition-colors cursor-text"
                                onClick={(e) => { e.stopPropagation(); setEditingProjectId(p.id); setEditingName(p.name); }}
                                title="Нажмите, чтобы переименовать"
                              >
                                {p.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(p.updated_at).toLocaleDateString('ru-RU')}
                                {p.is_public && <span className="ml-2 text-green-400">Публичный</span>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingProjectId(p.id); setEditingName(p.name); }}
                          className="w-7 h-7 rounded-md bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                          title="Переименовать"
                        >
                          <Icon name="Pencil" size={12} className="text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteProject(p); }}
                          className="w-7 h-7 rounded-md bg-black/60 hover:bg-destructive flex items-center justify-center transition-colors"
                          title="Удалить"
                        >
                          <Icon name="Trash2" size={12} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wallet">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="editor-panel rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Баланс</h3>
                <div className="text-3xl font-bold text-green-400">{balance.toFixed(2)} ₽</div>
                <Separator className="my-4 bg-border/50" />
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">Пополнить</h4>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={topupAmount}
                    onChange={e => setTopupAmount(e.target.value)}
                    placeholder="Сумма"
                    className="bg-secondary/50 border-border text-sm"
                  />
                  <button onClick={handleTopup} className="nle-button active whitespace-nowrap px-4">
                    <Icon name="Plus" size={12} className="inline mr-1" /> Пополнить
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[100, 500, 1000, 5000].map(amt => (
                    <button key={amt} onClick={() => setTopupAmount(String(amt))} className="nle-button text-[10px] flex-1">
                      {amt}₽
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 editor-panel rounded-xl p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  История транзакций
                </h3>
                <ScrollArea className="h-80 editor-scrollbar">
                  {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Транзакций пока нет</p>
                  ) : (
                    <div className="space-y-1">
                      {transactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                              <Icon name={tx.amount > 0 ? 'ArrowDownLeft' : 'ArrowUpRight'} size={14} className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'} />
                            </div>
                            <div>
                              <div className="text-xs font-medium">{tx.description || typeLabels[tx.type] || tx.type}</div>
                              <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('ru-RU')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₽
                            </div>
                            <div className="text-[10px] text-muted-foreground">Баланс: {tx.balance_after.toFixed(2)} ₽</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="purchases">
            <div className="editor-panel rounded-xl p-4">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Icon name="ShoppingBag" size={16} /> Мои покупки
              </h2>
              {purchases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="ShoppingBag" size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Покупок пока нет</p>
                  <p className="text-xs mt-1">Доступные эффекты и расширения появятся в магазине</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: 'hsl(var(--editor-bg))' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon name="Package" size={18} className="text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{p.item_name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.item_type} • {new Date(p.created_at).toLocaleDateString('ru-RU')}</div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold">{p.price.toFixed(2)} ₽</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="media">
            <div className="editor-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Icon name="Image" size={16} /> Все загруженные файлы
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{mediaFiles.length} файлов</span>
                  <button onClick={() => mediaInputRef.current?.click()} disabled={mediaUploading} className="nle-button active flex items-center gap-1.5">
                    <Icon name={mediaUploading ? 'Loader2' : 'Upload'} size={12} className={mediaUploading ? 'animate-spin' : ''} />
                    {mediaUploading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                  <input ref={mediaInputRef} type="file" accept="video/*,audio/*,image/*" multiple onChange={handleMediaUpload} className="hidden" />
                </div>
              </div>
              {mediaFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="Image" size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Нет загруженных файлов</p>
                  <p className="text-xs mt-1">Нажмите «Загрузить», чтобы добавить медиа-файлы</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {mediaFiles.map(f => (
                    <div key={f.id} className="rounded-lg overflow-hidden group relative" style={{ background: 'hsl(var(--editor-bg))' }}>
                      <div className="aspect-video flex items-center justify-center relative" style={{ background: 'hsl(var(--editor-panel-header))' }}>
                        {f.file_type === 'image' ? (
                          <img src={f.cdn_url} alt={f.file_name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon name={f.file_type === 'audio' ? 'Music' : 'Film'} size={28} className="text-muted-foreground/40" />
                        )}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/60 text-white">
                          {f.file_type === 'image' ? 'Фото' : f.file_type === 'audio' ? 'Аудио' : 'Видео'}
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-[11px] font-medium truncate">{f.file_name}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {f.file_size > 1e6 ? (f.file_size / 1e6).toFixed(1) + ' МБ' : (f.file_size / 1e3).toFixed(0) + ' КБ'}
                          {f.duration > 0 && ` • ${Math.floor(f.duration / 60)}:${Math.floor(f.duration % 60).toString().padStart(2, '0')}`}
                          {' • '}{new Date(f.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMedia(f.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/60 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        title="Удалить"
                      >
                        <Icon name="Trash2" size={11} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="max-w-lg editor-panel rounded-xl p-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Icon name="User" size={16} /> Настройки профиля
              </h2>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Роль: {user.role === 'admin' ? 'Администратор' : 'Пользователь'} •
                    Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
              <Separator className="bg-border/50 mb-4" />
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground">Имя</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-secondary/50 border-border" />
                    <button onClick={handleSaveName} className="nle-button active px-4">Сохранить</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={user.email} disabled className="mt-1 bg-secondary/30 border-border opacity-60" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!renameProject} onOpenChange={() => setRenameProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Переименовать проект</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            placeholder="Название проекта"
            className="bg-secondary/50 border-border"
            onKeyDown={e => e.key === 'Enter' && handleRenameProject()}
            autoFocus
          />
          <DialogFooter className="gap-2">
            <button onClick={() => setRenameProject(null)} className="nle-button px-4">Отмена</button>
            <button onClick={handleRenameProject} disabled={!renameValue.trim()} className="nle-button active px-4">Сохранить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteProject} onOpenChange={() => setDeleteProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Удалить проект?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Проект <strong>«{deleteProject?.name}»</strong> будет удалён без возможности восстановления.
          </p>
          <DialogFooter className="gap-2">
            <button onClick={() => setDeleteProject(null)} className="nle-button px-4">Отмена</button>
            <button onClick={handleDeleteProject} className="nle-button px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;