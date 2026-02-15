"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import api from "./api";
import type { User } from "./types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    password_confirm: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me/");
      setUser(res.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem("token");
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      setToken(stored);
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login/", { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
    router.push("/dashboard");
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    password_confirm: string
  ) => {
    const res = await api.post("/auth/register/", {
      username,
      email,
      password,
      password_confirm,
    });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
