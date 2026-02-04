-- Create partnership_transactions table for tracking income and expenses
CREATE TABLE public.partnership_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'pos')),
  source TEXT, -- For expenses: 'cash' or 'bank'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins and branch managers can view
CREATE POLICY "Branch managers and admins can view partnership transactions"
ON public.partnership_transactions
FOR SELECT
USING (is_branch_manager_or_admin(auth.uid()));

-- Only admins can insert
CREATE POLICY "Only admins can insert partnership transactions"
ON public.partnership_transactions
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update
CREATE POLICY "Only admins can update partnership transactions"
ON public.partnership_transactions
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete
CREATE POLICY "Only admins can delete partnership transactions"
ON public.partnership_transactions
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_partnership_transactions_updated_at
BEFORE UPDATE ON public.partnership_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();