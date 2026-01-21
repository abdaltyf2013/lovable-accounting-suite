import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, FileText, ListTodo, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  service_amount: number;
  government_fees: number;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Debt {
  id: string;
  service_type: string;
  amount: number;
  paid_amount: number;
  status: string;
  expected_payment_date: string;
  created_at: string;
}

interface ClientStats {
  totalTasks: number;
  completedTasks: number;
  totalRevenue: number;
  totalDebts: number;
  paidDebts: number;
  overdueDebts: number;
}

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats>({
    totalTasks: 0,
    completedTasks: 0,
    totalRevenue: 0,
    totalDebts: 0,
    paidDebts: 0,
    overdueDebts: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      // جلب بيانات العميل
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // جلب المهام
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      setTasks(tasksData || []);

      // جلب الفواتير
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      setInvoices(invoicesData || []);

      // جلب الديون (للمدراء فقط)
      if (isAdmin) {
        const { data: debtsData } = await supabase
          .from('debts')
          .select('*')
          .eq('client_name', clientData.name)
          .order('created_at', { ascending: false });

        setDebts(debtsData || []);

        // حساب الإحصائيات
        const totalDebts = debtsData?.reduce((sum, d) => sum + d.amount, 0) || 0;
        const paidDebts = debtsData?.reduce((sum, d) => sum + d.paid_amount, 0) || 0;
        const overdueDebts = debtsData?.filter(d => d.status === 'overdue').length || 0;

        setStats(prev => ({
          ...prev,
          totalDebts,
          paidDebts,
          overdueDebts
        }));
      }

      // حساب إحصائيات المهام والإيرادات
      const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
      const totalRevenue = tasksData?.reduce((sum, t) => sum + (t.service_amount || 0), 0) || 0;

      setStats(prev => ({
        ...prev,
        totalTasks: tasksData?.length || 0,
        completedTasks,
        totalRevenue
      }));

    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, type: 'task' | 'invoice' | 'debt') => {
    const configs = {
      task: {
        completed: { label: 'مكتملة', color: 'bg-green-500 text-white' },
        in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-500 text-white' },
        pending: { label: 'في الانتظار', color: 'bg-gray-500 text-white' },
        paused: { label: 'متوقفة', color: 'bg-yellow-500 text-white' },
        cancelled: { label: 'ملغاة', color: 'bg-red-500 text-white' }
      },
      invoice: {
        paid: { label: 'مدفوعة', color: 'bg-green-500 text-white' },
        pending: { label: 'معلقة', color: 'bg-yellow-500 text-white' },
        cancelled: { label: 'ملغاة', color: 'bg-red-500 text-white' }
      },
      debt: {
        paid: { label: 'مدفوعة', color: 'bg-green-500 text-white' },
        pending: { label: 'معلقة', color: 'bg-yellow-500 text-white' },
        overdue: { label: 'متأخرة', color: 'bg-red-500 text-white' }
      }
    };

    const config = configs[type][status as keyof typeof configs[typeof type]] || { label: status, color: 'bg-gray-500' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center">العميل غير موجود</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">ملف العميل الشامل</p>
          </div>
        </div>
      </div>

      {/* معلومات العميل الأساسية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات الاتصال</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
            )}
            {client.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            )}
          </div>
          {client.notes && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مؤشرات الأداء */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} مكتملة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} ريال</div>
            <p className="text-xs text-muted-foreground">من المهام المكتملة</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الديون</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalDebts.toFixed(2)} ريال</div>
                <p className="text-xs text-muted-foreground">
                  تم دفع {stats.paidDebts.toFixed(2)} ريال
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ديون متأخرة</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overdueDebts}</div>
                <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* التفاصيل */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">المهام ({tasks.length})</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير ({invoices.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="debts">الديون ({debts.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                لا توجد مهام لهذا العميل
              </CardContent>
            </Card>
          ) : (
            tasks.map(task => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{task.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        تاريخ الاستحقاق: {format(new Date(task.due_date), 'dd MMMM yyyy', { locale: ar })}
                      </p>
                      {task.service_amount > 0 && (
                        <p className="text-sm font-medium text-green-600">
                          المبلغ: {task.service_amount.toFixed(2)} ريال
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(task.status, 'task')}
                      <Badge variant="outline">{task.priority === 'urgent' ? 'عاجل' : task.priority === 'high' ? 'عالية' : task.priority === 'medium' ? 'متوسطة' : 'منخفضة'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                لا توجد فواتير لهذا العميل
              </CardContent>
            </Card>
          ) : (
            invoices.map(invoice => (
              <Card key={invoice.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold">{invoice.invoice_number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.created_at), 'dd MMMM yyyy', { locale: ar })}
                      </p>
                      <p className="text-sm font-medium">
                        {invoice.total_amount.toFixed(2)} ريال
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(invoice.status, 'invoice')}
                      <Badge variant="outline">{invoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="debts" className="space-y-4">
            {debts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  لا توجد ديون لهذا العميل
                </CardContent>
              </Card>
            ) : (
              debts.map(debt => (
                <Card key={debt.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{debt.service_type}</h3>
                        <p className="text-sm text-muted-foreground">
                          تاريخ السداد المتوقع: {format(new Date(debt.expected_payment_date), 'dd MMMM yyyy', { locale: ar })}
                        </p>
                        <p className="text-sm font-medium">
                          المبلغ: {debt.amount.toFixed(2)} ريال
                        </p>
                        <p className="text-sm text-muted-foreground">
                          المدفوع: {debt.paid_amount.toFixed(2)} ريال
                        </p>
                        <p className="text-sm font-medium text-orange-600">
                          المتبقي: {(debt.amount - debt.paid_amount).toFixed(2)} ريال
                        </p>
                      </div>
                      {getStatusBadge(debt.status, 'debt')}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
