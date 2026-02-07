-- ============================================
-- Multi-Tenant SaaS Architecture Migration - Part 4: RLS Policies for New Tables
-- ============================================

-- TENANTS TABLE POLICIES
CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can view own tenant"
ON public.tenants FOR SELECT
USING (owner_id = auth.uid() OR id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Super admins can create tenants"
ON public.tenants FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "Super admins can update any tenant"
ON public.tenants FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Tenant owners can update own tenant"
ON public.tenants FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Super admins can delete tenants"
ON public.tenants FOR DELETE
USING (is_super_admin(auth.uid()));

-- BRANCHES TABLE POLICIES
CREATE POLICY "Users can view branches in their tenant"
ON public.branches FOR SELECT
USING (has_tenant_access(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can create branches"
ON public.branches FOR INSERT
WITH CHECK (is_super_admin(auth.uid()) OR is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can update branches"
ON public.branches FOR UPDATE
USING (is_super_admin(auth.uid()) OR is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins can delete branches"
ON public.branches FOR DELETE
USING (is_super_admin(auth.uid()) OR is_tenant_admin(auth.uid(), tenant_id));