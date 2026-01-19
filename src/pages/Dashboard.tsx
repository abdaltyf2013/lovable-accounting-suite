import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, TrendingUp, TrendingDown, DollarSign, Trophy, History, AlertTriangle, Calendar, Clock, Wallet, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, isBefore, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Stats {
  totalClients: number;
  totalSalesInvoices: number;
  totalPurchaseInvoices: number;
  totalSalesAmount: number;
  totalPurchaseAmount: number;
  pendingInvoices: number;
  todaySales: number;
  myRank?: number;
  totalSettled?: number;
  cashBalance: number;
}

interface ChartData {
  name: string;
  sales: number;
  purchases: number;
}

interface OverdueTask {
  id: string;
  title: string;
  client_name: string;
  due_date: string;
  status: string;
}

interface AccountantPerformance {
  name: string;
  count: number;
  total: number;
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalSalesInvoices: 0,
    totalPurchaseInvoices: 0,
    totalSalesAmount: 0,
    totalPurchaseAmount: 0,
    pendingInvoices: 0,
    todaySales: 0,
    cashBalance: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [performance, setPerformance] = useState<AccountantPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentInvoices();
    if (isAdmin) {
      fetchOverdueTasks();
    }
  }, [isAdmin]);

  const fetchOverdueTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, client_name, due_date, status')
        .not('status', 'in', '("completed","cancelled")');
      
      if (error) throw error;

      const today = new Date();
      const overdue = (data || []).filter(task => {
        const dueDate = parseISO(task.due_date);
        return isBefore(dueDate, today);
      });

      setOverdueTasks(overdue);
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      let invoicesQuery = supabase.from('invoices').select('*').gte('created_at', firstDayOfMonth);
      
      if (!isAdmin && profile?.full_name) {
        invoicesQuery = invoicesQuery.eq('accountant_name', profile.full_name);
      }

      const [clientsRes, invoicesRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        invoicesQuery,
      ]);

      const invoices = invoicesRes.data || [];
      const salesInvoices = invoices.filter(i => i.type === 'sales' && i.status !== 'cancelled');
      const purchaseInvoices = invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled');
      const todaySales = salesInvoices.filter(i => i.created_at >= startOfDay).reduce((sum, i) => sum + Number(i.total_amount), 0);

      // حساب السيولة النقدية (إجمالي المبيعات - إجمالي المشتريات)
      const totalSalesAllTime = invoices.filter(i => i.type === 'sales' && i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
      const totalPurchasesAllTime = invoices.filter(i => i.type === 'purchase' && i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount), 0);

      // تجهيز بيانات الرسم البياني (آخر 7 أيام)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return format(d, 'yyyy-MM-dd');
      }).reverse();

      const dailyData = last7Days.map(date => {
        const daySales = invoices.filter(i => i.type === 'sales' && i.status !== 'cancelled' && i.created_at.startsWith(date))
          .reduce((sum, i) => sum + Number(i.total_amount), 0);
        const dayPurchases = invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && i.created_at.startsWith(date))
          .reduce((sum, i) => sum + Number(i.total_amount), 0);
        return {
          name: format(parseISO(date), 'eeee', { locale: ar }),
          sales: daySales,
          purchases: dayPurchases,
        };
      });
      setChartData(dailyData);

      let myRank = 0;
      let totalSettled = 0;

      if (isAdmin) {
        // حساب أداء المحاسبين
        const perf = salesInvoices.reduce((acc: any, curr) => {
          const name = curr.accountant_name || 'غير محدد';
          if (!acc[name]) acc[name] = { name, count: 0, total: 0 };
          acc[name].count += 1;
          acc[name].total += Number(curr.total_amount);
          return acc;
        }, {});
        setPerformance(Object.values(perf));
      }

      if (!isAdmin && profile?.full_name) {
        const { data: rankingData } = await supabase
          .from('invoices')
          .select('accountant_name, total_amount')
          .eq('type', 'sales')
          .neq('status', 'cancelled')
          .gte('created_at', firstDayOfMonth);
        
        const ranking = (rankingData || []).reduce((acc: any, curr) => {
          acc[curr.accountant_name] = (acc[curr.accountant_name] || 0) + Number(curr.total_amount);
          return acc;
        }, {});
        
        const sortedRanking = Object.entries(ranking).sort((a: any, b: any) => b[1] - a[1]);
        myRank = sortedRanking.findIndex(r => r[0] === profile.full_name) + 1;

        const { data: settledData } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('accountant_name', profile.full_name)
          .eq('status', 'cancelled')
          .like('notes', '[SETTLED_%');
        totalSettled = (settledData || []).reduce((sum, i) => sum + Number(i.total_amount), 0);
      }

      setStats({
        totalClients: clientsRes.count || 0,
        totalSalesInvoices: salesInvoices.length,
        totalPurchaseInvoices: purchaseInvoices.length,
        totalSalesAmount: salesInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
        totalPurchaseAmount: purchaseInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0),
        pendingInvoices: invoices.filter(i => i.status === 'pending').length,
        todaySales,
        myRank,
        totalSettled,
        cashBalance: totalSalesAllTime - totalPurchasesAllTime,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentInvoices(data || []);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const statCards = isAdmin ? [
    {
      title: 'السيولة النقدية (الخزينة)',
      value: formatCurrency(stats.cashBalance),
      icon: Wallet,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'إجمالي مبيعات الشهر',
      value: formatCurrency(stats.totalSalesAmount),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'مبيعات اليوم',
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'إجمالي المشتريات',
      value: formatCurrency(stats.totalPurchaseAmount),
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'عدد الفواتير',
      value: stats.totalSalesInvoices.toString(),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'إجمالي العملاء',
      value: stats.totalClients.toString(),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ] : [
    {
      title: 'مبيعاتي هذا الشهر',
      value: formatCurrency(stats.totalSalesAmount),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'مبيعاتي اليوم',
      value: formatCurrency(stats.todaySales),
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'ترتيبي الحالي',
      value: stats.myRank ? `#${stats.myRank}` : '-',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'فواتيري المصدرة',
      value: stats.totalSalesInvoices.toString(),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'إجمالي ما تم تسليمه',
      value: formatCurrency(stats.totalSettled || 0),
      icon: History,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            مرحباً، {profile?.full_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'لوحة تحكم المدير' : 'لوحة تحكم المحاسب'}
          </p>
        </div>
        {isAdmin && overdueTasks.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg border border-red-100 dark:border-red-900/30 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold text-sm">لديك {overdueTasks.length} مهام متأخرة!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  تحليل المبيعات والمشتريات (آخر 7 أيام)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar name="المبيعات" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="المشتريات" dataKey="purchases" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  أداء المحاسبين (هذا الشهر)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-right py-3 px-4 text-sm font-medium">المحاسب</th>
                        <th className="text-center py-3 px-4 text-sm font-medium">الفواتير</th>
                        <th className="text-left py-3 px-4 text-sm font-medium">إجمالي التحصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performance.sort((a, b) => b.total - a.total).map((p, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium">{p.name}</td>
                          <td className="py-3 px-4 text-sm text-center">{p.count}</td>
                          <td className="py-3 px-4 text-sm text-left font-bold text-green-600">{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-red-100 dark:border-red-900/30">
              <CardHeader className="bg-red-50/50 dark:bg-red-900/10">
                <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Clock className="w-5 h-5" />
                  تنبيه المهام المتأخرة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {overdueTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">لا توجد مهام متأخرة حالياً</p>
                ) : (
                  <div className="divide-y">
                    {overdueTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-sm">{task.title}</h4>
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">متأخرة</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{task.client_name}</span>
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                            <Calendar className="w-3 h-3" />
                            تاريخ التسليم: {format(parseISO(task.due_date), 'yyyy/MM/dd')}
                          </span>
                        </div>
                      </div>
                    ))}
                    {overdueTasks.length > 5 && (
                      <div className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">وهناك {overdueTasks.length - 5} مهام متأخرة أخرى...</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">آخر الفواتير</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentInvoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد فواتير بعد
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-right py-3 px-4 text-sm font-medium">رقم الفاتورة</th>
                          <th className="text-right py-3 px-4 text-sm font-medium">العميل</th>
                          <th className="text-left py-3 px-4 text-sm font-medium">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 text-sm font-mono">{invoice.invoice_number}</td>
                            <td className="py-3 px-4 text-sm">{invoice.client_name}</td>
                            <td className="py-3 px-4 text-sm text-left font-medium">
                              {formatCurrency(Number(invoice.total_amount))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">آخر الفواتير</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                لا توجد فواتير بعد
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">رقم الفاتورة</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">العميل</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">النوع</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">المبلغ</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="py-3 px-2 text-sm font-mono">{invoice.invoice_number}</td>
                        <td className="py-3 px-2 text-sm">{invoice.client_name}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.type === 'sales' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {invoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm font-medium">
                          {formatCurrency(Number(invoice.total_amount))}
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : invoice.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'cancelled' ? 'ملغاة' : 'معلقة'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
