-- إضافة حقول البيانات السرية لجدول العملاء
-- تاريخ الإنشاء: 2026-01-21

-- إضافة الحقول الجديدة
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS commercial_registration TEXT,
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS account_passwords TEXT,
ADD COLUMN IF NOT EXISTS secret_notes TEXT;

-- إضافة تعليقات توضيحية للحقول
COMMENT ON COLUMN public.clients.national_id IS 'رقم الهوية الوطنية';
COMMENT ON COLUMN public.clients.password IS 'كلمة السر';
COMMENT ON COLUMN public.clients.commercial_registration IS 'رقم السجل التجاري';
COMMENT ON COLUMN public.clients.license_number IS 'رقم الترخيص';
COMMENT ON COLUMN public.clients.account_passwords IS 'كلمات المرور للحسابات المختلفة (نص طويل)';
COMMENT ON COLUMN public.clients.secret_notes IS 'ملاحظات سرية';
