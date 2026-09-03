import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CommitRecord } from "@/lib/engine-core";
import { Swords, Scale, ShieldCheck, ArrowRight, Clock, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

interface PipelineViewProps {
  record: CommitRecord | null;
  onChallenge: (commitId: string) => void;
  onProve: (commitId: string) => void;
  isProcessing: boolean;
}

const phaseColors: Record<string, string> = {
  COMMITTED: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  CHALLENGED: 'text-engine-blocked border-engine-blocked/30 bg-engine-blocked/10',
  PROVING: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  VERIFIED: 'text-engine-approved border-engine-approved/30 bg-engine-approved/10',
  PAUSED: 'text-engine-blocked border-engine-blocked/30 bg-engine-blocked/10',
};

const phaseIndex: Record<string, number> = {
  COMMITTED: 1,
  CHALLENGED: 2,
  PROVING: 3,
  VERIFIED: 4,
};

const PipelineView = ({ record, onChallenge, onProve, isProcessing }: PipelineViewProps) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyHash = (hash: string, label: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!record) {
    return (
      <Card className="bg-engine-surface border-engine-border flex items-center justify-center min-h-[280px]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-dashed border-engine-border flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-engine-muted" />
          </div>
          <div className="text-engine-muted font-mono text-sm">PIPELINE IDLE</div>
          <div className="text-engine-muted/50 font-mono text-xs">Commit an action to begin verification</div>
        </div>
      </Card>
    );
  }

  const isApproved = record.status === 'APPROVED';
  const isBlocked = record.status === 'BLOCKED';
  const currentPhase = phaseIndex[record.phase] || 0;

  return (
    <Card className={`bg-engine-surface border min-h-[280px] transition-all duration-300 ${
      record.phase === 'VERIFIED'
        ? isApproved ? 'border-engine-approved/30 shadow-engine-approved' : 'border-engine-blocked/30 shadow-engine-blocked'
        : 'border-engine-border'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono text-engine-muted uppercase tracking-widest">
            Verification Pipeline
          </CardTitle>
          <motion.div
            key={record.phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Badge className={`font-mono text-xs border ${phaseColors[record.phase] || phaseColors.COMMITTED}`}>
              {record.phase}
            </Badge>
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Commit ID */}
        <div className="p-2 bg-engine-bg rounded border border-engine-border">
          <span className="text-[10px] font-mono text-engine-muted block">COMMIT ID</span>
          <span className="text-sm font-mono text-engine-approved font-bold">{record.id}</span>
        </div>

        {/* Phase Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-engine-muted">
            <span>COMMIT</span>
            <span>CHALLENGE</span>
            <span>PROVE</span>
            <span>VERIFY</span>
          </div>
          <div className="h-1.5 bg-engine-bg rounded-full overflow-hidden flex gap-1">
            {[1, 2, 3, 4].map((step) => (
              <motion.div
                key={step}
                className={`flex-1 rounded-full ${
                  step <= currentPhase 
                    ? record.phase === 'VERIFIED' 
                      ? isApproved ? 'bg-engine-approved' : 'bg-engine-blocked'
                      : 'bg-amber-400'
                    : 'bg-engine-border'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step <= currentPhase ? 1 : 0.3 }}
                transition={{ delay: step * 0.1 }}
              />
            ))}
          </div>
        </div>

        {/* Hashes */}
        <div className="space-y-2 max-h-[120px] overflow-y-auto">
          <HashRow label="Commit Hash" hash={record.commitHash} onCopy={copyHash} copied={copiedHash === record.commitHash} />
          <HashRow label="Merkle Leaf" hash={record.merkleLeafHash} onCopy={copyHash} copied={copiedHash === record.merkleLeafHash} />
          {record.challengeHash && <HashRow label="Challenge Hash" hash={record.challengeHash} onCopy={copyHash} copied={copiedHash === record.challengeHash} />}
          {record.proofHash && <HashRow label="Proof Hash" hash={record.proofHash} onCopy={copyHash} copied={copiedHash === record.proofHash} />}
          {record.merkleRoot && <HashRow label="Merkle Root" hash={record.merkleRoot} accent onCopy={copyHash} copied={copiedHash === record.merkleRoot} />}
        </div>

        {/* Timing */}
        {record.verificationTimeMs !== undefined && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-engine-muted">
            <Clock className="h-3 w-3" />
            {record.verificationTimeMs}ms total pipeline
          </div>
        )}

        {/* Verdict */}
        <AnimatePresence>
          {record.phase === 'VERIFIED' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded border ${isApproved ? 'border-engine-approved/30 bg-engine-approved/5' : 'border-engine-blocked/30 bg-engine-blocked/5'}`}
            >
              <Badge className={`text-base px-4 py-1.5 font-mono font-bold tracking-wider border-0 mb-2 ${
                isApproved
                  ? 'bg-engine-approved/15 text-engine-approved'
                  : 'bg-engine-blocked/15 text-engine-blocked'
              }`}>
                {isApproved ? '✓ STRUCTURALLY VERIFIED' : '✗ STRUCTURALLY BLOCKED'}
              </Badge>
              <p className={`text-xs font-mono ${isApproved ? 'text-engine-approved' : 'text-engine-blocked'}`}>
                {isApproved
                  ? `Action verified via Merkle inclusion proof against [${record.predicateId}].`
                  : `Violation: "${record.violationFound}" — blocked by [${record.predicateId}].`
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {record.phase === 'COMMITTED' && (
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => onChallenge(record.id)}
                disabled={isProcessing}
                className="w-full bg-engine-bg border border-engine-blocked/40 text-engine-blocked font-mono text-xs tracking-wider hover:bg-engine-blocked/10 gap-1.5"
                variant="outline"
                size="sm"
              >
                <Swords className="h-3.5 w-3.5" />
                CHALLENGE (Art. 50)
              </Button>
            </motion.div>
          )}
          {record.phase === 'CHALLENGED' && (
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => onProve(record.id)}
                disabled={isProcessing}
                className="w-full bg-engine-bg border border-blue-400/40 text-blue-400 font-mono text-xs tracking-wider hover:bg-blue-400/10 gap-1.5"
                variant="outline"
                size="sm"
              >
                <Scale className="h-3.5 w-3.5" />
                GENERATE MERKLE PROOF
              </Button>
            </motion.div>
          )}
          {record.phase === 'VERIFIED' && (
            <div className="flex items-center gap-1.5 text-xs font-mono text-engine-approved">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pipeline complete — proof recorded
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const HashRow = ({ 
  label, 
  hash, 
  accent, 
  onCopy, 
  copied 
}: { 
  label: string; 
  hash: string; 
  accent?: boolean;
  onCopy: (hash: string, label: string) => void;
  copied: boolean;
}) => (
  <div className="group flex items-start gap-2">
    <div className="flex-1 min-w-0">
      <span className="text-[10px] font-mono text-engine-muted block">{label}</span>
      <span className={`font-mono text-[11px] break-all ${accent ? 'text-amber-400' : 'text-engine-text/80'}`}>
        {hash}
      </span>
    </div>
    <button
      onClick={() => onCopy(hash, label)}
      className="shrink-0 p-1 rounded hover:bg-engine-border transition-colors opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-engine-approved" />
      ) : (
        <Copy className="h-3 w-3 text-engine-muted" />
      )}
    </button>
  </div>
);

export default PipelineView;
