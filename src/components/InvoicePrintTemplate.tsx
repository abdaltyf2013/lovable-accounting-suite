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
  notes: string | null;
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
        className="bg-white text-black p-8 min-h-[297mm] w-[210mm] mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
          <h1 className="text-3xl font-bold mb-2">
            {invoice.type === 'sales' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
          </h1>
          <p className="text-lg text-gray-600">نظام الفواتير المحاسبية</p>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="font-bold">رقم الفاتورة:</span>
              <span className="font-mono">{invoice.invoice_number}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">تاريخ الإصدار:</span>
              <span>{formatDate(invoice.created_at)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">الحالة:</span>
              <span className={`px-2 py-0.5 rounded ${
                invoice.status === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : invoice.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'cancelled' ? 'ملغاة' : 'معلقة'}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="font-bold">العميل:</span>
              <span>{invoice.client_name}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">المحاسب:</span>
              <span>{invoice.accountant_name || '-'}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 py-3 px-4 text-right font-bold">#</th>
                <th className="border border-gray-400 py-3 px-4 text-right font-bold">الوصف</th>
                <th className="border border-gray-400 py-3 px-4 text-right font-bold">الكمية</th>
                <th className="border border-gray-400 py-3 px-4 text-right font-bold">سعر الوحدة</th>
                <th className="border border-gray-400 py-3 px-4 text-right font-bold">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-400 py-2 px-4">{index + 1}</td>
                  <td className="border border-gray-400 py-2 px-4">{item.description}</td>
                  <td className="border border-gray-400 py-2 px-4">{item.quantity}</td>
                  <td className="border border-gray-400 py-2 px-4">{formatCurrency(Number(item.unit_price))}</td>
                  <td className="border border-gray-400 py-2 px-4">{formatCurrency(Number(item.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-80 border border-gray-400 rounded-lg overflow-hidden">
            <div className="flex justify-between py-3 px-4 border-b border-gray-400">
              <span className="font-bold">المجموع الفرعي:</span>
              <span>{formatCurrency(Number(invoice.amount))}</span>
            </div>
            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between py-3 px-4 border-b border-gray-400">
                <span className="font-bold">ضريبة القيمة المضافة (15%):</span>
                <span>{formatCurrency(Number(invoice.tax_amount))}</span>
              </div>
            )}
            <div className="flex justify-between py-4 px-4 bg-gray-800 text-white">
              <span className="font-bold text-lg">الإجمالي:</span>
              <span className="font-bold text-lg">{formatCurrency(Number(invoice.total_amount))}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8 p-4 bg-gray-100 rounded-lg">
            <span className="font-bold">ملاحظات:</span>
            <p className="mt-2">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 text-center text-gray-600">
          <p className="text-sm mb-2">تاريخ الطباعة: {printDate}</p>
          <p className="text-xs">هذه الفاتورة صادرة من نظام الفواتير المحاسبية</p>
        </div>
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
