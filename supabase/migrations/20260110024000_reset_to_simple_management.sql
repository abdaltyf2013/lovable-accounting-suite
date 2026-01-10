
-- حذف السياسات السابقة
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- سياسة القراءة للجميع
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- سياسة التحديث (للمستخدم نفسه أو للمدير)
CREATE POLICY "Users and admins can update profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com'
);

-- سياسة الحذف (للمدير فقط)
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com'
);
