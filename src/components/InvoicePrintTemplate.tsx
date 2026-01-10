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
  shipping_fee: number;
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
        className="bg-white text-black p-4 mx-auto print:p-0"
        style={{ 
          width: '148mm', 
          minHeight: '210mm',
          fontFamily: 'Arial, sans-serif',
          direction: 'rtl'
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: A5;
            margin: 5mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
            }
            .print-container {
              width: 148mm !important;
              height: 210mm !important;
              padding: 5mm !important;
            }
          }
        `}} />
        
        <div className="print-container border-2 border-gray-200 p-4 rounded-lg h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-primary pb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">
                {invoice.type === 'sales' ? 'فاتورة مبيعات' : 'فاتورة مشتريات'}
              </h1>
              <p className="text-sm text-gray-600">مؤسسة سمو الأمجاد للتجارة</p>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold">رقم الفاتورة:</div>
              <div className="text-lg font-mono text-primary">{invoice.invoice_number}</div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-1">
              <div className="flex gap-2">
                <span className="font-bold text-gray-700">التاريخ:</span>
                <span>{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-gray-700">العميل:</span>
                <span>{invoice.client_name}</span>
              </div>
            </div>
            <div className="space-y-1 text-left">
              <div className="flex justify-end gap-2">
                <span className="font-bold text-gray-700">المحاسب:</span>
                <span>{invoice.accountant_name || '-'}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-bold text-gray-700">الحالة:</span>
                <span className={invoice.status === 'paid' ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                  {invoice.status === 'paid' ? 'مدفوعة' : 'معلقة'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="flex-grow">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-right">الوصف</th>
                  <th className="border border-gray-300 p-2 text-center w-16">الكمية</th>
                  <th className="border border-gray-300 p-2 text-center w-24">السعر</th>
                  <th className="border border-gray-300 p-2 text-center w-24">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{item.description}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-center">{Number(item.unit_price).toFixed(2)}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{Number(item.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between p-1 border-b">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(Number(invoice.amount))}</span>
              </div>
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between p-1 border-b">
                  <span>الضريبة (15%):</span>
                  <span>{formatCurrency(Number(invoice.tax_amount))}</span>
                </div>
              )}
              {Number(invoice.shipping_fee) > 0 && (
                <div className="flex justify-between p-1 border-b">
                  <span>رسوم التوصيل:</span>
                  <span>{formatCurrency(Number(invoice.shipping_fee))}</span>
                </div>
              )}
              <div className="flex justify-between p-2 bg-gray-900 text-white rounded mt-2">
                <span className="font-bold">الإجمالي النهائي:</span>
                <span className="font-bold">{formatCurrency(Number(invoice.total_amount))}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500 mb-1">شكراً لتعاملكم معنا</p>
            <p className="text-[10px] text-gray-400">تاريخ الطباعة: {printDate}</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
