import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase/supabase-client";
import { toast } from "sonner";

const AuthContext = createContext();

export default function AuthContextProvider({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    const { error } = supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading: user === undefined, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
