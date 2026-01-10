
-- إضافة حقل طريقة الدفع لجدول الفواتير
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'كاش';

-- إنشاء جدول الإعدادات
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO public.settings (key, value)
VALUES 
    ('tax_enabled', 'true'::jsonb),
    ('theme_mode', '"light"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- تفعيل RLS لجدول الإعدادات
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع (ليتمكن المحاسب من معرفة حالة الضريبة)
CREATE POLICY "Settings are viewable by authenticated users" ON public.settings
FOR SELECT TO authenticated USING (true);

-- سياسة التعديل للمدير فقط
CREATE POLICY "Admins can update settings" ON public.settings
FOR ALL TO authenticated
USING (
    auth.jwt() ->> 'email' = 'awep991@gmail.com' OR 
    auth.jwt() ->> 'email' = 'abdaltyf2015.com@gmail.com' OR
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
