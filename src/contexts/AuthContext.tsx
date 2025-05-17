import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Route } from '../types';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  currentRoute: Route;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string, role: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  setCurrentRoute: (route: Route) => void;
  addUser: (userData: { username: string; password: string; role: string; fullName?: string; metadata?: Record<string, string>; }) => Promise<{ success: boolean; error?: string; message?: string; }>;
  setCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase user to our app User type
const supabaseUserToAppUser = (supabaseUser: SupabaseUser): User | null => {
  if (!supabaseUser) return null;

  // Get user metadata
  const metadata = supabaseUser.user_metadata || {};
  
  return {
    id: supabaseUser.id,
    username: supabaseUser.email || '',
    fullName: metadata.full_name || '',
    role: metadata.role || 'Staff',
    avatar: metadata.avatar || undefined,
    metadata: {
      specialty: metadata.specialty,
      license: metadata.license,
      contact: metadata.contact,
      notes: metadata.notes
    },
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [currentRoute, setCurrentRoute] = useState<Route>(Route.AUTH);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Initial authentication check
  useEffect(() => {
    const fetchSession = async () => {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const appUser = supabaseUserToAppUser(session.user);
        setCurrentUser(appUser);
      }

      setLoading(false);
    };

    fetchSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          const appUser = supabaseUserToAppUser(session.user);
          setCurrentUser(appUser);
        } else {
          setCurrentUser(null);
        }
        
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Load users for admins
  useEffect(() => {
    if (currentUser) {
      refreshUserList();
    }
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    try {
      // Simple login with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
      }

      const appUser = supabaseUserToAppUser(data.user);
      
      // Automatically set route to Dashboard on successful login
      if (appUser) {
        setCurrentRoute(Route.DASHBOARD);
      }
      
      return { success: !!appUser };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, fullName: string, role: string) => {
    try {
      // Make sure email is valid
      if (!email.includes('@')) {
        return { success: false, error: 'Please enter a valid email address' };
      }
      
      // For owner-only system, restrict to Administrator role
      const userRole = 'Administrator'; // Force Administrator role regardless of input

      // Create user with Supabase client with email confirmation bypassed
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: userRole,
            is_owner: true,
          },
          // This won't actually disable confirmation - we'll handle that in SQL
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        console.error('Signup error:', error);
        return { success: false, error: error.message };
      }

      console.log('Signup successful with user data:', data);
      
      // If there's a user but no session, try to sign in immediately
      // This is a workaround for email confirmation requirements
      if (data?.user && !data?.session) {
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (signInError) {
            console.warn('Auto sign-in failed:', signInError);
            return { 
              success: true,
              message: 'Account created! Please sign in with your credentials.'
            };
          }
        } catch (err) {
          console.warn('Auto sign-in error:', err);
        }
      }

      // User was created, automatically sign them in
      setCurrentRoute(Route.DASHBOARD);
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error 
        ? `${error.name}: ${error.message}` 
        : 'Unknown error occurred';
      
      return { 
        success: false, 
        error: `Unable to create account: ${errorMessage}` 
      };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentRoute(Route.AUTH);
  };

  // Add a new user (admin only)
  const addUser = async (userData: { username: string; password: string; role: string; fullName?: string; metadata?: Record<string, string>; }) => {
    try {
      // Validate inputs
      if (!userData.username || !userData.password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Only admins can add users - check current user role
      if (currentUser?.role !== 'Administrator') {
        return { success: false, error: 'Only administrators can add users' };
      }
      
      // Prepare metadata
      const userMetadata = {
        full_name: userData.fullName || userData.username,
        role: userData.role,
        created_by: currentUser?.id,
        ...(userData.metadata || {}) // Spread any additional metadata
      };
      
      // Use Supabase's built-in signup method
      const { data, error } = await supabase.auth.signUp({
        email: userData.username,
        password: userData.password,
        options: {
          data: userMetadata,
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) {
        console.error('Error adding user:', error);
        return { success: false, error: error.message };
      }

      // If user was created and is an administrator, add to owners table
      if (data?.user && userData.role === 'Administrator') {
        try {
          const { error: ownerError } = await supabase
            .from('owners')
            .insert({ 
              id: data.user.id, 
              full_name: userData.fullName || userData.username
            });
            
          if (ownerError) {
            console.warn('Error adding to owners table:', ownerError);
          }
        } catch (err) {
          console.warn('Error adding to owners table:', err);
          // Don't fail the user creation if this step fails
        }
      }
      
      // Auto-verify the email by updating auth.users directly (for development only)
      try {
        const { error: verifyError } = await supabase
          .from('auth_email_confirmations')
          .insert({
            user_id: data?.user?.id,
            confirmed_at: new Date().toISOString()
          });
          
        // Don't worry if this fails - it's just a development convenience
        if (verifyError) {
          console.log('Auto email verification not available:', verifyError);
        }
      } catch (err) {
        // Silently handle this error - email verification is optional
        console.log('Auto email verification failed:', err);
      }
      
      // Track activity in activities table
      try {
        const activityData = {
          action: 'created new user',
          user_id: currentUser?.id,
          user_name: currentUser ? currentUser.fullName || currentUser.username : 'System',
          details: `Added ${userData.role} user: ${userData.username}`,
          entity_type: 'user',
          entity_id: data?.user?.id
        };
        
        await supabase.from('activities').insert(activityData);
      } catch (err) {
        console.log('Activity logging failed:', err);
        // Don't fail user creation if activity logging fails
      }
      
      // Refresh the user list
      await refreshUserList();
      
      return { 
        success: true,
        message: 'User created successfully!'
      };
    } catch (error) {
      console.error('Error adding user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  };
  
  // Helper function to refresh the user list
  const refreshUserList = async () => {
    if (currentUser?.role === 'Administrator') {
      try {
        // Try the view first
        const { data, error } = await supabase
          .from('auth_users_view')
          .select('*');
          
        // If view doesn't exist, try admin API
        if (error && error.code === '42P01') {
          // Fallback to admin API
          const { data: userData, error: adminError } = await supabase.auth.admin.listUsers();
          
          if (adminError || !userData?.users) {
            console.error('Failed to refresh user list:', adminError);
            return;
          }
          
          const appUsers: User[] = userData.users.map((user: any) => ({
            id: user.id,
            username: user.email || '',
            fullName: user.user_metadata?.full_name || '',
            role: user.user_metadata?.role || 'Staff',
            metadata: {
              specialty: user.user_metadata?.specialty,
              license: user.user_metadata?.license,
              contact: user.user_metadata?.contact,
              notes: user.user_metadata?.notes
            }
          }));
          
          setUsers(appUsers);
        } else if (!error) {
          // Success with the view
          const appUsers: User[] = data.map((user: any) => ({
            id: user.id,
            username: user.email,
            fullName: user.full_name || '',
            role: user.role || 'Staff',
            metadata: {
              specialty: user.specialty,
              license: user.license,
              contact: user.contact,
              notes: user.notes
            }
          }));
          
          setUsers(appUsers);
        }
      } catch (err) {
        console.error('Error refreshing user list:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        currentRoute,
        loading,
        login,
        signup,
        logout,
        setCurrentRoute,
        addUser,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};