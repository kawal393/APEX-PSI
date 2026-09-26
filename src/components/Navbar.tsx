import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LayoutDashboard, ChevronDown, ChevronLeft, ChevronRight, Hash, Globe, Shield, Award, Code, Layers, FileText, Bot, ExternalLink, ScrollText, GitBranch, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import LanguageSelector from "@/components/LanguageSelector";
import ThemeToggle from "@/components/ThemeToggle";
import PWAInstallButton from "@/components/PWAInstallButton";
import EmpireNetworkSwitcher from "@/components/EmpireNetworkSwitcher";
import apexLogo from "@/assets/apex-logo.png";

type MoreLink = { label: string; href: string; external?: boolean };
const moreGroups: { title: string; links: MoreLink[] }[] = [
  { title: "Technology", links: [
    { label: "Architecture", href: "/architecture" }, { label: "SDK", href: "/sdk" }, { label: "API", href: "/api" },
    { label: "MCP", href: "/mcp" }, { label: "Post-Quantum", href: "/quantum" }, { label: "Lattice", href: "/lattice" },
    { label: "Robustness", href: "/robustness" }, { label: "In-Band", href: "/inband" }, { label: "Hardening", href: "/hardening" },
    { label: "Engine", href: "/engine" }, { label: "Open Source", href: "https://github.com/kawal393/APEX-PSI", external: true },
  ]},
  { title: "Compliance", links: [
    { label: "EU AI Act", href: "/eu-ai-act" }, { label: "EU Code", href: "/eu-code" }, { label: "Regulations", href: "/regulations" },
    { label: "Standards", href: "/standards" }, { label: "PSI-05", href: "/standards/psi-05" }, { label: "Portfolio", href: "/portfolio" },
  ]},
  { title: "Evidence", links: [
    { label: "Live Ledger", href: "/live" }, { label: "Registry", href: "/registry" }, { label: "Genesis", href: "/genesis" },
    { label: "Reference", href: "/reference" }, { label: "Declaration", href: "/declaration" },
    { label: "Case 001", href: "/case-001" }, { label: "Case 002", href: "/case-002" }, { label: "Case 003", href: "/case-003" },
    { label: "Challenge", href: "/challenge" }, { label: "Impact", href: "/impact" }, { label: "Witness Wall", href: "/witness-wall" },
    { label: "Timeline", href: "/timeline" }, { label: "Explorer", href: "/explorer" },
  ]},
  { title: "About", links: [
    { label: "Ecosystem", href: "/ecosystem" }, { label: "Governance", href: "/governance" }, { label: "Foundation", href: "/foundation" },
    { label: "Founding Members", href: "/founding" }, { label: "Articles", href: "/articles" }, { label: "Partners", href: "/partners" },
    { label: "Regulator", href: "/regulator" }, { label: "Cite", href: "/cite" },
  ]},
  { title: "Legal", links: [
    { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Cookies", href: "/cookies" },
    { label: "Disclaimers", href: "/disclaimers" }, { label: "Corrections", href: "/corrections" },
  ]},
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
    { label: "Verify", href: "/verify", isRoute: true },
    { label: "Get a Receipt", href: "/seal", isRoute: true },
    { label: "Authorize", href: "/mandate", isRoute: true },
    { label: "The Standard", href: "/protocol", isRoute: true },
    { label: "Pricing", href: "/products", isRoute: true },
  ];

  // The tab strip scrolls. Without an affordance it hid 17 of 23 doors behind an
  // invisible edge (no scrollbar, no fade, no arrow) - a door nobody can find is
  // a door that does not exist. These edges say "there is more" and move it.
  const navStripRef = useRef<HTMLDivElement>(null);
  const [navLeft, setNavLeft] = useState(false);
  const [navRight, setNavRight] = useState(false);

  const updateNavEdges = useCallback(() => {
    const el = navStripRef.current;
    if (!el) return;
    setNavLeft(el.scrollLeft > 2);
    setNavRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateNavEdges();
    window.addEventListener("resize", updateNavEdges);
    const t = window.setTimeout(updateNavEdges, 400);
    return () => {
      window.removeEventListener("resize", updateNavEdges);
      window.clearTimeout(t);
    };
  }, [updateNavEdges]);

  const scrollNav = (dir: number) => {
    navStripRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

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
    <>
    <EmpireNetworkSwitcher />
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
                Universal Verification Protocol
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
            IETF draft-singh-psi (rev 01)
          </a>

          <div className="relative flex-1 min-w-0">
          <div
            ref={navStripRef}
            onScroll={updateNavEdges}
            className="flex items-center gap-0 w-full overflow-x-auto scrollbar-hide"
          >
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

            {/* More library */}
            <div ref={refRef} className="relative">
              <button
                onClick={() => setRefOpen(!refOpen)}
                aria-expanded={refOpen}
                className="px-2 py-1.5 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary rounded-md hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                More
                <ChevronDown className={`h-3 w-3 transition-transform ${refOpen ? "rotate-180" : ""}`} />
              </button>
              {refOpen && (
                <div className="fixed left-1/2 top-16 z-50 mt-1 w-[min(90vw,56rem)] -translate-x-1/2 rounded-lg border border-border bg-background shadow-xl p-6 grid grid-cols-2 md:grid-cols-5 gap-6">
                  {moreGroups.map((g) => (
                    <div key={g.title}>
                      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">{g.title}</p>
                      <ul className="space-y-1">
                        {g.links.map((l) => (
                          <li key={l.href}>
                            {l.external ? (
                              <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary">{l.label}</a>
                            ) : (
                              <button onClick={() => handleNavClick(l.href, true)} className="text-left text-sm text-muted-foreground hover:text-primary bg-transparent border-none cursor-pointer p-0">{l.label}</button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            {navLeft && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
                <button
                  onClick={() => scrollNav(-1)}
                  aria-label="Scroll navigation left"
                  className="absolute inset-y-0 left-0 z-10 flex items-center px-1 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-primary"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {navRight && (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
                <button
                  onClick={() => scrollNav(1)}
                  aria-label="Scroll navigation right - more doors"
                  className="absolute inset-y-0 right-0 z-10 flex items-center px-1 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-primary"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
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
            {moreGroups.map((g) => (
              <div key={g.title} className="pt-3">
                <p className="px-3 text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{g.title}</p>
                <div className="grid grid-cols-2">
                  {g.links.map((l) =>
                    l.external ? (
                      <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-muted-foreground hover:text-primary">{l.label}</a>
                    ) : (
                      <button key={l.href} onClick={() => handleNavClick(l.href, true)} className="text-left px-3 py-2 text-sm text-muted-foreground hover:text-primary bg-transparent border-none cursor-pointer">{l.label}</button>
                    )
                  )}
                </div>
              </div>
            ))}
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
