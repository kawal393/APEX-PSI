import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CheckoutKey } from "@/lib/commerce";

interface ServiceCheckoutButtonProps {
  service: CheckoutKey;
  label: string;
  featured?: boolean;
}

export default function ServiceCheckoutButton({ service, label, featured }: ServiceCheckoutButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const autoStarted = useRef(false);

  const startCheckout = async () => {
    if (!user) {
      sessionStorage.setItem("apex_pending_checkout", service);
      navigate(`/auth?next=${encodeURIComponent(`/products?checkout=${service}`)}`);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { service } });
      if (error) throw error;
      if (!data?.url) throw new Error("Checkout did not return a payment URL");
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
      setLoading(false);
    }
  };

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("checkout");
    const pending = sessionStorage.getItem("apex_pending_checkout");
    if (!user || autoStarted.current || (requested !== service && pending !== service)) return;
    autoStarted.current = true;
    sessionStorage.removeItem("apex_pending_checkout");
    void startCheckout();
  }, [location.search, service, user]);

  return (
    <Button
      type="button"
      variant={featured ? "hero" : "heroOutline"}
      size="lg"
      className="w-full"
      onClick={() => void startCheckout()}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
      {loading ? "Opening secure checkout…" : label}
      {!loading ? <ArrowRight className="h-4 w-4 ml-1" /> : null}
    </Button>
  );
}