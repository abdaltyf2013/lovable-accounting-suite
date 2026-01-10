
-- إضافة حقل الموافقة لجدول الملفات الشخصية
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- تحديث الحقل ليكون true للمدراء الحاليين
UPDATE public.profiles SET is_approved = TRUE WHERE role = 'admin';

-- تحديث وظيفة إنشاء الملف الشخصي لتجعل المدير معتمداً تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email, role, is_approved)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        NEW.email,
        CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'accountant' END,
        CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN TRUE ELSE FALSE END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- سياسة تسمح للمدير بحذف الملفات الشخصية
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- سياسة تسمح للمدير بتحديث أي ملف شخصي (لتعديل الاسم أو الموافقة)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admin can update all" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
