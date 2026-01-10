
-- حذف السياسات القديمة لجدول الملفات الشخصية
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- سياسة تسمح للمستخدم بتحديث ملفه الشخصي الخاص
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- سياسة مضمونة تعتمد على البريد الإلكتروني للمدير الرئيسي أو دور المدير
-- تمنح صلاحية كاملة (إدخال، تحديث، حذف)
CREATE POLICY "Super Admin manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com' OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
