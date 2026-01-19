import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'branch_manager' | 'accountant';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string; // Keep for backward compatibility
  created_at: string;
  updated_at: string;
}

interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isBranchManager: boolean;
  isBranchManagerOrAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['awep991@gmail.com', 'abdaltyf2015.com@gmail.com'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('accountant');
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
      // Check if user is hardcoded admin
      if (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
        setUserRole('admin');
      } else {
        setUserRole('accountant');
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(() => fetchProfile(session.user.id, session.user.email), 0);
        } else {
          setProfile(null);
          setUserRole('accountant');
        }
        setLoading(false);
      }
    );

    // Then check for existing session
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

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { 
          full_name: fullName,
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
    setSession(null);
  };

  const isAdmin = userRole === 'admin' || 
    (user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false);

  const isBranchManager = userRole === 'branch_manager';
  
  const isBranchManagerOrAdmin = isAdmin || isBranchManager;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      userRole,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      isAdmin,
      isBranchManager,
      isBranchManagerOrAdmin
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
