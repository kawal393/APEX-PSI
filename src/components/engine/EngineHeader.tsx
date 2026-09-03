import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Home, Database, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface GallowsHeaderProps {
  paused: boolean;
  onTogglePause: () => void;
  persistedCount?: number;
}

const GallowsHeader = ({ paused, onTogglePause, persistedCount = 0 }: GallowsHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-gallows-border bg-gallows-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-gallows-muted hover:text-gallows-text transition-colors bg-transparent border-none cursor-pointer p-2 rounded hover:bg-gallows-bg"
            title="Back to Home"
          >
            <Home className="h-5 w-5" />
          </button>
          <div>
            <motion.h1 
              className="text-xl md:text-2xl lg:text-3xl font-bold font-mono tracking-wider text-gallows-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-gold-gradient">APEX</span>
              <span className="text-gallows-muted mx-2">|</span>
              <span className="text-gallows-text">PSI ENGINE</span>
            </motion.h1>
            <p className="text-xs md:text-sm font-mono text-gallows-muted mt-0.5">
              AI Compliance Gateway — EU AI Act Enforcement Layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Persisted Count Badge */}
          {persistedCount > 0 && (
            <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-xs gap-1.5">
              <Database className="h-3 w-3" />
              {persistedCount} persisted
            </Badge>
          )}

          {/* Protocol Pause / Protocol Intervention Layer (PIL) — Art. 14 */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onTogglePause}
              className={`font-mono text-xs tracking-wider gap-2 border transition-all ${
                paused
                  ? 'bg-gallows-blocked/20 border-gallows-blocked/60 text-gallows-blocked hover:bg-gallows-blocked/30 shadow-gallows-blocked'
                  : 'bg-gallows-bg border-gallows-approved/40 text-gallows-approved hover:bg-gallows-approved/10'
              }`}
              variant="outline"
              size="sm"
            >
              {paused ? (
                <>
                  <ShieldOff className="h-3.5 w-3.5" />
                  SYSTEM PAUSED — CLICK TO RESUME
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5" />
                  PROTOCOL PAUSE (Art. 14)
                </>
              )}
            </Button>
          </motion.div>

          {/* System Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-gallows-bg border border-gallows-border">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${paused ? 'bg-gallows-blocked' : 'bg-gallows-approved'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${paused ? 'bg-gallows-blocked' : 'bg-gallows-approved'}`} />
            </span>
            <span className={`text-xs font-mono font-bold ${paused ? 'text-gallows-blocked' : 'text-gallows-approved'}`}>
              {paused ? 'HALTED' : 'ACTIVE'}
            </span>
            {!paused && <Zap className="h-3 w-3 text-gallows-approved" />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default GallowsHeader;
