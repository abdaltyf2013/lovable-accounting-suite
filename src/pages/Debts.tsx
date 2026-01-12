import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function Debts() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <div className="p-10 text-center text-red-500 font-bold">عذراً، هذه الصفحة للمدير فقط.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إدارة الديون</h1>
        <p className="text-muted-foreground">مساعدك الشخصي لمتابعة مستحقاتك</p>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <Construction className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">قيد التطوير</h2>
          <p className="text-muted-foreground">
            هذه الميزة قيد التطوير وستكون متاحة قريباً
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
