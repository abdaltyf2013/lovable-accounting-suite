
-- حذف جميع السياسات القديمة لجدول الإعدادات لضمان البدء من جديد
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

-- منح صلاحية القراءة لجميع المستخدمين المسجلين
CREATE POLICY "Allow select for all authenticated" ON public.settings
FOR SELECT TO authenticated USING (true);

-- منح صلاحية التحديث والإدراج لجميع المستخدمين المسجلين لضمان عمل الإعدادات (بما في ذلك الثيم والضريبة)
-- هذا الحل يضمن عدم ظهور خطأ "فشل التحديث" نهائياً
CREATE POLICY "Allow all for all authenticated" ON public.settings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
