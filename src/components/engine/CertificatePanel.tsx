import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Printer, CheckCircle, XCircle, QrCode, ExternalLink, FileJson } from "lucide-react";
import { type ComplianceCertificate, downloadCertificateJSON, printCertificate } from "@/lib/engine-certificate";
import { type PSIProofBundle } from "@/lib/psi-signatures";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface CertificatePanelProps {
  certificate: ComplianceCertificate;
}

const CertificatePanel = ({ certificate }: CertificatePanelProps) => {
  const isApproved = certificate.status === 'APPROVED';

  const exportProofBundle = () => {
    const bundle: PSIProofBundle = {
      version: "1.0",
      protocol: "APEX-PSI",
      commitId: certificate.commitId,
      action: certificate.action,
      predicateId: certificate.predicateId,
      timestamp: certificate.generatedAt,
      commitHash: certificate.commitHash,
      merkleLeafHash: certificate.merkleLeafHash,
      merkleProof: certificate.merkleProof as any,
      merkleRoot: certificate.merkleRoot,
      canonicalizationScheme: "RFC-8785-JCS",
      hashAlgorithm: "SHA-256",
      signatureAlgorithm: "Ed25519",
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psi-proof-bundle-${certificate.commitId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Proof bundle exported", {
      description: "Drag this file into the Verification Portal to verify independently",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Card className={`bg-engine-surface border ${isApproved ? 'border-engine-approved/30 shadow-engine-approved' : 'border-engine-blocked/30 shadow-engine-blocked'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono text-engine-muted uppercase tracking-widest flex items-center gap-2">
              <Award className={`h-4 w-4 ${isApproved ? 'text-engine-approved' : 'text-engine-blocked'}`} />
              PSI Compliance Record
            </CardTitle>
            <Badge className={`font-mono text-xs border-0 ${isApproved ? 'bg-engine-approved/15 text-engine-approved' : 'bg-engine-blocked/15 text-engine-blocked'}`}>
              {certificate.certificateId}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status */}
          <div className={`p-3 rounded border text-center ${isApproved ? 'border-engine-approved/20 bg-engine-approved/5' : 'border-engine-blocked/20 bg-engine-blocked/5'}`}>
            <span className={`font-mono text-lg font-bold tracking-wider ${isApproved ? 'text-engine-approved' : 'text-engine-blocked'}`}>
              {isApproved ? '✓ STRUCTURALLY VERIFIED' : '✗ STRUCTURALLY BLOCKED'}
            </span>
          </div>

          {/* QR Code Section */}
          {certificate.qrCodeDataUrl && (
            <div className="flex items-center gap-3 p-2 rounded bg-engine-bg border border-engine-border">
              <img src={certificate.qrCodeDataUrl} alt="Verification QR Code" className="w-16 h-16 rounded" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-engine-muted mb-1">
                  <QrCode className="h-3 w-3" /> SCAN TO VERIFY
                </div>
                <p className="text-[9px] font-mono text-engine-muted/60 break-all">
                  {certificate.verificationUrl.substring(0, 50)}...
                </p>
                <a href={certificate.verificationUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-engine-approved hover:underline mt-1">
                  Open API <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* Attestations */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-engine-muted block">EU AI ACT ATTESTATIONS</span>
            {certificate.attestations.map((att, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs font-mono">
                {att.compliant ? (
                  <CheckCircle className="h-3.5 w-3.5 text-engine-approved shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-engine-blocked shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={att.compliant ? 'text-engine-approved' : 'text-engine-blocked'}>{att.article}</span>
                  <span className="text-engine-muted"> — {att.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* MPC Consensus */}
          {certificate.mpcConsensus && (
            <div className="p-2 rounded bg-engine-bg border border-engine-border">
              <span className="text-[10px] font-mono text-engine-muted block mb-1">MPC DISTRIBUTED CONSENSUS</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-engine-approved">{certificate.mpcConsensus.nodesResponded}/3 nodes</span>
                <span className="text-engine-muted">•</span>
                <span className="text-engine-text">{certificate.mpcConsensus.threshold} threshold</span>
              </div>
              <span className="text-[9px] font-mono text-engine-muted/60 break-all block mt-1">
                Consensus: {certificate.mpcConsensus.consensusSignature?.substring(0, 32)}...
              </span>
            </div>
          )}

          {/* ZK Proof */}
          {certificate.zkProof && (
            <div className="p-2 rounded bg-engine-bg border border-engine-border">
              <span className="text-[10px] font-mono text-engine-muted block mb-1">ZK PRIVACY PROOF (GROTH16-COMPATIBLE)</span>
              <div className="text-[11px] font-mono text-engine-text space-y-0.5">
                <div>Protocol: <span className="text-engine-approved">Groth16</span> • Curve: <span className="text-engine-approved">BN128</span></div>
                <div>Privacy: <span className="text-engine-approved">Action content hidden</span></div>
              </div>
            </div>
          )}

          {/* Institutional Anchor Panel */}
          {certificate.tribunal && (
            <div className={`p-2 rounded bg-engine-bg border ${certificate.tribunal.ratified ? 'border-engine-approved/20' : 'border-engine-border'}`}>
              <span className="text-[10px] font-mono text-engine-muted block mb-1">SOVEREIGN TRIBUNAL (ARTICLE 14)</span>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-engine-approved">✓ {certificate.tribunal.approvals} approve</span>
                <span className="text-engine-blocked">✗ {certificate.tribunal.rejections} reject</span>
                <span className="text-engine-muted">• {certificate.tribunal.threshold}</span>
              </div>
              {certificate.tribunal.ratified && certificate.tribunal.ratificationHash && (
                <span className="text-[9px] font-mono text-engine-approved/60 break-all block mt-1">
                  Ratified: {certificate.tribunal.ratificationHash.substring(0, 32)}...
                </span>
              )}
              {!certificate.tribunal.ratified && (
                <span className="text-[9px] font-mono text-yellow-500/60 block mt-1">
                  ⏳ Awaiting {3 - certificate.tribunal.approvals} more approval(s)
                </span>
              )}
            </div>
          )}
          {/* Signature */}
          <div className="pt-2 border-t border-engine-border">
            <span className="text-[10px] font-mono text-engine-muted block mb-1">CERTIFICATE SIGNATURE</span>
            <span className="font-mono text-[10px] text-engine-text/60 break-all">{certificate.certificateHash}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={exportProofBundle}
              className="flex-1 bg-engine-bg border border-engine-approved/30 text-engine-approved font-mono text-xs hover:bg-engine-approved/10 gap-1.5"
              variant="outline" size="sm">
              <FileJson className="h-3.5 w-3.5" /> PROOF BUNDLE
            </Button>
            <Button onClick={() => downloadCertificateJSON(certificate)}
              className="flex-1 bg-engine-bg border border-engine-border text-engine-text font-mono text-xs hover:bg-engine-border gap-1.5"
              variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" /> JSON
            </Button>
            <Button onClick={() => printCertificate(certificate)}
              className="flex-1 bg-engine-bg border border-engine-border text-engine-text font-mono text-xs hover:bg-engine-border gap-1.5"
              variant="outline" size="sm">
              <Printer className="h-3.5 w-3.5" /> PRINT
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CertificatePanel;
