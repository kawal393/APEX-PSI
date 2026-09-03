import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verifyHash } from "@/lib/gallows-engine";
import { verifyHashInLedger as verifyInDB } from "@/lib/gallows-persistence";
import { Search, ShieldCheck, ShieldX, Loader2, Globe, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const HashVerifier = () => {
  const [inputHash, setInputHash] = useState("");
  const [result, setResult] = useState<{
    found: boolean;
    verified: boolean;
    merkleRoot: string;
    commitId?: string;
    status?: string;
    predicateId?: string;
    merkleVerified?: boolean;
    source?: 'memory' | 'database';
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const handleVerify = async () => {
    if (!inputHash.trim()) return;
    setChecking(true);
    setResult(null);
    
    try {
      // First check in-memory
      const memRes = await verifyHash(inputHash.trim());
      
      if (memRes.found) {
        setResult({
          found: true,
          verified: memRes.verified,
          merkleRoot: memRes.merkleRoot,
          commitId: memRes.record?.id,
          status: memRes.record?.status,
          predicateId: memRes.record?.predicateId,
          merkleVerified: memRes.verified,
          source: 'memory',
        });
        return;
      }
      
      // Then check database
      const dbRes = await verifyInDB(inputHash.trim());
      
      if (dbRes.found && dbRes.entry) {
        setResult({
          found: true,
          verified: !!dbRes.entry.merkle_proof,
          merkleRoot: dbRes.entry.merkle_root || '',
          commitId: dbRes.entry.commit_id,
          status: dbRes.entry.status || undefined,
          predicateId: dbRes.entry.predicate_id,
          merkleVerified: !!dbRes.entry.merkle_proof,
          source: 'database',
        });
        return;
      }
      
      // Not found anywhere
      setResult({
        found: false,
        verified: false,
        merkleRoot: memRes.merkleRoot,
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="bg-gallows-surface border-gallows-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-mono text-gallows-muted uppercase tracking-widest flex items-center gap-2">
          <Search className="h-4 w-4" />
          Independent Hash Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs font-mono text-gallows-muted">
          Verify any hash against the immutable ledger — works with commit hashes, leaf hashes, proof hashes, or challenge hashes.
        </p>
        <div className="flex gap-2">
          <Input
            value={inputHash}
            onChange={(e) => setInputHash(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="Paste SHA-256 hash..."
            className="bg-gallows-bg border-gallows-border text-gallows-text font-mono text-xs focus-visible:ring-gallows-approved/50"
          />
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleVerify}
              disabled={checking || !inputHash.trim()}
              className="bg-gallows-bg border border-gallows-border text-gallows-text font-mono text-xs hover:bg-gallows-border shrink-0 gap-1.5"
              variant="outline"
              size="sm"
            >
              {checking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'VERIFY'
              )}
            </Button>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.found ? 'found' : 'notfound'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3 rounded border space-y-2 ${
                result.found && result.merkleVerified
                  ? 'border-gallows-approved/30 bg-gallows-approved/5'
                  : result.found
                  ? 'border-amber-400/30 bg-amber-400/5'
                  : 'border-gallows-blocked/30 bg-gallows-blocked/5'
              }`}
            >
              {result.found ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.merkleVerified ? (
                        <ShieldCheck className="h-4 w-4 text-gallows-approved" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-amber-400" />
                      )}
                      <span className={`font-mono text-xs font-bold ${result.merkleVerified ? 'text-gallows-approved' : 'text-amber-400'}`}>
                        {result.merkleVerified ? 'MERKLE INCLUSION VERIFIED' : 'RECORD FOUND — AWAITING PROOF'}
                      </span>
                    </div>
                    <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-[10px] gap-1">
                      {result.source === 'database' ? <Database className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                      {result.source}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    {result.commitId && (
                      <div><span className="text-gallows-muted">Commit: </span><span className="text-gallows-text">{result.commitId}</span></div>
                    )}
                    {result.predicateId && (
                      <div><span className="text-gallows-muted">Predicate: </span><span className="text-gallows-text">{result.predicateId}</span></div>
                    )}
                    {result.status && (
                      <div>
                        <span className="text-gallows-muted">Status: </span>
                        <Badge className={`font-mono text-xs border-0 ${
                          result.status === 'APPROVED' ? 'bg-gallows-approved/15 text-gallows-approved' : 'bg-gallows-blocked/15 text-gallows-blocked'
                        }`}>{result.status}</Badge>
                      </div>
                    )}
                    {result.merkleRoot && (
                      <div><span className="text-gallows-muted">Root: </span><span className="text-gallows-text/70 break-all text-[10px]">{result.merkleRoot.substring(0, 32)}…</span></div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldX className="h-4 w-4 text-gallows-blocked" />
                  <span className="font-mono text-xs font-bold text-gallows-blocked">
                    HASH NOT FOUND IN LEDGER
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Public API Hint */}
        <div className="pt-2 border-t border-gallows-border">
          <p className="text-[10px] font-mono text-gallows-muted/60">
            <span className="text-gallows-approved">API:</span> POST /functions/v1/verify-hash {`{ "hash": "..." }`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HashVerifier;
