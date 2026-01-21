import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  national_id: string | null;
  password: string | null;
  commercial_registration: string | null;
  license_number: string | null;
  account_passwords: string | null;
  secret_notes: string | null;
  created_at: string;
}

export default function Clients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    national_id: '',
    password: '',
    commercial_registration: '',
    license_number: '',
    account_passwords: '',
    secret_notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
          national_id: formData.national_id || null,
          password: formData.password || null,
          commercial_registration: formData.commercial_registration || null,
          license_number: formData.license_number || null,
          account_passwords: formData.account_passwords || null,
          secret_notes: formData.secret_notes || null,
        })
        .eq('id', editingClient.id);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في تحديث العميل', variant: 'destructive' });
      } else {
        toast({ title: 'تم التحديث', description: 'تم تحديث بيانات العميل بنجاح' });
        fetchClients();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('clients').insert({
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        notes: formData.notes || null,
        national_id: formData.national_id || null,
        password: formData.password || null,
        commercial_registration: formData.commercial_registration || null,
        license_number: formData.license_number || null,
        account_passwords: formData.account_passwords || null,
        secret_notes: formData.secret_notes || null,
        created_by: user?.id,
      });

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في إضافة العميل', variant: 'destructive' });
      } else {
        toast({ title: 'تمت الإضافة', description: 'تم إضافة العميل بنجاح' });
        fetchClients();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف العميل', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف العميل بنجاح' });
      fetchClients();
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      phone: '', 
      email: '', 
      address: '', 
      notes: '',
      national_id: '',
      password: '',
      commercial_registration: '',
      license_number: '',
      account_passwords: '',
      secret_notes: '',
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const openEditDialog = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || '',
      national_id: client.national_id || '',
      password: client.password || '',
      commercial_registration: client.commercial_registration || '',
      license_number: client.license_number || '',
      account_passwords: client.account_passwords || '',
      secret_notes: client.secret_notes || '',
    });
    setDialogOpen(true);
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone?.includes(search) ||
      client.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <p className="text-muted-foreground">إدارة قائمة العملاء</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة عميل
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العميل *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* بيانات سرية */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3 text-orange-600">🔒 بيانات سرية (للمدراء فقط)</h3>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="national_id">رقم الهوية الوطنية</Label>
                    <Input
                      id="national_id"
                      value={formData.national_id}
                      onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                      placeholder="مثال: 1234567890"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة السر</Label>
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commercial_registration">رقم السجل التجاري</Label>
                    <Input
                      id="commercial_registration"
                      value={formData.commercial_registration}
                      onChange={(e) => setFormData({ ...formData, commercial_registration: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_number">رقم الترخيص</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_passwords">كلمات المرور (للحسابات المختلفة)</Label>
                    <Textarea
                      id="account_passwords"
                      value={formData.account_passwords}
                      onChange={(e) => setFormData({ ...formData, account_passwords: e.target.value })}
                      placeholder="مثال:\nأبشر: 123456\nنافذ: password123\nالبنك: abc@123"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secret_notes">ملاحظات سرية</Label>
                    <Textarea
                      id="secret_notes"
                      value={formData.secret_notes}
                      onChange={(e) => setFormData({ ...formData, secret_notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingClient ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن عميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">لا يوجد عملاء</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/clients/${client.id}`)}
                      title="عرض ملف العميل"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(client.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {client.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{client.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
