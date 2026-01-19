-- توحيد أسماء المحاسبين المكررة
-- هذا الـ migration يقوم بتوحيد الأسماء المختلفة لنفس المحاسب

-- توحيد اسم عبداللطيف علوي اليافعي
UPDATE public.invoices
SET accountant_name = 'عبداللطيف علوي اليافعي'
WHERE accountant_name IN ('عبد اللطيف', 'عبداللطيف', 'عبد اللطيف علوي اليافعي');

-- توحيد اسم فؤاد خليل
UPDATE public.invoices
SET accountant_name = 'فؤاد خليل'
WHERE accountant_name IN ('فؤاد مكتب اشعار', 'فواد خليل', 'فؤاد مكتب إشعار');
