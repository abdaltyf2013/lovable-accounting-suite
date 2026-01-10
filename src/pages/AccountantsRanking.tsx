import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/button";
import { Trophy, User, Star, TrendingUp } from "lucide-react";

interface AccountantStats {
  accountant_name: string;
  total_amount: number;
  invoice_count: number;
}

const AccountantsRanking = () => {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ["accountants-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("accountant_name, total_amount, type")
        .eq("type", "sales"); // الاعتماد على المبيعات فقط

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

  if (isLoading) return <div className="p-8 text-center">جاري تحميل الترتيب...</div>;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          ترتيب المحاسبين
        </h1>
      </div>

      <div className="grid gap-4">
        {ranking?.map((accountant, index) => (
          <div
            key={accountant.accountant_name}
            className={`relative flex items-center justify-between p-4 rounded-xl border bg-card transition-all hover:shadow-md ${
              index === 0 ? "border-yellow-500 bg-yellow-50/10" : ""
            }`}
          >
            <div className="flex items-center gap-4">
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
            <div className="text-left">
              <div className="text-sm text-muted-foreground">إجمالي المبيعات</div>
              <div className="text-xl font-bold text-primary">
                {accountant.total_amount.toLocaleString()} ر.س
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountantsRanking;
