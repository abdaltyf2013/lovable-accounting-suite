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
import InvoicePrintTemplate from '@/components/InvoicePrintTemplate';
import { renderToString } from 'react-dom/server';

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
  status: 'pending' | 'paid' | 'cancelled';
  accountant_name: string | null;
  created_at: string;
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
  const printRef = useRef<HTMLDivElement>(null);

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
    
    if (field === 'quantity' || field === 'unit_price') {
      const numValue = value === '' ? 0 : Number(value);
      newItems[index] = { ...newItems[index], [field]: value === '' ? '' : numValue } as any;
      
      const qty = field === 'quantity' ? numValue : (Number(newItems[index].quantity) || 0);
      const price = field === 'unit_price' ? numValue : (Number(newItems[index].unit_price) || 0);
      newItems[index].total = qty * price;
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = includeTax ? subtotal * TAX_RATE : 0;
    return { subtotal, tax, total: subtotal + tax };
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
        status: formData.status,
        notes: formData.notes,
        accountant_name: profile?.full_name || user.email,
        created_by: user.id,
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice Error:', invoiceError);
      toast({
        title: 'خطأ',
        description: `حدث خطأ أثناء إنشاء الفاتورة: ${invoiceError.message}`,
        variant: 'destructive',
      });
      return;
    }

    const invoiceItems = items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.total) || 0,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Items Error:', itemsError);
      toast({
        title: 'خطأ',
        description: `حدث خطأ أثناء إضافة بنود الفاتورة: ${itemsError.message}`,
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

  const handlePrint = () => {
    if (!selectedInvoice || !selectedInvoiceItems) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'خطأ',
        description: 'يرجى السماح بالنوافذ المنبثقة للطباعة',
        variant: 'destructive',
      });
      return;
    }

    // استخراج محتوى الفاتورة كـ HTML
    const invoiceHtml = renderToString(
      <InvoicePrintTemplate 
        invoice={selectedInvoice} 
        items={selectedInvoiceItems} 
      />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>طباعة فاتورة - ${selectedInvoice.invoice_number}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; padding: 0; background: white !important; }
            .invoice-container { width: 100%; max-width: 210mm; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            ${invoiceHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                  <Label>اسم العميل (في حال عدم وجوده في القائمة)</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="اسم العميل"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-bold">بنود الفاتورة</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    إضافة بند
                  </Button>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg relative">
                    <div className="md:col-span-2 space-y-2">
                      <Label>الوصف</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="وصف الخدمة أو المنتج"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>السعر</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -left-2 w-6 h-6 rounded-full"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label>تضمين ضريبة القيمة المضافة (15%)</Label>
                      <p className="text-sm text-muted-foreground">
                        {taxEnabledByAdmin ? 'سيتم إضافة الضريبة تلقائياً' : 'الضريبة معطلة من الإعدادات'}
                      </p>
                    </div>
                    <Switch
                      checked={includeTax}
                      onCheckedChange={setIncludeTax}
                      disabled={!taxEnabledByAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>حالة الدفع</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card>
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>المجموع الفرعي:</span>
                      <span>{formatCurrency(calculateTotals().subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الضريبة:</span>
                      <span>{formatCurrency(calculateTotals().tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>الإجمالي:</span>
                      <span>{formatCurrency(calculateTotals().total)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <Button type="submit" className="w-full">حفظ الفاتورة</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="البحث برقم الفاتورة أو اسم العميل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-none focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-10">جاري التحميل...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">لا توجد فواتير</div>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">{invoice.client_name}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(invoice.total_amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit(invoice.created_at) && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(invoice.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
            <Button onClick={handlePrint} className="gap-2 ml-4">
              <Printer className="w-4 h-4" />
              طباعة الفاتورة
            </Button>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <InvoicePrintTemplate 
                  invoice={selectedInvoice} 
                  items={selectedInvoiceItems} 
                />
              </div>
              
              <div className="flex justify-end gap-2">
                {selectedInvoice.status === 'pending' && (
                  <Button 
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    تحديد كمدفوعة
                  </Button>
                )}
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
