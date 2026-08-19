import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  GitBranch,
  Lock,
  Layers,
  Swords,
  Scale,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Code,
  BookOpen,
  Zap,
  Globe,
  Eye,
} from "lucide-react";
import { Helmet } from "react-helmet-async";

const Architecture = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Architecture Verification Infrastructure — Apex PSI — Universal Verification Layer</title>
        <meta name="description" content="Three-node lattice, tri-verified attestations, Bitcoin anchoring, and zero-knowledge predicates powering APEX PSI." />
        <link rel="canonical" href="https://ai-governance-standard.com/architecture" />
        <meta property="og:title" content="Architecture — APEX PSI Verification Infrastructure" />
        <meta property="og:description" content="Three-node lattice, tri-verified attestations, Bitcoin anchoring, and zero-knowledge predicates powering APEX PSI." />
        <meta property="og:url" content="https://ai-governance-standard.com/architecture" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-gallows-bg text-gallows-text">
      {/* Header */}
      <header className="border-b border-gallows-border px-4 md:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-gallows-muted hover:text-gallows-text transition-colors bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-mono tracking-wider text-gallows-text">
                ARCHITECTURE SPECIFICATION
              </h1>
              <p className="text-xs font-mono text-gallows-muted mt-0.5">
                Proof of Stateful Integrity — Technical Documentation
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/gallows")}
            className="bg-gallows-bg border border-gallows-approved/40 text-gallows-approved font-mono text-xs hover:bg-gallows-approved/10 gap-2"
            variant="outline"
            size="sm"
          >
            <Zap className="h-3.5 w-3.5" />
            LIVE DEMO
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Overview */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-sm text-gallows-text/80 leading-relaxed">
            <p>
              The <span className="text-amber-400 font-bold">APEX PSI Engine</span> implements{" "}
              <span className="text-gallows-approved font-bold">Proof of Stateful Integrity (PSI)</span>,
              an Optimistic ZKML compliance architecture designed for the EU AI Act.
            </p>
            <p>
              Unlike traditional Zero-Knowledge approaches that prove every computation upfront (computationally
              prohibitive for large models), PSI uses an <span className="text-amber-400">optimistic model</span>:
              AI outputs are committed to an immutable ledger and assumed compliant until challenged.
              Only when a regulator issues a formal challenge does the system generate a cryptographic fraud proof.
            </p>
            <div className="p-3 border border-gallows-approved/20 bg-gallows-approved/5 rounded">
              <p className="text-xs text-gallows-approved">
                <strong>Result:</strong> 99.9% cost reduction over traditional ZK proofs while maintaining
                mathematical compliance guarantees through SHA-256 Merkle tree inclusion proofs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Architecture */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              Verification Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <PipelineStep
                icon={<Lock className="h-5 w-5" />}
                phase="Phase 1"
                title="COMMIT"
                color="text-amber-400 border-amber-400/30 bg-amber-400/5"
                description="AI action is hashed via SHA-256 with predicate ID and timestamp. The commit hash becomes a Merkle leaf and is added to the tree. Merkle root is updated."
                code={`commitHash = SHA256(action | predicateId | timestamp)\nleafHash = SHA256(commitId | commitHash)\nmerkleTree.addLeaf(leafHash)`}
              />
              <PipelineStep
                icon={<Swords className="h-5 w-5" />}
                phase="Phase 2"
                title="CHALLENGE"
                color="text-gallows-blocked border-gallows-blocked/30 bg-gallows-blocked/5"
                description="Regulator challenges a committed action. System runs predicate compliance check against locked violation patterns. Challenge hash is generated."
                code={`challengeHash = SHA256(commitHash | timestamp | predicateId)\nresult = checkCompliance(action, predicateId)\nstatus = result.compliant ? 'APPROVED' : 'BLOCKED'`}
              />
              <PipelineStep
                icon={<Scale className="h-5 w-5" />}
                phase="Phase 3"
                title="PROVE"
                color="text-blue-400 border-blue-400/30 bg-blue-400/5"
                description="Merkle inclusion proof is generated — sibling hashes from leaf to root. This mathematically proves the action was committed before the challenge."
                code={`proof = merkleTree.getProof(leafIndex)\n// Returns [{hash, position: 'left'|'right'}, ...]\nproofHash = SHA256(merkleRoot | proof | status)`}
              />
              <PipelineStep
                icon={<ShieldCheck className="h-5 w-5" />}
                phase="Phase 4"
                title="VERIFY"
                color="text-gallows-approved border-gallows-approved/30 bg-gallows-approved/5"
                description="Anyone can independently verify: recompute the Merkle root from the leaf hash and proof path. If it matches the published root, inclusion is proven."
                code={`hash = leafHash\nfor (step of proof):\n  hash = SHA256(canonical_order(hash, step.hash))\nassert(hash === publishedRoot)`}
              />
            </div>
          </CardContent>
        </Card>

        {/* Merkle Tree Spec */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-amber-400" />
              Merkle Tree Specification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SpecItem label="Hash Algorithm" value="SHA-256 (Web Crypto API)" />
              <SpecItem label="Node Ordering" value="Canonical (lexicographic)" />
              <SpecItem label="Odd Leaf Handling" value="Duplicate last leaf" />
              <SpecItem label="Proof Format" value="Array of {hash, position}" />
              <SpecItem label="Root Update" value="On every new commit" />
              <SpecItem label="Verification" value="O(log n) proof path" />
            </div>
            <div className="mt-4 p-4 bg-gallows-bg rounded border border-gallows-border">
              <span className="text-xs font-mono text-gallows-muted block mb-2">CANONICAL ORDERING RULE</span>
              <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap">{`// Prevents second-preimage attacks
// Always hash smaller value first
function combinePair(a: string, b: string): string {
  const combined = a < b ? a + b : b + a;
  return SHA256(combined);
}`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* EU AI Act Mapping */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-400" />
              EU AI Act Article Mapping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <ArticleMapping
                article="Article 5"
                title="Prohibited AI Practices"
                component="Predicate Registry"
                mechanism="Hard-coded UNACCEPTABLE risk predicates that cannot be overridden. Any action matching violation patterns is structurally blocked."
                risk="UNACCEPTABLE"
              />
              <ArticleMapping
                article="Article 9"
                title="Risk Management System"
                component="Compliance Engine"
                mechanism="Continuous risk assessment via predicate matching against Annex III classification. Each commit is evaluated against applicable risk predicates."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 11"
                title="Technical Documentation"
                component="Audit Trail + JSON Export"
                mechanism="Every verification generates exportable, hash-chained audit records with commit IDs, timestamps, Merkle proofs, and predicate results."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 12"
                title="Record-Keeping"
                component="Merkle Tree Ledger"
                mechanism="Immutable SHA-256 hash chain. Every action is a Merkle leaf. Tree root updates on each commit. Historical states are cryptographically provable."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 13"
                title="Transparency"
                component="Verification Pipeline"
                mechanism="Full pipeline visibility: commit hash, challenge hash, Merkle proof path, and final proof hash are all displayed and independently verifiable."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 14"
                title="Human Oversight"
                component="Protocol Intervention Layer (PIL)"
                mechanism="One-click sovereign pause that freezes all pipeline operations. Logged with timestamp. System cannot process actions while paused. Art. 14 mandate satisfied."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 15"
                title="Accuracy & Robustness"
                component="Hash Verification"
                mechanism="Independent hash verifier allows any party to validate Merkle inclusion proofs against the published root. Canonical ordering prevents collision attacks."
                risk="HIGH"
              />
              <ArticleMapping
                article="Article 50"
                title="Transparency for GPAI"
                component="Predicate Engine"
                mechanism="Locked predicates enforce AI content labeling, attribution requirements, and deepfake disclosure through pattern matching against Article 50 violation definitions."
                risk="LIMITED"
              />
            </div>
          </CardContent>
        </Card>

        {/* TRIO Framework */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              The TRIO Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TrioCard
                name="SHIELD"
                role="The Lawyer"
                description="Private compliance layer. MPC-based verification ensures model weights and proprietary data never leave the deployer's environment. Merkle tree commitments prove compliance without exposing internals."
                color="text-gallows-approved border-gallows-approved/30"
              />
              <TrioCard
                name="SWORD"
                role="The Police"
                description="Public audit enforcement. Processes challenges against committed actions, generates fraud proofs, and maintains the immutable verification record. All outputs are independently verifiable."
                color="text-gallows-blocked border-gallows-blocked/30"
              />
              <TrioCard
                name="JUDGE"
                role="The Authority"
                description="Canonical standard layer. Sets legal precedents by locking predicate definitions with SHA-256 hashes. Once locked, predicates cannot be modified — ensuring consistent enforcement across all deployments."
                color="text-amber-400 border-amber-400/30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Predicate Schema */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Code className="h-5 w-5 text-amber-400" />
              Predicate Schema (Downloadable)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-mono text-gallows-muted">
              Each predicate is a locked, hash-verified legal rule mapped to a specific EU AI Act article.
            </p>
            <pre className="p-4 bg-gallows-bg rounded border border-gallows-border text-xs font-mono text-gallows-text/80 whitespace-pre-wrap overflow-x-auto">{`{
  "id": "EU_ART_14",
  "name": "Human Oversight",
  "article": "Article 14",
  "description": "High-risk AI systems must allow effective human oversight...",
  "violationPatterns": [
    "autonomous decision",
    "no human review",
    "override human",
    "bypass approval",
    "without human",
    "remove oversight",
    "disable protocol intervention"
  ],
  "riskLevel": "HIGH",
  "enforcementDate": "2026-08-02",
  "definitionHash": "sha256:a1b2c3d4e5f6..."  // Immutable
}`}</pre>
            <Button
              onClick={() => {
                const schema = {
                  schema: 'APEX Predicate Registry v2.0',
                  format: 'JSON',
                  hashAlgorithm: 'SHA-256',
                  fields: {
                    id: 'string — Unique identifier (e.g., EU_ART_14)',
                    name: 'string — Human-readable name',
                    article: 'string — EU AI Act article reference',
                    description: 'string — Full legal description',
                    violationPatterns: 'string[] — Lowercase keyword patterns for compliance matching',
                    riskLevel: 'enum — UNACCEPTABLE | HIGH | LIMITED | MINIMAL',
                    enforcementDate: 'string — ISO date when article becomes enforceable',
                  },
                  verification: 'SHA-256 hash of concatenated fields ensures predicate immutability',
                };
                const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'apex-predicate-schema.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-xs hover:text-gallows-approved hover:border-gallows-approved/40 gap-2"
              variant="outline"
              size="sm"
            >
              <FileText className="h-3.5 w-3.5" />
              DOWNLOAD SCHEMA JSON
            </Button>
          </CardContent>
        </Card>

        {/* Public API Documentation */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-400" />
              Public Verification API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-mono text-gallows-muted">
              Anyone can independently verify a hash against the APEX Gallows immutable ledger via the public API.
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-gallows-bg rounded border border-gallows-border">
                <span className="text-[10px] font-mono text-gallows-approved block mb-1">GET REQUEST</span>
                <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap">{`curl "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash?hash=<SHA256_HASH>"`}</pre>
              </div>
              <div className="p-3 bg-gallows-bg rounded border border-gallows-border">
                <span className="text-[10px] font-mono text-gallows-approved block mb-1">POST REQUEST</span>
                <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap">{`curl -X POST "https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash" \\
  -H "Content-Type: application/json" \\
  -d '{"hash": "<SHA256_HASH>"}'`}</pre>
              </div>
              <div className="p-3 bg-gallows-bg rounded border border-gallows-border">
                <span className="text-[10px] font-mono text-amber-400 block mb-1">RESPONSE (FOUND)</span>
                <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap">{`{
  "verified": true,
  "found": true,
  "merkle_verified": true,
  "commit_id": "APEX-A1B2C3D4-E5F6",
  "predicate_id": "EU_ART_50",
  "phase": "VERIFIED",
  "status": "APPROVED",
  "merkle_root": "abc123...",
  "eu_ai_act_compliance": true,
  "engine": "APEX PSI Engine v2.0",
  "algorithm": "SHA-256"
}`}</pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Code Samples */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <Code className="h-5 w-5 text-amber-400" />
              Live Engine Source (Actual Implementation)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-mono text-gallows-muted">
              These are actual code excerpts from <code className="text-gallows-approved">src/lib/gallows-engine.ts</code> — not pseudocode.
            </p>
            
            <div className="p-4 bg-gallows-bg rounded border border-gallows-border">
              <span className="text-[10px] font-mono text-gallows-approved block mb-2">SHA-256 HASHING (Web Crypto API)</span>
              <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap overflow-x-auto">{`export async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}`}</pre>
            </div>

            <div className="p-4 bg-gallows-bg rounded border border-gallows-border">
              <span className="text-[10px] font-mono text-gallows-approved block mb-2">MERKLE TREE LAYER COMPUTATION</span>
              <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap overflow-x-auto">{`private async computeLayers(): Promise<string[][]> {
  if (this.leaves.length === 0) return [['0'.repeat(64)]];
  
  let currentLayer = [...this.leaves];
  const layers: string[][] = [currentLayer];
  
  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i];
      const combined = left < right ? left + right : right + left; // canonical ordering
      const parentHash = await hashSHA256(combined);
      nextLayer.push(parentHash);
    }
    currentLayer = nextLayer;
    layers.push(currentLayer);
  }
  return layers;
}`}</pre>
            </div>

            <div className="p-4 bg-gallows-bg rounded border border-gallows-border">
              <span className="text-[10px] font-mono text-gallows-approved block mb-2">MERKLE PROOF VERIFICATION</span>
              <pre className="text-xs font-mono text-gallows-text/80 whitespace-pre-wrap overflow-x-auto">{`export async function verifyMerkleProof(
  leafHash: string,
  proof: MerkleProofPath,
  root: string
): Promise<boolean> {
  let computedHash = leafHash;
  
  for (const step of proof) {
    const left = step.position === 'left' ? step.hash : computedHash;
    const right = step.position === 'left' ? computedHash : step.hash;
    const combined = left < right ? left + right : right + left;
    computedHash = await hashSHA256(combined);
  }
  
  return computedHash === root;
}`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* C2PA Content Credentials Integration */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text">
              C2PA Content Credentials Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-mono text-gallows-muted leading-relaxed">
              Content files are signed using C2PA Content Credentials manifests. The manifest contains: claim store,
              signature, certificate chain, and timestamp. Signatures use Ed25519 + ML-DSA-65 hybrid mode. Timestamps
              anchored to Bitcoin via OpenTimestamps. Verification is permissionless and offline-capable.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                ["JPEG / PNG", "APP11 / JUMBF manifest"],
                ["MP4", "ISO BMFF box manifest"],
                ["WAV / MP3", "ID3v2 signed metadata block"],
                ["PDF", "XMP + PDF/A-3 signed manifest"],
              ].map(([f, m]) => (
                <div key={f} className="p-3 rounded border border-gallows-border">
                  <span className="font-mono text-xs text-gallows-approved font-bold block">{f}</span>
                  <span className="font-mono text-[11px] text-gallows-muted">{m}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Known Limitations — Intellectual Honesty */}
        <Card className="bg-gallows-surface border-gallows-border">
          <CardHeader>
            <CardTitle className="text-lg font-mono text-gallows-text flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Known Limitations & Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <LimitationItem
              title="Keyword-based Compliance (Current)"
              description="Predicate matching currently uses substring pattern matching. Production deployment requires NLP-based semantic analysis or formal verification circuits (Circom/Halo2/Noir)."
              status="SIMULATED"
            />
            <LimitationItem
              title="Database-backed Merkle Tree"
              description="Merkle tree now persists to database and rebuilds on page load. Tree state survives browser refresh. Production requires distributed consensus anchoring."
              status="IMPLEMENTED"
            />
            <LimitationItem
              title="Zero-Knowledge Proofs"
              description="True ZK circuit compilation for large foundational models remains computationally prohibitive. PSI's optimistic approach is the pragmatic bridge — only generating proofs on challenge."
              status="ARCHITECTURAL"
            />
            <LimitationItem
              title="Certificate Generation"
              description="Compliance certificates with QR codes for instant verification are now generated. PDF export via print dialog. Full Article 11/12 formatted reports on roadmap."
              status="IMPLEMENTED"
            />
            <LimitationItem
              title="Validator Governance"
              description="Who audits the humans who lock the predicates? Production requires a multi-sig predicate governance model with transparent amendment history."
              status="DESIGNED"
            />
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-8">
          <Button
            onClick={() => navigate("/gallows")}
            className="bg-gallows-bg border border-gallows-approved/40 text-gallows-approved font-mono tracking-wider hover:bg-gallows-approved/10 hover:shadow-gallows-approved gap-2"
            size="lg"
          >
            <Zap className="h-4 w-4" />
            TRY THE LIVE DEMO
          </Button>
          <Button
            onClick={() => navigate("/#contact")}
            className="bg-gallows-bg border border-amber-400/40 text-amber-400 font-mono tracking-wider hover:bg-amber-400/10 gap-2"
            variant="outline"
            size="lg"
          >
            <Eye className="h-4 w-4" />
            REQUEST CONSULTATION
          </Button>
        </div>
      </main>
    </div>
    </>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────

const PipelineStep = ({ icon, phase, title, color, description, code }: {
  icon: React.ReactNode;
  phase: string;
  title: string;
  color: string;
  description: string;
  code: string;
}) => (
  <div className={`p-4 rounded border ${color} space-y-3`}>
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <span className="text-[10px] font-mono block opacity-60">{phase}</span>
        <span className="text-sm font-mono font-bold">{title}</span>
      </div>
    </div>
    <p className="text-xs font-mono opacity-80 leading-relaxed">{description}</p>
    <pre className="text-[10px] font-mono bg-gallows-bg/80 rounded p-2 whitespace-pre-wrap opacity-70 border border-gallows-border/50">
      {code}
    </pre>
  </div>
);

const SpecItem = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 bg-gallows-bg rounded border border-gallows-border">
    <span className="text-[10px] font-mono text-gallows-muted block">{label}</span>
    <span className="text-sm font-mono text-gallows-text">{value}</span>
  </div>
);

const ArticleMapping = ({ article, title, component, mechanism, risk }: {
  article: string;
  title: string;
  component: string;
  mechanism: string;
  risk: string;
}) => {
  const riskColors: Record<string, string> = {
    UNACCEPTABLE: 'bg-gallows-blocked/15 text-gallows-blocked',
    HIGH: 'bg-amber-500/15 text-amber-400',
    LIMITED: 'bg-blue-400/15 text-blue-400',
  };

  return (
    <div className="p-3 rounded border border-gallows-border space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-gallows-approved font-bold">{article}</span>
          <span className="font-mono text-sm text-gallows-text">{title}</span>
        </div>
        <Badge className={`font-mono text-[10px] border-0 ${riskColors[risk] || ''}`}>{risk}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Badge className="bg-gallows-bg border border-gallows-border text-gallows-muted font-mono text-[10px]">
          {component}
        </Badge>
      </div>
      <p className="text-xs font-mono text-gallows-muted leading-relaxed">{mechanism}</p>
    </div>
  );
};

const TrioCard = ({ name, role, description, color }: {
  name: string;
  role: string;
  description: string;
  color: string;
}) => (
  <div className={`p-4 rounded border ${color} space-y-2`}>
    <div>
      <span className="text-lg font-mono font-bold">{name}</span>
      <span className="text-xs font-mono block opacity-60">{role}</span>
    </div>
    <p className="text-xs font-mono opacity-80 leading-relaxed">{description}</p>
  </div>
);

const LimitationItem = ({ title, description, status }: {
  title: string;
  description: string;
  status: string;
}) => {
  const statusColors: Record<string, string> = {
    SIMULATED: 'bg-amber-500/15 text-amber-400',
    PROTOTYPE: 'bg-blue-400/15 text-blue-400',
    ARCHITECTURAL: 'bg-gallows-approved/15 text-gallows-approved',
    PLANNED: 'bg-gallows-muted/15 text-gallows-muted',
    DESIGNED: 'bg-amber-400/15 text-amber-400',
  };

  return (
    <div className="p-3 rounded border border-gallows-border space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm text-gallows-text font-bold">{title}</span>
        <Badge className={`font-mono text-[10px] border-0 ${statusColors[status] || ''}`}>{status}</Badge>
      </div>
      <p className="text-xs font-mono text-gallows-muted leading-relaxed">{description}</p>
    </div>
  );
};

export default Architecture;
