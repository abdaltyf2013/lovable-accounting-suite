import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle, Bell, MessageSquare, Trash2, Calendar, Clock, AlertTriangle, Pencil } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Debt {
  id: string;
  client_name: string;
  service_type: string;
  amount: number;
  paid_amount: number;
  work_completion_date: string;
  expected_payment_date: string;
  status: 'pending' | 'paid' | 'overdue';
  notes: string | null;
  last_reminder_date: string | null;
  created_at: string;
}

interface DebtNote {
  id: string;
  debt_id: string;
  note: string;
  created_at: string;
}

const SERVICE_TYPES = [
  'طباعة كروت',
  'تغليف',
  'خدمات إلكترونية',
  'تصميم',
  'طباعة مستندات',
  'أخرى'
];

export default function Debts() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [debtNotes, setDebtNotes] = useState<DebtNote[]>([]);
  const [newNote, setNewNote] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    client_name: '',
    service_type: '',
    amount: '',
    work_completion_date: '',
    expected_payment_date: '',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    client_name: '',
    service_type: '',
    amount: '',
    work_completion_date: '',
    expected_payment_date: '',
    notes: ''
  });

  useEffect(() => {
    if (isAdmin) {
      fetchDebts();
    }
  }, [isAdmin]);

  const fetchDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('expected_payment_date', { ascending: true });

      if (error) throw error;
      setDebts((data as Debt[]) || []);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل الديون',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebt = async () => {
    if (!formData.client_name || !formData.service_type || !formData.amount || 
        !formData.work_completion_date || !formData.expected_payment_date) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.from('debts').insert({
        client_name: formData.client_name,
        service_type: formData.service_type,
        amount: parseFloat(formData.amount),
        work_completion_date: formData.work_completion_date,
        expected_payment_date: formData.expected_payment_date,
        notes: formData.notes || null,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تمت إضافة الدين الجديد'
      });

      setFormData({
        client_name: '',
        service_type: '',
        amount: '',
        work_completion_date: '',
        expected_payment_date: '',
        notes: ''
      });
      setIsAddDialogOpen(false);
      fetchDebts();
    } catch (error) {
      console.error('Error adding debt:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة الدين',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (debt: Debt) => {
    setEditingDebt(debt);
    setEditFormData({
      client_name: debt.client_name,
      service_type: debt.service_type,
      amount: debt.amount.toString(),
      work_completion_date: debt.work_completion_date,
      expected_payment_date: debt.expected_payment_date,
      notes: debt.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditDebt = async () => {
    if (!editingDebt) return;
    
    if (!editFormData.client_name || !editFormData.service_type || !editFormData.amount || 
        !editFormData.work_completion_date || !editFormData.expected_payment_date) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('debts')
        .update({
          client_name: editFormData.client_name,
          service_type: editFormData.service_type,
          amount: parseFloat(editFormData.amount),
          work_completion_date: editFormData.work_completion_date,
          expected_payment_date: editFormData.expected_payment_date,
          notes: editFormData.notes || null
        })
        .eq('id', editingDebt.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث الدين'
      });

      setIsEditDialogOpen(false);
      setEditingDebt(null);
      fetchDebts();
    } catch (error) {
      console.error('Error updating debt:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الدين',
        variant: 'destructive'
      });
    }
  };

  const openPaymentDialog = (debt: Debt) => {
    setPayingDebt(debt);
    setPaymentAmount('');
    setIsPaymentDialogOpen(true);
  };

  const handleFullPayment = async () => {
    if (!payingDebt) return;

    try {
      const { error } = await supabase
        .from('debts')
        .update({ 
          status: 'paid',
          paid_amount: payingDebt.amount
        })
        .eq('id', payingDebt.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تسجيل السداد الكلي'
      });
      setIsPaymentDialogOpen(false);
      setPayingDebt(null);
      fetchDebts();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث الحالة',
        variant: 'destructive'
      });
    }
  };

  const handlePartialPayment = async () => {
    if (!payingDebt || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مبلغ صحيح',
        variant: 'destructive'
      });
      return;
    }

    const newPaidAmount = payingDebt.paid_amount + amount;
    const remaining = payingDebt.amount - newPaidAmount;
    const isFullyPaid = remaining <= 0;

    try {
      const { error } = await supabase
        .from('debts')
        .update({ 
          paid_amount: newPaidAmount,
          status: isFullyPaid ? 'paid' : 'pending'
        })
        .eq('id', payingDebt.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: isFullyPaid 
          ? 'تم سداد المبلغ بالكامل' 
          : `تم تسجيل سداد ${amount.toLocaleString()} ريال، المتبقي: ${remaining.toLocaleString()} ريال`
      });
      setIsPaymentDialogOpen(false);
      setPayingDebt(null);
      setPaymentAmount('');
      fetchDebts();
    } catch (error) {
      console.error('Error partial payment:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل السداد',
        variant: 'destructive'
      });
    }
  };

  const handleSendReminder = async (debt: Debt) => {
    // Check if 3 days have passed since last reminder
    if (debt.last_reminder_date) {
      const daysSinceLastReminder = differenceInDays(new Date(), parseISO(debt.last_reminder_date));
      if (daysSinceLastReminder < 3) {
        toast({
          title: 'تنبيه',
          description: `يمكنك إرسال تذكير آخر بعد ${3 - daysSinceLastReminder} أيام`,
          variant: 'destructive'
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('debts')
        .update({ last_reminder_date: new Date().toISOString() })
        .eq('id', debt.id);

      if (error) throw error;

      // Create WhatsApp message
      const message = `مرحباً ${debt.client_name}،\n\nنود تذكيركم بالمبلغ المستحق: ${debt.amount.toLocaleString()} ريال\nعن خدمة: ${debt.service_type}\n\nشكراً لتعاونكم 🙏`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'تم بنجاح',
        description: 'تم فتح واتساب للتذكير'
      });
      fetchDebts();
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الدين؟')) return;

    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debtId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم حذف الدين'
      });
      fetchDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء الحذف',
        variant: 'destructive'
      });
    }
  };

  const openNotesDialog = async (debt: Debt) => {
    setSelectedDebt(debt);
    setIsNotesDialogOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('debt_notes')
        .select('*')
        .eq('debt_id', debt.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDebtNotes((data as DebtNote[]) || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedDebt) return;

    try {
      const { error } = await supabase.from('debt_notes').insert({
        debt_id: selectedDebt.id,
        note: newNote,
        created_by: user?.id
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تمت إضافة الملاحظة'
      });

      setNewNote('');
      openNotesDialog(selectedDebt);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const getDebtColor = (debt: Debt) => {
    if (debt.status === 'paid') return 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600';
    
    const daysUntilDue = differenceInDays(parseISO(debt.expected_payment_date), new Date());
    
    if (daysUntilDue < 0) return 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600'; // Overdue
    if (daysUntilDue <= 3) return 'bg-orange-100 border-orange-400 dark:bg-orange-900/30 dark:border-orange-600'; // Due soon
    if (daysUntilDue <= 7) return 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600'; // Coming up
    return 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'; // Healthy
  };

  const getStatusBadge = (debt: Debt) => {
    if (debt.status === 'paid') {
      return <Badge className="bg-green-500 text-white">تم السداد</Badge>;
    }
    
    const daysUntilDue = differenceInDays(parseISO(debt.expected_payment_date), new Date());
    
    if (daysUntilDue < 0) {
      return <Badge variant="destructive">متأخر {Math.abs(daysUntilDue)} يوم</Badge>;
    }
    if (daysUntilDue === 0) {
      return <Badge className="bg-orange-500 text-white">مستحق اليوم</Badge>;
    }
    if (daysUntilDue <= 3) {
      return <Badge className="bg-yellow-500 text-white">مستحق قريباً</Badge>;
    }
    return <Badge variant="secondary">باقي {daysUntilDue} يوم</Badge>;
  };

  const canSendReminder = (debt: Debt) => {
    if (debt.status === 'paid') return false;
    if (!debt.last_reminder_date) return true;
    return differenceInDays(new Date(), parseISO(debt.last_reminder_date)) >= 3;
  };

  if (!isAdmin) {
    return <div className="p-10 text-center text-red-500 font-bold">عذراً، هذه الصفحة للمدير فقط.</div>;
  }

  const pendingDebts = debts.filter(d => d.status !== 'paid');
  const paidDebts = debts.filter(d => d.status === 'paid');
  const totalPending = pendingDebts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-4 py-4 md:py-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الديون</h1>
          <p className="text-muted-foreground">متابعة المستحقات والتذكيرات</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة دين جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة دين جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>اسم العميل *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="أدخل اسم العميل"
                />
              </div>
              
              <div>
                <Label>نوع الخدمة *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>المبلغ (ريال) *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>تاريخ إنجاز العمل *</Label>
                <Input
                  type="date"
                  value={formData.work_completion_date}
                  onChange={(e) => setFormData({ ...formData, work_completion_date: e.target.value })}
                />
              </div>

              <div>
                <Label>تاريخ السداد المتوقع *</Label>
                <Input
                  type="date"
                  value={formData.expected_payment_date}
                  onChange={(e) => setFormData({ ...formData, expected_payment_date: e.target.value })}
                />
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <Button onClick={handleAddDebt} className="w-full">
                إضافة الدين
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ديون معلقة</p>
                <p className="text-2xl font-bold">{pendingDebts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المستحقات</p>
                <p className="text-2xl font-bold">{totalPending.toLocaleString()} ريال</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تم سدادها</p>
                <p className="text-2xl font-bold">{paidDebts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debts List */}
      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            جاري التحميل...
          </CardContent>
        </Card>
      ) : debts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد ديون مسجلة
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">الديون المعلقة</h2>
          {pendingDebts.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                🎉 لا توجد ديون معلقة
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingDebts.map((debt) => (
                <Card key={debt.id} className={`border-2 transition-all ${getDebtColor(debt)}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg">{debt.client_name}</h3>
                          {getStatusBadge(debt)}
                        </div>
                        <p className="text-muted-foreground">{debt.service_type}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            إنجاز: {format(parseISO(debt.work_completion_date), 'dd/MM/yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            سداد: {format(parseISO(debt.expected_payment_date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {debt.notes && (
                          <p className="text-sm text-muted-foreground">{debt.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        <div className="text-left">
                          <p className="text-2xl font-bold text-primary">
                            {debt.amount.toLocaleString()} ريال
                          </p>
                          {debt.paid_amount > 0 && (
                            <div className="text-sm">
                              <span className="text-green-600">مسدد: {debt.paid_amount.toLocaleString()}</span>
                              <span className="text-muted-foreground"> | </span>
                              <span className="text-orange-600">متبقي: {(debt.amount - debt.paid_amount).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openNotesDialog(debt)}
                            className="gap-1 h-8 px-2 text-xs"
                          >
                            <MessageSquare className="w-3 h-3" />
                            ملاحظات
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(debt)}
                            className="gap-1 h-8 px-2 text-xs"
                          >
                            <Pencil className="w-3 h-3" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder(debt)}
                            disabled={!canSendReminder(debt)}
                            className="gap-1 h-8 px-2 text-xs"
                          >
                            <Bell className="w-3 h-3" />
                            تذكير
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(debt)}
                            className="gap-1 h-8 px-2 text-xs bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-3 h-3" />
                            سداد
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="h-8 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {paidDebts.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-8">الديون المسددة</h2>
              <div className="grid gap-4 opacity-70">
                {paidDebts.map((debt) => (
                  <Card key={debt.id} className={`border-2 ${getDebtColor(debt)}`}>
                    <CardContent className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold">{debt.client_name}</h3>
                            {getStatusBadge(debt)}
                          </div>
                          <p className="text-muted-foreground text-sm">{debt.service_type}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold line-through text-muted-foreground">
                            {debt.amount.toLocaleString()} ريال
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteDebt(debt.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Notes Dialog */}
      <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>سجل الملاحظات - {selectedDebt?.client_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="أضف ملاحظة جديدة..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button onClick={handleAddNote}>إضافة</Button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {debtNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا توجد ملاحظات</p>
              ) : (
                debtNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(note.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل الدين</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>اسم العميل *</Label>
              <Input
                value={editFormData.client_name}
                onChange={(e) => setEditFormData({ ...editFormData, client_name: e.target.value })}
                placeholder="أدخل اسم العميل"
              />
            </div>
            
            <div>
              <Label>نوع الخدمة *</Label>
              <Input
                value={editFormData.service_type}
                onChange={(e) => setEditFormData({ ...editFormData, service_type: e.target.value })}
                placeholder="أدخل نوع الخدمة"
              />
            </div>

            <div>
              <Label>المبلغ (ريال) *</Label>
              <Input
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>تاريخ إنجاز العمل *</Label>
              <Input
                type="date"
                value={editFormData.work_completion_date}
                onChange={(e) => setEditFormData({ ...editFormData, work_completion_date: e.target.value })}
              />
            </div>

            <div>
              <Label>تاريخ السداد المتوقع *</Label>
              <Input
                type="date"
                value={editFormData.expected_payment_date}
                onChange={(e) => setEditFormData({ ...editFormData, expected_payment_date: e.target.value })}
              />
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <Button onClick={handleEditDebt} className="w-full">
              حفظ التعديلات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تسجيل السداد - {payingDebt?.client_name}</DialogTitle>
          </DialogHeader>
          {payingDebt && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>المبلغ الإجمالي:</span>
                  <span className="font-bold">{payingDebt.amount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>المسدد:</span>
                  <span>{payingDebt.paid_amount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between text-orange-600 font-bold">
                  <span>المتبقي:</span>
                  <span>{(payingDebt.amount - payingDebt.paid_amount).toLocaleString()} ريال</span>
                </div>
              </div>

              <Button 
                onClick={handleFullPayment} 
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                سداد كلي (المبلغ المتبقي بالكامل)
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>سداد جزئي</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="أدخل المبلغ..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <Button onClick={handlePartialPayment} disabled={!paymentAmount}>
                    تأكيد
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
