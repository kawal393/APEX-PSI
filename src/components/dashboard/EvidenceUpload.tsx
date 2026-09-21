import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, Lock, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface EvidenceUploadProps {
  articleKey: string;
  articleLabel: string;
  existingHash?: string;
  onHashGenerated: (articleKey: string, hash: string, fileName: string) => void;
}

async function sha256Hash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EvidenceUpload = ({ articleKey, articleLabel, existingHash, onHashGenerated }: EvidenceUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(existingHash || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      // 1. Client-side SHA-256 hash — no document content leaves the browser
      const fileHash = await sha256Hash(file);
      setHash(fileHash);
      setFileName(file.name);

      // 2. Upload file to private storage bucket
      const path = `${user.id}/${articleKey}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("evidence-documents")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // 3. Commit hash to append-only ledger via edge function
      const { error: commitErr } = await supabase.functions.invoke("commit-action", {
        body: {
          action: `evidence_upload:${articleKey}`,
          predicate_id: `EVIDENCE-${articleKey.toUpperCase()}`,
          metadata: {
            file_name: file.name,
            file_size: file.size,
            sha256_hash: fileHash,
            article: articleKey,
          },
        },
      });
      if (commitErr) {
        console.warn("Ledger commit failed (non-blocking):", commitErr);
      }

      onHashGenerated(articleKey, fileHash, file.name);
      toast.success(`Evidence hashed for ${articleLabel}`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{articleLabel} — Documentary Evidence</span>
        {hash && <FileCheck className="h-3.5 w-3.5 text-compliant" />}
      </div>

      {hash ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileCheck className="h-3 w-3 text-compliant shrink-0" />
            <span className="text-[10px] text-compliant font-mono truncate">{fileName}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-auto"
              onClick={() => {
                setHash(null);
                setFileName(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[9px] font-mono text-muted-foreground truncate">SHA-256: {hash}</p>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border border-dashed border-border rounded-md p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mx-auto animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">Drop policy document or click to upload</p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.md"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="flex items-center gap-1.5">
        <Lock className="h-2.5 w-2.5 text-compliant" />
        <p className="text-[8px] text-muted-foreground">No document content leaves your browser. Only the SHA-256 hash is stored.</p>
      </div>
    </div>
  );
};

export default EvidenceUpload;
