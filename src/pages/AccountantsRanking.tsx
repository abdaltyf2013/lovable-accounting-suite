import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Star, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AccountantStats {
  accountant_name: string;
  total_amount: number;
  invoice_count: number;
}

const AccountantsRanking = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ranking, isLoading } = useQuery({
    queryKey: ["accountants-ranking", selectedMonth],
    queryFn: async () => {
      const startOfMonth = new Date(selectedMonth + "-01").toISOString();
      const endOfMonth = new Date(new Date(selectedMonth + "-01").getFullYear(), new Date(selectedMonth + "-01").getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from("invoices")
        .select("accountant_name, total_amount, type, created_at, status")
        .eq("type", "sales")
        .neq("status", "cancelled") // استبعاد الملغاة
        .gte("created_at", startOfMonth)
        .lte("created_at", endOfMonth);

      if (error) throw error;

      const stats = data.reduce((acc: Record<string, AccountantStats>, curr) => {
        const name = curr.accountant_name || "غير معروف";
        if (!acc[name]) {
          acc[name] = { accountant_name: name, total_amount: 0, invoice_count: 0 };
        }
        acc[name].total_amount += Number(curr.total_amount);
        acc[name].invoice_count += 1;
        return acc;
      }, {});

      return Object.values(stats).sort((a, b) => b.total_amount - a.total_amount);
    },
  });

  const handleSettlement = async (accountantName: string, totalAmount: number) => {
    if (!confirm(`هل أنت متأكد من تصفية حساب المحاسب "${accountantName}" بمبلغ ${totalAmount.toLocaleString()} ر.س؟ سيتم تصفير إحصائياته الحالية.`)) return;

    try {
      // 1. تحديث الفواتير الحالية لتصبح "مؤرشفة" (سنستخدم حقل status أو ملاحظات بما أننا لا نستطيع تعديل الجدول)
      // سنقوم بتغيير الحالة إلى 'archived' (يجب التأكد من دعمها أو استخدام ملاحظات)
      // الأفضل: سنستخدم حقل notes لإضافة علامة [SETTLED]
      const { error } = await supabase
        .from("invoices")
        .update({ status: 'cancelled', notes: `[SETTLED_${new Date().toISOString()}] ${accountantName}` })
        .eq("accountant_name", accountantName)
        .eq("type", "sales")
        .eq("status", "paid");

      if (error) throw error;

      toast({
        title: "تمت التصفية",
        description: `تمت تصفية حساب ${accountantName} بنجاح وتصفير إحصائياته.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["accountants-ranking"] });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تصفية الحساب",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="p-8 text-center">جاري تحميل الترتيب...</div>;

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          ترتيب المحاسبين
        </h1>

        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] border-none shadow-none focus:ring-0">
              <SelectValue placeholder="اختر الشهر" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {new Date(m).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {ranking?.map((accountant, index) => (
          <div
            key={accountant.accountant_name}
            className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border bg-card transition-all hover:shadow-md gap-4 ${
              index === 0 ? "border-yellow-500 bg-yellow-50/10" : ""
            }`}
          >
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                index === 0 ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{accountant.accountant_name}</span>
                  {index === 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-xs font-bold animate-pulse">
                      <Star className="w-3 h-3 fill-current" />
                      موظف الشهر
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {accountant.invoice_count} فاتورة
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-row sm:flex-row items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto border-t sm:border-none pt-4 sm:pt-0">
              <div className="text-right sm:text-left">
                <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
                <div className="text-base sm:text-xl font-bold text-primary">
                  {accountant.total_amount.toLocaleString()} ر.س
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 h-9 sm:h-10"
                onClick={() => handleSettlement(accountant.accountant_name, accountant.total_amount)}
              >
                <CheckCircle2 className="w-4 h-4" />
                تصفية
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountantsRanking;
