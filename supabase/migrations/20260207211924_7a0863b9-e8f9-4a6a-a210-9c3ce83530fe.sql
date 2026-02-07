-- ============================================
-- Multi-Tenant SaaS Architecture Migration - Part 3: Helper Functions
-- ============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'super_admin'
    )
$$;

-- Function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id 
          AND (role = 'tenant_admin' OR role = 'admin')
          AND (tenant_id = _tenant_id OR tenant_id IS NULL)
    )
$$;

-- Function to get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if tenant is active
CREATE OR REPLACE FUNCTION public.is_tenant_active(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT subscription_status IN ('active', 'trial') FROM public.tenants WHERE id = _tenant_id),
        true
    )
$$;

-- Function to check tenant access
CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        is_super_admin(_user_id) 
        OR (
            (get_user_tenant_id(_user_id) = _tenant_id OR _tenant_id IS NULL)
            AND is_tenant_active(_tenant_id)
        )
$$;

-- Updated handle_new_user function for multi-tenancy
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_tenant_id UUID;
    is_first_user BOOLEAN;
BEGIN
    -- Check if this is the first user (make them super admin)
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
    
    IF is_first_user THEN
        -- First user becomes super admin, no tenant
        INSERT INTO public.profiles (user_id, full_name, email, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
            NEW.email,
            'super_admin'
        );
        
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'super_admin');
    ELSE
        -- Create a new tenant for this user
        INSERT INTO public.tenants (name, owner_id, subscription_status)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'company_name', 'شركة جديدة'),
            NEW.id,
            'trial'
        )
        RETURNING id INTO new_tenant_id;
        
        -- Create main branch for the tenant
        INSERT INTO public.branches (tenant_id, name, is_main)
        VALUES (new_tenant_id, 'الفرع الرئيسي', true);
        
        -- Create profile with tenant association
        INSERT INTO public.profiles (user_id, full_name, email, role, tenant_id)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
            NEW.email,
            'tenant_admin',
            new_tenant_id
        );
        
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (NEW.id, 'tenant_admin', new_tenant_id);
    END IF;
    
    RETURN NEW;
END;
$$;