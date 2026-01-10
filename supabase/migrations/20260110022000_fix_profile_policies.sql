
-- حذف السياسات القديمة لجدول الملفات الشخصية لتجنب التعارض
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin can update all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can manage all profiles" ON public.profiles;

-- سياسة تسمح للمستخدم بتحديث ملفه الشخصي الخاص
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- سياسة تسمح للمدير بالتحكم الكامل في جميع الملفات الشخصية (تحديث، حذف)
CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
