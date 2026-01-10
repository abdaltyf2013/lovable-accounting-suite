
-- إضافة حقل رسوم التوصيل لجدول الفواتير
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(12,2) DEFAULT 0;
