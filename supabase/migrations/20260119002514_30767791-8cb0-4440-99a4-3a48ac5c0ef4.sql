
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'branch_manager', 'accountant');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'accountant',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is branch manager or admin
CREATE OR REPLACE FUNCTION public.is_branch_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND (
        u.email IN ('Abdaltyf2015.com@gmail.com', 'awep991@gmail.com', 'Awep991@gmail.com', 'abdaltyf2015.com@gmail.com')
        OR EXISTS (
          SELECT 1 FROM public.user_roles r 
          WHERE r.user_id = _user_id AND r.role IN ('admin', 'branch_manager')
        )
      )
  )
$$;

-- Update is_admin function to use user_roles table
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND (
        u.email IN ('Abdaltyf2015.com@gmail.com', 'awep991@gmail.com', 'Awep991@gmail.com', 'abdaltyf2015.com@gmail.com')
        OR EXISTS (
          SELECT 1 FROM public.user_roles r 
          WHERE r.user_id = _user_id AND r.role = 'admin'
        )
      )
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing profiles roles to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 
  CASE 
    WHEN p.role = 'admin' THEN 'admin'::app_role
    ELSE 'accountant'::app_role
  END
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- Update invoices RLS to allow branch managers to view all
DROP POLICY IF EXISTS "Users view own invoices or admin views all" ON public.invoices;
CREATE POLICY "Users view own invoices or managers view all"
ON public.invoices FOR SELECT
USING ((created_by = auth.uid()) OR is_branch_manager_or_admin(auth.uid()));

-- Update profiles RLS to allow branch managers to view all
CREATE POLICY "Branch managers can view all profiles"
ON public.profiles FOR SELECT
USING (is_branch_manager_or_admin(auth.uid()));
