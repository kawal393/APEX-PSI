import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PREDICATES } from "@/lib/gallows-engine";
import { Lock, ArrowRight, Zap, AlertTriangle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";

interface CommitPanelProps {
  onCommit: (action: string, predicateId: string, zkMode?: boolean) => void;
  isProcessing: boolean;
  paused: boolean;
}

const EXAMPLE_ACTIONS = [
  "Generate a transparent AI summary with full source attribution and disclosure that this content is AI-generated",
  "Deploy facial recognition system for real-time identification in public spaces",
  "Run credit scoring algorithm without human oversight or appeal mechanism",
  "Process medical imaging with explainable AI diagnostics and physician review",
];

const CommitPanel = ({ onCommit, isProcessing, paused }: CommitPanelProps) => {
  const [action, setAction] = useState("");
  const [predicateId, setPredicateId] = useState("EU_ART_50");
  const [zkMode, setZkMode] = useState(false);

  const handleCommit = () => {
    if (!action.trim() || paused) return;
    onCommit(action.trim(), predicateId, zkMode);
  };

  const selectedPredicate = PREDICATES.find(p => p.id === predicateId);

  const loadExample = (example: string) => {
    setAction(example);
  };

  return (
    <Card className="bg-gallows-surface border-gallows-border relative overflow-hidden">
      {/* Subtle animated border glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-gallows-approved/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gallows-approved opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gallows-approved" />
          </span>
          Phase 1 — Commit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div>
          <label className="text-xs font-mono text-gallows-muted mb-1.5 block flex items-center gap-2">
            AI ACTION TO VERIFY
            <Zap className="h-3 w-3" />
          </label>
          <Textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Describe the AI action to be cryptographically verified against EU AI Act predicates..."
            className="bg-gallows-bg border-gallows-border text-gallows-text font-mono text-sm min-h-[100px] placeholder:text-gallows-muted/50 focus-visible:ring-gallows-approved/50 resize-none transition-all"
          />
          
          {/* Quick examples */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] font-mono text-gallows-muted">Quick test:</span>
            {EXAMPLE_ACTIONS.slice(0, 2).map((ex, idx) => (
              <button
                key={idx}
                onClick={() => loadExample(ex)}
                className="text-[10px] font-mono text-gallows-muted/70 hover:text-gallows-approved underline underline-offset-2 transition-colors cursor-pointer bg-transparent border-none"
              >
                Example {idx + 1}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-gallows-muted mb-1.5 block">EU AI ACT PREDICATE</label>
          <Select value={predicateId} onValueChange={setPredicateId}>
            <SelectTrigger className="bg-gallows-bg border-gallows-border text-gallows-text font-mono text-sm focus:ring-gallows-approved/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gallows-surface border-gallows-border max-h-[300px]">
              {PREDICATES.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  className="font-mono text-xs text-gallows-text focus:bg-gallows-border focus:text-gallows-text"
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    p.riskLevel === 'UNACCEPTABLE' ? 'bg-gallows-blocked' :
                    p.riskLevel === 'HIGH' ? 'bg-amber-500' :
                    'bg-gallows-approved'
                  }`} />
                  {p.id}: {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AnimatePresence mode="wait">
            {selectedPredicate && (
              <motion.div
                key={selectedPredicate.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-3 rounded bg-gallows-bg border border-gallows-border overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedPredicate.riskLevel === 'UNACCEPTABLE' ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-gallows-blocked" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-gallows-muted" />
                  )}
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${
                    selectedPredicate.riskLevel === 'UNACCEPTABLE' ? 'text-gallows-blocked' :
                    selectedPredicate.riskLevel === 'HIGH' ? 'text-amber-500' :
                    'text-gallows-muted'
                  }`}>
                    {selectedPredicate.riskLevel} RISK — Enforceable {selectedPredicate.enforcementDate}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-gallows-muted leading-relaxed">
                  {selectedPredicate.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ZK Privacy Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded bg-gallows-bg border border-gallows-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gallows-highlight" />
            <div>
              <span className="text-xs font-mono text-gallows-text block">ZK PRIVACY MODE (GROTH16-COMPATIBLE)</span>
              <span className="text-[10px] font-mono text-gallows-muted">BN128 field commitment — hides action content</span>
            </div>
          </div>
          <Switch
            checked={zkMode}
            onCheckedChange={setZkMode}
            className="data-[state=checked]:bg-gallows-highlight"
          />
        </div>

        <motion.div
          whileHover={{ scale: paused || isProcessing || !action.trim() ? 1 : 1.02 }}
          whileTap={{ scale: paused || isProcessing || !action.trim() ? 1 : 0.98 }}
        >
          <Button
            onClick={handleCommit}
            disabled={isProcessing || !action.trim() || paused}
            className={`w-full font-mono font-bold tracking-wider gap-2 transition-all duration-300 ${
              paused 
                ? 'bg-gallows-blocked/20 border-gallows-blocked/40 text-gallows-blocked'
                : 'bg-gallows-bg border border-gallows-approved/40 text-gallows-approved hover:bg-gallows-approved/10 hover:shadow-gallows-approved'
            } disabled:opacity-40`}
          >
            {paused ? (
              'SYSTEM PAUSED'
            ) : isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-gallows-approved border-t-transparent rounded-full animate-spin" />
                HASHING...
              </span>
            ) : (
              <>
                COMMIT TO LEDGER
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default CommitPanel;
