import { useState } from "react";
import { Check, Copy, Terminal, X } from "lucide-react";

const COMMAND = "npx -y apex-psi-mcp";

const ConnectAIButton = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open && (
        <div className="mb-2 w-[19rem] rounded-md border border-primary/40 bg-card/95 p-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">
              Connect your AI
            </p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded border border-border bg-background/80 px-2 py-2">
            <code className="flex-1 truncate font-mono text-xs text-foreground">{COMMAND}</code>
            <button
              onClick={copy}
              className="flex items-center gap-1 rounded border border-primary/50 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:bg-primary/10"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <li>· Used by ChatGPT, Claude, Cursor</li>
            <li>· OAuth protected, 4 tools</li>
            <li>· Public ledger, free tier</li>
            <li>
              <a
                href="/.well-known/mcp/server.json"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                Read MCP spec →
              </a>
            </li>
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-primary/60 bg-background/90 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-primary shadow-lg backdrop-blur hover:bg-primary/10"
      >
        <Terminal className="h-3.5 w-3.5" />
        Connect your AI in 1 command
      </button>
    </div>
  );
};

export default ConnectAIButton;
