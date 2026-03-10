import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import useAuth from '@/hooks/use-auth';
import { shop, wallet } from '@/lib/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

interface ShopItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  icon: string;
  preview_url: string;
  features: string[];
  owned: boolean;
}

interface PromoResult {
  valid: boolean;
  code: string;
  discount_type: string;
  discount_value: number;
  discount: number;
  final_price: number;
  original_price: number;
}

const categoryLabels: Record<string, string> = {
  transitions: 'Переходы',
  titles: 'Титры',
  effects: 'Эффекты',
  audio: 'Аудио',
  templates: 'Шаблоны',
  features: 'Функции',
};

const categoryIcons: Record<string, string> = {
  transitions: 'Sparkles',
  titles: 'Type',
  effects: 'Palette',
  audio: 'Music',
  templates: 'Layout',
  features: 'Cpu',
};

const categoryColors: Record<string, string> = {
  transitions: 'from-purple-500/20 to-blue-500/20',
  titles: 'from-cyan-500/20 to-teal-500/20',
  effects: 'from-orange-500/20 to-red-500/20',
  audio: 'from-green-500/20 to-emerald-500/20',
  templates: 'from-pink-500/20 to-rose-500/20',
  features: 'from-yellow-500/20 to-amber-500/20',
};

const Shop = () => {
  const { user, isAuthenticated, loadProfile } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [checkingPromo, setCheckingPromo] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (user) setBalance(user.balance);
  }, [user]);

  useEffect(() => {
    setPromoCode('');
    setPromoResult(null);
    setPromoError('');
  }, [selectedItem]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await shop.catalog();
      setItems(data.items || []);
      setCategories(data.categories || []);
    } catch {}
    setLoading(false);
  };

  const handleCheckPromo = async () => {
    if (!promoCode.trim() || !selectedItem) return;
    setCheckingPromo(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const res = await shop.checkPromo(promoCode, selectedItem.slug);
      setPromoResult(res);
    } catch (e: any) {
      setPromoError(e.error || 'Недействительный промокод');
    }
    setCheckingPromo(false);
  };

  const handleBuy = useCallback(async (item: ShopItem) => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    if (item.owned) return;

    setBuying(item.slug);
    setMessage(null);
    try {
      const code = promoResult?.valid ? promoResult.code : '';
      const res = await shop.buy(item.slug, code);
      setBalance(res.balance);
      setItems(prev => prev.map(i => i.slug === item.slug ? { ...i, owned: true } : i));
      let msg = `${item.name} приобретён!`;
      if (res.discount > 0) msg += ` Скидка: ${res.discount.toFixed(0)} ₽`;
      setMessage({ type: 'success', text: msg });
      setSelectedItem(null);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.error || 'Ошибка покупки' });
    }
    setBuying(null);
  }, [isAuthenticated, navigate, promoResult]);

  const filteredItems = activeCategory
    ? items.filter(i => i.category === activeCategory)
    : items;

  const getFinalPrice = (item: ShopItem) => {
    if (promoResult?.valid && selectedItem?.slug === item.slug) {
      return promoResult.final_price;
    }
    return item.price;
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--editor-bg))' }}>
      <header className="border-b border-border" style={{ background: 'hsl(var(--editor-panel))' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Icon name="Film" size={16} className="text-primary" />
              </div>
              <span className="font-semibold text-sm">VideoForge</span>
            </button>
            <Separator orientation="vertical" className="h-6 bg-border/50" />
            <div className="flex items-center gap-1.5">
              <Icon name="Store" size={14} className="text-accent" />
              <span className="text-xs font-medium">Магазин</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'hsl(var(--editor-bg))' }}>
                <Icon name="Wallet" size={14} className="text-green-400" />
                <span className="text-sm font-semibold">{balance.toFixed(0)} ₽</span>
              </div>
            )}
            <button onClick={() => navigate('/')} className="nle-button flex items-center gap-1.5">
              <Icon name="Clapperboard" size={12} /> Редактор
            </button>
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="nle-button flex items-center gap-1.5">
                <Icon name="User" size={12} /> Кабинет
              </button>
            ) : (
              <button onClick={() => navigate('/auth')} className="nle-button active flex items-center gap-1.5">
                <Icon name="LogIn" size={12} /> Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Магазин VideoForge</h1>
          <p className="text-sm text-muted-foreground">Эффекты, переходы, музыка и расширения для ваших проектов</p>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'}`}>
            <Icon name={message.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={16} />
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><Icon name="X" size={14} /></button>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!activeCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'}`}
            >
              <Icon name={categoryIcons[cat] || 'Package'} size={12} />
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Icon name="Loader2" size={32} className="animate-spin text-primary mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`editor-panel rounded-xl overflow-hidden group cursor-pointer transition-all hover:ring-1 hover:ring-primary/40 ${item.owned ? 'ring-1 ring-green-500/30' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className={`h-32 bg-gradient-to-br ${categoryColors[item.category] || 'from-gray-500/20 to-gray-600/20'} flex items-center justify-center relative`}>
                  <div className="w-16 h-16 rounded-2xl bg-black/20 flex items-center justify-center backdrop-blur-sm">
                    <Icon name={item.icon || 'Package'} size={28} className="text-white/80" />
                  </div>
                  {item.owned && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Icon name="Check" size={10} /> Куплено
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="bg-black/40 text-white/80 text-[9px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {categoryLabels[item.category] || item.category}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold mb-1">{item.name}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    {item.owned ? (
                      <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <Icon name="CheckCircle" size={12} /> Установлено
                      </span>
                    ) : (
                      <span className="text-lg font-bold">{item.price.toFixed(0)} ₽</span>
                    )}
                    {!item.owned && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Купить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedItem(null)}>
          <div className="editor-panel rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`h-40 bg-gradient-to-br ${categoryColors[selectedItem.category] || 'from-gray-500/20 to-gray-600/20'} flex items-center justify-center relative`}>
              <div className="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center backdrop-blur-sm">
                <Icon name={selectedItem.icon || 'Package'} size={36} className="text-white/80" />
              </div>
              <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors">
                <Icon name="X" size={16} className="text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{categoryLabels[selectedItem.category]}</span>
                  <h2 className="text-lg font-bold">{selectedItem.name}</h2>
                </div>
                {!selectedItem.owned && (
                  <div className="text-right">
                    {promoResult?.valid ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">{selectedItem.price.toFixed(0)} ₽</span>
                        <span className="text-2xl font-bold text-green-400 ml-2">{promoResult.final_price.toFixed(0)} ₽</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">{selectedItem.price.toFixed(0)} ₽</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{selectedItem.description}</p>

              {selectedItem.features && selectedItem.features.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Что включено</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {selectedItem.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'hsl(var(--editor-bg))' }}>
                        <Icon name="Check" size={12} className="text-green-400 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedItem.owned && isAuthenticated && (
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-1.5 block">Промокод</label>
                  <div className="flex gap-2">
                    <Input
                      value={promoCode}
                      onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                      placeholder="Введите промокод"
                      className="bg-secondary/50 border-border text-sm uppercase"
                      onKeyDown={e => e.key === 'Enter' && handleCheckPromo()}
                    />
                    <button
                      onClick={handleCheckPromo}
                      disabled={!promoCode.trim() || checkingPromo}
                      className="nle-button active px-4 whitespace-nowrap disabled:opacity-50"
                    >
                      {checkingPromo ? (
                        <Icon name="Loader2" size={12} className="animate-spin" />
                      ) : (
                        'Применить'
                      )}
                    </button>
                  </div>
                  {promoResult?.valid && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs">
                      <Icon name="Tag" size={14} />
                      <span>
                        Скидка {promoResult.discount_type === 'percent' ? `${promoResult.discount_value}%` : `${promoResult.discount_value.toFixed(0)} ₽`}
                        {' '}— вы экономите {promoResult.discount.toFixed(0)} ₽
                      </span>
                    </div>
                  )}
                  {promoError && (
                    <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
                      <Icon name="AlertCircle" size={14} />
                      {promoError}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.owned ? (
                <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-green-500/10 text-green-400 text-sm font-medium">
                  <Icon name="CheckCircle" size={18} /> Уже установлено
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBuy(selectedItem)}
                    disabled={buying === selectedItem.slug}
                    className="flex-1 py-3 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {buying === selectedItem.slug ? (
                      <>
                        <Icon name="Loader2" size={16} className="animate-spin" /> Покупка...
                      </>
                    ) : (
                      <>
                        <Icon name="ShoppingBag" size={16} /> Купить за {getFinalPrice(selectedItem).toFixed(0)} ₽
                      </>
                    )}
                  </button>
                  {isAuthenticated && balance < getFinalPrice(selectedItem) && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-4 py-3 rounded-lg font-medium text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      Пополнить
                    </button>
                  )}
                </div>
              )}
              {isAuthenticated && !selectedItem.owned && balance < getFinalPrice(selectedItem) && (
                <p className="text-[11px] text-destructive mt-2 text-center">
                  Не хватает {(getFinalPrice(selectedItem) - balance).toFixed(0)} ₽. Пополните кошелёк.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
