import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, FileText, Users, DollarSign } from 'lucide-react';

interface Invoice {
  id: string;
  type: 'sales' | 'purchase';
  total_amount: number;
  status: string;
  accountant_name: string | null;
  created_at: string;
}

interface AccountantStats {
  name: string;
  salesCount: number;
  salesTotal: number;
  purchaseCount: number;
  purchaseTotal: number;
}

export default function Reports() {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchInvoices();
    }
  }, [isAdmin]);

  const fetchInvoices = async () => {
    let query = supabase.from('invoices').select('*');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    setLoading(true);
    fetchInvoices();
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const salesInvoices = invoices.filter((i) => i.type === 'sales');
  const purchaseInvoices = invoices.filter((i) => i.type === 'purchase');

  const totalSales = salesInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const totalPurchases = purchaseInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const netProfit = totalSales - totalPurchases;

  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const pendingInvoices = invoices.filter((i) => i.status === 'pending');

  // Group by accountant
  const accountantStatsMap = new Map<string, AccountantStats>();
  invoices.forEach((inv) => {
    const name = inv.accountant_name || 'غير محدد';
    if (!accountantStatsMap.has(name)) {
      accountantStatsMap.set(name, {
        name,
        salesCount: 0,
        salesTotal: 0,
        purchaseCount: 0,
        purchaseTotal: 0,
      });
    }
    const stats = accountantStatsMap.get(name)!;
    if (inv.type === 'sales') {
      stats.salesCount++;
      stats.salesTotal += Number(inv.total_amount);
    } else {
      stats.purchaseCount++;
      stats.purchaseTotal += Number(inv.total_amount);
    }
  });
  const accountantStats = Array.from(accountantStatsMap.values());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
        <p className="text-muted-foreground">تقارير مالية شاملة</p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleFilter}>تصفية</Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setTimeout(fetchInvoices, 100);
              }}
            >
              إعادة تعيين
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-100">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-xl font-bold">{formatCurrency(totalSales)}</p>
                <p className="text-xs text-muted-foreground">{salesInvoices.length} فاتورة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-red-100">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
                <p className="text-xl font-bold">{formatCurrency(totalPurchases)}</p>
                <p className="text-xs text-muted-foreground">{purchaseInvoices.length} فاتورة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <DollarSign className={`w-6 h-6 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفواتير</p>
                <p className="text-xl font-bold">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">
                  {paidInvoices.length} مدفوعة، {pendingInvoices.length} معلقة
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accountant Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            أداء المحاسبين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accountantStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">المحاسب</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">المبيعات</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">إجمالي المبيعات</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">المصروفات</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">إجمالي المشتريات</th>
                  </tr>
                </thead>
                <tbody>
                  {accountantStats.map((stat, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-3 px-2 font-medium">{stat.name}</td>
                      <td className="py-3 px-2">{stat.salesCount}</td>
                      <td className="py-3 px-2 text-green-600">{formatCurrency(stat.salesTotal)}</td>
                      <td className="py-3 px-2">{stat.purchaseCount}</td>
                      <td className="py-3 px-2 text-red-600">{formatCurrency(stat.purchaseTotal)}</td>
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
