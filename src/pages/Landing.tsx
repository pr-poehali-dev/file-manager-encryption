import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const Landing = () => {
  const navigate = useNavigate();
  
  const features = [
    {
      icon: 'Palette',
      title: 'Визуальный редактор сайта',
      description: 'Чтобы изменить и персонализировать шаблон'
    },
    {
      icon: 'ShoppingCart',
      title: 'Каталог товаров и корзина',
      description: 'С поиском и сортировкой'
    },
    {
      icon: 'LayoutDashboard',
      title: 'Кабинет продавца',
      description: 'Отображает заявки и оплаченные заказы'
    },
    {
      icon: 'CreditCard',
      title: 'Прием платежей',
      description: 'Онлайн и наличными через заявку'
    },
    {
      icon: 'Mail',
      title: 'Уведомления по почте',
      description: 'Никаких ручных напоминаний клиентам'
    },
    {
      icon: 'MapPin',
      title: 'Карточка в онлайн-картах',
      description: 'Реклама в геосервисах и сбор отзывов'
    },
    {
      icon: 'Star',
      title: 'Отзывы клиентов с карт',
      description: 'Автоматически подтягиваются на сайт'
    },
    {
      icon: 'MessageSquare',
      title: 'Форма обратной связи',
      description: 'Чтобы оставить заявку'
    },
    {
      icon: 'TrendingUp',
      title: 'SEO-оптимизация',
      description: 'Сайт продвигается в поисковиках'
    },
    {
      icon: 'Megaphone',
      title: 'Реклама через Я.Бизнес',
      description: 'Для продвижения в интернете'
    },
    {
      icon: 'Share2',
      title: 'Контакты и соцсети',
      description: 'Готовый блок с иконками ваших площадок'
    },
    {
      icon: 'Image',
      title: 'Фото, тексты, видео и ссылки',
      description: 'Ваш контент в красивой упаковке'
    },
    {
      icon: 'Shield',
      title: 'SSL-сертификат и защита от DDoS атак',
      description: 'Все для безопасности сайта'
    },
    {
      icon: 'Smartphone',
      title: 'Оптимизация под популярные устройства',
      description: 'Красиво на компьютере, планшете и смартфоне'
    },
    {
      icon: 'Sparkles',
      title: 'Полная персонализация шаблона',
      description: 'Настройте сайт под свой бренд'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Icon name="Zap" size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SitePro
            </span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="rounded-full">
              Возможности
            </Button>
            <Button variant="ghost" className="rounded-full">
              Тарифы
            </Button>
            <Button variant="default" className="rounded-full" onClick={() => navigate('/app')}>
              Попробовать бесплатно
            </Button>
          </div>
        </nav>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Создайте сайт мечты
            </span>
            <br />
            за считанные минуты
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Всё что нужно для успешного онлайн-бизнеса в одном решении. 
            Никакого кода, только результат.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="rounded-full text-lg px-8 h-14" onClick={() => navigate('/app')}>
              <Icon name="Rocket" size={20} className="mr-2" />
              Начать бесплатно
            </Button>
            <Button size="lg" variant="outline" className="rounded-full text-lg px-8 h-14">
              <Icon name="Play" size={20} className="mr-2" />
              Смотреть демо
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Все возможности
            </span>
            {' '}в одной платформе
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Мы собрали всё необходимое для запуска и роста вашего бизнеса
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card/50 backdrop-blur"
            >
              <CardContent className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                  <Icon name={feature.icon as any} size={24} className="text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <Card className="border-2 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 backdrop-blur">
          <CardContent className="p-12 text-center space-y-6">
            <h2 className="text-4xl font-bold">
              Готовы начать?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Присоединяйтесь к тысячам предпринимателей, которые уже запустили свой бизнес онлайн
            </p>
            <Button size="lg" className="rounded-full text-lg px-12 h-14" onClick={() => navigate('/app')}>
              <Icon name="Sparkles" size={20} className="mr-2" />
              Создать сайт бесплатно
            </Button>
            <p className="text-sm text-muted-foreground">
              Кредитная карта не требуется • Настройка за 5 минут
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Icon name="Zap" size={16} className="text-white" />
                </div>
                <span className="text-xl font-bold">SitePro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Создавайте профессиональные сайты без навыков программирования
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Продукт</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Возможности</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Тарифы</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Шаблоны</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Интеграции</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Компания</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">О нас</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Блог</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Карьера</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Контакты</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Поддержка</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Помощь</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Документация</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Статус</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 SitePro. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;