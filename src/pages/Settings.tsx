import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Moon, Sun, Keyboard, Palette } from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { Button } from '@/components/ui/button';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { themeMode, setThemeMode } = useTheme();
  const { toast } = useToast();

  const toggleTheme = (checked: boolean) => {
    setThemeMode(checked ? 'dark' : 'light');
    toast({
      title: 'تم التحديث',
      description: 'تم حفظ الإعدادات بنجاح',
    });
  };

  const openShortcutsHelp = () => {
    window.dispatchEvent(new CustomEvent('open-shortcuts-help'));
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">غير مسموح</h1>
        <p>هذه الصفحة مخصصة للمدير فقط</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">إعدادات النظام</h1>
          <p className="text-muted-foreground text-sm">تحكم في خصائص النظام العامة</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* المظهر العام */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              المظهر العام
            </CardTitle>
            <CardDescription>تغيير ألوان النظام للراحة البصرية</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>الوضع الليلي</Label>
                <p className="text-xs text-muted-foreground">تفعيل المظهر الداكن للنظام</p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-muted-foreground" />
                <Switch 
                  checked={themeMode === 'dark'} 
                  onCheckedChange={toggleTheme} 
                />
                <Moon className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            
            <div className="border-t pt-6">
              <ThemeSelector />
            </div>
          </CardContent>
        </Card>

        {/* اختصارات لوحة المفاتيح */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              اختصارات لوحة المفاتيح
            </CardTitle>
            <CardDescription>تعرف على الاختصارات المتاحة للتنقل السريع</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm">استخدم اختصارات لوحة المفاتيح للتنقل بسرعة</p>
                <p className="text-xs text-muted-foreground">
                  اضغط <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl + K</kbd> للبحث السريع
                </p>
              </div>
              <Button variant="outline" onClick={openShortcutsHelp}>
                <Keyboard className="w-4 h-4 ml-2" />
                عرض الاختصارات
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
