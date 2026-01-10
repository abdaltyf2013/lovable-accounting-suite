import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  UserCircle,
  Mail,
  Calendar,
  Search,
  Shield,
  ShieldCheck,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  DollarSign,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'accountant';
  is_approved: boolean;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  client_name: string;
  total_amount: number;
  status: string;
  accountant_name: string | null;
  created_by: string;
  created_at: string;
}

interface AccountantStats {
  profile: Profile;
  salesCount: number;
  salesTotal: number;
  purchaseCount: number;
  purchaseTotal: number;
  pendingCount: number;
  paidCount: number;
}

export default function Accountants() {
  const { isAdmin, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAccountant, setSelectedAccountant] = useState<AccountantStats | null>(null);
  const [accountantInvoices, setAccountantInvoices] = useState<Invoice[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // حالات التعديل
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    const [profilesRes, invoicesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (invoicesRes.data) setInvoices(invoicesRes.data as Invoice[]);
    setLoading(false);
  };

  const getAccountantStats = (profile: Profile): AccountantStats => {
    const accountantInvs = invoices.filter(
      (inv) => inv.created_by === profile.user_id || inv.accountant_name === profile.full_name
    );

    const salesInvs = accountantInvs.filter((i) => i.type === 'sales');
    const purchaseInvs = accountantInvs.filter((i) => i.type === 'purchase');

    return {
      profile,
      salesCount: salesInvs.length,
      salesTotal: salesInvs.reduce((sum, i) => sum + Number(i.total_amount), 0),
      purchaseCount: purchaseInvs.length,
      purchaseTotal: purchaseInvs.reduce((sum, i) => sum + Number(i.total_amount), 0),
      pendingCount: accountantInvs.filter((i) => i.status === 'pending').length,
      paidCount: accountantInvs.filter((i) => i.status === 'paid').length,
    };
  };

  const viewAccountantDetails = (profile: Profile) => {
    const stats = getAccountantStats(profile);
    setSelectedAccountant(stats);

    const invs = invoices.filter(
      (inv) => inv.created_by === profile.user_id || inv.accountant_name === profile.full_name
    );
    setAccountantInvoices(invs);
    setDialogOpen(true);
  };

  const handleApprove = async (profile: Profile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في اعتماد المحاسب', variant: 'destructive' });
    } else {
      toast({ title: 'تم الاعتماد', description: `تم اعتماد المحاسب ${profile.full_name} بنجاح` });
      fetchData();
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (profile.user_id === currentProfile?.user_id) {
      toast({ title: 'غير مسموح', description: 'لا يمكنك حذف حسابك الخاص', variant: 'destructive' });
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف المحاسب ${profile.full_name}؟ سيتم حذف ملفه الشخصي فقط.`)) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المحاسب', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف المحاسب بنجاح' });
      fetchData();
    }
  };

  const handleEditName = (profile: Profile) => {
    setEditingProfile(profile);
    setNewName(profile.full_name);
    setEditDialogOpen(true);
  };

  const saveName = async () => {
    if (!editingProfile || !newName.trim()) return;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', editingProfile.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الاسم', variant: 'destructive' });
    } else {
      toast({ title: 'تم التحديث', description: 'تم تحديث اسم المحاسب بنجاح' });
      setEditDialogOpen(false);
      fetchData();
    }
  };

  const toggleRole = async (profile: Profile) => {
    if (profile.user_id === currentProfile?.user_id) {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكنك تغيير صلاحياتك الخاصة',
        variant: 'destructive',
      });
      return;
    }

    const newRole = profile.role === 'admin' ? 'accountant' : 'admin';

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, is_approved: true })
      .eq('id', profile.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الصلاحية', variant: 'destructive' });
    } else {
      toast({ title: 'تم التحديث', description: `تم تغيير الصلاحية إلى ${newRole === 'admin' ? 'مدير' : 'محاسب'}` });
      fetchData();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredProfiles = profiles.filter(
    (p) =>
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalAccountants = profiles.filter((p) => p.role === 'accountant').length;
  const totalAdmins = profiles.filter((p) => p.role === 'admin').length;
  const totalInvoices = invoices.length;
  const totalSales = invoices.filter((i) => i.type === 'sales').reduce((s, i) => s + Number(i.total_amount), 0);
  const totalPurchases = invoices.filter((i) => i.type === 'purchase').reduce((s, i) => s + Number(i.total_amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة المحاسبين</h1>
          <p className="text-muted-foreground">متابعة أداء الفريق والإحصائيات</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-100"><Users className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-muted-foreground">المحاسبين</p><p className="text-lg font-bold">{totalAccountants}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-100"><ShieldCheck className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-muted-foreground">المدراء</p><p className="text-lg font-bold">{totalAdmins}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-gray-100"><FileText className="w-5 h-5 text-gray-600" /></div><div><p className="text-xs text-muted-foreground">الفواتير</p><p className="text-lg font-bold">{totalInvoices}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100"><TrendingUp className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-muted-foreground">المبيعات</p><p className="text-lg font-bold">{formatCurrency(totalSales)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-100"><TrendingDown className="w-5 h-5 text-red-600" /></div><div><p className="text-xs text-muted-foreground">المشتريات</p><p className="text-lg font-bold">{formatCurrency(totalPurchases)}</p></div></div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن محاسب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10"><p className="text-muted-foreground">جاري التحميل...</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const stats = getAccountantStats(profile);
            return (
              <Card key={profile.id} className={`hover:shadow-lg transition-shadow ${!profile.is_approved ? 'border-yellow-400 bg-yellow-50/30' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                      <UserCircle className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">{profile.full_name}</CardTitle>
                        {!profile.is_approved && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">بانتظار الموافقة</span>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${profile.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-secondary-foreground'}`}>
                        {profile.role === 'admin' ? <><ShieldCheck className="w-3 h-3" />مدير</> : <><Shield className="w-3 h-3" />محاسب</>}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(profile.created_at).toLocaleDateString('ar-SA')}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">مبيعات</p>
                      <p className="font-bold text-green-600">{stats.salesCount}</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-muted-foreground">مشتريات</p>
                      <p className="font-bold text-red-600">{stats.purchaseCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => viewAccountantDetails(profile)}>
                      <Eye className="w-4 h-4" /> تفاصيل
                    </Button>
                    
                    {profile.user_id !== currentProfile?.user_id && (
                      <>
                        {!profile.is_approved && (
                          <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleApprove(profile)}>
                            <CheckCircle2 className="w-4 h-4" /> اعتماد
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleEditName(profile)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(profile)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleRole(profile)}>
                          {profile.role === 'admin' ? 'تحويل لمحاسب' : 'ترقية'}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* نافذة تعديل الاسم */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>تعديل اسم المحاسب</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="أدخل الاسم الجديد" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={saveName}>حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تفاصيل المحاسب */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-6 h-6" /> تفاصيل {selectedAccountant?.profile.full_name}
            </DialogTitle>
          </DialogHeader>
          {selectedAccountant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center"><TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" /><p className="text-xs text-muted-foreground">فواتير المبيعات</p><p className="text-xl font-bold">{selectedAccountant.salesCount}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" /><p className="text-xs text-muted-foreground">فواتير المشتريات</p><p className="text-xl font-bold">{selectedAccountant.purchaseCount}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" /><p className="text-xs text-muted-foreground">مدفوعة</p><p className="text-xl font-bold text-green-600">{selectedAccountant.paidCount}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><FileText className="w-8 h-8 text-yellow-600 mx-auto mb-2" /><p className="text-xs text-muted-foreground">معلقة</p><p className="text-xl font-bold text-yellow-600">{selectedAccountant.pendingCount}</p></CardContent></Card>
              </div>
              <div>
                <h3 className="font-bold mb-3">آخر الفواتير ({accountantInvoices.length})</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr><th className="text-right py-2 px-3">رقم الفاتورة</th><th className="text-right py-2 px-3">النوع</th><th className="text-right py-2 px-3">العميل</th><th className="text-right py-2 px-3">المبلغ</th><th className="text-right py-2 px-3">الحالة</th></tr>
                    </thead>
                    <tbody>
                      {accountantInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t">
                          <td className="py-2 px-3 font-mono">{invoice.invoice_number}</td>
                          <td className="py-2 px-3">{invoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}</td>
                          <td className="py-2 px-3">{invoice.client_name}</td>
                          <td className="py-2 px-3 font-medium">{formatCurrency(Number(invoice.total_amount))}</td>
                          <td className="py-2 px-3">{invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
