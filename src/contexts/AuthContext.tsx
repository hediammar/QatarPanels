import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone_number?: string;
  role: string;
  department?: string;
  status: string;
  last_login?: string;
  customer_id?: string;
  customer?: Customer;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateLastLogin: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing stored user data:', error);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      // Enhanced login with customer data embedding for RBAC
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          customer:customers!users_customer_id_fkey(id, name, email, phone)
        `)
        .eq('username', username)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Verify password against stored password_hash
      if (data.password_hash !== password) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      await updateLastLogin(data.id);

      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateLastLogin = async (userId: string) => {
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateLastLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 