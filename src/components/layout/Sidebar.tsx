import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
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
  Wallet,
  ClipboardList,
  Sparkles,
  ChevronLeft,
  Calculator
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  branchManagerOrAdmin?: boolean;
  accountantOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
  { title: 'المهام', href: '/tasks', icon: ClipboardList },
  { title: 'العملاء', href: '/clients', icon: Users },
  { title: 'المبيعات', href: '/sales', icon: FileText },
  { title: 'المصروفات', href: '/purchases', icon: ShoppingCart },
  { title: 'إدارة الديون', href: '/debts', icon: Wallet, adminOnly: true },
  { title: 'محاسبة الشركاء', href: '/partnership', icon: Calculator, branchManagerOrAdmin: true },
  { title: 'المحاسبين', href: '/accountants', icon: UserCircle, branchManagerOrAdmin: true },
  { title: 'التقارير', href: '/reports', icon: BarChart3, branchManagerOrAdmin: true },
  { title: 'ترتيب المحاسبين', href: '/ranking', icon: Trophy, branchManagerOrAdmin: true },
  { title: 'سجل التصفيات', href: '/settlements', icon: History },
  { title: 'سجل الرقابة', href: '/audit-log', icon: ShieldCheck, adminOnly: true },
  { title: 'الإعدادات', href: '/settings', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, signOut, isAdmin, isBranchManagerOrAdmin, userRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
    if (item.branchManagerOrAdmin) return isBranchManagerOrAdmin || isAdmin;
    return true;
  });

  const getRoleLabel = () => {
    if (isAdmin) return 'مدير';
    if (userRole === 'branch_manager') return 'مدير فرع';
    return 'محاسب';
  };

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-primary/20 text-primary';
    if (userRole === 'branch_manager') return 'bg-warning/20 text-warning';
    return 'bg-info/20 text-info';
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <h1 className="font-bold text-base">إشعار</h1>
              <p className="text-xs text-sidebar-foreground/60">نظام محاسبي v2</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-accent/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold text-sm">
            {profile?.full_name?.charAt(0) || 'م'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name}</p>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', getRoleBadgeColor())}>
                {getRoleLabel()}
              </span>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-sidebar-accent/30">
          <div className="flex items-center gap-2 text-sm">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {!collapsed && <span>الوضع الليلي</span>}
          </div>
          <Switch checked={isDark} onCheckedChange={toggleTheme} />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5 ml-2" />
          {!collapsed && 'تسجيل الخروج'}
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
        className="fixed top-4 right-4 z-50 lg:hidden bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg rounded-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 lg:static',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <NavContent />
        
        {/* Collapse Toggle - Desktop only */}
        <button
          className="hidden lg:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-sidebar border border-sidebar-border rounded-l-lg items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </aside>
    </>
  );
}
