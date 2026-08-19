import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RobustnessBench from "@/components/eu/RobustnessBench";
import { WM2_METHOD, WM2_SPEC, PAYLOAD_BITS, DEFAULT_DELTA, SCALE_CANDIDATES } from "@/lib/psi-watermark-dct";
import { SITE_URL } from "@/lib/site";

const METHOD = [
  ["Dataset", "Any raster you supply, plus a deterministic 768×512 synthetic test raster generated in-page so results are reproducible without external data."],
  ["Payload", `${PAYLOAD_BITS}-bit tile: 32-bit "PSI1" sync word + 128-bit truncated SHA-256 of the sealed asset.`],
  ["Embedding", "8×8 block DCT on the luminance plane, quantization index modulation on mid-band coefficient pairs, tile repeated across the raster."],
  ["Recovery metric", "Exact payload match (all 128 bits) counts as recovered. Bit accuracy and sync-word lock are reported separately so partial survival is visible."],
  ["Detector search", `Grid-offset search over 8×8 pixel phases, tile-shift search, and rescale candidates ${SCALE_CANDIDATES.join(", ")}.`],
  ["Strength", `Quantization step delta = ${DEFAULT_DELTA} (visually transparent at this level on photographic content).`],
];

const CHANNELS = [
  ["Lossless PNG round-trip", "Baseline"],
  ["JPEG re-encode q75", "Standard web export"],
  ["JPEG re-encode q50", "Aggressive compression"],
  ["Downscale 0.5×", "Thumbnailing"],
  ["Upscale 2×", "Resampling"],
  ["Centre crop, 25% of area removed", "Reframing"],
  ["Screenshot (1.25× resample + JPEG q80)", "Screen capture"],
  ["Social repost (1080px downscale + double JPEG q65)", "Platform recompression"],
  ["Chained attack (JPEG q50 → 0.5× → 25% crop)", "Worst case"],
];

const Robustness = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Watermark Robustness Benchmark — Apex PSI — Universal Verification Layer</title>
      <meta
        name="description"
        content="Reproducible, in-browser benchmark of the APEX PSI transform-domain watermark (psi.dct-qim-v2) against JPEG recompression, resizing, cropping, screenshots and social repost chains."
      />
      <link rel="canonical" href={`${SITE_URL}/robustness`} />
      <meta property="og:title" content="Watermark Robustness Benchmark | APEX PSI" />
      <meta
        property="og:description"
        content="Run the watermark robustness benchmark yourself, client-side. Method, distortion set and per-channel recovery rates published in full."
      />
      <meta property="og:url" content={`${SITE_URL}/robustness`} />
      <meta property="og:type" content="article" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
    <Navbar />
    <main className="pt-28 pb-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">{WM2_METHOD}</p>
        <h1 className="text-3xl sm:text-5xl font-black text-foreground mb-4">Watermark robustness, measured</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mb-4">
          Robustness is not a claim you make, it is a number someone else can reproduce. The transform-domain mark{" "}
          <code className="font-mono text-gold">{WM2_METHOD}</code> replaces the earlier LSB spreading method. Every
          benchmark below runs entirely in your browser — no upload, no server, no cached results.
        </p>
        <p className="text-xs text-muted-foreground max-w-3xl mb-10">{WM2_SPEC}</p>

        <section className="mb-12">
          <h2 className="text-lg font-black uppercase tracking-widest mb-4">
            <span className="text-gold-gradient">Run the benchmark</span>
          </h2>
          <RobustnessBench />
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-black uppercase tracking-widest mb-4">
            <span className="text-gold-gradient">Methodology</span>
          </h2>
          <div className="space-y-2">
            {METHOD.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-card/40 p-3 sm:flex sm:gap-4">
                <span className="text-xs font-mono font-bold text-gold sm:w-40 shrink-0">{k}</span>
                <span className="text-xs text-muted-foreground">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-black uppercase tracking-widest mb-4">
            <span className="text-gold-gradient">Distortion set</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {CHANNELS.map(([c, tag]) => (
              <div key={c} className="rounded-lg border border-border bg-card/40 p-3">
                <p className="text-xs font-bold text-foreground">{c}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{tag}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-black uppercase tracking-widest mb-4">
            <span className="text-gold-gradient">Stated scope and limits</span>
          </h2>
          <ul className="space-y-2 text-xs text-foreground/75">
            <li>• The mark is designed for raster images. Audio and video keyframe marking is not yet claimed as robust; for those media the in-band signed manifest is the marker.</li>
            <li>• Recovery degrades once a crop removes more than roughly three quarters of the area, because fewer complete payload tiles remain for the majority vote.</li>
            <li>• Heavy generative editing, aggressive denoising or re-rendering of an image is expected to destroy the mark. No watermark in public literature survives arbitrary regeneration.</li>
            <li>• The watermark indicates that an asset was sealed. It does not assert that the content of the asset is true.</li>
            <li>• Results shown are produced by your device in real time; hardware-dependent JPEG encoders can move per-channel numbers by small margins.</li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link to="/eu-code" className="rounded-lg border border-gold/40 bg-gold/5 px-4 py-2 text-xs font-bold text-gold hover:bg-gold/10 transition-colors">
            Section 1 requirement mapping
          </Link>
          <Link to="/inband" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            In-band manifest specification
          </Link>
          <Link to="/verify" className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:border-gold/40 transition-colors">
            Public verification
          </Link>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Robustness;
