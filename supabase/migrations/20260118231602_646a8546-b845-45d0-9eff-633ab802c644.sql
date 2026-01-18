-- Add paid_amount column to track partial payments
ALTER TABLE public.debts ADD COLUMN paid_amount NUMERIC NOT NULL DEFAULT 0;