import { forwardRef } from 'react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  type: 'sales' | 'purchase';
  client_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes?: string | null;
  accountant_name: string | null;
  created_at: string;
}

interface InvoicePrintTemplateProps {
  invoice: Invoice;
  items: InvoiceItem[];
}

const InvoicePrintTemplate = forwardRef<HTMLDivElement, InvoicePrintTemplateProps>(
  ({ invoice, items }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const printDate = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        ref={ref}
        className="invoice-print-container"
        style={{ 
          width: '100%',
          maxWidth: '210mm',
          margin: '0 auto',
          backgroundColor: 'white',
          direction: 'rtl',
          fontFamily: 'Arial, sans-serif',
          padding: '10mm',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b-8 border-gray-900 pb-6">
          <div>
            <h1 className="text-5xl font-black text-gray-900 mb-2">
              {invoice.type === 'sales' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
            </h1>
            <p className="text-2xl font-bold text-gray-700">مؤسسة اشعار للنسخ والتصوير</p>
          </div>
          <div className="text-left bg-gray-100 p-6 rounded-2xl border-2 border-gray-200">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">رقم الفاتورة</div>
            <div className="text-4xl font-black text-gray-900 font-mono">{invoice.invoice_number}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-10 mb-12 bg-gray-50 p-8 rounded-3xl border-2 border-gray-100">
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-bold mb-1">تاريخ الإصدار</span>
              <span className="text-2xl font-bold text-gray-900">{formatDate(invoice.created_at)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-bold mb-1">العميل</span>
              <span className="text-3xl font-black text-gray-900">{invoice.client_name}</span>
            </div>
          </div>
          <div className="space-y-4 text-left">
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-bold mb-1">المحاسب</span>
              <span className="text-2xl font-bold text-gray-900">{invoice.accountant_name || '-'}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-bold mb-1">حالة الفاتورة</span>
              <span className={`text-xl font-black px-6 py-2 rounded-full ${invoice.status === 'paid' ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
                {invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}
              </span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-12">
          <table className="w-full text-xl border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="border-4 border-gray-900 p-5 text-right rounded-tr-2xl">الوصف</th>
                <th className="border-4 border-gray-900 p-5 text-center w-24">الكمية</th>
                <th className="border-4 border-gray-900 p-5 text-center w-40">السعر</th>
                <th className="border-4 border-gray-900 p-5 text-center w-40 rounded-tl-2xl">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-2 border-gray-200 p-5 font-bold text-gray-800">{item.description}</td>
                  <td className="border-2 border-gray-200 p-5 text-center font-bold">{item.quantity}</td>
                  <td className="border-2 border-gray-200 p-5 text-center font-bold">{Number(item.unit_price).toFixed(2)}</td>
                  <td className="border-2 border-gray-200 p-5 text-center font-black text-gray-900">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-16">
          <div className="w-full max-w-md space-y-4">
            <div className="flex justify-between p-8 bg-gray-900 text-white rounded-3xl shadow-2xl">
              <span className="text-3xl font-black">الإجمالي</span>
              <span className="text-5xl font-black">{formatCurrency(Number(invoice.amount))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 border-t-4 border-gray-100 text-center">
          <div className="inline-block bg-gray-900 text-white px-12 py-4 rounded-full mb-6 shadow-lg">
            <p className="text-2xl font-black">شكراً لتعاملكم معنا</p>
          </div>
          <div className="flex justify-center gap-12 text-sm text-gray-400 font-bold uppercase tracking-widest">
            <span>تاريخ الطباعة: {printDate}</span>
            <span>•</span>
<span>نظام المحاسبة</span>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
