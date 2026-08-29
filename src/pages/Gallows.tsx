import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import GallowsHeader from "@/components/gallows/GallowsHeader";
import CommitPanel from "@/components/gallows/CommitPanel";
import PipelineView from "@/components/gallows/PipelineView";
import MerkleVisualizer from "@/components/gallows/MerkleVisualizer";
import AuditTrailLog from "@/components/gallows/AuditTrailLog";
import PredicateRegistry from "@/components/gallows/PredicateRegistry";
import HashVerifier from "@/components/gallows/HashVerifier";
import CertificatePanel from "@/components/gallows/CertificatePanel";
import {
  commitAction,
  toggleProtocolPause,
  getCommitLog,
  getTreeState,
  initializeFromLedger,
  updateRecordFromServer,
  type CommitRecord,
  type MerkleTreeState,
} from "@/lib/gallows-engine";
import { 
  persistCommit, 
  challengeCommitServer,
  proveCommitServer,
  fetchLedger, 
  subscribeLedgerAll, 
  type LedgerEntry 
} from "@/lib/gallows-persistence";
import { generateCertificate, type ComplianceCertificate } from "@/lib/gallows-certificate";
import { generateZKProof, type ZKProofResult } from "@/lib/gallows-zk";
import TrafficNoticeBanner from "@/components/TrafficNoticeBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Gallows = () => {
  const [currentRecord, setCurrentRecord] = useState<CommitRecord | null>(null);
  const [commitLog, setCommitLog] = useState<CommitRecord[]>([]);
  const [treeState, setTreeState] = useState<(MerkleTreeState & { layers: string[][] }) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<ComplianceCertificate | null>(null);
  const [persistedCount, setPersistedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [externalAnchoring, setExternalAnchoring] = useState<{ success: boolean; ots_url?: string } | null>(null);
  const [zkResult, setZkResult] = useState<ZKProofResult | null>(null);

  const refreshState = () => {
    setCommitLog(getCommitLog());
    setTreeState(getTreeState());
  };

  // Initialize from database on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        const entries = await fetchLedger(500);
        
        if (entries.length > 0) {
          const result = await initializeFromLedger(entries);
          console.log(`[Gallows] Initialized from ${result.loaded} persisted entries. Root: ${result.merkleRoot.substring(0, 16)}...`);
          toast.success(`Loaded ${result.loaded} entries from ledger`, {
            description: `Merkle root: ${result.merkleRoot.substring(0, 16)}...`,
          });
        }
        
        setPersistedCount(entries.length);
        refreshState();
      } catch (err) {
        console.error('[Gallows] Initialization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Subscribe to realtime updates (INSERT and UPDATE)
  useEffect(() => {
    const unsubscribe = subscribeLedgerAll((entry, event) => {
      if (event === 'INSERT') {
        setPersistedCount((prev) => prev + 1);
      }
      // Refresh state on any change
      refreshState();
    });
    return unsubscribe;
  }, []);

  const handleCommit = useCallback(async (action: string, predicateId: string, zkMode?: boolean) => {
    setIsProcessing(true);
    setError(null);
    setCertificate(null);
    setExternalAnchoring(null);
    setZkResult(null);
    try {
      // Create local record first (for immediate UI feedback)
      const record = await commitAction(action, predicateId);
      setCurrentRecord(record);
      refreshState();

      // Generate ZK proof if enabled
      let zkProofResult: ZKProofResult | null = null;
      if (zkMode) {
        try {
          zkProofResult = await generateZKProof({
            actionHash: record.commitHash,
            predicateId,
            complianceStatus: true,
            timestamp: Date.now(),
          });
          setZkResult(zkProofResult);
          toast.success("ZK proof generated (Groth16-compatible)", {
            description: `BN128 field arithmetic • ${zkProofResult.generationTimeMs}ms • ${zkProofResult.privacyLevel}`,
          });
        } catch (e: any) {
          console.warn("[Gallows] ZK proof generation failed:", e.message);
        }
      }

      // Persist via server-side Edge Function (hashes verified server-side)
      const result = await persistCommit(record);
      if (result.success && result.commit_id) {
        const description = result.hash_mismatch_detected 
          ? `⚠ Hash mismatch detected - server values used` 
          : `ID: ${result.commit_id} • Server verified`;
        toast.success("Committed to immutable ledger", { description });
        setPersistedCount((prev) => prev + 1);
        
        // Create updated record with server values (use server commit_id!)
        const serverRecord: CommitRecord = {
          ...record,
          id: result.commit_id,
          commitHash: result.commit_hash!,
          merkleLeafHash: result.merkle_leaf_hash!,
          timestamp: result.timestamp || record.timestamp,
        };
        
        // Update both local engine state and current record
        updateRecordFromServer(record.id, serverRecord);
        setCurrentRecord(serverRecord);
        refreshState();
      } else {
        console.error('[Gallows] Persistence failed:', result.error);
        toast.error("Persistence failed", {
          description: result.error,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleChallenge = useCallback(async (commitId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Call server-side challenge endpoint
      const result = await challengeCommitServer(commitId);
      
      if (result.success) {
        // Update local record with server response
        const updatedRecord = updateRecordFromServer(commitId, {
          phase: 'CHALLENGED',
          challengeHash: result.challenge_hash,
          challengedAt: result.challenged_at,
        });
        
        if (updatedRecord) {
          setCurrentRecord(updatedRecord);
        }
        refreshState();
        
        toast.success("Challenge registered", {
          description: `Hash: ${result.challenge_hash?.substring(0, 16)}...`,
        });
      } else {
        throw new Error(result.error || 'Challenge failed');
      }
    } catch (e: any) {
      setError(e.message);
      toast.error("Challenge failed", { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleProve = useCallback(async (commitId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Call server-side prove endpoint
      const result = await proveCommitServer(commitId);
      
      // Call MPC coordinator in parallel (best-effort)
      let mpcData: any = null;
      try {
        const { data } = await supabase.functions.invoke('mpc-coordinator', {
          body: { commit_id: commitId },
        });
        if (data?.success) {
          mpcData = data;
          toast.success("MPC consensus reached", {
            description: `${data.nodes_responded}/3 nodes • ${data.threshold} threshold • ${data.total_time_ms}ms`,
          });
        }
      } catch {
        // MPC is best-effort
      }
      
      if (result.success) {
        const updatedRecord = updateRecordFromServer(commitId, {
          phase: 'VERIFIED',
          status: result.status,
          proofHash: result.proof_hash,
          merkleRoot: result.merkle_root,
          merkleProof: result.merkle_proof,
          violationFound: result.violation_found ?? undefined,
          verificationTimeMs: result.verification_time_ms,
          provenAt: result.proven_at,
        });
        
        if (updatedRecord) {
          setCurrentRecord(updatedRecord);
          
          // Generate certificate with MPC and ZK data
          const cert = await generateCertificate(updatedRecord);
          if (cert) {
            // Attach MPC consensus data
            if (mpcData) {
              cert.mpcConsensus = {
                nodesResponded: mpcData.nodes_responded,
                threshold: mpcData.threshold,
                consensusSignature: mpcData.consensus_signature,
              };
            }
            // Attach ZK proof data
            if (zkResult) {
              cert.zkProof = {
                protocol: zkResult.proof.protocol,
                curve: zkResult.proof.curve,
                proofHash: zkResult.proofHash,
                privacyLevel: zkResult.privacyLevel,
              };
            }
            setCertificate(cert);
            toast.success("Compliance certificate generated", {
              description: cert.certificateId,
            });
          }
        }
        
        // Store external anchoring info
        if (result.external_anchoring) {
          setExternalAnchoring(result.external_anchoring);
          if (result.external_anchoring.success) {
            toast.success("Merkle root anchored to OpenTimestamps", {
              description: "External proof of existence recorded",
            });
          }
        }
        
        refreshState();
        
        toast.success(`Action ${result.status}`, {
          description: `Proof: ${result.proof_hash?.substring(0, 16)}... • ${result.verification_time_ms}ms`,
        });
      } else {
        throw new Error(result.error || 'Prove failed');
      }
    } catch (e: any) {
      setError(e.message);
      toast.error("Prove failed", { description: e.message });
    } finally {
      setIsProcessing(false);
    }
  }, [zkResult]);

  const handlePause = useCallback(() => {
    const result = toggleProtocolPause();
    setPaused(result.paused);
    refreshState();
    
    toast[result.paused ? 'warning' : 'success'](
      result.paused ? 'OVERSIGHT PAUSE ACTIVATED' : 'System Resumed',
      {
        description: result.paused 
          ? 'All operations halted per EU AI Act Art. 14'
          : 'Verification pipeline operational',
      }
    );
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gallows-bg text-gallows-text flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-gallows-approved animate-spin mx-auto" />
          <div className="font-mono text-sm text-gallows-muted">
            INITIALIZING MERKLE TREE FROM LEDGER...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gallows-bg text-gallows-text">
      <TrafficNoticeBanner />
      <GallowsHeader paused={paused} onTogglePause={handlePause} persistedCount={persistedCount} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 md:mx-6 mt-4 p-3 border border-gallows-blocked/40 bg-gallows-blocked/10 rounded font-mono text-sm text-gallows-blocked"
        >
          ⚠ {error}
        </motion.div>
      )}

      {externalAnchoring?.success && externalAnchoring.ots_url && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 md:mx-6 mt-4 p-3 border border-gallows-approved/40 bg-gallows-approved/10 rounded font-mono text-sm"
        >
          <span className="text-gallows-approved">⚓ EXTERNAL ANCHOR:</span>{" "}
          <a 
            href={externalAnchoring.ots_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gallows-highlight underline"
          >
            OpenTimestamps Proof
          </a>
        </motion.div>
      )}

      <main className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Top row: Commit + Pipeline + Predicates */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_300px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CommitPanel onCommit={handleCommit} isProcessing={isProcessing} paused={paused} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PipelineView
              record={currentRecord}
              onChallenge={handleChallenge}
              onProve={handleProve}
              isProcessing={isProcessing}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PredicateRegistry />
          </motion.div>
        </div>

        {/* Middle row: Merkle Tree + Hash Verifier + Certificate */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[1fr_400px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <MerkleVisualizer treeState={treeState} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-4"
          >
            <HashVerifier />
            {certificate && <CertificatePanel certificate={certificate} />}
          </motion.div>
        </div>

        {/* Bottom: Full Audit Trail */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <AuditTrailLog entries={commitLog} />
        </motion.div>
      </main>
    </div>
  );
};

export default Gallows;
