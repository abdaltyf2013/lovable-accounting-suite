-- إضافة حقل client_id للمهام لربطها بالعملاء
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- إضافة حقل task_id للديون لربطها بالمهام
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id);

-- إضافة حقل task_id للفواتير لربطها بالمهام
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id);

-- إضافة حقول للمبالغ في المهام
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS service_amount numeric DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS government_fees numeric DEFAULT 0;