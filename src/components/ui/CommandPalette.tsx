import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  ClipboardList,
  Settings,
  Wallet,
  BarChart3,
  X,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'dashboard',
      title: 'لوحة التحكم',
      subtitle: 'الذهاب إلى لوحة التحكم الرئيسية',
      icon: <LayoutDashboard className="w-4 h-4" />,
      action: () => navigate('/dashboard'),
      keywords: ['home', 'main', 'رئيسية'],
    },
    {
      id: 'clients',
      title: 'العملاء',
      subtitle: 'إدارة العملاء',
      icon: <Users className="w-4 h-4" />,
      action: () => navigate('/clients'),
      keywords: ['customers', 'عميل'],
    },
    {
      id: 'tasks',
      title: 'المهام',
      subtitle: 'إدارة المهام والأعمال',
      icon: <ClipboardList className="w-4 h-4" />,
      action: () => navigate('/tasks'),
      keywords: ['work', 'todo', 'مهمة'],
    },
    {
      id: 'sales',
      title: 'المبيعات',
      subtitle: 'فواتير المبيعات',
      icon: <FileText className="w-4 h-4" />,
      action: () => navigate('/sales'),
      keywords: ['invoice', 'فاتورة', 'بيع'],
    },
    {
      id: 'purchases',
      title: 'المصروفات',
      subtitle: 'فواتير المشتريات',
      icon: <ShoppingCart className="w-4 h-4" />,
      action: () => navigate('/purchases'),
      keywords: ['expense', 'شراء', 'مصروف'],
    },
    {
      id: 'debts',
      title: 'الديون',
      subtitle: 'إدارة الديون',
      icon: <Wallet className="w-4 h-4" />,
      action: () => navigate('/debts'),
      keywords: ['debt', 'دين'],
    },
    {
      id: 'reports',
      title: 'التقارير',
      subtitle: 'عرض التقارير والإحصائيات',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => navigate('/reports'),
      keywords: ['report', 'تقرير', 'إحصائيات'],
    },
    {
      id: 'settings',
      title: 'الإعدادات',
      subtitle: 'إعدادات النظام',
      icon: <Settings className="w-4 h-4" />,
      action: () => navigate('/settings'),
      keywords: ['setting', 'إعداد', 'تهيئة'],
    },
  ];

  const filteredCommands = commands.filter((command) => {
    const searchLower = search.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.subtitle?.toLowerCase().includes(searchLower) ||
      command.keywords?.some((k) => k.toLowerCase().includes(searchLower))
    );
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
            setSearch('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearch('');
          break;
      }
    },
    [isOpen, filteredCommands, selectedIndex]
  );

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-command-palette', handleOpen);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-palette', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 p-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن صفحة أو إجراء..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">ESC</kbd>
                  <span>للإغلاق</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    لا توجد نتائج للبحث
                  </div>
                ) : (
                  filteredCommands.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={() => {
                        command.action();
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-colors',
                        index === selectedIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          index === selectedIndex
                            ? 'bg-primary-foreground/20'
                            : 'bg-primary/10'
                        )}
                      >
                        <span className={index === selectedIndex ? '' : 'text-primary'}>
                          {command.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{command.title}</p>
                        {command.subtitle && (
                          <p
                            className={cn(
                              'text-xs truncate',
                              index === selectedIndex
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {command.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3" />
                  <span>Ctrl + K للفتح</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
                  <span>للتنقل</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>
                  <span>للاختيار</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
