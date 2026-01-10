
-- تحديث سياسات invoices: المحاسب يرى فواتيره فقط، المدير يرى الكل
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;

-- المستخدم يرى فواتيره فقط
CREATE POLICY "Users can view own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- المستخدم يدير فواتيره فقط
CREATE POLICY "Users can manage own invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- تحديث سياسات invoice_items
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON public.invoice_items;

-- المستخدم يرى عناصر فواتيره فقط
CREATE POLICY "Users can view own invoice items"
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

-- المستخدم يدير عناصر فواتيره فقط
CREATE POLICY "Users can manage own invoice items"
ON public.invoice_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND (i.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- تحديث سياسات clients: كل المصادقين يرون العملاء، لكن يديرون عملاءهم فقط
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own clients"
ON public.clients
FOR ALL
TO authenticated
USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
