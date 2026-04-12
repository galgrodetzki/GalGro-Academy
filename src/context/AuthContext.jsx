import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getAccessStatus, hasAccessExpired } from "../utils/access";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
  };

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    // Keep auth state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) fetchProfile(u.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  const isCoach     = profile?.role === "head_coach";
  const isAssistant = profile?.role === "assistant";
  const isKeeper    = profile?.role === "keeper";
  const isViewer    = profile?.role === "viewer";
  const isRevoked   = profile?.role === "revoked";
  const isAccessExpired = hasAccessExpired(profile);
  const isAccessBlocked = isRevoked || isAccessExpired;
  const accessStatus = getAccessStatus(profile);
  const canEdit     = (isCoach || isAssistant) && !isAccessBlocked;

  return (
    <AuthContext.Provider value={{
      user, profile, loading, signOut, fetchProfile,
      isCoach, isAssistant, isKeeper, isViewer, isRevoked,
      isAccessExpired, isAccessBlocked, accessStatus, canEdit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
