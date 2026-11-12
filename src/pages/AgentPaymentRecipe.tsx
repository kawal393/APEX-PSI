import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

const API = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

const STEPS = [
  { n: "01", t: "Mandate", who: "The human or organisation", s: "Signs what the agent may do: scope, max spend, currencies, time window." },
  { n: "02", t: "Proposal", who: "The agent", s: "Signs what it intends to buy, referencing the mandate and a digest of the arguments." },
  { n: "03", t: "Decision", who: "Your policy engine or approver", s: "Signs allow, deny or require_human for that proposal under a named policy." },
  { n: "04", t: "Settlement", who: "Whoever observed the payment", s: "Signs the rail's own reference — an x402 settlement, a card payment, a bank transfer." },
  { n: "05", t: "Envelope", who: "The issuer", s: "Binds the four statements and the action chain into one object, then seals its identifier as an APEX PSI receipt." },
];

const CODE_SEAL = `// RFC 8785 canonical form + Ed25519, per draft-singh-psi-agent-02 §4.1
import canonicalize from "canonicalize";          // RFC 8785 (JCS)
import { ed25519 } from "@noble/curves/ed25519";

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");

// Signed bytes = canonical form without sig and without the statement's own id field.
// The id is the digest reference of those bytes.
async function sealStatement(body: Record<string, unknown>, idField: string, key: Uint8Array, kid: string) {
  const unsigned = { ...body, alg: "ed25519", kid };
  const bytes = new TextEncoder().encode(canonicalize(unsigned)!);
  const id = "sha256:" + hex(await crypto.subtle.digest("SHA-256", bytes));
  return { ...unsigned, [idField]: id, sig: b64url(ed25519.sign(bytes, key)) };
}`;

const CODE_FLOW = `const run = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");

const mandate = await sealStatement({
  ver: "1", run, principal: "acme-finance", purpose: "buy one dataset licence",
  scope: ["data.example.com"], limits: { max_actions: "1", max_spend: "5.00", currencies: ["USDC"] },
  not_before: "2026-11-12T00:00:00Z", not_after: "2026-11-13T00:00:00Z",
}, "mid", ownerKey, "acme-owner-1");

const proposal = await sealStatement({
  ver: "1", run, mid: mandate.mid, proposer: "procurement-agent/2",
  intent: "purchase dataset licence", args_digest: argsDigest,
}, "pid", agentKey, "agent-1");

const decision = await sealStatement({
  ver: "1", run, pid: proposal.pid, verdict: "allow",
  policy_digest: policyDigest, decided_by: "policy-engine/1", reason: "within mandate limits",
}, "did", policyKey, "policy-1");

// After the rail settles. With x402 the facts come from the PAYMENT-RESPONSE header.
const settlement = await sealStatement({
  ver: "1", run, did: decision.did, payer: payerAddress, payee: payeeAddress,
  amount: "5.00", asset: "USDC", status: "settled",
  ref: paymentResponse.transaction, scheme: "x402-exact", observed_at: new Date().toISOString(),
}, "sid", observerKey, "observer-1");

const envelope = await sealStatement({
  ver: "1", run, mandate: mandate.mid, proposal: proposal.pid, decision: decision.did,
  action_root: actionChainHead /* or "absent" */, settlement: settlement.sid,
  issued: new Date().toISOString(),
}, "eid", issuerKey, "issuer-1");`;

const CODE_NOTARIZE = `// Seal the envelope identifier with the hosted notary (free allowance: 20/min, 100/day).
const res = await fetch("${API}/notarize", {
  method: "POST",
  headers: { "Content-Type": "application/json" /* , "x-apex-api-key": process.env.APEX_API_KEY */ },
  body: JSON.stringify({ decision: envelope.eid, context: "psi-agent-02 envelope", model_id: "procurement-agent/2" }),
});
const receipt = await res.json();
console.log(receipt.receipt_page_url);   // a page anyone can open to re-check it
console.log(receipt.verify_command);     // the same check as one curl command`;

const Code = ({ children }: { children: string }) => (
  <pre className="bg-card border border-border p-4 text-xs overflow-x-auto font-mono leading-relaxed text-foreground">{children}</pre>
);

const AgentPaymentRecipe = () => (
  <>
    <Helmet>
      <title>Agent Payment + Evidence Recipe — Apex PSI</title>
      <meta name="description" content="How an AI agent's mandate, proposal, decision and payment settlement are bound into one signed envelope and sealed as a re-verifiable APEX PSI receipt." />
      <link rel="canonical" href={`${SITE_URL}/recipe/agent-payment`} />
      <meta property="og:title" content="Agent Payment + Evidence Recipe — Apex PSI" />
      <meta property="og:description" content="Mandate, proposal, decision and settlement bound into one envelope and sealed as a receipt anyone can re-check." />
    </Helmet>
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-7xl">
          <p className="text-xs tracking-widest text-primary mb-2">DEVELOPER RECIPE · DRAFT-SINGH-PSI-AGENT-02</p>
          <h1 className="text-3xl sm:text-6xl font-black uppercase mb-4 text-chrome-gradient">Agent pays. Evidence stays.</h1>
          <p className="text-muted-foreground max-w-3xl mb-10">
            Payment rails record that money moved. This recipe records why it was allowed to move: who authorised the agent,
            what it proposed, which policy approved it, and which settlement followed — bound into one signed envelope that a
            stranger can re-check later.
          </p>

          <section className="mb-12 border border-border p-5">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-2">Status — checked 12 Nov 2026</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li><span className="text-foreground">Envelope format:</span> draft-singh-psi-agent-02 is a prepared working draft, not yet filed with the IETF and not a standard. <Link to="/drafts" className="underline text-primary">Read it</Link>.</li>
              <li><span className="text-foreground">Sealing the envelope:</span> live today on the hosted notary and through the MCP server.</li>
              <li><span className="text-foreground">Paying APEX by machine (x402):</span> implemented but dormant on this deployment. A payment sent now is refused with <code className="font-mono">apex_x402_door_not_configured</code> and nothing is charged.</li>
              <li><span className="text-foreground">Your own rail:</span> the settlement statement works with any rail — x402, card, bank — because it records the rail's own reference.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-4">The five objects</h2>
            <div className="border border-border divide-y divide-border">
              {STEPS.map((x) => (
                <div key={x.n} className="p-4 grid md:grid-cols-[60px_160px_220px_1fr] gap-2">
                  <span className="font-mono text-primary">{x.n}</span>
                  <span className="font-bold uppercase text-sm">{x.t}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{x.who}</span>
                  <span className="text-sm text-muted-foreground">{x.s}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Separate keys for each party are the point: an agent holding only its own key cannot forge its mandate or its approval.</p>
          </section>

          <section className="mb-12 space-y-4">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground">1 · Seal a statement</h2>
            <Code>{CODE_SEAL}</Code>
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground pt-4">2 · Build the run</h2>
            <Code>{CODE_FLOW}</Code>
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground pt-4">3 · Make it re-verifiable</h2>
            <Code>{CODE_NOTARIZE}</Code>
            <p className="text-xs text-muted-foreground">
              Keys, the args digest, policy digest and action chain head come from your system. Only the envelope identifier — a
              fingerprint — is sent to the notary; the statements stay with you and whoever you share them with.
            </p>
          </section>

          <section className="mb-12 grid md:grid-cols-2 gap-6">
            <div className="border border-border p-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-primary mb-3">What this proves</h2>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>Each statement was signed by the key it names and has not changed.</li>
                <li>The four statements and the action chain belong to one run.</li>
                <li>The envelope existed at the notary's sealing time.</li>
              </ul>
            </div>
            <div className="border border-border p-6">
              <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground mb-3">What it does not prove</h2>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>That the payment rail actually settled — only that someone signed that they observed it.</li>
                <li>That the purchase was wise, lawful or the policy correct.</li>
                <li>Who a key belongs to, unless you publish or pin it.</li>
              </ul>
            </div>
          </section>

          <section className="flex flex-wrap gap-4 text-xs uppercase tracking-widest">
            <Link to="/seal" className="underline hover:text-primary">Make a free receipt</Link>
            <Link to="/mcp" className="underline hover:text-primary">Use it from an AI assistant (MCP)</Link>
            <Link to="/mandate" className="underline hover:text-primary">Authorise an agent</Link>
            <Link to="/pilot" className="underline hover:text-primary">Run a 14-day pilot</Link>
            <a href="/ietf/draft-singh-psi-agent-02.txt" className="underline hover:text-primary" target="_blank" rel="noopener noreferrer">Draft text</a>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  </>
);

export default AgentPaymentRecipe;
