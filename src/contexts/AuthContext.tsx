import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionInfo {
  subscribed: boolean;
  tier: string | null;
  subscriptionEnd: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  checkSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  subscription: { subscribed: false, tier: null, subscriptionEnd: null },
  checkSubscription: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
  });

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription({
        subscribed: data?.subscribed ?? false,
        tier: data?.tier ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
      });
    } catch (e) {
      // The plan check is best-effort: if the backend or Stripe is unreachable
      // we resolve to the free tier rather than leaving the tier unknown.
      console.error("Failed to check subscription:", e);
      setSubscription((prev) => (prev.tier ? prev : { subscribed: false, tier: "free", subscriptionEnd: null }));
    }
  };

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
        setTimeout(() => checkSubscription(), 0);
        const next = sessionStorage.getItem("apex_auth_next");
        if (next?.startsWith("/") && !next.startsWith("//")) {
          sessionStorage.removeItem("apex_auth_next");
          window.location.assign(next);
        }
      } else {
        setSubscription({ subscribed: false, tier: null, subscriptionEnd: null });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) checkSubscription();
    });

    return () => authSub.unsubscribe();
  }, []);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, subscription, checkSubscription, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
