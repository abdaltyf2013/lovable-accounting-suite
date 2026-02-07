-- ============================================
-- Multi-Tenant SaaS Architecture Migration - Part 1: Schema
-- ============================================

-- 1. Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'suspended', 'trial');

-- 2. Add new role values to existing enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tenant_admin';