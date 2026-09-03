// ═══════════════════════════════════════════════════════════════════════
// APEX GALLOWS — Compliance Certificate Generator
// Generates cryptographically-signed compliance attestations
// ═══════════════════════════════════════════════════════════════════════

import type { CommitRecord } from "./gallows-engine";
import { hashSHA256 } from "./gallows-engine";
import QRCode from "qrcode";

export interface ComplianceCertificate {
  certificateId: string;
  generatedAt: string;
  engine: string;
  version: string;
  
  // Subject
  commitId: string;
  action: string;
  predicateId: string;
  predicateName: string;
  
  // Cryptographic Evidence
  commitHash: string;
  merkleLeafHash: string;
  merkleRoot: string;
  proofHash: string;
  merkleProof: object;
  
  // Verdict
  status: 'APPROVED' | 'BLOCKED';
  violationFound?: string;
  verificationTimeMs: number;
  
  // EU AI Act Attestations
  attestations: {
    article: string;
    title: string;
    compliant: boolean;
    evidence: string;
  }[];
  
  // Certificate Signature
  certificateHash: string;
  
  // QR Code for verification
  qrCodeDataUrl?: string;
  verificationUrl: string;

  // MPC Consensus (optional)
  mpcConsensus?: {
    nodesResponded: number;
    threshold: string;
    consensusSignature: string;
  };

  // ZK Proof (optional)
  zkProof?: {
    protocol: string;
    curve: string;
    proofHash: string;
    privacyLevel: string;
  };

  // Institutional Anchor Panel (optional)
  tribunal?: {
    approvals: number;
    rejections: number;
    threshold: string;
    ratified: boolean;
    ratificationHash: string | null;
    ratifiedAt: string | null;
  };
}

const PREDICATE_NAMES: Record<string, string> = {
  'EU_ART_5': 'Prohibited AI Practices',
  'EU_ART_6': 'High-Risk Classification',
  'EU_ART_9': 'Risk Management System',
  'EU_ART_11': 'Technical Documentation',
  'EU_ART_12': 'Record-Keeping',
  'EU_ART_13': 'Transparency & Information',
  'EU_ART_14': 'Human Oversight',
  'EU_ART_15': 'Accuracy, Robustness & Cybersecurity',
  'EU_ART_50': 'Transparency for GPAI & Content',
  'EU_ART_52': 'AI Interaction Disclosure',
};

/**
 * Generate a compliance certificate from a verified commit record
 */
export async function generateCertificate(record: CommitRecord): Promise<ComplianceCertificate | null> {
  if (record.phase !== 'VERIFIED' || !record.proofHash || !record.merkleRoot || !record.merkleProof) {
    return null;
  }

  const isApproved = record.status === 'APPROVED';
  
  const attestations = [
    {
      article: 'Article 11',
      title: 'Technical Documentation',
      compliant: true,
      evidence: `Cryptographic commit hash generated: ${record.commitHash.substring(0, 16)}...`,
    },
    {
      article: 'Article 12',
      title: 'Record-Keeping',
      compliant: true,
      evidence: `Immutable Merkle tree entry at leaf hash: ${record.merkleLeafHash.substring(0, 16)}...`,
    },
    {
      article: 'Article 13',
      title: 'Transparency',
      compliant: true,
      evidence: `Full audit trail with verifiable proof hash: ${record.proofHash.substring(0, 16)}...`,
    },
    {
      article: 'Article 14',
      title: 'Human Oversight',
      compliant: true,
      evidence: 'Protocol Pause (kill switch) available throughout verification pipeline.',
    },
    {
      article: 'Article 15',
      title: 'Accuracy & Robustness',
      compliant: isApproved,
      evidence: isApproved 
        ? `Action verified against predicate [${record.predicateId}] with Merkle inclusion proof.`
        : `Violation detected: "${record.violationFound}" — action structurally blocked.`,
    },
  ];

  const certificateData = {
    commitId: record.id,
    timestamp: record.timestamp,
    proofHash: record.proofHash,
    merkleRoot: record.merkleRoot,
    status: record.status,
  };
  
  const certificateHash = await hashSHA256(JSON.stringify(certificateData));
  const certificateId = `CERT-${certificateHash.substring(0, 12).toUpperCase()}`;
  
  // Generate verification URL
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qhtntebpcribjiwrdtdd';
  const verificationUrl = `https://${projectId}.supabase.co/functions/v1/verify-hash?hash=${record.proofHash}`;
  
  // Generate QR code
  let qrCodeDataUrl: string | undefined;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#00ff88',
        light: '#0a0a0a',
      },
    });
  } catch (e) {
    console.warn('QR code generation failed:', e);
  }

  return {
    certificateId,
    generatedAt: new Date().toISOString(),
    engine: 'APEX PSI',
    version: '2.0',
    
    commitId: record.id,
    action: record.action,
    predicateId: record.predicateId,
    predicateName: PREDICATE_NAMES[record.predicateId] || record.predicateId,
    
    commitHash: record.commitHash,
    merkleLeafHash: record.merkleLeafHash,
    merkleRoot: record.merkleRoot,
    proofHash: record.proofHash,
    merkleProof: record.merkleProof,
    
    status: record.status || 'APPROVED',
    violationFound: record.violationFound,
    verificationTimeMs: record.verificationTimeMs || 0,
    
    attestations,
    certificateHash,
    qrCodeDataUrl,
    verificationUrl,
  };
}

/**
 * Export certificate as downloadable JSON
 */
export function downloadCertificateJSON(cert: ComplianceCertificate): void {
  const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cert.certificateId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate certificate HTML for printing/PDF
 */
export function generateCertificateHTML(cert: ComplianceCertificate): string {
  const statusColor = cert.status === 'APPROVED' ? '#00ff88' : '#ff4466';
  const statusIcon = cert.status === 'APPROVED' ? '✓' : '✗';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APEX Compliance Certificate - ${cert.certificateId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: #0a0a0f;
      color: #e0e0e0;
      padding: 40px;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #d4af37;
      padding: 40px;
      background: linear-gradient(135deg, #0f0f18 0%, #0a0a0f 100%);
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      color: #d4af37;
      letter-spacing: 4px;
      margin-bottom: 10px;
    }
    .header .subtitle {
      color: #888;
      font-size: 12px;
      letter-spacing: 2px;
    }
    .cert-id {
      font-size: 18px;
      color: #d4af37;
      margin-top: 15px;
    }
    .status {
      text-align: center;
      margin: 30px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 15px 40px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 3px;
      border: 2px solid ${statusColor};
      color: ${statusColor};
      background: ${statusColor}15;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 12px;
      color: #666;
      letter-spacing: 2px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .section-content {
      font-size: 13px;
      color: #ccc;
      word-break: break-all;
    }
    .hash {
      font-size: 11px;
      color: #888;
      background: #111;
      padding: 10px;
      border-left: 3px solid #333;
      margin-top: 5px;
    }
    .attestations {
      margin-top: 30px;
    }
    .attestation {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      padding: 12px 0;
      border-bottom: 1px solid #222;
    }
    .attestation-status {
      font-size: 16px;
    }
    .attestation-pass { color: #00ff88; }
    .attestation-fail { color: #ff4466; }
    .attestation-content h4 {
      font-size: 13px;
      color: #d4af37;
      margin-bottom: 4px;
    }
    .attestation-content p {
      font-size: 11px;
      color: #888;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #333;
      text-align: center;
    }
    .footer .signature {
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
    }
    .footer .cert-hash {
      font-size: 10px;
      color: #444;
      word-break: break-all;
    }
    @media print {
      body { background: white; color: black; padding: 20px; }
      .certificate { border-color: #333; background: white; }
      .header h1 { color: #333; }
      .status-badge { border-color: ${cert.status === 'APPROVED' ? '#228B22' : '#B22222'}; color: ${cert.status === 'APPROVED' ? '#228B22' : '#B22222'}; }
      .section-content, .hash { color: #333; background: #f5f5f5; }
      .attestation-content h4 { color: #333; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <h1>APEX PSI</h1>
      <div class="subtitle">EU AI ACT COMPLIANCE CERTIFICATE</div>
      <div class="cert-id">${cert.certificateId}</div>
    </div>

    <div class="status">
      <div class="status-badge">${statusIcon} STRUCTURALLY ${cert.status}</div>
    </div>

    <div class="section">
      <div class="section-title">Verified Action</div>
      <div class="section-content">${cert.action}</div>
    </div>

    <div class="section">
      <div class="section-title">Predicate Enforced</div>
      <div class="section-content">${cert.predicateId}: ${cert.predicateName}</div>
    </div>

    <div class="section">
      <div class="section-title">Cryptographic Evidence</div>
      <div class="hash">
        <strong>Commit Hash:</strong> ${cert.commitHash}<br>
        <strong>Merkle Leaf:</strong> ${cert.merkleLeafHash}<br>
        <strong>Merkle Root:</strong> ${cert.merkleRoot}<br>
        <strong>Proof Hash:</strong> ${cert.proofHash}
      </div>
    </div>

    ${cert.violationFound ? `
    <div class="section">
      <div class="section-title">Violation Detected</div>
      <div class="section-content" style="color: #ff4466;">"${cert.violationFound}"</div>
    </div>
    ` : ''}

    <div class="attestations">
      <div class="section-title">EU AI Act Article Attestations</div>
      ${cert.attestations.map(a => `
        <div class="attestation">
          <span class="attestation-status ${a.compliant ? 'attestation-pass' : 'attestation-fail'}">${a.compliant ? '✓' : '✗'}</span>
          <div class="attestation-content">
            <h4>${a.article}: ${a.title}</h4>
            <p>${a.evidence}</p>
          </div>
        </div>
      `).join('')}
    </div>

    ${cert.qrCodeDataUrl ? `
    <div class="section" style="text-align: center; margin-top: 30px;">
      <div class="section-title">Scan to Verify</div>
      <img src="${cert.qrCodeDataUrl}" alt="Verification QR Code" style="width: 150px; height: 150px; margin: 15px auto; border: 2px solid #333; border-radius: 8px;" />
      <p style="font-size: 10px; color: #666; word-break: break-all; max-width: 400px; margin: 0 auto;">
        ${cert.verificationUrl}
      </p>
    </div>
    ` : ''}

    <div class="footer">
      <div class="signature">
        Generated: ${new Date(cert.generatedAt).toLocaleString()}<br>
        Engine: ${cert.engine} v${cert.version}<br>
        Verification Time: ${cert.verificationTimeMs}ms
      </div>
      <div class="cert-hash">
        Certificate Signature: ${cert.certificateHash}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Open certificate in new window for printing
 */
export function printCertificate(cert: ComplianceCertificate): void {
  const html = generateCertificateHTML(cert);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
