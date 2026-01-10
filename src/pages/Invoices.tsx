import { useEffect, useState, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Eye, Trash2, FileText, Printer } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  client_id: string | null;
  client_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  shipping_fee: number;
  status: 'pending' | 'paid' | 'cancelled';  payment_method: string;
  accountant_name: string | null;  created_at: string;
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Client {
  id: string;
  name: string;
}

interface InvoicesPageProps {
  type: 'sales' | 'purchase';
}

export default function Invoices({ type }: InvoicesPageProps) {
  const { user, profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);

  const canEdit = (createdAt: string) => {
    if (isAdmin) return true;
    const createdTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - createdTime) / (1000 * 60);
    return diffInMinutes <= 5;
  };

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    notes: '',
    shipping_fee: 0,
    payment_method: 'كاش',
    status: 'paid' as 'pending' | 'paid' | 'cancelled',
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  const [includeTax, setIncludeTax] = useState(true);
  const [taxEnabledByAdmin, setTaxEnabledByAdmin] = useState(true);
  const TAX_RATE = 0.15; // 15% VAT

  useEffect(() => {
    fetchInvoices();
    fetchClients();
    fetchSettings();
  }, [type]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const taxSetting = data.find(s => s.key === 'tax_enabled');
      if (taxSetting) {
        setTaxEnabledByAdmin(taxSetting.value);
        setIncludeTax(taxSetting.value);
      }
    }
  };

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name');
    if (data) setClients(data);
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const numValue = value === '' ? 0 : Number(value);
    newItems[index] = { ...newItems[index], [field]: numValue };
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = includeTax ? subtotal * TAX_RATE : 0;
    const shipping = Number(formData.shipping_fee) || 0;
    return { subtotal, tax, total: subtotal + tax + shipping };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { subtotal, tax, total } = calculateTotals();
    const invoiceNumber = `${type === 'sales' ? 'INV' : 'PUR'}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100000 + Math.random() * 900000)}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        type,
        client_id: formData.client_id || null,
        client_name: formData.client_name,
        amount: subtotal,
        tax_amount: tax,
        total_amount: total,
        shipping_fee: Number(formData.shipping_fee) || 0,
        payment_method: formData.payment_method,
        status: formData.status,
        notes: formData.notes,
        accountant_name: profile?.full_name || user.email,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إنشاء الفاتورة',
        variant: 'destructive',
      });
      return;
    }

    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة بنود الفاتورة',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'تم بنجاح',
      description: 'تم إنشاء الفاتورة بنجاح',
    });

    setDialogOpen(false);
    resetForm();
    fetchInvoices();
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      client_name: '',
      notes: '',
      shipping_fee: 0,
      status: 'paid',
    });
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);
    
    setSelectedInvoice(invoice);
    setSelectedInvoiceItems(data || []);
    setViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (!error) {
      toast({ title: 'تم بنجاح', description: 'تم حذف الفاتورة' });
      fetchInvoices();
    }
  };

  const handleUpdateStatus = async (id: string, status: 'pending' | 'paid' | 'cancelled') => {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id);

    if (!error) {
      toast({ title: 'تم بنجاح', description: 'تم تحديث حالة الفاتورة' });
      setViewDialogOpen(false);
      fetchInvoices();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.client_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">
          {type === 'sales' ? 'فواتير المبيعات' : 'فواتير المشتريات'}
        </h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" />
              إنشاء فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة {type === 'sales' ? 'مبيعات' : 'مشتريات'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => {
                      const client = clients.find(c => c.id === value);
                      setFormData({ ...formData, client_id: value, client_name: client?.name || '' });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميلاً" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>اسم العميل (يدوي)</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="أدخل اسم العميل"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>رسوم التوصيل (اختياري)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.shipping_fee === 0 ? '' : formData.shipping_fee}
                    onChange={(e) => setFormData({ ...formData, shipping_fee: e.target.value === '' ? 0 : Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  >
                    <option value="كاش">كاش</option>
                    <option value="شبكة">شبكة</option>
                    <option value="تحويل بنكي أهلي">تحويل بنكي أهلي</option>
                    <option value="تحويل بنكي راجحي">تحويل بنكي راجحي</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-bold">البنود</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    إضافة بند
                  </Button>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-muted/30 p-3 rounded-lg">
                    <div className="md:col-span-5 space-y-2">
                      <Label className="text-xs">الوصف</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], description: e.target.value };
                            setItems(newItems);
                          }}
                          placeholder="وصف الخدمة أو المنتج"
                          required
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">الكمية</Label>
                        <Input
                          type="number"
                          step="any"
                          value={item.quantity === 0 ? '' : item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="0"
                          required
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">السعر</Label>
                        <Input
                          type="number"
                          step="any"
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                          min="0"
                          required
                        />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs">المجموع</Label>
                      <div className="h-10 flex items-center px-3 bg-muted rounded-md text-sm font-medium">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    <div className="md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleRemoveItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between gap-6 pt-4 border-t">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="tax"
                      checked={includeTax}
                      onCheckedChange={setIncludeTax}
                    />
                    <Label htmlFor="tax">إضافة ضريبة القيمة المضافة (15%)</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="أي ملاحظات إضافية..."
                    />
                  </div>
                </div>
                
                <div className="w-full md:w-64 space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي:</span>
                    <span>{formatCurrency(calculateTotals().subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>الضريبة:</span>
                    <span>{formatCurrency(calculateTotals().tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span>الإجمالي:</span>
                    <span>{formatCurrency(calculateTotals().total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">حفظ الفاتورة</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث برقم الفاتورة أو اسم العميل..."
              className="pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-right">
                  <th className="py-3 px-4 font-medium text-muted-foreground">رقم الفاتورة</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">التاريخ</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">العميل</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">المبلغ</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">المحاسب</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">الحالة</th>
                  <th className="py-3 px-4 font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">جاري التحميل...</td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">لا توجد فواتير</td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-sm">{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</td>
                      <td className="py-3 px-4">{invoice.client_name}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(Number(invoice.total_amount))}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{invoice.accountant_name || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : invoice.status === 'cancelled'
                            ? (invoice.notes?.includes('[SETTLED_') ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700')
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {invoice.status === 'paid' ? 'مدفوعة' : (invoice.status === 'cancelled' && invoice.notes?.includes('[SETTLED_') ? 'تمت المحاسبة' : invoice.status === 'cancelled' ? 'ملغاة' : 'معلقة')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewInvoice(invoice)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!isAdmin && canEdit(invoice.created_at) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleViewInvoice(invoice)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(invoice.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl print:max-w-full print:fixed print:inset-0 print:bg-white print:m-0 print:p-0 print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 print:space-y-0" id="invoice-content">
              {/* قالب الفاتورة الاحترافي للطباعة */}
              <div className="print:p-12 print:text-black print:bg-white min-h-full flex flex-col">
                {/* الترويسة */}
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">مؤسسة سمو الأمجاد للتجارة</h1>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>مكة المكرمة - حي الشرايع</p>
                      <p>شارع محمد صالح باشراحيل</p>
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <h2 className="text-2xl font-bold text-gray-800">فاتورة {selectedInvoice.type === 'sales' ? 'مبيعات' : 'مشتريات'}</h2>
                    <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block">{selectedInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">{new Date(selectedInvoice.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                </div>

                {/* معلومات العميل والمحاسب */}
                <div className="grid grid-cols-3 gap-4 mb-10 bg-gray-50 p-4 rounded-lg print:bg-gray-50">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">العميل</p>
                    <p className="text-lg font-bold text-gray-900">{selectedInvoice.client_name}</p>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">طريقة الدفع</p>
                    <p className="text-lg font-bold text-gray-900">{selectedInvoice.payment_method || 'كاش'}</p>
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">المحاسب</p>
                    <p className="text-lg font-bold text-gray-900">{selectedInvoice.accountant_name}</p>
                  </div>
                </div>

                {/* جدول البنود */}
                <div className="flex-grow mb-10">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white print:bg-gray-800 print:text-white">
                        <th className="py-3 px-4 text-right rounded-tr-lg">الوصف</th>
                        <th className="py-3 px-4 text-center">الكمية</th>
                        <th className="py-3 px-4 text-center">السعر</th>
                        <th className="py-3 px-4 text-left rounded-tl-lg">المجموع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                      {selectedInvoiceItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-900">{item.description}</td>
                          <td className="py-4 px-4 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-4 px-4 text-center text-gray-600">{formatCurrency(item.unit_price)}</td>
                          <td className="py-4 px-4 text-left font-bold text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ملخص الحساب */}
                <div className="flex justify-end mb-12">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>الضريبة (15%):</span>
                      <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                    </div>
                    {selectedInvoice.shipping_fee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>رسوم التوصيل:</span>
                        <span>{formatCurrency(selectedInvoice.shipping_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-2xl font-bold text-gray-900 border-t-2 border-gray-900 pt-3 mt-3">
                      <span>الإجمالي:</span>
                      <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* التذييل والكلمة الطيبة */}
                <div className="mt-auto pt-10 border-t border-gray-200 text-center space-y-4">
                  <div className="bg-gray-900 text-white py-4 px-8 rounded-full inline-block print:bg-gray-900 print:text-white">
                    <p className="text-xl font-bold">شكراً لثقتكم بنا، نسعد بخدمتكم دائماً</p>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>مؤسسة سمو الأمجاد للتجارة</p>
                    <p>مكة المكرمة - حي الشرايع - شارع محمد صالح باشراحيل</p>
                  </div>
                </div>
              </div>

              {/* أزرار التحكم - تختفي عند الطباعة */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t print:hidden px-6 pb-6">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-12 text-lg font-bold border-2 hover:bg-primary hover:text-white transition-all"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer className="w-5 h-5" />
                  تحميل الفاتورة (PDF)
                </Button>
                <div className="flex flex-1 gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 bg-green-100 text-green-700 hover:bg-green-200"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                    disabled={selectedInvoice.status === 'paid'}
                  >
                    تحديد كمدفوعة
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleUpdateStatus(selectedInvoice.id, 'cancelled')}
                      disabled={selectedInvoice.status === 'cancelled'}
                    >
                      إلغاء الفاتورة
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
