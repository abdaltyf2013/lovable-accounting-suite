import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { Settings as SettingsIcon, Moon, Sun, Percent } from 'lucide-react';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // تحميل الإعدادات من localStorage
    const savedTax = localStorage.getItem('tax_enabled');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTax !== null) {
      setTaxEnabled(savedTax === 'true');
    }
    if (savedTheme) {
      setThemeMode(savedTheme as 'light' | 'dark');
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    const newMode = checked ? 'dark' : 'light';
    setThemeMode(newMode);
    localStorage.setItem('theme', newMode);
    
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    toast({
      title: 'تم التحديث',
      description: 'تم حفظ الإعدادات بنجاح',
    });
  };

  const toggleTax = (checked: boolean) => {
    setTaxEnabled(checked);
    localStorage.setItem('tax_enabled', String(checked));
    
    toast({
      title: 'تم التحديث',
      description: 'تم حفظ الإعدادات بنجاح',
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">غير مسموح</h1>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5" />
              المظهر العام
            </CardTitle>
            <CardDescription>تغيير ألوان النظام للراحة البصرية</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              الإعدادات المالية
            </CardTitle>
            <CardDescription>التحكم في الضرائب والرسوم</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>تفعيل ضريبة القيمة المضافة (15%)</Label>
              <p className="text-xs text-muted-foreground">عند التعطيل، لن يتم حساب الضريبة في الفواتير الجديدة</p>
            </div>
            <Switch 
              checked={taxEnabled} 
              onCheckedChange={toggleTax} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
