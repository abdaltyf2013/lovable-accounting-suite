import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, CheckCircle2, Bell, MessageSquare, Calendar, User, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Debt {
  id: string;
  client_name: string;
  service_type: string;
  amount: number;
  debt_date: string;
  due_date: string | null;
  completion_date: string | null;
  status: 'pending' | 'paid';
  last_reminder_date: string | null;
  notes: string | null;
  created_at: string;
}

export default function Debts() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    service_type: '',
    amount: '',
    debt_date: new Date().toISOString().split('T')[0],
    due_date: '',
    completion_date: '',
    notes: '',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchDebts();
    }
  }, [isAdmin]);

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('debt_date', { ascending: false });

    if (!error && data) {
      setDebts(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('debts').insert({
      client_name: formData.client_name,
      service_type: formData.service_type,
      amount: Number(formData.amount),
      debt_date: formData.debt_date,
      due_date: formData.due_date || null,
      completion_date: formData.completion_date || null,
      notes: formData.notes || null,
      status: 'pending',
    });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في إضافة الدين', variant: 'destructive' });
    } else {
      toast({ title: 'تمت الإضافة', description: 'تم إضافة الدين بنجاح' });
      fetchDebts();
      setDialogOpen(false);
      setFormData({
        client_name: '',
        service_type: '',
        amount: '',
        debt_date: new Date().toISOString().split('T')[0],
        due_date: '',
        completion_date: '',
        notes: '',
      });
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const { error } = await supabase
      .from('debts')
      .update({ status: 'paid' })
      .eq('id', id);

    if (!error) {
      toast({ title: 'تم السداد', description: 'تم تحديث حالة الدين إلى مدفوع' });
      fetchDebts();
    }
  };

  const handleReminder = async (id: string) => {
    const { error } = await supabase
      .from('debts')
      .update({ last_reminder_date: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast({ title: 'تم التذكير', description: 'تم تسجيل تذكير العميل بنجاح' });
      fetchDebts();
    }
  };

  const getDebtColor = (debtDate: string) => {
    const days = Math.floor((new Date().getTime() - new Date(debtDate).getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'border-r-8 border-green-500 bg-green-50/30';
    if (days <= 15) return 'border-r-8 border-yellow-500 bg-yellow-50/30';
    if (days <= 30) return 'border-r-8 border-orange-500 bg-orange-50/30';
    return 'border-r-8 border-red-500 bg-red-50/30';
  };

  const canRemind = (lastReminder: string | null) => {
    if (!lastReminder) return true;
    const days = Math.floor((new Date().getTime() - new Date(lastReminder).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 3;
  };

  const filteredDebts = debts.filter(d => 
    d.client_name.toLowerCase().includes(search.toLowerCase()) ||
    d.service_type.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return <div className="p-10 text-center text-red-500 font-bold">عذراً، هذه الصفحة للمدير فقط.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الديون</h1>
          <p className="text-muted-foreground">مساعدك الشخصي لمتابعة مستحقاتك</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة دين جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>تسجيل دين جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم العميل</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>نوع الخدمة</Label>
                <Input
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  placeholder="مثلاً: طباعة كروت، تغليف..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>المبلغ</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاريخ الدين</Label>
                  <Input
                    type="date"
                    value={formData.debt_date}
                    onChange={(e) => setFormData({ ...formData, debt_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ السداد المتوقع</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>تاريخ إنجاز العمل</Label>
                <Input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">حفظ الدين</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن عميل أو خدمة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : filteredDebts.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد ديون مسجلة</CardContent></Card>
        ) : (
          filteredDebts.map((debt) => (
            <Card key={debt.id} className={cn("transition-all", debt.status === 'paid' ? 'opacity-60' : getDebtColor(debt.debt_date))}>
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-bold text-lg">{debt.client_name}</span>
                    {debt.status === 'paid' && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">مدفوع</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {debt.service_type}</div>
                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(debt.debt_date).toLocaleDateString('ar-SA')}</div>
                  </div>
                  {debt.notes && <p className="text-xs text-muted-foreground italic">ملاحظة: {debt.notes}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">{debt.amount} ريال</div>
                    {debt.due_date && <div className="text-xs text-orange-600 font-bold">موعد السداد: {new Date(debt.due_date).toLocaleDateString('ar-SA')}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    {debt.status === 'pending' && (
                      <>
                        <Button
                          variant={canRemind(debt.last_reminder_date) ? "destructive" : "outline"}
                          size="sm"
                          className="gap-1"
                          disabled={!canRemind(debt.last_reminder_date)}
                          onClick={() => handleReminder(debt.id)}
                        >
                          <Bell className="w-4 h-4" />
                          {canRemind(debt.last_reminder_date) ? "تذكير تواصل" : "تم التذكير"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleMarkAsPaid(debt.id)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          تم السداد
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
