import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, RotateCcw, Sparkles, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import ChatMessage from "./ChatMessage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProactiveChat } from "@/hooks/use-proactive-chat";

const QUICK_ACTIONS = [
  { label: "What is PSI?", message: "What is PSI and how does it work?" },
  { label: "Show pricing", message: "What are your pricing plans?" },
  { label: "Free assessment", message: "How can I get a free compliance assessment?" },
  { label: "EU AI Act", message: "When is the EU AI Act compliance deadline?" },
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const { messages, isLoading, error, sendMessage, resetChat } = useChat();

  const openChat = useCallback(() => setIsOpen(true), []);
  useProactiveChat(isOpen, messages.length > 0, openChat, sendMessage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const spokenMessageId = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const supportsSpeechInput = typeof window !== "undefined" && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const supportsSpeechOutput = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!voiceReplies || isLoading || !supportsSpeechOutput) return;
    const latest = messages[messages.length - 1];
    if (!latest || latest.role !== "assistant" || latest.id === spokenMessageId.current) return;
    spokenMessageId.current = latest.id;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(latest.content.replace(/[#*_`[\]()]/g, " "));
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }, [isLoading, messages, supportsSpeechOutput, voiceReplies]);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if (supportsSpeechOutput) window.speechSynthesis.cancel();
  }, [supportsSpeechOutput]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleQuickAction = (msg: string) => {
    sendMessage(msg);
  };

  const toggleListening = () => {
    if (!supportsSpeechInput) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript ?? "")
        .join("")
        .slice(0, 500);
      setInput(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
          {/* Notification dot for first visit */}
          {messages.length === 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className={`fixed z-50 flex flex-col overflow-hidden border border-primary/20 bg-card shadow-2xl shadow-background/60 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ${
          isMobile
            ? "inset-0 rounded-none"
            : "bottom-5 right-5 w-[400px] h-[580px] max-h-[calc(100vh-3rem)] rounded-2xl"
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm text-foreground block leading-tight">APEX AI</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Compliance Assistant</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={resetChat}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="New conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 scroll-smooth">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-2">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Welcome to APEX AI</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-[260px]">
                  Your AI compliance assistant. Ask about the EU AI Act, our technology, or get started with a free assessment.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_ACTIONS.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(qa.message)}
                      className="text-xs px-3.5 py-2 rounded-xl border border-primary/25 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all active:scale-95"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {error && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center my-2">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5 shrink-0 bg-card">
            <div className="flex items-center gap-2">
              {supportsSpeechInput && (
                <Button
                  type="button"
                  size="icon"
                  variant={listening ? "destructive" : "ghost"}
                  onClick={toggleListening}
                  aria-label={listening ? "Stop listening" : "Speak your question"}
                  title={listening ? "Stop listening" : "Speak your question"}
                  className="h-10 w-10 shrink-0"
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 500))}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask about compliance..."
                className="flex-1 bg-muted rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-transparent focus:ring-primary/30 transition-all"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
              {supportsSpeechOutput && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (voiceReplies) window.speechSynthesis.cancel();
                    setVoiceReplies(!voiceReplies);
                  }}
                  aria-label={voiceReplies ? "Disable spoken replies" : "Enable spoken replies"}
                  title={voiceReplies ? "Disable spoken replies" : "Enable spoken replies"}
                  className="h-10 w-10 shrink-0"
                >
                  {voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">
              Powered by APEX · {500 - input.length} characters remaining
            </p>
          </div>
        </div>
      )}
    </>
  );
}
