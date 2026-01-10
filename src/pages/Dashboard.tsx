import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Trophy, History } from 'lucide-react';

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
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentInvoices();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      
      let invoicesQuery = supabase.from('invoices').select('*').gte('created_at', firstDayOfMonth);
      
      // إذا لم يكن مديراً، نفلتر إحصائياته هو فقط
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

      let myRank = 0;
      let totalSettled = 0;

      if (!isAdmin && profile?.full_name) {
        // جلب الترتيب
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

        // جلب إجمالي المصفى
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          مرحباً، {profile?.full_name}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'لوحة تحكم المدير' : 'لوحة تحكم المحاسب'}
        </p>
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
    </div>
  );
}
