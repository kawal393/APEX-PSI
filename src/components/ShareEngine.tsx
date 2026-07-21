import { Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareEngineProps {
  variant?: "inline" | "floating";
  pageTitle?: string;
  customMessage?: string;
}

const powerStatements: Record<string, string> = {
  "/": "AI compliance is no longer self-reported. PSI Protocol makes it mathematically verifiable — backed by IETF draft-singh-psi-00.",
  "/protocol": "Read the protocol that replaces 'Trust Us' with cryptographic proof. IETF draft-singh-psi-00 is live.",
  "/gallows": "The APEX PSI: where AI outputs face mathematical judgment. Every claim verified, every violation blocked.",
  "/verify": "Verify any AI system's compliance in real-time. No login required. This is the new standard.",
  "/research": "From IETF drafts to arXiv papers — the institutional architecture behind verifiable AI governance.",
  "/governance": "Open Global Tribunal. Permissionless public verification with cryptographic consensus. The math is the authority.",
};

const ShareEngine = ({ variant = "inline", pageTitle, customMessage }: ShareEngineProps) => {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const message =
    customMessage ||
    powerStatements[currentPath] ||
    `${pageTitle || "PSI Protocol"} — The Open Protocol for Verifiable AI Governance.`;

  const shareUrl = `${siteUrl}${currentPath}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  if (variant === "floating") {
    return (
      <a
        href={linkedInUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-5 z-40 bg-[#0A66C2] hover:bg-[#004182] text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110"
        title="Share on LinkedIn"
      >
        <Linkedin className="h-5 w-5" />
      </a>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 border-psi-blue/30 text-psi-blue hover:bg-psi-blue/10"
      onClick={() => window.open(linkedInUrl, "_blank")}
    >
      <Linkedin className="h-4 w-4" />
      Share on LinkedIn
    </Button>
  );
};

export default ShareEngine;
