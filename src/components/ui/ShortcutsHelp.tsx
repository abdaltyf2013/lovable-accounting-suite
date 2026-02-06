import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'K'], description: 'فتح البحث السريع', category: 'تنقل' },
  { keys: ['/'], description: 'بحث', category: 'تنقل' },
  { keys: ['Ctrl', 'Alt', 'D'], description: 'لوحة التحكم', category: 'صفحات' },
  { keys: ['Ctrl', 'Alt', 'C'], description: 'العملاء', category: 'صفحات' },
  { keys: ['Ctrl', 'Alt', 'T'], description: 'المهام', category: 'صفحات' },
  { keys: ['Ctrl', 'Alt', 'S'], description: 'المبيعات', category: 'صفحات' },
  { keys: ['Ctrl', 'Alt', 'P'], description: 'المصروفات', category: 'صفحات' },
  { keys: ['Ctrl', 'N'], description: 'إنشاء جديد', category: 'إجراءات' },
  { keys: ['Shift', '?'], description: 'عرض الاختصارات', category: 'مساعدة' },
];

export function ShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-shortcuts-help', handleOpen);
    return () => window.removeEventListener('open-shortcuts-help', handleOpen);
  }, []);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">اختصارات لوحة المفاتيح</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto space-y-6">
                {Object.entries(groupedShortcuts).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {items.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                        >
                          <span className="text-sm">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, i) => (
                              <span key={i}>
                                <kbd className="px-2 py-1 bg-background border border-border rounded text-xs font-mono">
                                  {key}
                                </kbd>
                                {i < shortcut.keys.length - 1 && (
                                  <span className="mx-1 text-muted-foreground">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-muted/30">
                <p className="text-xs text-center text-muted-foreground">
                  اضغط <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">ESC</kbd> أو انقر خارج النافذة للإغلاق
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
