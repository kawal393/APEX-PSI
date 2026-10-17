import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Terminal, Shield, Zap, Lock, Code2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import sdkPackage from "../../packages/psi-sdk/package.json";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";

const githubConformance = `# For a checkout of the APEX-PSI repository
name: PSI Conformance
on: [push, pull_request]
jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: npm ci
      - run: npm run test:conformance`;

const gitlabConformance = `# For a checkout of the APEX-PSI repository
psi_conformance:
  stage: test
  image: node:22-bookworm
  before_script:
    - apt-get update && apt-get install -y python3
    - npm ci
  script:
    - npm run test:conformance`;

const SDK = () => {
  const { t } = useTranslation();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <button
      onClick={() => copyToClipboard(text, section)}
      className="absolute top-3 right-3 p-1.5 rounded bg-engine-border/50 hover:bg-engine-border transition-colors"
    >
      {copiedSection === section ? (
        <Check className="h-4 w-4 text-engine-approved" />
      ) : (
        <Copy className="h-4 w-4 text-engine-muted" />
      )}
    </button>
  );

  const commitExample = `// 1. Commit an action for compliance verification
const response = await fetch(
  process.env.APEX_ENDPOINT + "/commit-action",
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
  process.env.APEX_ENDPOINT + "/challenge-action",
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
  process.env.APEX_ENDPOINT + "/prove-action",
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
  process.env.APEX_ENDPOINT + "/verify-hash",
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

  const sdkExample = `// not on npm - build from source:
// git clone https://github.com/kawal393/APEX-PSI
// npm install ./APEX-PSI/packages/psi-sdk
import { ApexEngine } from '@apex/psi-sdk';

// Initialize SDK
const engine = new ApexEngine({
  endpoint: process.env.APEX_ENDPOINT, // functions base URL, not the website URL
  apiKey: process.env.APEX_API_KEY,
  mode: 'blocking'          // 'blocking' halts the response, 'monitoring' logs only
});

// Runtime blocking middleware for Express/Node.js
app.use('/api/ai', engine.middleware({
  predicates: ['EU_ART_14', 'EU_ART_50'],
  mode: 'blocking',
  onViolation: (result, req, res) => {
    console.error(\`Blocked: \${result.violationFound} under \${result.predicateId}\`);
    res.status(403).json({ blocked: true, reason: result.violationFound });
  }
}));

// Inline usage in your code
async function generateAIResponse(prompt: string) {
  const result = await engine.verify(\`Generate response: \${prompt}\`, 'EU_ART_50');

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
        <title>SDKs & Integrations — Apex PSI — Universal Verification Protocol</title>
        <meta name="description" content="SDK source for OpenAI, Anthropic, Vercel AI and Hono, built from the repository — not published to npm. CI/CD guides and the psi-sdk runtime pattern cache." />
        <link rel="canonical" href="https://ai-governance-standard.com/sdk" />
        <meta property="og:title" content="SDKs & Integrations — APEX PSI" />
        <meta property="og:description" content="SDK source for OpenAI, Anthropic, Vercel AI and Hono, built from the repository — not published to npm. CI/CD guides and the psi-sdk runtime pattern cache." />
        <meta property="og:url" content="https://ai-governance-standard.com/sdk" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-engine-bg text-engine-text">
      {/* Header */}
      <header className="border-b border-engine-border bg-engine-surface/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-engine-muted hover:text-engine-text">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-engine-approved" />
              <span className="font-mono font-bold">APEX SDK</span>
              <Badge className="bg-engine-approved/20 text-engine-approved border-engine-approved/30 text-xs">
                Source v{sdkPackage.version}
              </Badge>
            </div>
          </div>
          <Link to="/engine">
            <Button size="sm" className="bg-engine-approved hover:bg-engine-approved/90 text-black font-mono">
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
            {t("sdk.heading", "Runtime Evidence SDK")}
          </h1>
          <p className="text-lg text-engine-muted max-w-2xl mx-auto mb-6">
            {t("sdk.description", "Record AI actions and screen configured text patterns before execution. A pattern match is a heuristic, not a legal compliance determination.")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Badge className="bg-engine-surface border-engine-border text-engine-text gap-1.5 px-3 py-1">
              <Zap className="h-3 w-3 text-amber-400" /> {t("sdk.localPatterns", "Local pattern screening")}
            </Badge>
            <Badge className="bg-engine-surface border-engine-border text-engine-text gap-1.5 px-3 py-1">
              <Lock className="h-3 w-3 text-engine-approved" /> {t("sdk.crypto", "SHA-256 + signatures")}
            </Badge>
            <Badge className="bg-engine-surface border-engine-border text-engine-text gap-1.5 px-3 py-1">
              <Shield className="h-3 w-3 text-blue-400" /> {t("sdk.rules", "Configured rule patterns")}
            </Badge>
          </div>
        </motion.div>

        {/* Quick Start */}
        <Card className="bg-engine-surface border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-engine-approved" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-engine-muted text-sm">
              The APEX Engine API exposes four core endpoints for the commit-challenge-prove pipeline.
              {t("sdk.access", "Access requirements vary by endpoint. Hosted receipt issuance is limited; independent receipt verification can run offline.")}
            </p>
            <div className="bg-engine-bg rounded border border-engine-border p-4 font-mono text-sm">
              <span className="text-engine-muted">Base URL:</span>{" "}
              <span className="text-engine-approved break-all">APEX_ENDPOINT</span>
            </div>
          </CardContent>
        </Card>

        {/* API Reference */}
        <Tabs defaultValue="notarize" className="mb-12">
          <TabsList className="bg-engine-surface border border-engine-border w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap">
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
            <Card className="bg-engine-surface border-engine-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">POST /notarize</CardTitle>
                  <Badge className="bg-engine-approved/20 text-engine-approved border-engine-approved/30">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-engine-muted text-sm mb-4">
                  Notarize any AI decision with a single API call. Returns a SHA-256 hashed, Ed25519 signed,
                  receipt with a Merkle root. Public hosted allowance: 20/minute and 100/day. Bitcoin anchoring status is reported separately.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{`const response = await fetch(
  process.env.APEX_ENDPOINT + "/notarize",
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
            <Card className="bg-engine-surface border-engine-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">POST /notarize-batch</CardTitle>
                  <Badge className="bg-engine-approved/20 text-engine-approved border-engine-approved/30">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-engine-muted text-sm mb-4">
                  Notarize up to 100 AI decisions in a single API call. All decisions share a single
                  cumulative Merkle root for batch integrity.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{`const response = await fetch(
  process.env.APEX_ENDPOINT + "/notarize-batch",
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
            <Card className="bg-engine-surface border-engine-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /commit-action
                  </CardTitle>
                  <Badge className="bg-engine-approved/20 text-engine-approved border-engine-approved/30">
                    Phase 1
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-engine-muted text-sm mb-4">
                  Submit an AI action for compliance verification. The server computes SHA-256 hashes
                  and adds the action to the Merkle tree.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{commitExample}</code>
                  </pre>
                  <CopyButton text={commitExample} section="commit" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenge" className="mt-4">
            <Card className="bg-engine-surface border-engine-border">
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
                <p className="text-engine-muted text-sm mb-4">
                  Challenge a committed action for regulatory review. Generates a challenge hash
                  binding the original commit to the review process.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{challengeExample}</code>
                  </pre>
                  <CopyButton text={challengeExample} section="challenge" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prove" className="mt-4">
            <Card className="bg-engine-surface border-engine-border">
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
                <p className="text-engine-muted text-sm mb-4">
                  Generate a Merkle inclusion proof for a committed action. The endpoint takes a
                  commit id and returns the proof path and the recorded verdict; there is no
                  zero-knowledge option, because nothing here is a zero-knowledge proof.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{proveExample}</code>
                  </pre>
                  <CopyButton text={proveExample} section="prove" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verify" className="mt-4">
            <Card className="bg-engine-surface border-engine-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    POST /verify-hash
                  </CardTitle>
                  <Badge className="bg-engine-approved/20 text-engine-approved border-engine-approved/30">
                    Phase 4
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-engine-muted text-sm mb-4">
                  Verify that a hash exists in the public audit ledger. Useful for third-party
                  verification without access to the original action content.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{verifyExample}</code>
                  </pre>
                  <CopyButton text={verifyExample} section="verify" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sdk" className="mt-4">
            <Card className="bg-engine-surface border-engine-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-base">
                    Runtime SDK (source, not published)
                  </CardTitle>
                  <Badge className="bg-engine-muted/20 text-engine-muted border-engine-muted/30">
                    Build from source
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-engine-muted text-sm mb-4">
                  The code above is the current source API of packages/psi-sdk: local pattern checks,
                  blocking middleware and hash commits. It is built from the repository, not installed
                  from npm, and there is no zero-knowledge layer in it — verification is SHA-256 hashing,
                  Merkle inclusion and Ed25519 signing, all of which you can run yourself at /conformance.
                </p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{sdkExample}</code>
                  </pre>
                  <CopyButton text={sdkExample} section="sdk" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Predicate Registry */}
        <Card className="bg-engine-surface border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-engine-approved" />
              Predicate Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-engine-muted text-sm mb-6">
              {t("sdk.patternCaveat", "These rule identifiers map to text-pattern screening. A match can trigger a block; no match does not establish compliance with the referenced framework.")}
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {predicates.map((p) => (
                <div key={p.category} className="bg-engine-bg border border-engine-border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-engine-approved">{p.category}</span>
                    <Badge className="bg-engine-surface text-engine-muted border-engine-border text-xs">
                      {p.count} predicates
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {p.examples.map((ex) => (
                      <code key={ex} className="block text-xs text-engine-muted font-mono">
                        {ex}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* What stays private */}
        <Card className="bg-gradient-to-br from-engine-surface to-engine-bg border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-engine-approved" />
              What Stays Private - and Why
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-engine-muted text-sm mb-4">
              A receipt publishes a digest, not a document: the ledger entry carries the SHA-256 of
              the record, the predicate, the verdict and the Merkle proof. Sealing in your browser
              sends the digest only, and the content never leaves the device. Sending an action to
              the sealing endpoint for a verdict does store the text server-side, so the check can be
              reproduced - it is stored, not published. None of this is zero-knowledge: a SHA-256 of
              short, guessable text can be brute-forced, so never treat a hash as encryption.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-engine-bg/50 border border-engine-border rounded p-3">
                <span className="text-engine-approved font-mono text-xs">Published in the receipt:</span>
                <ul className="mt-2 space-y-1 text-engine-muted text-xs">
                  <li>• SHA-256 digest of the committed record</li>
                  <li>• Predicate id, phase and verdict</li>
                  <li>• Merkle inclusion path and anchor</li>
                </ul>
              </div>
              <div className="bg-engine-bg/50 border border-engine-border rounded p-3">
                <span className="text-engine-blocked font-mono text-xs">Not in the receipt:</span>
                <ul className="mt-2 space-y-1 text-engine-muted text-xs">
                  <li>• Model weights or parameters</li>
                  <li>• Business logic details</li>
                  <li>• Action text, unless you post it for a verdict</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CI/CD Integration Guide */}
        <Card className="bg-engine-surface border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Terminal className="h-5 w-5 text-engine-approved" />
              CI/CD Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-engine-muted text-sm">
              {t("sdk.ciDescription", "Run the repository’s conformance tests in CI. Passing tests check implementation behavior; they do not issue a deployment receipt.")}
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-engine-approved mb-2">GitHub Actions</p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{githubConformance}</code>
                  </pre>
                  <CopyButton text={githubConformance} section="github-actions" />
                </div>
              </div>

              <div>
                <p className="text-xs font-mono text-engine-approved mb-2">GitLab CI</p>
                <div className="relative">
                  <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                    <code className="text-engine-text">{gitlabConformance}</code>
                  </pre>
                  <CopyButton text={gitlabConformance} section="gitlab-ci" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance DNS */}
        <Card className="bg-gradient-to-br from-engine-surface to-engine-bg border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-engine-approved" />
              Compliance DNS — Public Verification API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-engine-muted text-sm">
              Query any entity's compliance status. No authentication required. The WHOIS of AI Compliance.
            </p>
            <div className="relative">
              <pre className="bg-engine-bg border border-engine-border rounded p-4 overflow-x-auto text-xs">
                <code className="text-engine-text">{`# Lookup a specific entity
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
        <Card className="bg-gradient-to-br from-engine-surface to-engine-bg border-engine-border mb-8">
          <CardHeader>
            <CardTitle className="font-mono text-lg flex items-center gap-2">
              <Code2 className="h-5 w-5 text-engine-approved" />
              Runtime Adapters — Compliance-Receipt Header
            </CardTitle>
            <p className="text-engine-muted text-xs mt-2">
              Wrap your AI runtime in one line. Every response carries a signed{" "}
              <code className="text-engine-approved">Compliance-Receipt</code> header
              (<Link to="/standard" className="text-engine-approved underline">draft-singh-psi-http — Internet-Draft, not an approved standard</Link>).
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "apex-psi-verifier", target: "MIT verifier — free forever. No permission required.", status: "published at 1.2.0; 1.3.0 pending", install: "npm i apex-psi-verifier@1.3.0 — or build from packages/psi-verifier. 1.2.0 does not check signatures; do not rely on it." },
                { name: "psi-verifier", target: "Python verifier, MIT — same rules, same verdicts, byte-identical", status: "not published (PyPI 404)", install: "source in packages/psi-verifier-py — build from the repository" },
                { name: "@apex/psi-openai", target: "OpenAI Node SDK", status: "not published", install: "source in packages/ — build from the repository" },
                { name: "@apex/psi-anthropic", target: "Anthropic SDK", status: "not published", install: "source in packages/ — build from the repository" },
                { name: "@apex/psi-vercel-ai", target: "Vercel AI SDK", status: "not published", install: "source in packages/ — build from the repository" },
                { name: "@apex/psi-hono", target: "Hono middleware", status: "not published", install: "source in packages/ — build from the repository" },
                { name: "@apex/psi-google", target: "Gemini / Vertex", status: "roadmap", install: "Not implemented" },
                { name: "@apex/psi-bedrock", target: "AWS Bedrock", status: "roadmap", install: "Not implemented" },
              ].map((pkg) => (
                <div key={pkg.name} className="border border-engine-border bg-engine-bg rounded p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <code className="text-xs text-engine-approved font-bold">{pkg.name}</code>
                    <Badge className={pkg.status === "roadmap"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"
                      : "bg-muted/30 text-muted-foreground border-border text-[10px]"}>
                      {pkg.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-engine-muted mb-2">{pkg.target}</div>
                  <code className="text-[11px] font-mono text-engine-text">{pkg.install}</code>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/header">
                <Button variant="outline" size="sm" className="border-engine-border text-engine-text gap-2">
                  <Zap className="h-4 w-4" />
                  Try the live header inspector
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>


        <div className="text-center py-8">
          <p className="text-engine-muted mb-4">
            {t("sdk.capacity", "Independent verification is free. Hosted issuance has limits and separate commercial terms.")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/engine">
              <Button className="bg-engine-approved hover:bg-engine-approved/90 text-black font-mono gap-2">
                <Terminal className="h-4 w-4" />
                Try Live Demo
              </Button>
            </Link>
            <Link to="/spec">
              <Button variant="outline" className="border-engine-border text-engine-text gap-2">
                <ExternalLink className="h-4 w-4" />
                Read the specification
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  </>
  );
};

export default SDK;
