import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import useAuth from '@/hooks/use-auth';
import { admin, shop } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface Stats {
  total_users: number;
  new_users_week: number;
  total_balance: number;
  total_projects: number;
  total_purchases: number;
  revenue: number;
  transactions_today: number;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  balance: number;
  projects_count: number;
}

interface AdminTransaction {
  id: number;
  user_id: number;
  email: string;
  user_name: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Promo {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  applies_to: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const categoryOptions = [
  { value: 'all', label: 'Все категории' },
  { value: 'transitions', label: 'Переходы' },
  { value: 'titles', label: 'Титры' },
  { value: 'effects', label: 'Эффекты' },
  { value: 'audio', label: 'Аудио' },
  { value: 'templates', label: 'Шаблоны' },
  { value: 'features', label: 'Функции' },
];

const Admin = () => {
  const { loadProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [txList, setTxList] = useState<AdminTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState<{ userId: number; name: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [loading, setLoading] = useState(true);

  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoModal, setPromoModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    max_uses: '',
    applies_to: 'all',
    expires_at: '',
    min_purchase: '',
  });
  const [promoSaving, setPromoSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    loadProfile().then(() => {
      const state = useAuth.getState();
      if (!state.isAuthenticated || !state.isAdmin) {
        navigate('/auth');
        return;
      }
      loadAll();
    });
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, t] = await Promise.all([
        admin.stats(),
        admin.users(50),
        admin.transactions(50),
      ]);
      setStats(s);
      setUsers(u.users || []);
      setTotalUsers(u.total || 0);
      setTxList(t.items || []);
    } catch {}
    loadPromos();
    setLoading(false);
  };

  const loadPromos = async () => {
    try {
      const res = await shop.promos();
      setPromos(res.promos || []);
    } catch {}
  };

  const handleSearch = useCallback(async () => {
    try {
      const res = await admin.users(50, 0, search);
      setUsers(res.users || []);
      setTotalUsers(res.total || 0);
    } catch {}
  }, [search]);

  const toggleUserActive = async (u: AdminUser) => {
    try {
      await admin.updateUser({ user_id: u.id, is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    } catch {}
  };

  const toggleUserRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await admin.updateUser({ user_id: u.id, role: newRole });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    } catch {}
  };

  const handleAdjustBalance = async () => {
    if (!adjustModal) return;
    const amount = parseFloat(adjustAmount);
    if (!amount) return;
    try {
      await admin.adjustBalance(adjustModal.userId, amount, adjustReason || 'Корректировка админом');
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      loadAll();
    } catch {}
  };

  const openCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', applies_to: 'all', expires_at: '', min_purchase: '' });
    setPromoModal(true);
  };

  const openEditPromo = (p: Promo) => {
    setEditingPromo(p);
    setPromoForm({
      code: p.code,
      discount_type: p.discount_type,
      discount_value: String(p.discount_value),
      max_uses: p.max_uses ? String(p.max_uses) : '',
      applies_to: p.applies_to || 'all',
      expires_at: p.expires_at ? p.expires_at.slice(0, 16) : '',
      min_purchase: p.min_purchase ? String(p.min_purchase) : '',
    });
    setPromoModal(true);
  };

  const handleSavePromo = async () => {
    const code = promoForm.code.trim().toUpperCase();
    const dv = parseFloat(promoForm.discount_value);
    if (!code || !dv || dv <= 0) return;

    setPromoSaving(true);
    try {
      if (editingPromo) {
        await shop.updatePromo({
          id: editingPromo.id,
          code,
          discount_type: promoForm.discount_type,
          discount_value: dv,
          max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : null,
          applies_to: promoForm.applies_to,
          expires_at: promoForm.expires_at || null,
          min_purchase: promoForm.min_purchase ? parseFloat(promoForm.min_purchase) : 0,
        });
      } else {
        await shop.createPromo({
          code,
          discount_type: promoForm.discount_type,
          discount_value: dv,
          max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : undefined,
          applies_to: promoForm.applies_to,
          expires_at: promoForm.expires_at || undefined,
        });
      }
      setPromoModal(false);
      loadPromos();
    } catch {}
    setPromoSaving(false);
  };

  const handleTogglePromo = async (id: number) => {
    try {
      const res = await shop.togglePromo(id);
      setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: res.is_active } : p));
    } catch {}
  };

  const handleDeletePromo = async (id: number) => {
    try {
      await shop.deletePromo(id);
      setPromos(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch {}
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--editor-bg))' }}>
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const statCards = stats ? [
    { label: 'Пользователи', value: stats.total_users, icon: 'Users', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Новые за неделю', value: stats.new_users_week, icon: 'UserPlus', color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Проекты', value: stats.total_projects, icon: 'Film', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Покупки', value: stats.total_purchases, icon: 'ShoppingBag', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Общий баланс', value: stats.total_balance.toFixed(0) + ' ₽', icon: 'Wallet', color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Выручка', value: stats.revenue.toFixed(0) + ' ₽', icon: 'TrendingUp', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Транзакции сегодня', value: stats.transactions_today, icon: 'Activity', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ] : [];

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <header className="border-b border-border" style={{ background: 'hsl(var(--editor-panel))' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Icon name="Shield" size={16} className="text-red-400" />
              </div>
              <span className="font-semibold text-sm">Админ-панель</span>
            </button>
            <Separator orientation="vertical" className="h-6 bg-border/50" />
            <span className="text-xs text-muted-foreground">VideoForge</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="nle-button flex items-center gap-1.5">
              <Icon name="User" size={12} /> Кабинет
            </button>
            <button onClick={() => navigate('/')} className="nle-button flex items-center gap-1.5">
              <Icon name="Clapperboard" size={12} /> Редактор
            </button>
            <button onClick={loadAll} className="nle-button">
              <Icon name="RefreshCw" size={12} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {statCards.map(s => (
              <div key={s.label} className="editor-panel rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <Icon name={s.icon} size={14} className={s.color} />
                  </div>
                </div>
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-transparent gap-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="Users" size={12} className="mr-1.5" /> Пользователи ({totalUsers})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="Activity" size={12} className="mr-1.5" /> Транзакции
            </TabsTrigger>
            <TabsTrigger value="promos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Icon name="Tag" size={12} className="mr-1.5" /> Промокоды ({promos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="editor-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Поиск по email или имени..."
                  className="max-w-sm bg-secondary/50 border-border text-sm"
                />
                <button onClick={handleSearch} className="nle-button active">
                  <Icon name="Search" size={12} />
                </button>
              </div>

              <ScrollArea className="editor-scrollbar">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">ID</th>
                      <th className="text-left py-2 px-3 font-medium">Пользователь</th>
                      <th className="text-left py-2 px-3 font-medium">Роль</th>
                      <th className="text-left py-2 px-3 font-medium">Баланс</th>
                      <th className="text-left py-2 px-3 font-medium">Проекты</th>
                      <th className="text-left py-2 px-3 font-medium">Дата</th>
                      <th className="text-left py-2 px-3 font-medium">Статус</th>
                      <th className="text-right py-2 px-3 font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/20 transition-colors">
                        <td className="py-2.5 px-3 text-muted-foreground">#{u.id}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <button onClick={() => toggleUserRole(u)} className={`px-2 py-0.5 rounded text-[10px] font-medium ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {u.role === 'admin' ? 'Админ' : 'Пользователь'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-green-400 font-medium">{u.balance.toFixed(0)} ₽</td>
                        <td className="py-2.5 px-3">{u.projects_count}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                        <td className="py-2.5 px-3">
                          <Switch checked={u.is_active} onCheckedChange={() => toggleUserActive(u)} />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button onClick={() => setAdjustModal({ userId: u.id, name: u.name })} className="nle-button text-[10px]">
                            <Icon name="Wallet" size={10} className="inline mr-1" /> Баланс
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="editor-panel rounded-xl p-4">
              <ScrollArea className="h-96 editor-scrollbar">
                <div className="space-y-1">
                  {txList.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <Icon name={tx.amount > 0 ? 'ArrowDownLeft' : 'ArrowUpRight'} size={14} className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'} />
                        </div>
                        <div>
                          <div className="text-xs font-medium">{tx.description || tx.type}</div>
                          <div className="text-[10px] text-muted-foreground">{tx.user_name} ({tx.email})</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} ₽
                        </div>
                        <div className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('ru-RU')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="promos">
            <div className="editor-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Управление промокодами</h3>
                <button onClick={openCreatePromo} className="nle-button active flex items-center gap-1.5 text-xs">
                  <Icon name="Plus" size={12} /> Создать промокод
                </button>
              </div>

              {promos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <Icon name="Tag" size={32} className="mx-auto mb-3 opacity-30" />
                  <p>Промокодов пока нет</p>
                </div>
              ) : (
                <ScrollArea className="editor-scrollbar">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 px-3 font-medium">Код</th>
                        <th className="text-left py-2 px-3 font-medium">Скидка</th>
                        <th className="text-left py-2 px-3 font-medium">Категория</th>
                        <th className="text-left py-2 px-3 font-medium">Использовано</th>
                        <th className="text-left py-2 px-3 font-medium">Истекает</th>
                        <th className="text-left py-2 px-3 font-medium">Статус</th>
                        <th className="text-right py-2 px-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        const isExhausted = p.max_uses && p.used_count >= p.max_uses;
                        return (
                          <tr key={p.id} className={`border-b border-border/30 hover:bg-secondary/20 transition-colors ${(!p.is_active || isExpired || isExhausted) ? 'opacity-50' : ''}`}>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{p.code}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold">
                                {p.discount_type === 'percent' ? `${p.discount_value}%` : `${p.discount_value.toFixed(0)} ₽`}
                              </span>
                              {p.min_purchase > 0 && (
                                <div className="text-[10px] text-muted-foreground">от {p.min_purchase.toFixed(0)} ₽</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.applies_to === 'all' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                {categoryOptions.find(c => c.value === p.applies_to)?.label || p.applies_to}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.used_count}</span>
                                {p.max_uses ? (
                                  <>
                                    <span className="text-muted-foreground">/ {p.max_uses}</span>
                                    <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${p.used_count >= p.max_uses ? 'bg-red-400' : p.used_count > p.max_uses * 0.7 ? 'bg-yellow-400' : 'bg-green-400'}`}
                                        style={{ width: `${Math.min(100, (p.used_count / p.max_uses) * 100)}%` }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">/ ∞</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              {p.expires_at ? (
                                <span className={isExpired ? 'text-red-400' : 'text-muted-foreground'}>
                                  {new Date(p.expires_at).toLocaleDateString('ru-RU')}
                                  {isExpired && <span className="ml-1 text-[10px]">(истёк)</span>}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Бессрочно</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Switch checked={p.is_active} onCheckedChange={() => handleTogglePromo(p.id)} />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openEditPromo(p)} className="nle-button text-[10px] px-2 py-1">
                                  <Icon name="Pencil" size={10} />
                                </button>
                                {deleteConfirm === p.id ? (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => handleDeletePromo(p.id)} className="px-2 py-1 rounded text-[10px] font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Да
                                    </button>
                                    <button onClick={() => setDeleteConfirm(null)} className="nle-button text-[10px] px-2 py-1">
                                      Нет
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setDeleteConfirm(p.id)} className="nle-button text-[10px] px-2 py-1 hover:text-destructive">
                                    <Icon name="Trash2" size={10} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {adjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="editor-panel rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-semibold mb-1">Корректировка баланса</h3>
            <p className="text-xs text-muted-foreground mb-4">{adjustModal.name} (ID: {adjustModal.userId})</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Сумма (+ начислить, - списать)</label>
                <Input
                  type="number"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                  placeholder="100 или -50"
                  className="mt-1 bg-secondary/50 border-border"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Причина</label>
                <Input
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="Причина корректировки"
                  className="mt-1 bg-secondary/50 border-border"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdjustBalance} className="flex-1 py-2 rounded font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90">
                  Применить
                </button>
                <button onClick={() => setAdjustModal(null)} className="flex-1 nle-button py-2">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {promoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPromoModal(false)}>
          <div className="editor-panel rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{editingPromo ? 'Редактировать промокод' : 'Новый промокод'}</h3>
              <button onClick={() => setPromoModal(false)} className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center">
                <Icon name="X" size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Код промокода</label>
                <Input
                  value={promoForm.code}
                  onChange={e => setPromoForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER2025"
                  className="bg-secondary/50 border-border font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Тип скидки</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={e => setPromoForm(prev => ({ ...prev, discount_type: e.target.value }))}
                    className="w-full h-9 rounded-md bg-secondary/50 border border-border text-sm px-3"
                  >
                    <option value="percent">Процент (%)</option>
                    <option value="fixed">Фиксированная (₽)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Размер скидки {promoForm.discount_type === 'percent' ? '(%)' : '(₽)'}
                  </label>
                  <Input
                    type="number"
                    value={promoForm.discount_value}
                    onChange={e => setPromoForm(prev => ({ ...prev, discount_value: e.target.value }))}
                    placeholder={promoForm.discount_type === 'percent' ? '20' : '100'}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
                  <select
                    value={promoForm.applies_to}
                    onChange={e => setPromoForm(prev => ({ ...prev, applies_to: e.target.value }))}
                    className="w-full h-9 rounded-md bg-secondary/50 border border-border text-sm px-3"
                  >
                    {categoryOptions.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Макс. использований</label>
                  <Input
                    type="number"
                    value={promoForm.max_uses}
                    onChange={e => setPromoForm(prev => ({ ...prev, max_uses: e.target.value }))}
                    placeholder="∞ (пусто = без лимита)"
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Мин. сумма покупки (₽)</label>
                  <Input
                    type="number"
                    value={promoForm.min_purchase}
                    onChange={e => setPromoForm(prev => ({ ...prev, min_purchase: e.target.value }))}
                    placeholder="0"
                    className="bg-secondary/50 border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Истекает</label>
                  <Input
                    type="datetime-local"
                    value={promoForm.expires_at}
                    onChange={e => setPromoForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="bg-secondary/50 border-border"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSavePromo}
                  disabled={promoSaving || !promoForm.code.trim() || !promoForm.discount_value}
                  className="flex-1 py-2.5 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {promoSaving ? (
                    <Icon name="Loader2" size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Icon name={editingPromo ? 'Save' : 'Plus'} size={14} />
                      {editingPromo ? 'Сохранить' : 'Создать'}
                    </>
                  )}
                </button>
                <button onClick={() => setPromoModal(false)} className="nle-button py-2.5 px-6">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
