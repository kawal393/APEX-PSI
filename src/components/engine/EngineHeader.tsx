import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff, Home, Database, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface EngineHeaderProps {
  paused: boolean;
  onTogglePause: () => void;
  persistedCount?: number;
}

const EngineHeader = ({ paused, onTogglePause, persistedCount = 0 }: EngineHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-engine-border bg-engine-surface/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-engine-muted hover:text-engine-text transition-colors bg-transparent border-none cursor-pointer p-2 rounded hover:bg-engine-bg"
            title="Back to Home"
          >
            <Home className="h-5 w-5" />
          </button>
          <div>
            <motion.h1 
              className="text-xl md:text-2xl lg:text-3xl font-bold font-mono tracking-wider text-engine-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="text-gold-gradient">APEX</span>
              <span className="text-engine-muted mx-2">|</span>
              <span className="text-engine-text">PSI ENGINE</span>
            </motion.h1>
            <p className="text-xs md:text-sm font-mono text-engine-muted mt-0.5">
              AI Compliance Gateway — EU AI Act Enforcement Layer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Persisted Count Badge */}
          {persistedCount > 0 && (
            <Badge className="bg-engine-bg border border-engine-border text-engine-muted font-mono text-xs gap-1.5">
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
                  ? 'bg-engine-blocked/20 border-engine-blocked/60 text-engine-blocked hover:bg-engine-blocked/30 shadow-engine-blocked'
                  : 'bg-engine-bg border-engine-approved/40 text-engine-approved hover:bg-engine-approved/10'
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-engine-bg border border-engine-border">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${paused ? 'bg-engine-blocked' : 'bg-engine-approved'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${paused ? 'bg-engine-blocked' : 'bg-engine-approved'}`} />
            </span>
            <span className={`text-xs font-mono font-bold ${paused ? 'text-engine-blocked' : 'text-engine-approved'}`}>
              {paused ? 'HALTED' : 'ACTIVE'}
            </span>
            {!paused && <Zap className="h-3 w-3 text-engine-approved" />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default EngineHeader;
