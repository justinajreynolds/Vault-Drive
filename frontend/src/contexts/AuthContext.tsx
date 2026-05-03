import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, TOKEN_KEY, setToken as saveToken, clearToken } from "../api/client";

export type User = {
  id: string;
  email: string;
  name: string;
  plan: string;
  storage_used: number;
  storage_quota: number;
  created_at?: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setUser(null);
        return;
      }
      const { data } = await api.get<User>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      await clearToken();
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    await saveToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    await saveToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
