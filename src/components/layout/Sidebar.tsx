import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Building2,
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  LogOut,
  UserCircle,
  Menu,
  X,
  Trophy,
  History,
  ShieldCheck,
  Moon,
  Sun,
  CreditCard,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { title: 'العملاء', href: '/clients', icon: Users },
  { title: 'فواتير المبيعات', href: '/sales', icon: FileText },
  { title: 'فواتير المشتريات', href: '/purchases', icon: ShoppingCart },
  { title: 'إدارة الديون', href: '/debts', icon: Wallet, adminOnly: true },
  { title: 'المحاسبين', href: '/accountants', icon: UserCircle, adminOnly: true },
  { title: 'التقارير', href: '/reports', icon: BarChart3, adminOnly: true },
  { title: 'ترتيب المحاسبين', href: '/ranking', icon: Trophy, adminOnly: true },
  { title: 'سجل التصفيات', href: '/settlements', icon: History },
  { title: 'سجل الرقابة', href: '/audit-log', icon: ShieldCheck, adminOnly: true },
  { title: 'الإعدادات', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = (checked: boolean) => {
    setIsDark(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">سمو الأمجاد</h1>
            <p className="text-xs text-sidebar-foreground/70">نظام المحاسبة</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-sidebar-foreground/70">
              {isAdmin ? 'مدير' : 'محاسب'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-sidebar-accent/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>الوضع الليلي</span>
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 lg:hidden bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:translate-x-0 lg:static',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
