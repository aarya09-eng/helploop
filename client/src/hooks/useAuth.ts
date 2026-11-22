import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import React from "react";
import { api } from "../api";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user || data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    const data = await api.login(credentials);
    setUser(data.user || data);
  };

  const register = async (formData: any) => {
    const data = await api.register(formData);
    setUser(data.user || data);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, loading, login, register, logout, refreshUser } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
