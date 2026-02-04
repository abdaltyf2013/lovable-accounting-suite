import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Calculator, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  transaction_date: string;
  payment_method: 'cash' | 'pos';
  source?: string;
  created_at: string;
}

const FIXED_SALARIES = 5500;

export default function Partnership() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Income form state
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [incomeDescription, setIncomeDescription] = useState('');
  const [incomePaymentMethod, setIncomePaymentMethod] = useState<'cash' | 'pos'>('cash');

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseSource, setExpenseSource] = useState<'cash' | 'pos'>('cash');

  // Fetch transactions for selected month
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['partnership-transactions', selectedMonth],
    queryFn: async () => {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0);
      const endDateStr = `${selectedMonth}-${String(endDate.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('partnership_transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDateStr)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Add transaction mutation
  const addTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('partnership_transactions')
        .insert([transaction])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-transactions'] });
      toast({ title: 'تمت الإضافة', description: 'تم إضافة المعاملة بنجاح' });
      // Reset forms
      setIncomeAmount('');
      setIncomeDescription('');
      setExpenseAmount('');
      setExpenseDescription('');
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: 'فشل في إضافة المعاملة', variant: 'destructive' });
      console.error(error);
    },
  });

  // Delete transaction mutation
  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partnership_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnership-transactions'] });
      toast({ title: 'تم الحذف', description: 'تم حذف المعاملة بنجاح' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: 'فشل في حذف المعاملة', variant: 'destructive' });
      console.error(error);
    },
  });

  // Calculate report data
  const reportData = {
    totalCashIncome: transactions
      .filter(t => t.type === 'income' && t.payment_method === 'cash')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalPosIncome: transactions
      .filter(t => t.type === 'income' && t.payment_method === 'pos')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalCashExpense: transactions
      .filter(t => t.type === 'expense' && t.source === 'cash')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalBankExpense: transactions
      .filter(t => t.type === 'expense' && t.source === 'pos')
      .reduce((sum, t) => sum + Number(t.amount), 0),
  };

  const totalIncome = reportData.totalCashIncome + reportData.totalPosIncome;
  const totalVariableExpenses = reportData.totalCashExpense + reportData.totalBankExpense;
  const totalExpenses = totalVariableExpenses + FIXED_SALARIES;
  const netProfit = totalIncome - totalExpenses;
  
  // Settlement calculation:
  // Ahmed's side: POS Income - Bank Expenses
  // AbdulLatif's side: Cash Income - Cash Expenses
  // Each partner gets 50% of net profit
  const ahmedBalance = reportData.totalPosIncome - reportData.totalBankExpense;
  const abdulLatifBalance = reportData.totalCashIncome - reportData.totalCashExpense - FIXED_SALARIES;
  const profitShare = netProfit * 0.5;
  
  // Final settlement: (Ahmed's Balance) - (AbdulLatif's Balance) - each partner's 50% profit
  // Simplified: Each partner should end up with 50% of net profit
  // Ahmed paid from his pocket: Bank Expenses, received: POS Income
  // AbdulLatif paid from his pocket: Cash Expenses + Salaries, received: Cash Income
  // Settlement = What Ahmed should pay to AbdulLatif to balance
  const settlement = ahmedBalance - profitShare;

  const handleAddIncome = () => {
    if (!incomeAmount || Number(incomeAmount) <= 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    addTransaction.mutate({
      type: 'income',
      amount: Number(incomeAmount),
      description: incomeDescription,
      transaction_date: incomeDate,
      payment_method: incomePaymentMethod,
    });
  };

  const handleAddExpense = () => {
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      toast({ title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
      return;
    }
    addTransaction.mutate({
      type: 'expense',
      amount: Number(expenseAmount),
      description: expenseDescription,
      transaction_date: expenseDate,
      payment_method: expenseSource,
      source: expenseSource,
    });
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: format(d, 'MMMM yyyy', { locale: ar }),
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 font-tajawal" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">محاسبة الشركاء</h1>
            <p className="text-sm text-muted-foreground">إدارة حسابات الشراكة بين عبداللطيف وأحمد</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="اختر الشهر" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-green-200 dark:border-green-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إيراد الكاش (صندوق عبداللطيف)</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(reportData.totalCashIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-blue-200 dark:border-blue-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إيراد الشبكة (بنك أحمد)</p>
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(reportData.totalPosIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-red-200 dark:border-red-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المصروفات المتغيرة</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(totalVariableExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-purple-200 dark:border-purple-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الرواتب الثابتة</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(FIXED_SALARIES)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Net Profit & Settlement Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                ملخص الأرباح
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">إجمالي الإيرادات</span>
                <span className="font-bold text-green-600">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">إجمالي المصروفات</span>
                <span className="font-bold text-red-600">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-bold">صافي الربح</span>
                <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-t">
                <span className="text-muted-foreground">حصة كل شريك (50%)</span>
                <span className="font-bold">{formatCurrency(profitShare)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <Alert className={settlement > 0 
            ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-800' 
            : settlement < 0 
            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-gray-50 border-gray-300 dark:bg-gray-900/20 dark:border-gray-800'
          }>
            <ArrowLeftRight className={`w-5 h-5 ${settlement > 0 ? 'text-blue-600' : settlement < 0 ? 'text-green-600' : 'text-gray-600'}`} />
            <AlertTitle className="text-lg font-bold mb-2">التسوية النهائية</AlertTitle>
            <AlertDescription className="space-y-2">
              <div className="text-sm space-y-1 mb-3">
                <p>• رصيد أحمد (شبكة - مصروفات بنك): {formatCurrency(ahmedBalance)}</p>
                <p>• رصيد عبداللطيف (كاش - مصروفات كاش - رواتب): {formatCurrency(abdulLatifBalance)}</p>
              </div>
              <div className={`text-xl font-bold p-3 rounded-lg text-center ${
                settlement > 0 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                  : settlement < 0 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
              }`}>
                {settlement > 0 
                  ? `أحمد يدفع لـ عبداللطيف: ${formatCurrency(Math.abs(settlement))}`
                  : settlement < 0 
                  ? `عبداللطيف يدفع لـ أحمد: ${formatCurrency(Math.abs(settlement))}`
                  : 'لا توجد تسوية مطلوبة'
                }
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>

      {/* Data Entry Tabs */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إضافة معاملة جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="income" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="income" className="gap-2">
                    <TrendingUp className="w-4 h-4" />
                    إيراد
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="gap-2">
                    <TrendingDown className="w-4 h-4" />
                    مصروف
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="income" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المبلغ (ر.س)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={incomeAmount}
                        onChange={(e) => setIncomeAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={incomeDate}
                        onChange={(e) => setIncomeDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>طريقة الدفع</Label>
                      <Select value={incomePaymentMethod} onValueChange={(v: 'cash' | 'pos') => setIncomePaymentMethod(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              كاش (صندوق عبداللطيف)
                            </div>
                          </SelectItem>
                          <SelectItem value="pos">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              شبكة (بنك أحمد)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea
                        placeholder="وصف الإيراد..."
                        value={incomeDescription}
                        onChange={(e) => setIncomeDescription(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddIncome} disabled={addTransaction.isPending} className="w-full">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة إيراد
                  </Button>
                </TabsContent>

                <TabsContent value="expense" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المبلغ (ر.س)</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التاريخ</Label>
                      <Input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المصدر</Label>
                      <Select value={expenseSource} onValueChange={(v: 'cash' | 'pos') => setExpenseSource(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="w-4 h-4" />
                              كاش (عبداللطيف)
                            </div>
                          </SelectItem>
                          <SelectItem value="pos">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              بنك (أحمد)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea
                        placeholder="وصف المصروف..."
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddExpense} disabled={addTransaction.isPending} className="w-full" variant="destructive">
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة مصروف
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Transactions Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">سجل المعاملات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد معاملات لهذا الشهر</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right py-3 px-4 text-sm font-medium">التاريخ</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">النوع</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">المبلغ</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">الطريقة/المصدر</th>
                      <th className="text-right py-3 px-4 text-sm font-medium">الوصف</th>
                      {isAdmin && <th className="text-center py-3 px-4 text-sm font-medium">إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {format(new Date(t.transaction_date), 'yyyy/MM/dd')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            t.type === 'income' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {t.type === 'income' ? 'إيراد' : 'مصروف'}
                          </span>
                        </td>
                        <td className={`py-3 px-4 text-sm font-bold ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            t.payment_method === 'cash' || t.source === 'cash'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {t.payment_method === 'cash' || t.source === 'cash' ? (
                              <><Banknote className="w-3 h-3" /> كاش</>
                            ) : (
                              <><CreditCard className="w-3 h-3" /> شبكة/بنك</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {t.description || '-'}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                              onClick={() => {
                                if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
                                  deleteTransaction.mutate(t.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
