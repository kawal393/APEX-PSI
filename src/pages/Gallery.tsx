import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, ExternalLink, Copy, Check, Search, Download } from "lucide-react";
import { SEALED_DOCS, GALLERY_SEAL_EPOCH, type SealedDoc } from "@/data/sealedGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type SealedEntry = SealedDoc & {
  manifest: string;
  hash: string;
  merkleIndex: number;
};

const CATEGORIES = [
  "All",
  "Constitutional",
  "Human Rights",
  "Scientific",
  "Technical",
  "AI Governance",
  "Cultural",
] as const;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return "";
  let layer = [...leaves];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(await sha256Hex(a + b));
    }
    layer = next;
  }
  return layer[0];
}

export default function Gallery() {
  const [entries, setEntries] = useState<SealedEntry[]>([]);
  const [merkleRoot, setMerkleRoot] = useState<string>("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sealed: SealedEntry[] = [];
      for (let i = 0; i < SEALED_DOCS.length; i++) {
        const d = SEALED_DOCS[i];
        const manifest = JSON.stringify({
          id: d.id,
          title: d.title,
          author: d.author,
          year: d.year,
          category: d.category,
          source: d.source,
          excerpt: d.excerpt,
          sealed_at: GALLERY_SEAL_EPOCH,
          protocol: "APEX-PSI/1.0",
        });
        const hash = await sha256Hex(manifest);
        sealed.push({ ...d, manifest, hash, merkleIndex: i });
      }
      setEntries(sealed);
      const root = await buildMerkleRoot(sealed.map((s) => s.hash));
      setMerkleRoot(root);
    })();
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q) ||
        e.hash.includes(q.toLowerCase())
      );
    });
  }, [entries, query, category]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 1500);
  };

  const downloadManifest = () => {
    const payload = {
      protocol: "APEX-PSI/1.0",
      title: "APEX PSI Sealed Gallery — 50 Canonical Public Documents",
      sealed_at: GALLERY_SEAL_EPOCH,
      merkle_root_sha256: merkleRoot,
      hash_algorithm: "SHA-256",
      count: entries.length,
      note: "Each seal proves existence and integrity of the manifest at seal time. It does NOT assert truth of source contents.",
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        author: e.author,
        year: e.year,
        category: e.category,
        source: e.source,
        sha256: e.hash,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apex-psi-sealed-gallery.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Manifest downloaded");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Sealed Gallery — 50 Canonical Documents | APEX PSI</title>
        <meta
          name="description"
          content="Proof of concept: 50 of the world's most important public documents cryptographically sealed with the APEX PSI protocol (SHA-256 + Merkle root)."
        />
        <link rel="canonical" href="https://ai-governance-standard.com/gallery" />
      </Helmet>

      {/* Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-background to-muted/10">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-primary mb-6">
            <Shield className="w-4 h-4" />
            <span>Proof of Concept</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            The Sealed Gallery
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-8">
            50 canonical public documents — constitutions, scientific papers,
            protocols, and declarations — sealed with SHA-256 and anchored into
            a single Merkle root. Existence and integrity, not truth of contents.
          </p>

          {/* Merkle root panel */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 max-w-3xl">
            <div className="text-xs uppercase tracking-widest text-primary mb-2">
              Gallery Merkle Root · SHA-256
            </div>
            <div className="font-mono text-xs md:text-sm break-all text-foreground">
              {merkleRoot || "computing…"}
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Sealed at {GALLERY_SEAL_EPOCH} · {entries.length} leaves
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={!merkleRoot}
                onClick={() => copy(merkleRoot, "root")}
              >
                {copied === "root" ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                Copy Root
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!entries.length}
                onClick={downloadManifest}
              >
                <Download className="w-3 h-3 mr-1" />
                Download Manifest (JSON)
              </Button>
              <Link to={`/verify?h=${merkleRoot}`}>
                <Button size="sm" variant="ghost" disabled={!merkleRoot}>
                  Verify Root →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 md:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search title, author, or hash…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1 text-xs uppercase tracking-widest rounded border transition ${
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-20">
            Computing 50 seals…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((e) => (
              <article
                key={e.id}
                className="group rounded-lg border border-border/60 bg-card hover:border-primary/40 transition p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary">
                    {e.category}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{String(e.merkleIndex + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-tight mb-1">
                  {e.title}
                </h3>
                <div className="text-xs text-muted-foreground mb-3">
                  {e.author} · {e.year}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4 line-clamp-3">
                  "{e.excerpt}"
                </p>

                <div className="mt-auto space-y-2">
                  <div className="rounded border border-primary/20 bg-primary/5 p-2">
                    <div className="text-[9px] uppercase tracking-widest text-primary mb-1">
                      SHA-256 Seal
                    </div>
                    <div className="font-mono text-[10px] break-all text-foreground/90">
                      {e.hash}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copy(e.hash, e.id)}
                      className="flex-1 text-xs px-2 py-1.5 border border-border rounded hover:bg-muted transition inline-flex items-center justify-center gap-1"
                    >
                      {copied === e.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                    <a
                      href={e.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-xs px-2 py-1.5 border border-border rounded hover:bg-muted transition inline-flex items-center justify-center gap-1"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                    <Link
                      to={`/verify?h=${e.hash}`}
                      className="flex-1 text-xs px-2 py-1.5 border border-primary/40 text-primary rounded hover:bg-primary/10 transition inline-flex items-center justify-center"
                    >
                      Verify
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Honest footer */}
      <section className="border-t border-border/40 bg-muted/10">
        <div className="max-w-4xl mx-auto px-6 py-12 text-sm text-muted-foreground space-y-3">
          <div className="text-xs uppercase tracking-widest text-primary">
            About these seals
          </div>
          <p>
            Each entry is a canonical JSON manifest (id, title, author, year,
            source URL, excerpt, seal timestamp) hashed with SHA-256 in your
            browser. The 50 hashes are aggregated into a single Merkle root.
          </p>
          <p>
            <strong className="text-foreground">What this proves:</strong> that
            this reference to the document existed at{" "}
            <code className="text-foreground">{GALLERY_SEAL_EPOCH}</code> and
            has not been altered since.
          </p>
          <p>
            <strong className="text-foreground">What this does not prove:</strong>{" "}
            the truth or accuracy of the source contents. APEX PSI is a
            verification layer, not a truth engine.
          </p>
        </div>
      </section>
    </div>
  );
}
