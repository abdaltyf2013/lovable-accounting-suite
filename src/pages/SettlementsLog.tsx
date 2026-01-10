import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, User, Calendar, DollarSign, Clock } from "lucide-react";

interface Settlement {
  accountant_name: string;
  total_amount: number;
  settlement_date: string;
  period_start: string;
  period_end: string;
}

const SettlementsLog = () => {
  const { data: settlements, isLoading } = useQuery({
    queryKey: ["settlements-log"],
    queryFn: async () => {
      // جلب الفواتير التي تم تمييزها كـ [SETTLED]
      const { data, error } = await supabase
        .from("invoices")
        .select("accountant_name, total_amount, created_at, notes, status")
        .eq("status", "cancelled")
        .like("notes", "[SETTLED_%");

      if (error) throw error;

      // تجميع الفواتير حسب كود التصفية الموجود في الملاحظات
      const grouped = data.reduce((acc: Record<string, any>, curr) => {
        const match = curr.notes?.match(/\[SETTLED_(.*?)\]/);
        const settlementId = match ? match[1] : 'unknown';
        
        if (!acc[settlementId]) {
          acc[settlementId] = {
            accountant_name: curr.accountant_name,
            total_amount: 0,
            settlement_date: settlementId,
            dates: []
          };
        }
        acc[settlementId].total_amount += Number(curr.total_amount);
        acc[settlementId].dates.push(new Date(curr.created_at));
        return acc;
      }, {});

      return Object.values(grouped).map((s: any) => ({
        accountant_name: s.accountant_name,
        total_amount: s.total_amount,
        settlement_date: s.settlement_date,
        period_start: new Date(Math.min(...s.dates)).toISOString(),
        period_end: new Date(Math.max(...s.dates)).toISOString(),
      })).sort((a, b) => new Date(b.settlement_date).getTime() - new Date(a.settlement_date).getTime());
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) return <div className="p-8 text-center">جاري تحميل سجل التصفيات...</div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          سجل تصفيات الحسابات
        </h1>
      </div>

      <div className="grid gap-4">
        {settlements?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              لا توجد تصفيات سابقة مسجلة.
            </CardContent>
          </Card>
        ) : (
          settlements?.map((s, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="bg-muted/30 p-4 border-b flex flex-col sm:flex-row justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <User className="w-5 h-5 text-primary" />
                    {s.accountant_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    تاريخ التصفية: {formatDate(s.settlement_date)}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      فترة العمل المصفاة:
                    </div>
                    <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                      <div className="text-center flex-1">
                        <div className="text-xs text-muted-foreground">من</div>
                        <div className="font-medium">{new Date(s.period_start).toLocaleDateString('ar-SA')}</div>
                      </div>
                      <div className="w-px h-8 bg-primary/20" />
                      <div className="text-center flex-1">
                        <div className="text-xs text-muted-foreground">إلى</div>
                        <div className="font-medium">{new Date(s.period_end).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center items-end bg-green-50/50 p-4 rounded-lg border border-green-100">
                    <div className="text-sm text-green-700 mb-1 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      المبلغ المصفى
                    </div>
                    <div className="text-2xl font-black text-green-600">
                      {formatCurrency(s.total_amount)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SettlementsLog;
