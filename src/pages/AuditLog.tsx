import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck, User, Clock, Activity } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    // ملاحظة: بما أننا لم ننشئ جدول audit_logs في Supabase بعد، 
    // سنقوم بجلب الفواتير كنموذج أولي للرقابة حالياً (من أنشأ ماذا ومتى)
    const { data, error } = await supabase
      .from('invoices')
      .select('id, accountant_name, invoice_number, type, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedLogs: AuditLogEntry[] = data.map(item => ({
        id: item.id,
        user_email: item.accountant_name || 'غير معروف',
        action: item.type === 'sales' ? 'إصدار فاتورة مبيعات' : 'إصدار فاتورة مشتريات',
        details: `رقم الفاتورة: ${item.invoice_number}`,
        created_at: item.created_at
      }));
      setLogs(formattedLogs);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => 
    log.user_email.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-foreground">سجل الرقابة</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالمحاسب أو الإجراء..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">جاري تحميل السجلات...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">لا توجد سجلات حالياً</div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm">{log.action}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString('ar-SA')}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700">
                      <User className="w-3 h-3" />
                      {log.user_email}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
