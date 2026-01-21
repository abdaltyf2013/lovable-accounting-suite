-- إضافة العملاء من المهمات الموجودة
-- هذا السكريبت يستخرج أسماء العملاء وأرقام الجوالات من جدول المهمات ويضيفها إلى جدول العملاء

-- إضافة عمود client_id إلى جدول المهمات إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='tasks' AND column_name='client_id') THEN
        ALTER TABLE public.tasks ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- إنشاء دالة لإضافة العملاء من المهمات
CREATE OR REPLACE FUNCTION add_clients_from_tasks()
RETURNS void AS $$
DECLARE
    task_record RECORD;
    new_client_id UUID;
    existing_client_id UUID;
BEGIN
    -- المرور على جميع المهمات التي لها أسماء عملاء
    FOR task_record IN 
        SELECT DISTINCT 
            client_name, 
            phone
        FROM public.tasks 
        WHERE client_name IS NOT NULL 
        AND client_name != ''
        ORDER BY client_name
    LOOP
        -- التحقق من وجود العميل
        SELECT id INTO existing_client_id
        FROM public.clients
        WHERE name = task_record.client_name
        LIMIT 1;
        
        -- إذا لم يكن العميل موجوداً، أضفه
        IF existing_client_id IS NULL THEN
            INSERT INTO public.clients (name, phone, notes)
            VALUES (
                task_record.client_name,
                task_record.phone,
                'تم إضافة العميل تلقائياً من المهمات'
            )
            RETURNING id INTO new_client_id;
            
            RAISE NOTICE 'تم إضافة العميل: % - رقم الجوال: %', task_record.client_name, task_record.phone;
            
            -- تحديث المهمات المرتبطة بهذا العميل
            UPDATE public.tasks
            SET client_id = new_client_id
            WHERE client_name = task_record.client_name
            AND client_id IS NULL;
        ELSE
            -- تحديث المهمات المرتبطة بالعميل الموجود
            UPDATE public.tasks
            SET client_id = existing_client_id
            WHERE client_name = task_record.client_name
            AND client_id IS NULL;
            
            RAISE NOTICE 'العميل موجود مسبقاً: %', task_record.client_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تنفيذ الدالة لإضافة العملاء
SELECT add_clients_from_tasks();

-- حذف الدالة بعد الاستخدام (اختياري)
-- DROP FUNCTION IF EXISTS add_clients_from_tasks();

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
