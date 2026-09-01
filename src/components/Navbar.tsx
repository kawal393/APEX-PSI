import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LayoutDashboard, ChevronDown, Hash, Globe, Shield, Award, Code, Layers, FileText, Bot, ExternalLink, ScrollText, GitBranch, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import PWAInstallButton from "@/components/PWAInstallButton";
import apexLogo from "@/assets/apex-logo.png";

const referenceLinks = [
  { label: "The Reference", href: "/reference", icon: BookOpen, desc: "Public reference for machine-governance records" },
  { label: "Declaration", href: "/declaration", icon: ScrollText, desc: "The Recomputation Declaration" },
  { label: "Genesis Zero", href: "/genesis", icon: Hash, desc: "Reference Implementation v1.0, sealed" },
  { label: "Case 001 — The Worker", href: "/case-001", icon: FileText, desc: "Live record" },
  { label: "Case 002 — The Money", href: "/case-002", icon: FileText, desc: "Reserved" },
  { label: "Case 003 — The Regulator", href: "/case-003", icon: FileText, desc: "Reserved" },
];

const infraLinks = [
  { label: "HTTP Header Standard", href: "/standard", icon: ScrollText, desc: "draft-singh-psi-http-01" },
  { label: "Live Header Inspector", href: "/header", icon: Hash, desc: "Verify any AI endpoint" },
  { label: "PSI Foundation", href: "/foundation", icon: Shield, desc: "Governance · in formation" },
  { label: "Open Source", href: "https://github.com/kawal393/APEX-PSI", icon: GitBranch, desc: "Full protocol on GitHub", external: true },
  { label: "Verified Registry", href: "/registry", icon: Shield, desc: "Public verified entity ledger" },
  { label: "Verify Hash", href: "/verify", icon: Hash, desc: "Public SHA-256 verification" },
  { label: "The Referee", href: "/verify-any", icon: Shield, desc: "Cross-standard seal reader" },
  { label: "FWC 20 Oct", href: "/fwc", icon: FileText, desc: "AI filing verification, Australia" },
  { label: "Regulation Map", href: "/regulations", icon: Globe, desc: "AI laws in 25+ countries" },
  { label: "Free Score", href: "/assess", icon: Shield, desc: "Compliance in 2 minutes" },
  { label: "Trust Badge", href: "/badge", icon: Award, desc: "Embeddable PSI badge" },
  { label: "Standards Map", href: "/standards", icon: ScrollText, desc: "NIST / ISO / CISA mapping" },
  { label: "Submission Kit", href: "/submission-kit", icon: FileText, desc: "CEN-CENELEC regulatory package" },
  { label: "SDK", href: "/sdk", icon: Code, desc: "Developer integration" },
  { label: "Architecture", href: "/architecture", icon: Layers, desc: "Technical deep-dive" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [infraOpen, setInfraOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const infraRef = useRef<HTMLDivElement>(null);
  const refRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [user]);

const navLinks = [
    { label: "Declaration", href: "/declaration", isRoute: true },
    { label: "Reference", href: "/reference", isRoute: true },
    { label: "Founding Members", href: "/founding", isRoute: true },
    { label: "Products", href: "/products", isRoute: true },

    { label: "Overview", href: "/home", isRoute: true },
    { label: "Engine", href: "/gallows", isRoute: true },
    { label: "Notary", href: "/notary", isRoute: true },
    { label: "Explorer", href: "/explorer", isRoute: true },
    { label: "Live", href: "/live", isRoute: true },
    { label: "Verify", href: "/verify", isRoute: true },
    { label: "Universal Ledger", href: "/ledger", isRoute: true },
    { label: "Hello PSI", href: "/hello-psi", isRoute: true },
    { label: "Enforcement Watch", href: "/enforcement-watch", isRoute: true },
    { label: "Sealed Memory", href: "/sealed-memory", isRoute: true },
    { label: "Evidence", href: "/governance", isRoute: true },
    { label: "Registry", href: "/registry", isRoute: true },
    { label: "Protocol", href: "/protocol", isRoute: true },
    { label: "MCP", href: "/mcp", isRoute: true },
    { label: "ROBUSTNESS", href: "/robustness", isRoute: true },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (infraRef.current && !infraRef.current.contains(e.target as Node)) {
        setInfraOpen(false);
      }
      if (refRef.current && !refRef.current.contains(e.target as Node)) {
        setRefOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (href: string, isRoute?: boolean) => {
    setOpen(false);
    setInfraOpen(false);
    setRefOpen(false);
    if (isRoute) {
      navigate(href);
    } else if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        navigate("/" + href);
      } else {
        const el = document.getElementById(href.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else if (href === "#top") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Desktop */}
        <div className="hidden lg:flex items-center justify-between h-16 gap-6">
          <button
            onClick={() => handleNavClick("#top")}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer shrink-0"
          >
            <span className="flex flex-col items-start leading-none">
              <span className="text-sm font-black tracking-tight">
                <span className="text-gold-gradient">APEX</span>{" "}
                <span className="text-chrome-gradient">PSI</span>
              </span>
              <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
                Universal Verification Layer
              </span>
            </span>
          </button>

          {/* IETF Status Badge */}
          <a
            href="/protocol"
            onClick={(e) => { e.preventDefault(); handleNavClick("/protocol", true); }}
            className="hidden xl:inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[9px] font-bold text-primary tracking-widest uppercase hover:bg-primary/10 transition-colors cursor-pointer shrink-0"
          >
            <FileText className="h-2.5 w-2.5" />
            IETF draft-singh-psi-00
          </a>

          <div className="flex items-center gap-0 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {navLinks.map((link) =>
              (link as any).external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary rounded-md hover:bg-muted/50 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href, link.isRoute)}
                  className="px-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary rounded-md hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap"
                >
                  {link.label}
                </button>
              )
            )}

            {/* The Reference Dropdown */}
            <div ref={refRef} className="relative">
              <button
                onClick={() => setRefOpen(!refOpen)}
                className="px-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary rounded-md hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                The Reference
                <ChevronDown className={`h-3 w-3 transition-transform ${refOpen ? "rotate-180" : ""}`} />
              </button>
              {refOpen && (
                <div className="absolute top-full left-0 mt-1 w-72 rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-xl py-2 z-50">
                  {referenceLinks.map((tool) => (
                    <button
                      key={tool.label}
                      onClick={() => handleNavClick(tool.href, true)}
                      className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer group"
                    >
                      <tool.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
                        <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Infrastructure Dropdown */}
            <div ref={infraRef} className="relative">
              <button
                onClick={() => setInfraOpen(!infraOpen)}
                className="px-1.5 py-1.5 text-[11px] text-muted-foreground hover:text-primary rounded-md hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                Infra
                <ChevronDown className={`h-3 w-3 transition-transform ${infraOpen ? "rotate-180" : ""}`} />
              </button>
              {infraOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-xl py-2 z-50">
                  {infraLinks.map((tool) =>
                    (tool as any).external ? (
                      <a
                        key={tool.label}
                        href={tool.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setInfraOpen(false)}
                        className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <tool.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1">{tool.label} <ExternalLink className="h-3 w-3" /></p>
                          <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                        </div>
                      </a>
                    ) : (
                      <button
                        key={tool.label}
                        onClick={() => handleNavClick(tool.href, true)}
                        className="w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer group"
                      >
                        <tool.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
                          <p className="text-[11px] text-muted-foreground">{tool.desc}</p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <ThemeToggle />
            <LanguageSelector />
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="border-gold/40 text-gold hover:bg-gold/10">
                <Bot className="h-4 w-4 mr-1.5" />
                Admin
              </Button>
            )}
            {user ? (
              <Button variant="heroOutline" size="sm" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                {t("nav.dashboard")}
              </Button>
            ) : (
              <Button variant="heroOutline" size="sm" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-1.5" />
                {t("nav.login")}
              </Button>
            )}
            <Button variant="hero" size="sm" onClick={() => handleNavClick("#contact")}>
              {t("nav.getStarted")}
            </Button>
          </div>
        </div>

        {/* Tablet */}
        <div className="hidden md:flex lg:hidden items-center justify-between h-16 gap-4">
          <button
            onClick={() => handleNavClick("#top")}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer shrink-0"
          >
            <img src={apexLogo} alt="APEX" className="h-7 w-7 object-contain glow-gold" />
            <span className="text-sm font-bold text-gold-gradient">APEX PSI</span>
          </button>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <ThemeToggle />
            <LanguageSelector />
            {user ? (
              <Button variant="heroOutline" size="sm" onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="heroOutline" size="sm" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4" />
              </Button>
            )}
            <Button variant="hero" size="sm" onClick={() => handleNavClick("#contact")}>
              {t("nav.getStarted")}
            </Button>
            <button
              className="ml-1 text-foreground bg-transparent border-none cursor-pointer"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center justify-between h-14">
          <button
            onClick={() => handleNavClick("#top")}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer"
          >
            <img src={apexLogo} alt="APEX" className="h-7 w-7 object-contain glow-gold" />
            <span className="text-sm font-bold text-gold-gradient">APEX PSI</span>
          </button>
          <div className="flex items-center gap-2">
            <PWAInstallButton />
            <ThemeToggle />
            <LanguageSelector />
            <button
              className="text-foreground bg-transparent border-none cursor-pointer"
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown menu for tablet + mobile */}
      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto max-w-6xl px-4 py-4 space-y-1">
            {navLinks.map((link) =>
              (link as any).external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="block w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors flex items-center gap-1"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href, link.isRoute)}
                  className="block w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors bg-transparent border-none cursor-pointer"
                >
                  {link.label}
                </button>
              )
            )}
            <div className="pt-2 pb-1">
              <p className="px-3 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">The Reference</p>
            </div>
            {referenceLinks.map((tool) => (
              <button
                key={tool.label}
                onClick={() => handleNavClick(tool.href, true)}
                className="w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
              >
                <tool.icon className="h-3.5 w-3.5 text-primary" />
                {tool.label}
              </button>
            ))}
            <div className="pt-2 pb-1">
              <p className="px-3 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Infrastructure</p>
            </div>
            {infraLinks.map((tool) =>
              (tool as any).external ? (
                <a
                  key={tool.label}
                  href={tool.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors flex items-center gap-2"
                >
                  <tool.icon className="h-3.5 w-3.5 text-primary" />
                  {tool.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  key={tool.label}
                  onClick={() => handleNavClick(tool.href, true)}
                  className="w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors bg-transparent border-none cursor-pointer flex items-center gap-2"
                >
                  <tool.icon className="h-3.5 w-3.5 text-primary" />
                  {tool.label}
                </button>
              )
            )}
            <div className="pt-3 border-t border-border/50 space-y-2">
              {user ? (
                <Button variant="heroOutline" size="sm" className="w-full justify-center" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  {t("nav.dashboard")}
                </Button>
              ) : (
                <Button variant="heroOutline" size="sm" className="w-full justify-center" onClick={() => { setOpen(false); navigate("/auth"); }}>
                  <LogIn className="h-4 w-4 mr-1.5" />
                  {t("nav.login")}
                </Button>
              )}
              <Button variant="hero" size="sm" className="w-full justify-center" onClick={() => handleNavClick("#contact")}>
                {t("nav.getStarted")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
