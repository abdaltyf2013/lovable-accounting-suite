-- 1. إنشاء دالة للتحقق من صلاحيات المدير بدون عودية
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND (
        u.email IN ('Abdaltyf2015.com@gmail.com', 'awep991@gmail.com', 'Awep991@gmail.com')
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.user_id = _user_id AND p.role = 'admin'
        )
      )
  )
$$;

-- 2. حذف سياسات profiles القديمة التي تسبب العودية
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- 3. إنشاء سياسات جديدة بدون عودية
-- المستخدم يرى ملفه الشخصي
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- المدير يرى كل الملفات
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- إدراج ملف شخصي جديد (للتسجيل)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- المستخدم يعدّل ملفه
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- المدير يعدّل كل الملفات
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. تحديث سياسات clients
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage clients"
ON public.clients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. تحديث سياسات invoices
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

CREATE POLICY "Authenticated users can view invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. تحديث سياسات invoice_items
DROP POLICY IF EXISTS "Authenticated users can manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;

CREATE POLICY "Authenticated users can view invoice items"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage invoice items"
ON public.invoice_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);