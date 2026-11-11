"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuthApi } from "@/app/services/ApiClient";
import { toast } from "sonner";

const AuthContext = createContext();

export default function AuthContextProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [provider, setProvider] = useState("mysql");

  const refreshSession = useCallback(async () => {
    try {
      const res = await AuthApi.getSession();
      setUser(res.user || null);
      if (res.provider) setProvider(res.provider);
      return res.user || null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email, password) => {
    const res = await AuthApi.login(email, password);
    setUser(res.user);
    if (res.provider) setProvider(res.provider);
    return res.user;
  };

  const signup = async (payload) => {
    const res = await AuthApi.signup(payload);
    setUser(res.user);
    if (res.provider) setProvider(res.provider);
    return res.user;
  };

  const updateProfile = async (profile) => {
    const res = await AuthApi.updateProfile(profile);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
      setUser(null);
    } catch (error) {
      toast.error(error.message || "Failed to log out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        provider,
        isLoading: user === undefined,
        refreshSession,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
