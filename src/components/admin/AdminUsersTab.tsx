import { useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { admin } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  balance: number;
  projects_count: number;
}

interface AdminUsersTabProps {
  users: AdminUser[];
  setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>;
  totalUsers: number;
  setTotalUsers: React.Dispatch<React.SetStateAction<number>>;
  onReload: () => void;
}

const AdminUsersTab = ({ users, setUsers, totalUsers, setTotalUsers, onReload }: AdminUsersTabProps) => {
  const [search, setSearch] = useState('');
  const [adjustModal, setAdjustModal] = useState<{ userId: number; name: string } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const handleSearch = useCallback(async () => {
    try {
      const res = await admin.users(50, 0, search);
      setUsers(res.users || []);
      setTotalUsers(res.total || 0);
    } catch { /* ignore */ }
  }, [search, setUsers, setTotalUsers]);

  const toggleUserActive = async (u: AdminUser) => {
    try {
      await admin.updateUser({ user_id: u.id, is_active: !u.is_active });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    } catch { /* ignore */ }
  };

  const toggleUserRole = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await admin.updateUser({ user_id: u.id, role: newRole });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    } catch { /* ignore */ }
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
      onReload();
    } catch { /* ignore */ }
  };

  return (
    <>
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
    </>
  );
};

export default AdminUsersTab;