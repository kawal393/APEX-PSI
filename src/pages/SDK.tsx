import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Terminal, Shield, Zap, Lock, Code2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";

const SDK = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <button
      onClick={() => copyToClipboard(text, section)}
      className="absolute top-3 right-3 p-1.5 rounded bg-gallows-border/50 hover:bg-gallows-border transition-colors"
    >
      {copiedSection === section ? (
        <Check className="h-4 w-4 text-gallows-approved" />
      ) : (
        <Copy className="h-4 w-4 text-gallows-muted" />
      )}
    </button>
  );

  const commitExample = `// 1. Commit an action for compliance verification
const response = await fetch(
  'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/commit-action',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'Generate personalized product recommendations using user browsing history',
      predicate_id: 'EU_ART_14',
      client_commit_hash: 'optional-precomputed-hash',
      client_leaf_hash: 'optional-precomputed-leaf'
    })
  }
);

const result = await response.json();
// {
//   success: true,
//   commit_id: "APEX-A1B2C3D4-E5F6",
//   commit_hash: "sha256:abc123...",
//   merkle_leaf_hash: "sha256:def456...",
//   timestamp: "2026-03-08T12:00:00.000Z",
//   hash_verified_server_side: true
// }`;

  const challengeExample = `// 2. Challenge a committed action (regulatory verification)
const response = await fetch(
  'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/challenge-action',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commit_id: 'APEX-A1B2C3D4-E5F6'
    })
  }
);

const result = await response.json();
// {
//   success: true,
//   commit_id: "APEX-A1B2C3D4-E5F6",
//   phase: "CHALLENGED",
//   challenge_hash: "sha256:789abc...",
//   challenged_at: "2026-03-08T12:00:01.000Z"
// }`;

  const proveExample = `// 3. Prove compliance with Merkle inclusion proof
const response = await fetch(
  'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/prove-action',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commit_id: 'APEX-A1B2C3D4-E5F6',
      zk_mode: true  // Optional: Enable zero-knowledge proof mode
    })
  }
);

const result = await response.json();
// {
//   success: true,
//   commit_id: "APEX-A1B2C3D4-E5F6",
//   phase: "VERIFIED",
//   status: "APPROVED",  // or "BLOCKED" if violation detected
//   proof_hash: "sha256:final123...",
//   merkle_root: "sha256:root456...",
//   merkle_proof: [
//     { hash: "sha256:sibling1...", position: "left" },
//     { hash: "sha256:sibling2...", position: "right" }
//   ],
//   verification_time_ms: 12.34,
//   external_anchoring: {
//     success: true,
//     ots_url: "https://opentimestamps.org/info/?digest=..."
//   }
// }`;

  const verifyExample = `// 4. Verify a hash exists in the public ledger
const response = await fetch(
  'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/verify-hash',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hash: 'sha256:abc123...'
    })
  }
);

const result = await response.json();
// {
//   found: true,
//   hash_type: "commit_hash",
//   entry: {
//     commit_id: "APEX-A1B2C3D4-E5F6",
//     action: "Generate personalized...",
//     predicate_id: "EU_ART_14",
//     phase: "VERIFIED",
//     status: "APPROVED",
//     created_at: "2026-03-08T12:00:00.000Z"
//   }
// }`;

  const sdkExample = `import { ApexGallows } from '@apex/gallows-sdk';

// Initialize SDK
const gallows = new ApexGallows({
  projectId: 'qhtntebpcribjiwrdtdd',
  apiKey: process.env.APEX_API_KEY
});

// Runtime blocking middleware for Express/Node.js
app.use(gallows.middleware({
  predicates: ['EU_ART_14', 'EU_ART_50', 'MIFID_ART_17'],
  mode: 'blocking',       // 'blocking' | 'audit-only'
  zkMode: true,           // Privacy-preserving verification
  onViolation: (action, predicate, violation) => {
    console.error(\`Blocked: \${violation} under \${predicate}\`);
    return { blocked: true, reason: violation };
  }
}));

// Inline usage in your code
async function generateAIResponse(prompt: string) {
  const result = await gallows.verify({
    action: \`Generate response: \${prompt}\`,
    predicates: ['EU_ART_50', 'EU_ART_52'],
    blocking: true
  });

  if (result.status === 'BLOCKED') {
    throw new Error(\`Compliance violation: \${result.violationFound}\`);
  }

  // Proceed with AI generation
  return await openai.chat.completions.create({ ... });
}`;

  const predicates = [
    { category: 'EU AI Act', count: 10, examples: ['EU_ART_5', 'EU_ART_14', 'EU_ART_50'] },
    { category: 'MiFID II', count: 4, examples: ['MIFID_ART_16', 'MIFID_ART_17', 'MIFID_ART_27'] },
    { category: 'DORA', count: 6, examples: ['DORA_ART_5', 'DORA_ART_11', 'DORA_ART_26'] },
    { category: 'NIST AI RMF', count: 4, examples: ['NIST_MAP_1', 'NIST_MEASURE_2', 'NIST_GOVERN_1'] },
    { category: 'UK AI Safety', count: 3, examples: ['UK_AISI_1', 'UK_AISI_2', 'UK_AISI_3'] },
    { category: 'Canada AIDA', count: 4, examples: ['CA_AIDA_5', 'CA_AIDA_7', 'CA_AIDA_11'] },
  ];

  return (
    <>
      <Helmet>
        <title>SDKs & Integrations — APEX PSI</title>
        <meta name="description" content="Drop-in SDKs for OpenAI, Anthropic, Vercel AI, Hono. CI/CD guides and the @apex/gallows-sdk runtime pattern cache." />
        <link rel="canonical" href="https://ai-governance-standard.com/sdk" />
        <meta property="og:title" content="SDKs & Integrations — APEX PSI" />
        <meta property="og:description" content="Drop-in SDKs for OpenAI, Anthropic, Vercel AI, Hono. CI/CD guides and the @apex/gallows-sdk runtime pattern cache." />
        <meta property="og:url" content="https://ai-governance-standard.com/sdk" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-gallows-bg text-gallows-text">
      {/* Header */}
      <header className="border-b border-gallows-border bg-gallows-surface/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-gallows-muted hover:text-gallows-text">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gallows-approved" />
              <span className="font-mono font-bold">APEX SDK</span>
              <Badge className="bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30 text-xs">
                v2.1
              </Badge>
            </div>
          </div>
          <Link to="/gallows">
            <Button size="sm" className="bg-gallows-approved hover:bg-gallows-approved/90 text-black font-mono">
              Try Live Demo →
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
            Runtime Compliance SDK
          </h1>
          <p className="text-lg text-gallows-muted max-w-2xl mx-auto mb-6">
            Integrate cryptographic compliance verification directly into your AI systems.
            Block violations in milliseconds, before they reach production.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge className="bg-gallows-surface border-gallows-border text-gallows-text gap-1.5 px-3 py-1">
              <Zap className="h-3 w-3 text-amber-400" /> &lt;15ms verification
            </Badge>
            <Badge className="bg-gallows-surface border-gallows-border text-gallows-text gap-1.5 px-3 py-1">
              <Lock className="h-3 w-3 text-gallows-approved" /> ZK proof mode
            </Badge>
            <Badge className="bg-gallows-surface border-gallows-border text-gallows-text gap-1.5 px-3 py-1">
              <Shield className="h-3 w-3 text-blue-400" /> 35 predicates · 7 jurisdictions
            </Badge>
          </div>
        </motion.div>

        {/* Quick Start */}
        <Card className="bg-gallows-surface border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-gallows-approved" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gallows-muted text-sm">
              The APEX Gallows API exposes four core endpoints for the commit-challenge-prove pipeline.
              All endpoints are public and require no authentication for basic usage.
            </p>
            <div className="bg-gallows-bg rounded border border-gallows-border p-4 font-mono text-sm">
              <span className="text-gallows-muted">Base URL:</span>{" "}
              <span className="text-gallows-approved">https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1</span>
            </div>
          </CardContent>
        </Card>

        {/* API Reference */}
        <Tabs defaultValue="notarize" className="mb-12">
          <TabsList className="bg-gallows-surface border border-gallows-border w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap">
            <TabsTrigger value="notarize" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Notarize</TabsTrigger>
            <TabsTrigger value="notarize-batch" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Batch</TabsTrigger>
            <TabsTrigger value="commit" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Commit</TabsTrigger>
            <TabsTrigger value="challenge" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Challenge</TabsTrigger>
            <TabsTrigger value="prove" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Prove</TabsTrigger>
            <TabsTrigger value="verify" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">Verify</TabsTrigger>
            <TabsTrigger value="sdk" className="font-mono text-[10px] sm:text-xs whitespace-nowrap">SDK</TabsTrigger>
          </TabsList>

          {/* Notarize tab */}
          <TabsContent value="notarize" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">POST /notarize</CardTitle>
                  <Badge className="bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Notarize any AI decision with a single API call. Returns a SHA-256 hashed, Ed25519 signed,
                  Merkle-anchored receipt. No authentication required for the free tier (100/day).
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{`const response = await fetch(
  "https://\${PROJECT_ID}.supabase.co/functions/v1/notarize",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decision: "Model approved loan application #4521",
      model_id: "gpt-4-turbo",
      context: { applicant_risk: "low", amount: 50000 },
      predicate: "EU_ART_12"
    })
  }
);

const receipt = await response.json();
// {
//   receipt_id: "APEX-NTR-A1B2C3D4E5F6G7H8",
//   decision_hash: "sha256:...",
//   merkle_leaf: "sha256:...",
//   merkle_root: "sha256:...",   // cumulative binary Merkle root
//   ed25519_signature: "...",     // RFC 8032 signature
//   verify_url: "https://...",
//   pdf_url: "https://...",       // downloadable PDF receipt
//   predicate_applied: "EU_ART_12",
//   receipt_version: "PSI-1.2"
// }`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Notarize tab */}
          <TabsContent value="notarize-batch" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">POST /notarize-batch</CardTitle>
                  <Badge className="bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Notarize up to 100 AI decisions in a single API call. All decisions share a single
                  cumulative Merkle root for batch integrity.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{`const response = await fetch(
  "https://\${PROJECT_ID}.supabase.co/functions/v1/notarize-batch",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      decisions: [
        { decision: "Approved loan #4521", model_id: "gpt-4", predicate: "EU_ART_12" },
        { decision: "Rejected claim #8832", model_id: "gpt-4", predicate: "EU_ART_14" },
        { decision: "Flagged transaction #1290", predicate: "MIFID_ART_17" }
      ]
    })
  }
);

const batch = await response.json();
// {
//   batch_size: 3,
//   batch_merkle_root: "sha256:...",
//   receipts: [ ... ],
//   engine: "APEX NOTARY Batch v1.0"
// }`}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commit" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /commit-action
                  </CardTitle>
                  <Badge className="bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30">
                    Phase 1
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Submit an AI action for compliance verification. The server computes SHA-256 hashes
                  and adds the action to the Merkle tree.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{commitExample}</code>
                  </pre>
                  <CopyButton text={commitExample} section="commit" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenge" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /challenge-action
                  </CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    Phase 2
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Challenge a committed action for regulatory review. Generates a challenge hash
                  binding the original commit to the review process.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{challengeExample}</code>
                  </pre>
                  <CopyButton text={challengeExample} section="challenge" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prove" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /prove-action
                  </CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Phase 3
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Generate a Merkle inclusion proof and run compliance verification. Optionally enable
                  <span className="text-gallows-approved"> zk_mode</span> for privacy-preserving verification.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{proveExample}</code>
                  </pre>
                  <CopyButton text={proveExample} section="prove" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verify" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /verify-hash
                  </CardTitle>
                  <Badge className="bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30">
                    Phase 4
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  Verify that a hash exists in the public audit ledger. Useful for third-party
                  verification without access to the original action content.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{verifyExample}</code>
                  </pre>
                  <CopyButton text={verifyExample} section="verify" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sdk" className="mt-4">
            <Card className="bg-gallows-surface border-gallows-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    Runtime SDK (Coming Soon)
                  </CardTitle>
                  <Badge className="bg-gallows-muted/20 text-gallows-muted border-gallows-muted/30">
                    Roadmap
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gallows-muted text-sm mb-4">
                  The SDK will provide middleware integration, automatic blocking, and privacy-preserving
                  verification with ZK proofs. Contact us for early access.
                </p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{sdkExample}</code>
                  </pre>
                  <CopyButton text={sdkExample} section="sdk" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Predicate Registry */}
        <Card className="bg-gallows-surface border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gallows-approved" />
              Predicate Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gallows-muted text-sm mb-6">
              APEX supports compliance verification across multiple regulatory frameworks.
              Each predicate contains violation patterns that trigger automatic blocking.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {predicates.map((p) => (
                <div key={p.category} className="bg-gallows-bg border border-gallows-border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-gallows-approved">{p.category}</span>
                    <Badge className="bg-gallows-surface text-gallows-muted border-gallows-border text-xs">
                      {p.count} predicates
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {p.examples.map((ex) => (
                      <code key={ex} className="block text-xs text-gallows-muted font-mono">
                        {ex}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ZK Mode */}
        <Card className="bg-gradient-to-br from-gallows-surface to-gallows-bg border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-gallows-approved" />
              Zero-Knowledge Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gallows-muted text-sm mb-4">
              Enable <code className="text-gallows-approved">zk_mode: true</code> in prove requests
              to verify compliance without revealing the original action content. The proof demonstrates
              that your action passes predicate checks without exposing proprietary information.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-gallows-bg/50 border border-gallows-border rounded p-3">
                <span className="text-gallows-approved font-mono text-xs">What's proven:</span>
                <ul className="mt-2 space-y-1 text-gallows-muted text-xs">
                  <li>• Action satisfies predicate requirements</li>
                  <li>• Hash is included in Merkle tree</li>
                  <li>• Verification completed within SLA</li>
                </ul>
              </div>
              <div className="bg-gallows-bg/50 border border-gallows-border rounded p-3">
                <span className="text-gallows-blocked font-mono text-xs">What's hidden:</span>
                <ul className="mt-2 space-y-1 text-gallows-muted text-xs">
                  <li>• Original action content</li>
                  <li>• Model weights or parameters</li>
                  <li>• Business logic details</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CI/CD Integration Guide */}
        <Card className="bg-gallows-surface border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gallows-approved" />
              CI/CD Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gallows-muted text-sm">
              Embed compliance verification into your build pipeline. Every deployment gets a cryptographic proof.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-gallows-approved mb-2">GitHub Actions</p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{`# .github/workflows/compliance.yml
name: APEX Compliance Gate
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install @apex/gallows-sdk
      - name: Run compliance check
        env:
          APEX_ENDPOINT: \${{ secrets.APEX_ENDPOINT }}
        run: |
          npx apex-verify \\
            --predicates EU_ART_14,EU_ART_50,NIST_GOVERN_1 \\
            --mode blocking \\
            --fail-on-violation`}</code>
                  </pre>
                  <CopyButton text={`# .github/workflows/compliance.yml\nname: APEX Compliance Gate\non: [push, pull_request]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: '20' }\n      - run: npm install @apex/gallows-sdk\n      - name: Run compliance check\n        env:\n          APEX_ENDPOINT: \${{ secrets.APEX_ENDPOINT }}\n        run: npx apex-verify --predicates EU_ART_14,EU_ART_50,NIST_GOVERN_1 --mode blocking --fail-on-violation`} section="github-actions" />
                </div>
              </div>

              <div>
                <p className="text-xs font-mono text-gallows-approved mb-2">GitLab CI</p>
                <div className="relative">
                  <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-gallows-text">{`# .gitlab-ci.yml
compliance_gate:
  stage: test
  image: node:20
  script:
    - npm install @apex/gallows-sdk
    - npx apex-verify
        --predicates EU_ART_14,MIFID_ART_17,UK_AISI_1
        --mode blocking
        --output proof-bundle.json
  artifacts:
    paths: [proof-bundle.json]`}</code>
                  </pre>
                  <CopyButton text={`# .gitlab-ci.yml\ncompliance_gate:\n  stage: test\n  image: node:20\n  script:\n    - npm install @apex/gallows-sdk\n    - npx apex-verify --predicates EU_ART_14,MIFID_ART_17,UK_AISI_1 --mode blocking --output proof-bundle.json\n  artifacts:\n    paths: [proof-bundle.json]`} section="gitlab-ci" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance DNS */}
        <Card className="bg-gradient-to-br from-gallows-surface to-gallows-bg border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-gallows-approved" />
              Compliance DNS — Public Verification API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gallows-muted text-sm">
              Query any entity's compliance status. No authentication required. The WHOIS of AI Compliance.
            </p>
            <div className="relative">
              <pre className="bg-gallows-bg border border-gallows-border rounded p-4 overflow-x-auto text-xs">
                <code className="text-gallows-text">{`# Lookup a specific entity
GET /verify-status?entity=<compliance_result_id>

# Browse the public registry
GET /verify-status?action=registry&limit=50&offset=0

# Get aggregate statistics
GET /verify-status?action=stats

# Example response (entity lookup):
{
  "verified": true,
  "entity": {
    "name": "Acme AI Corp",
    "status": "compliant",
    "score": 92,
    "mode": "SHIELD",
    "last_verified": "2026-03-15T..."
  },
  "articles": [...],
  "cryptographic_assurance": {
    "hash_algorithm": "SHA-256",
    "signature_scheme": "Ed25519",
    "proof_structure": "Merkle Inclusion Proof"
  }
}`}</code>
              </pre>
              <CopyButton text="GET /verify-status?entity=<compliance_result_id>" section="compliance-dns" />
            </div>
          </CardContent>
        </Card>

        {/* Runtime Middleware Cards — Compliance-Receipt header adapters */}
        <Card className="bg-gradient-to-br from-gallows-surface to-gallows-bg border-gallows-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-gallows-approved" />
              Runtime Adapters — Compliance-Receipt Header
            </CardTitle>
            <p className="text-gallows-muted text-xs mt-2">
              Wrap your AI runtime in one line. Every response carries a signed{" "}
              <code className="text-gallows-approved">Compliance-Receipt</code> header
              (<Link to="/standard" className="text-gallows-approved underline">draft-singh-psi-http-01</Link>).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "@apex/psi-openai", target: "OpenAI Node SDK", status: "shipped", install: "npm i @apex/psi-openai" },
                { name: "@apex/psi-anthropic", target: "Anthropic SDK", status: "shipped", install: "npm i @apex/psi-anthropic" },
                { name: "@apex/psi-vercel-ai", target: "Vercel AI SDK", status: "shipped", install: "npm i @apex/psi-vercel-ai" },
                { name: "@apex/psi-hono", target: "Hono middleware", status: "shipped", install: "npm i @apex/psi-hono" },
                { name: "@apex/psi-google", target: "Gemini / Vertex", status: "roadmap", install: "Q1 2026" },
                { name: "@apex/psi-bedrock", target: "AWS Bedrock", status: "roadmap", install: "Q1 2026" },
              ].map((pkg) => (
                <div key={pkg.name} className="border border-gallows-border bg-gallows-bg rounded p-4">
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs text-gallows-approved font-bold">{pkg.name}</code>
                    <Badge className={pkg.status === "shipped"
                      ? "bg-gallows-approved/20 text-gallows-approved border-gallows-approved/30 text-[10px]"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"}>
                      {pkg.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-gallows-muted mb-2">{pkg.target}</div>
                  <code className="text-[11px] font-mono text-gallows-text">{pkg.install}</code>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/header">
                <Button variant="outline" size="sm" className="border-gallows-border text-gallows-text gap-2">
                  <Zap className="h-4 w-4" />
                  Try the live header inspector
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>


        <div className="text-center py-8">
          <p className="text-gallows-muted mb-4">
            Ready to integrate compliance verification into your AI systems?
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/gallows">
              <Button className="bg-gallows-approved hover:bg-gallows-approved/90 text-black font-mono gap-2">
                <Terminal className="h-4 w-4" />
                Try Live Demo
              </Button>
            </Link>
            <a href="/#contact">
              <Button variant="outline" className="border-gallows-border text-gallows-text gap-2">
                <ExternalLink className="h-4 w-4" />
                Contact Sales
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  </>
  );
};

export default SDK;
