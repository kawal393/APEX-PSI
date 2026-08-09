import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthForm from "@/components/auth/AuthForm";
import apexLogo from "@/assets/apex-logo.png";
import { Shield, Users, TrendingUp } from "lucide-react";

const Auth = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

  if (loading) return null;
  if (user) return <Navigate to={next} replace />;

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <img src={apexLogo} alt="APEX" className="h-16 w-16 mx-auto glow-gold" />
          <h1 className="text-2xl font-bold text-gold-gradient">CREATE OR ACCESS YOUR ACCOUNT</h1>
          <p className="text-muted-foreground text-sm">
            Secure service activation and AI governance evidence
          </p>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            150+ AI Companies
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-compliant" />
            32 joined this week
          </span>
        </div>

        {/* Form Card */}
        <div className="border border-border rounded-lg p-6 bg-card/60 backdrop-blur-sm border-glow">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Secure Access</span>
          </div>
          <AuthForm />
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50">
          Protected by zero-knowledge cryptographic verification
        </p>
      </div>
    </div>
  );
};

export default Auth;
