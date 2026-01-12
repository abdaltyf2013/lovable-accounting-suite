-- Create debts table for debt management
CREATE TABLE public.debts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    work_completion_date DATE NOT NULL,
    expected_payment_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    notes TEXT,
    last_reminder_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Only admins can view debts
CREATE POLICY "Only admins can view debts"
ON public.debts
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert debts
CREATE POLICY "Only admins can insert debts"
ON public.debts
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update debts
CREATE POLICY "Only admins can update debts"
ON public.debts
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete debts
CREATE POLICY "Only admins can delete debts"
ON public.debts
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_debts_updated_at
BEFORE UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create debt_notes table for communication log
CREATE TABLE public.debt_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.debt_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage debt notes
CREATE POLICY "Only admins can view debt notes"
ON public.debt_notes
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can insert debt notes"
ON public.debt_notes
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete debt notes"
ON public.debt_notes
FOR DELETE
USING (is_admin(auth.uid()));