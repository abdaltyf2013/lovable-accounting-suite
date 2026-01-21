import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, TrendingUp, TrendingDown, DollarSign, Trophy, History, AlertTriangle, Calendar, Clock, Wallet, UserCheck, CheckCircle2, ListTodo, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, isBefore, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

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
  avgTaskCompletionTime?: number;
  onTimeCompletionRate?: number;
  debtCollectionRate?: number;
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

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
  client_name: string;
}

interface TopAccountant {
  name: string;
  total: number;
  rank: number;
}

interface AccountantStats {
  completedTasks: number;
  currentTasks: number;
  totalRevenue: number;
  avgCompletionTime: number;
  tasksThisMonth: number;
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
    avgTaskCompletionTime: 0,
    onTimeCompletionRate: 0,
    debtCollectionRate: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [performance, setPerformance] = useState<AccountantPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [topAccountants, setTopAccountants] = useState<TopAccountant[]>([]);
  const [accountantStats, setAccountantStats] = useState<AccountantStats>({
    completedTasks: 0,
    currentTasks: 0,
    totalRevenue: 0,
    avgCompletionTime: 0,
    tasksThisMonth: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecentInvoices();
    if (isAdmin) {
      fetchOverdueTasks();
    }
    if (!isAdmin) {
      fetchAllTasks();
      fetchTopAccountants();
      fetchAccountantStats();
    }
  }, [isAdmin, profile]);

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
        const normalizedName = profile.full_name;
        const { data: rankingData } = await supabase
          .from('invoices')
          .select('accountant_name, total_amount')
          .eq('type', 'sales')
          .neq('status', 'cancelled')
          .gte('created_at', firstDayOfMonth);
        
        // خريطة توحيد الأسماء المكررة
        const nameMapping: Record<string, string> = {
          "عبد اللطيف": "عبداللطيف علوي اليافعي",
          "عبداللطيف": "عبداللطيف علوي اليافعي",
          "عبد اللطيف علوي اليافعي": "عبداللطيف علوي اليافعي",
          "فؤاد مكتب اشعار": "فؤاد خليل",
          "فواد خليل": "فؤاد خليل",
          "فؤاد مكتب إشعار": "فؤاد خليل",
        };
        
        const ranking = (rankingData || []).reduce((acc: any, curr) => {
          const normalizedAccountantName = nameMapping[curr.accountant_name] || curr.accountant_name;
          acc[normalizedAccountantName] = (acc[normalizedAccountantName] || 0) + Number(curr.total_amount);
          return acc;
        }, {});
        
        const sortedRanking = Object.entries(ranking).sort((a: any, b: any) => b[1] - a[1]);
        myRank = sortedRanking.findIndex(r => r[0] === normalizedName) + 1;

        const { data: settledData } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('accountant_name', profile.full_name)
          .eq('status', 'cancelled')
          .like('notes', '[SETTLED_%');
        totalSettled = (settledData || []).reduce((sum, i) => sum + Number(i.total_amount), 0);
      }

      // حساب مؤشرات الأداء الذكية
      let avgTaskCompletionTime = 0;
      let onTimeCompletionRate = 0;
      let debtCollectionRate = 0;

      if (isAdmin) {
        // متوسط وقت إنجاز المهمة
        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('started_at, completed_at')
          .eq('status', 'completed')
          .not('started_at', 'is', null)
          .not('completed_at', 'is', null)
          .gte('completed_at', firstDayOfMonth);

        if (completedTasks && completedTasks.length > 0) {
          const totalTime = completedTasks.reduce((sum, task) => {
            const start = new Date(task.started_at).getTime();
            const end = new Date(task.completed_at).getTime();
            return sum + (end - start);
          }, 0);
          avgTaskCompletionTime = Math.round(totalTime / completedTasks.length / (1000 * 60 * 60)); // بالساعات
        }

        // نسبة المهام المكتملة في الوقت المحدد
        const { data: allCompletedTasks } = await supabase
          .from('tasks')
          .select('due_date, completed_at')
          .eq('status', 'completed')
          .gte('completed_at', firstDayOfMonth);

        if (allCompletedTasks && allCompletedTasks.length > 0) {
          const onTime = allCompletedTasks.filter(task => {
            const dueDate = new Date(task.due_date);
            const completedDate = new Date(task.completed_at);
            return completedDate <= dueDate;
          }).length;
          onTimeCompletionRate = Math.round((onTime / allCompletedTasks.length) * 100);
        }

        // معدل تحصيل الديون
        const { data: allDebts } = await supabase
          .from('debts')
          .select('amount, paid_amount');

        if (allDebts && allDebts.length > 0) {
          const totalDebtAmount = allDebts.reduce((sum, d) => sum + d.amount, 0);
          const totalPaidAmount = allDebts.reduce((sum, d) => sum + d.paid_amount, 0);
          if (totalDebtAmount > 0) {
            debtCollectionRate = Math.round((totalPaidAmount / totalDebtAmount) * 100);
          }
        }
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
        avgTaskCompletionTime,
        onTimeCompletionRate,
        debtCollectionRate,
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

  const fetchAllTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, client_name')
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      setAllTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchTopAccountants = async () => {
    try {
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      const { data, error } = await supabase
        .from('invoices')
        .select('accountant_name, total_amount')
        .eq('type', 'sales')
        .neq('status', 'cancelled')
        .gte('created_at', firstDayOfMonth);
      
      if (error) throw error;

      const nameMapping: Record<string, string> = {
        "عبد اللطيف": "عبداللطيف علوي اليافعي",
        "عبداللطيف": "عبداللطيف علوي اليافعي",
        "عبد اللطيف علوي اليافعي": "عبداللطيف علوي اليافعي",
        "فؤاد مكتب اشعار": "فؤاد خليل",
        "فواد خليل": "فؤاد خليل",
        "فؤاد مكتب إشعار": "فؤاد خليل",
      };
      
      const totals = (data || []).reduce((acc: any, curr) => {
        const normalizedName = nameMapping[curr.accountant_name] || curr.accountant_name;
        acc[normalizedName] = (acc[normalizedName] || 0) + Number(curr.total_amount);
        return acc;
      }, {});
      
      const sorted = Object.entries(totals)
        .map(([name, total]: [string, any]) => ({ name, total, rank: 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((item, index) => ({ ...item, rank: index + 1 }));
      
      setTopAccountants(sorted);
    } catch (error) {
      console.error('Error fetching top accountants:', error);
    }
  };

  const fetchAccountantStats = async () => {
    try {
      if (!profile?.full_name) return;

      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // المهام المنجزة
      const { data: completed } = await supabase
        .from('tasks')
        .select('id, started_at, completed_at')
        .eq('accountant_name', profile.full_name)
        .eq('status', 'completed');

      // المهام الحالية
      const { data: current } = await supabase
        .from('tasks')
        .select('id')
        .eq('accountant_name', profile.full_name)
        .in('status', ['pending', 'in_progress']);

      // المهام هذا الشهر
      const { data: thisMonth } = await supabase
        .from('tasks')
        .select('id')
        .eq('accountant_name', profile.full_name)
        .gte('created_at', firstDayOfMonth);

      // إجمالي الإيرادات
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('accountant_name', profile.full_name)
        .eq('type', 'sales')
        .neq('status', 'cancelled');

      const totalRevenue = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);

      // متوسط وقت الإنجاز
      let avgTime = 0;
      if (completed && completed.length > 0) {
        const validTasks = completed.filter(t => t.started_at && t.completed_at);
        if (validTasks.length > 0) {
          const totalTime = validTasks.reduce((sum, task) => {
            const start = new Date(task.started_at).getTime();
            const end = new Date(task.completed_at).getTime();
            return sum + (end - start);
          }, 0);
          avgTime = Math.round(totalTime / validTasks.length / (1000 * 60 * 60)); // بالساعات
        }
      }

      setAccountantStats({
        completedTasks: completed?.length || 0,
        currentTasks: current?.length || 0,
        totalRevenue,
        avgCompletionTime: avgTime,
        tasksThisMonth: thisMonth?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching accountant stats:', error);
    }
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
    {
      title: 'متوسط وقت إنجاز المهمة',
      value: stats.avgTaskCompletionTime ? `${stats.avgTaskCompletionTime} ساعة` : '-',
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      title: 'نسبة الإنجاز في الوقت',
      value: stats.onTimeCompletionRate ? `${stats.onTimeCompletionRate}%` : '-',
      icon: Calendar,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
    },
    {
      title: 'معدل تحصيل الديون',
      value: stats.debtCollectionRate ? `${stats.debtCollectionRate}%` : '-',
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
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
            لوحة التحكم
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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* قائمة المهمات العامة */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5 text-blue-600" />
                    <span>المهمات العامة</span>
                  </div>
                  <button
                    onClick={() => navigate('/tasks')}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                  >
                    عرض الكل
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {allTasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد مهمات حالياً</p>
                ) : (
                  <div className="divide-y">
                    {allTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate('/tasks')}
                        className="p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm group-hover:text-blue-600 transition-colors">{task.title}</h4>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                            task.status === 'completed' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {task.status === 'completed' ? 'مكتملة' : task.status === 'in_progress' ? 'جارية' : 'معلقة'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {task.client_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(parseISO(task.due_date), 'yyyy/MM/dd')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* موظف الشهر Top 3 */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <span>موظف الشهر 🏆</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {topAccountants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
                ) : (
                  <div className="space-y-4">
                    {topAccountants.map((acc) => (
                      <div
                        key={acc.rank}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                          acc.rank === 1
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 shadow-md scale-105'
                            : acc.rank === 2
                            ? 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800'
                            : 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30'
                        }`}
                      >
                        <div className="text-4xl">
                          {acc.rank === 1 ? '🥇' : acc.rank === 2 ? '🥈' : '🥉'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-base">{acc.name}</p>
                          {acc.rank === 1 && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-400 font-semibold mt-1">⭐ موظف الشهر</p>
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${
                          acc.rank === 1
                            ? 'text-yellow-600'
                            : acc.rank === 2
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-orange-600'
                        }`}>
                          #{acc.rank}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* إحصائيات المحاسب */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span>إحصائياتي 📊</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-right py-4 px-6 text-sm font-semibold">المؤشر</th>
                      <th className="text-center py-4 px-6 text-sm font-semibold">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="py-4 px-6 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="font-medium">عدد المهمات المنجزة</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-4 py-1 rounded-full font-bold text-sm">
                          {accountantStats.completedTasks}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="py-4 px-6 text-sm flex items-center gap-2">
                        <ListTodo className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">عدد المهمات الحالية</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-4 py-1 rounded-full font-bold text-sm">
                          {accountantStats.currentTasks}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="py-4 px-6 text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium">إجمالي الإيرادات</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-4 py-1 rounded-full font-bold text-sm">
                          {formatCurrency(accountantStats.totalRevenue)}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="py-4 px-6 text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium">متوسط وقت الإنجاز</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-1 rounded-full font-bold text-sm">
                          {accountantStats.avgCompletionTime > 0 ? `${accountantStats.avgCompletionTime} ساعة` : '-'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      <td className="py-4 px-6 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">المهمات هذا الشهر</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center justify-center bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-4 py-1 rounded-full font-bold text-sm">
                          {accountantStats.tasksThisMonth}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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
        </>
      )}
    </div>
  );
}
