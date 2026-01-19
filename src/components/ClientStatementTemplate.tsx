import { forwardRef } from 'react';

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  type: 'sales' | 'purchase';
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ClientStatementTemplateProps {
  client: Client;
  invoices: Invoice[];
}

const ClientStatementTemplate = forwardRef<HTMLDivElement, ClientStatementTemplateProps>(
  ({ client, invoices }, ref) => {
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

    const totalDue = invoices
      .filter(inv => inv.status !== 'paid' && inv.type === 'sales')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    const totalPaid = invoices
      .filter(inv => inv.status === 'paid' && inv.type === 'sales')
      .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

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
        className="statement-print-container"
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
            <h1 className="text-5xl font-black text-gray-900 mb-2">كشف حساب عميل</h1>
            <p className="text-2xl font-bold text-gray-700">مؤسسة اشعار للنسخ والتصوير</p>
          </div>
          <div className="text-left bg-gray-100 p-6 rounded-2xl border-2 border-gray-200">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">تاريخ الكشف</div>
            <div className="text-2xl font-black text-gray-900">{printDate.split(' في ')[0]}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-10 mb-12 bg-gray-50 p-8 rounded-3xl border-2 border-gray-100">
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-500 font-bold mb-1">اسم العميل</span>
              <span className="text-3xl font-black text-gray-900">{client.name}</span>
            </div>
            {client.phone && (
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 font-bold mb-1">رقم الهاتف</span>
                <span className="text-xl font-bold text-gray-900" dir="ltr">{client.phone}</span>
              </div>
            )}
          </div>
          <div className="space-y-4 text-left">
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-bold mb-1">إجمالي المبالغ المدفوعة</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-bold mb-1">إجمالي المبالغ المستحقة</span>
              <span className="text-3xl font-black text-red-600">{formatCurrency(totalDue)}</span>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-black mb-4 border-r-8 border-gray-900 pr-4">سجل العمليات</h2>
          <table className="w-full text-lg border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="border-4 border-gray-900 p-4 text-right rounded-tr-2xl">التاريخ</th>
                <th className="border-4 border-gray-900 p-4 text-center">رقم الفاتورة</th>
                <th className="border-4 border-gray-900 p-4 text-center">الحالة</th>
                <th className="border-4 border-gray-900 p-4 text-center rounded-tl-2xl">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border-2 border-gray-200 p-10 text-center text-gray-400 font-bold">
                    لا توجد عمليات مسجلة لهذا العميل
                  </td>
                </tr>
              ) : (
                invoices.map((inv, index) => (
                  <tr key={inv.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border-2 border-gray-200 p-4 font-bold text-gray-800">{formatDate(inv.created_at)}</td>
                    <td className="border-2 border-gray-200 p-4 text-center font-mono font-bold">{inv.invoice_number}</td>
                    <td className="border-2 border-gray-200 p-4 text-center">
                      <span className={`px-4 py-1 rounded-full text-sm font-black ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inv.status === 'paid' ? 'مدفوعة' : 'مستحقة'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-200 p-4 text-center font-black text-gray-900">{formatCurrency(Number(inv.total_amount))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-16">
          <div className="w-full max-w-md space-y-4">
            <div className="flex justify-between p-8 bg-gray-900 text-white rounded-3xl shadow-2xl">
              <span className="text-2xl font-black">الرصيد المتبقي</span>
              <span className="text-4xl font-black">{formatCurrency(totalDue)}</span>
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

ClientStatementTemplate.displayName = 'ClientStatementTemplate';

export default ClientStatementTemplate;
