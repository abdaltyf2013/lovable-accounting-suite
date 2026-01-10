
-- تحديث سياسات clients: الكل يشوف، الإضافة/التعديل للمصادقين، الحذف للمدراء فقط
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage own clients" ON public.clients;

-- الكل يشوف العملاء
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

-- المصادقين يضيفون عملاء
CREATE POLICY "Authenticated users can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (true);

-- المصادقين يعدّلون العملاء
CREATE POLICY "Authenticated users can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (true);

-- المدراء فقط يحذفون
CREATE POLICY "Only admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- تحديث سياسات invoices: المحاسب يرى فواتيره فقط، المدير يرى الكل
DROP POLICY IF EXISTS "Users can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can manage own invoices" ON public.invoices;

-- المستخدم يرى فواتيره فقط أو المدير يرى الكل
CREATE POLICY "Users view own invoices or admin views all"
ON public.invoices
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- المستخدم يضيف فواتيره
CREATE POLICY "Users can insert own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- المستخدم يعدّل فواتيره أو المدير
CREATE POLICY "Users can update own invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- المستخدم يحذف فواتيره أو المدير
CREATE POLICY "Users can delete own invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- تحديث سياسات invoice_items
DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can manage own invoice items" ON public.invoice_items;

-- المستخدم يرى عناصر فواتيره فقط
CREATE POLICY "Users view own invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- المستخدم يضيف عناصر لفواتيره
CREATE POLICY "Users can insert invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- المستخدم يعدّل عناصر فواتيره
CREATE POLICY "Users can update invoice items"
ON public.invoice_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- المستخدم يحذف عناصر فواتيره
CREATE POLICY "Users can delete invoice items"
ON public.invoice_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);
