import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import useAuth from '@/hooks/use-auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { login, register, loading, error, clearError, isAuthenticated, loadProfile } = useAuth();

  useEffect(() => {
    loadProfile().then(() => {
      if (useAuth.getState().isAuthenticated) navigate('/');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch {}
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(var(--editor-bg))' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Icon name="Film" size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold">VideoForge</h1>
          <p className="text-sm text-muted-foreground mt-1">Профессиональный видеоредактор</p>
        </div>

        <div className="editor-panel rounded-xl p-6">
          <div className="flex mb-6 rounded-lg overflow-hidden" style={{ background: 'hsl(var(--editor-bg))' }}>
            <button
              onClick={() => { setMode('login'); clearError(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Вход
            </button>
            <button
              onClick={() => { setMode('register'); clearError(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <Label className="text-xs text-muted-foreground">Имя</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ваше имя"
                  className="mt-1 bg-secondary/50 border-border"
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="mt-1 bg-secondary/50 border-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Пароль</Label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
                required
                minLength={mode === 'register' ? 6 : undefined}
                className="mt-1 bg-secondary/50 border-border"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <Icon name="AlertCircle" size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm transition-all bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  {mode === 'login' ? 'Вход...' : 'Регистрация...'}
                </span>
              ) : (
                mode === 'login' ? 'Войти' : 'Создать аккаунт'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={switchMode} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>

          {mode === 'register' && (
            <div className="mt-4 p-3 rounded-lg text-center" style={{ background: 'hsl(var(--editor-bg))' }}>
              <div className="flex items-center justify-center gap-1.5 text-xs text-green-400">
                <Icon name="Gift" size={14} />
                <span>100 ₽ бонус за регистрацию!</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          VideoForge v1.0 — Профессиональный видеоредактор
        </p>
      </div>
    </div>
  );
};

export default Auth;
