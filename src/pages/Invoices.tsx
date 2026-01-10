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

interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  client_id: string | null;
  client_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string | null;
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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<InvoiceItem[]>([]);

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
  const printRef = useRef<HTMLDivElement>(null);

  const TAX_RATE = 0.15; // 15% VAT

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [type]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name');
    if (data) setClients(data);
  };

  const generateInvoiceNumber = () => {
    const prefix = type === 'sales' ? 'INV' : 'PUR';
    const date = new Date();
    const timestamp = date.getTime().toString().slice(-6);
    return `${prefix}-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}-${timestamp}`;
  };

  const calculateTotals = (withTax: boolean = includeTax) => {
    const amount = items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = withTax ? amount * TAX_RATE : 0;
    const total_amount = amount + tax_amount;
    return { amount, tax_amount, total_amount };
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = Number(newItems[index].quantity) * Number(newItems[index].unit_price);
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.description && item.total > 0);
    if (validItems.length === 0) {
      toast({ title: 'خطأ', description: 'أضف بند واحد على الأقل', variant: 'destructive' });
      return;
    }

    const { amount, tax_amount, total_amount } = calculateTotals(includeTax);
    const invoice_number = generateInvoiceNumber();

    const selectedClient = clients.find((c) => c.id === formData.client_id);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number,
        type,
        client_id: formData.client_id || null,
        client_name: selectedClient?.name || formData.client_name,
        amount,
        tax_amount,
        total_amount,
        status: formData.status,
        notes: formData.notes || null,
        created_by: user?.id,
        accountant_name: profile?.full_name,
      })
      .select()
      .single();

    if (invoiceError) {
      toast({ title: 'خطأ', description: 'فشل في إنشاء الفاتورة', variant: 'destructive' });
      return;
    }

    const invoiceItems = validItems.map((item) => ({
      invoice_id: invoiceData.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase.from('invoice_items').insert(invoiceItems);

    if (itemsError) {
      toast({ title: 'خطأ', description: 'فشل في إضافة البنود', variant: 'destructive' });
    } else {
      toast({ title: 'تم الإنشاء', description: 'تم إنشاء الفاتورة بنجاح' });
      fetchInvoices();
      resetForm();
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const { data } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id);
    setSelectedInvoiceItems(data || []);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = async (invoiceId: string, status: 'pending' | 'paid' | 'cancelled') => {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', invoiceId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    } else {
      toast({ title: 'تم التحديث', description: 'تم تحديث حالة الفاتورة' });
      fetchInvoices();
      setViewDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف الفاتورة', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف الفاتورة بنجاح' });
      fetchInvoices();
    }
  };

  const resetForm = () => {
    setFormData({ client_id: '', client_name: '', notes: '', status: 'paid' });
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setIncludeTax(true);
    setDialogOpen(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>طباعة فاتورة - ${selectedInvoice?.invoice_number}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(search.toLowerCase())
  );

  const title = type === 'sales' ? 'فواتير المبيعات' : 'فواتير المشتريات';
  const { amount, tax_amount, total_amount } = calculateTotals();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">إدارة {title}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء فاتورة {type === 'sales' ? 'مبيعات' : 'مشتريات'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اختر عميل</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value, client_name: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عميل..." />
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
                  <Label>أو أدخل اسم العميل</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value, client_id: '' })}
                    placeholder="اسم العميل"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>بنود الفاتورة</Label>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Input
                          placeholder="الوصف"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="الكمية"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="السعر"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                          min="0"
                        />
                      </div>
                      <div className="col-span-2 text-sm font-medium py-2">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 ml-1" /> إضافة بند
                </Button>
              </div>

              {/* Tax Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="include-tax" className="font-medium">تضمين ضريبة القيمة المضافة (15%)</Label>
                </div>
                <Switch
                  id="include-tax"
                  checked={includeTax}
                  onCheckedChange={setIncludeTax}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>المجموع قبل الضريبة:</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
                {includeTax && (
                  <div className="flex justify-between text-primary">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span>{formatCurrency(tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>الإجمالي:</span>
                  <span>{formatCurrency(total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">إنشاء الفاتورة</Button>
                <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث عن فاتورة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد فواتير</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-card rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-right py-3 px-4 text-sm font-medium">رقم الفاتورة</th>
                <th className="text-right py-3 px-4 text-sm font-medium">العميل</th>
                <th className="text-right py-3 px-4 text-sm font-medium">المبلغ</th>
                <th className="text-right py-3 px-4 text-sm font-medium">المحاسب</th>
                <th className="text-right py-3 px-4 text-sm font-medium">الحالة</th>
                <th className="text-right py-3 px-4 text-sm font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="py-3 px-4 font-mono text-sm">{invoice.invoice_number}</td>
                  <td className="py-3 px-4">{invoice.client_name}</td>
                  <td className="py-3 px-4 font-medium">{formatCurrency(Number(invoice.total_amount))}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{invoice.accountant_name || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'cancelled' ? 'ملغاة' : 'معلقة'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(invoice.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الفاتورة</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">رقم الفاتورة:</span>
                  <p className="font-mono font-bold">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">العميل:</span>
                  <p className="font-medium">{selectedInvoice.client_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">المحاسب:</span>
                  <p>{selectedInvoice.accountant_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">التاريخ:</span>
                  <p>{new Date(selectedInvoice.created_at).toLocaleDateString('ar-SA')}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-right py-2 px-3">الوصف</th>
                      <th className="text-right py-2 px-3">الكمية</th>
                      <th className="text-right py-2 px-3">السعر</th>
                      <th className="text-right py-2 px-3">المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceItems.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">{item.description}</td>
                        <td className="py-2 px-3">{item.quantity}</td>
                        <td className="py-2 px-3">{formatCurrency(Number(item.unit_price))}</td>
                        <td className="py-2 px-3">{formatCurrency(Number(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>المجموع:</span>
                    <span>{formatCurrency(Number(selectedInvoice.amount))}</span>
                  </div>
                  {Number(selectedInvoice.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة (15%):</span>
                      <span>{formatCurrency(Number(selectedInvoice.tax_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-2">
                    <span>الإجمالي:</span>
                    <span>{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handlePrint}
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الفاتورة
                  </Button>
                  <Button
                    variant={selectedInvoice.status === 'paid' ? 'secondary' : 'outline'}
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'paid')}
                    disabled={selectedInvoice.status === 'paid'}
                  >
                    تحديد كمدفوعة
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedInvoice.id, 'cancelled')}
                    disabled={selectedInvoice.status === 'cancelled'}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* Hidden Print Template */}
            <div className="hidden">
              {selectedInvoice && (
                <InvoicePrintTemplate
                  ref={printRef}
                  invoice={selectedInvoice}
                  items={selectedInvoiceItems}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
