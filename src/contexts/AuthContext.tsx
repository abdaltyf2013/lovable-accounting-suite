import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'super_admin' | 'tenant_admin' | 'admin' | 'branch_manager' | 'accountant';

interface Tenant {
  id: string;
  name: string;
  subscription_status: 'active' | 'inactive' | 'suspended' | 'trial';
  max_branches: number;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  settings: Record<string, unknown>;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  tenant: Tenant | null;
  tenantId: string | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isAdmin: boolean;
  isBranchManager: boolean;
  isBranchManagerOrAdmin: boolean;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = ['awep991@gmail.com', 'abdaltyf2015.com@gmail.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('accountant');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, userEmail: string | undefined) => {
    console.log("Fetching profile for user:", userId);
    
    // Fetch profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    if (profileData) {
      console.log("Profile loaded:", profileData);
      setProfile(profileData as Profile);

      // Fetch tenant if user has tenant_id
      if (profileData.tenant_id) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profileData.tenant_id)
          .maybeSingle();

        if (tenantError) {
          console.error("Error fetching tenant:", tenantError);
        }

        if (tenantData) {
          console.log("Tenant loaded:", tenantData);
          setTenant(tenantData as Tenant);
        }
      }
    }

    // Fetch user role from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError) {
      console.error("Error fetching user role:", roleError);
    }

    if (roleData) {
      console.log("User role loaded:", roleData);
      setUserRole(roleData.role as UserRole);
    } else {
      // Check if user is hardcoded super admin
      if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        setUserRole('super_admin');
      } else {
        setUserRole('accountant');
      }
    }
  };

  const refetchProfile = async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id, session.user.email), 0);
        } else {
          setProfile(null);
          setUserRole('accountant');
          setTenant(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, companyName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { 
          full_name: fullName,
          company_name: companyName || 'شركة جديدة',
        }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setUserRole('accountant');
    setTenant(null);
    setSession(null);
  };

  const isSuperAdmin = userRole === 'super_admin' || 
    (user?.email ? SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()) : false);

  const isTenantAdmin = userRole === 'tenant_admin';

  const isAdmin = isSuperAdmin || isTenantAdmin;

  const isBranchManager = userRole === 'branch_manager';
  
  const isBranchManagerOrAdmin = isAdmin || isBranchManager;

  const tenantId = profile?.tenant_id || null;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userRole,
      tenant,
      tenantId,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      isSuperAdmin,
      isTenantAdmin,
      isAdmin,
      isBranchManager,
      isBranchManagerOrAdmin,
      refetchProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
