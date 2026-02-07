import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Users,
  Plus,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Loader2,
  Search,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Tenant {
  id: string;
  name: string;
  subscription_status: 'active' | 'inactive' | 'suspended' | 'trial';
  max_branches: number;
  owner_id: string | null;
  created_at: string;
  contact_email: string | null;
  contact_phone: string | null;
}

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
}

const statusConfig = {
  active: { label: 'نشط', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle },
  trial: { label: 'تجريبي', color: 'bg-info/10 text-info border-info/20', icon: Clock },
  inactive: { label: 'غير نشط', color: 'bg-muted text-muted-foreground border-muted', icon: AlertTriangle },
  suspended: { label: 'موقوف', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: Ban },
};

export default function SuperAdminDashboard() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<TenantStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    suspendedTenants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    max_branches: 1,
    subscription_status: 'trial' as 'active' | 'inactive' | 'suspended' | 'trial',
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTenants(data || []);
      
      // Calculate stats
      const tenantsData = data || [];
      setStats({
        totalTenants: tenantsData.length,
        activeTenants: tenantsData.filter(t => t.subscription_status === 'active').length,
        trialTenants: tenantsData.filter(t => t.subscription_status === 'trial').length,
        suspendedTenants: tenantsData.filter(t => t.subscription_status === 'suspended').length,
      });
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب بيانات الشركات',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    try {
      const { error } = await supabase.from('tenants').insert({
        name: formData.name,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        max_branches: formData.max_branches,
        subscription_status: formData.subscription_status,
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إنشاء الشركة الجديدة',
      });
      setIsCreateOpen(false);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إنشاء الشركة',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          max_branches: formData.max_branches,
          subscription_status: formData.subscription_status,
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث بيانات الشركة',
      });
      setIsEditOpen(false);
      setSelectedTenant(null);
      resetForm();
      fetchTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الشركة',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSuspend = async (tenant: Tenant) => {
    const newStatus = tenant.subscription_status === 'suspended' ? 'active' : 'suspended';
    
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ subscription_status: newStatus })
        .eq('id', tenant.id);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: newStatus === 'suspended' ? 'تم إيقاف الشركة' : 'تم تفعيل الشركة',
      });
      fetchTenants();
    } catch (error) {
      console.error('Error toggling tenant status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الشركة',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      contact_email: tenant.contact_email || '',
      contact_phone: tenant.contact_phone || '',
      max_branches: tenant.max_branches,
      subscription_status: tenant.subscription_status,
    });
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      max_branches: 1,
      subscription_status: 'trial',
    });
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة تحكم Super Admin</h1>
            <p className="text-muted-foreground text-sm">إدارة جميع الشركات والاشتراكات</p>
          </div>
        </div>
        <Button onClick={fetchTenants} variant="outline" size="icon">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الشركات</p>
                  <p className="text-3xl font-bold mt-1">{stats.totalTenants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">شركات نشطة</p>
                  <p className="text-3xl font-bold mt-1 text-primary">{stats.activeTenants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">فترة تجريبية</p>
                  <p className="text-3xl font-bold mt-1 text-info">{stats.trialTenants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">موقوفة</p>
                  <p className="text-3xl font-bold mt-1 text-destructive">{stats.suspendedTenants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>الشركات المسجلة</CardTitle>
              <CardDescription>قائمة بجميع الشركات المشتركة في النظام</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 w-64"
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة شركة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة شركة جديدة</DialogTitle>
                    <DialogDescription>
                      أدخل بيانات الشركة الجديدة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>اسم الشركة *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="أدخل اسم الشركة"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>البريد الإلكتروني</Label>
                      <Input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="email@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="05xxxxxxxx"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>حد الفروع</Label>
                        <Input
                          type="number"
                          min={1}
                          value={formData.max_branches}
                          onChange={(e) => setFormData({ ...formData, max_branches: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>حالة الاشتراك</Label>
                        <Select
                          value={formData.subscription_status}
                          onValueChange={(value: 'active' | 'inactive' | 'suspended' | 'trial') => 
                            setFormData({ ...formData, subscription_status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">تجريبي</SelectItem>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="inactive">غير نشط</SelectItem>
                            <SelectItem value="suspended">موقوف</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleCreateTenant} disabled={!formData.name}>
                      إنشاء
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد شركات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشركة</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>حد الفروع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => {
                    const status = statusConfig[tenant.subscription_status];
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>{tenant.contact_email || '-'}</TableCell>
                        <TableCell>{tenant.contact_phone || '-'}</TableCell>
                        <TableCell>{tenant.max_branches}</TableCell>
                        <TableCell>
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(tenant)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={tenant.subscription_status === 'suspended' ? 'default' : 'destructive'}
                              size="sm"
                              onClick={() => handleToggleSuspend(tenant)}
                            >
                              {tenant.subscription_status === 'suspended' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 ml-1" />
                                  تفعيل
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 ml-1" />
                                  إيقاف
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات الشركة</DialogTitle>
            <DialogDescription>
              تحديث بيانات {selectedTenant?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم الشركة *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>حد الفروع</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.max_branches}
                  onChange={(e) => setFormData({ ...formData, max_branches: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>حالة الاشتراك</Label>
                <Select
                  value={formData.subscription_status}
                  onValueChange={(value: 'active' | 'inactive' | 'suspended' | 'trial') => 
                    setFormData({ ...formData, subscription_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">تجريبي</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                    <SelectItem value="suspended">موقوف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateTenant} disabled={!formData.name}>
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
