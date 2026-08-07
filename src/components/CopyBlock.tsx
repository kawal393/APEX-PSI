import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyBlockProps {
  code: string;
  label?: string;
  className?: string;
  multiline?: boolean;
}

/** Monospace code block with a copy button. Matches the obsidian/gold surface style. */
const CopyBlock = ({ code, label, className, multiline }: CopyBlockProps) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{label}</p>
      )}
      <pre
        className={cn(
          "rounded-lg border border-border bg-background/80 py-3 pl-3 pr-11 text-[11px] sm:text-xs font-mono text-foreground/90 overflow-x-auto",
          multiline ? "whitespace-pre" : "whitespace-pre-wrap break-all",
        )}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy to clipboard"
        className="absolute right-2 bottom-2 p-1.5 rounded border border-border bg-card hover:border-gold/50 transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
};

export default CopyBlock;
