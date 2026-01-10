
-- حذف السياسات القديمة لجدول الإعدادات
DROP POLICY IF EXISTS "Settings are viewable by authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

-- سياسة القراءة للجميع
CREATE POLICY "Settings are viewable by authenticated users" ON public.settings
FOR SELECT TO authenticated USING (true);

-- سياسة التحكم الكامل للمدير (باستخدام البريد الإلكتروني المباشر لضمان النجاح)
CREATE POLICY "Admins can manage settings" ON public.settings
FOR ALL TO authenticated
USING (
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com' OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com' OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
