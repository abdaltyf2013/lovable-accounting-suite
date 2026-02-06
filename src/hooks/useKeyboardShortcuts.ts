import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const shortcuts: ShortcutAction[] = [
    {
      key: 'k',
      ctrl: true,
      action: () => {
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
      description: 'فتح البحث السريع',
    },
    {
      key: 'd',
      ctrl: true,
      alt: true,
      action: () => navigate('/dashboard'),
      description: 'لوحة التحكم',
    },
    {
      key: 'c',
      ctrl: true,
      alt: true,
      action: () => navigate('/clients'),
      description: 'العملاء',
    },
    {
      key: 't',
      ctrl: true,
      alt: true,
      action: () => navigate('/tasks'),
      description: 'المهام',
    },
    {
      key: 's',
      ctrl: true,
      alt: true,
      action: () => navigate('/sales'),
      description: 'المبيعات',
    },
    {
      key: 'p',
      ctrl: true,
      alt: true,
      action: () => navigate('/purchases'),
      description: 'المصروفات',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => {
        const event = new CustomEvent('open-new-dialog');
        window.dispatchEvent(event);
      },
      description: 'إنشاء جديد',
    },
    {
      key: '/',
      action: () => {
        const event = new CustomEvent('open-command-palette');
        window.dispatchEvent(event);
      },
      description: 'بحث',
    },
    {
      key: '?',
      shift: true,
      action: () => {
        const event = new CustomEvent('open-shortcuts-help');
        window.dispatchEvent(event);
      },
      description: 'عرض الاختصارات',
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // تجاهل إذا كان المستخدم يكتب في حقل إدخال
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // السماح فقط بـ Escape و Ctrl+K في حقول الإدخال
        if (event.key !== 'Escape' && !(event.ctrlKey && event.key === 'k')) {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export function getShortcutDisplay(shortcut: { key: string; ctrl?: boolean; alt?: boolean; shift?: boolean }) {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}
