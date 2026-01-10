
-- التأكد من وجود حقل طريقة الدفع في جدول الفواتير
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='payment_method') THEN
        ALTER TABLE public.invoices ADD COLUMN payment_method TEXT DEFAULT 'كاش';
    END IF;
END $$;

-- تحديث سياسات الأمان لجدول الفواتير لضمان قدرة الجميع على الإدراج
DROP POLICY IF EXISTS "Anyone can insert invoices" ON public.invoices;
CREATE POLICY "Anyone can insert invoices" ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (true);

-- تحديث سياسات الأمان لجدول بنود الفواتير
DROP POLICY IF EXISTS "Anyone can insert invoice items" ON public.invoice_items;
CREATE POLICY "Anyone can insert invoice items" ON public.invoice_items
FOR INSERT TO authenticated
WITH CHECK (true);
