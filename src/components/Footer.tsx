import { forwardRef } from "react";
import { Github, ExternalLink, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import apexLogo from "@/assets/apex-logo.png";
import { useTranslation } from "react-i18next";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  return (
    <footer ref={ref} className="border-t border-border py-12 px-4 relative overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 85% 52% / 0.03) 0%, transparent 70%)" }}
      />

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Legal Disclaimer */}
        <div className="rounded-lg border border-border bg-card/40 p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold">{t("footer.disclaimerLabel")}</span> {t("footer.disclaimer")}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src={apexLogo} alt="APEX" className="h-8 w-8 object-contain" />
              <h3 className="text-lg font-bold">
                <span className="text-gold-gradient">APEX</span>{" "}
                <span className="text-chrome-gradient">PSI</span>
              </h3>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-4">
              Proof of Stateful Integrity — The Open Standard for Verifiable AI Governance. By Apex Intelligence Empire.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>A division of <span className="text-foreground/80">APEX INTELLIGENCE EMPIRE</span></p>
              <p>ABN: 71 672 237 795 &nbsp;|&nbsp; ACN: 672 237 795</p>
              <p>Registered in Victoria, Australia</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/eu-ai-act" className="hover:text-gold transition-colors">EU AI Act Compliance</Link></li>
              <li><Link to="/inband" className="hover:text-gold transition-colors">In-Band Metadata &amp; Watermark</Link></li>
              <li><Link to="/protocol" className="hover:text-gold transition-colors">PSI Protocol</Link></li>
              <li><Link to="/gallows" className="hover:text-gold transition-colors">Verification Portal</Link></li>
              <li><Link to="/verify" className="hover:text-gold transition-colors">Verify Hash</Link></li>
              <li><Link to="/regulations" className="hover:text-gold transition-colors">Regulation Map</Link></li>
              <li><Link to="/landscape" className="hover:text-gold transition-colors">Competitive Landscape</Link></li>
              <li><Link to="/assess" className="hover:text-gold transition-colors">Free Score</Link></li>
              <li><Link to="/badge" className="hover:text-gold transition-colors">Trust Badge</Link></li>
              <li><Link to="/architecture" className="hover:text-gold transition-colors">Architecture</Link></li>
              <li><Link to="/integrations" className="hover:text-gold transition-colors">Integrations</Link></li>
              <li><Link to="/partner" className="hover:text-gold transition-colors">Partner Program</Link></li>
              
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:apexinfrastructure369@gmail.com" className="hover:text-gold transition-colors">apexinfrastructure369@gmail.com</a></li>
              <li><a href="https://apex-infrastructure.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors inline-flex items-center gap-1">apex-infrastructure.com <ExternalLink className="h-3 w-3" /></a></li>
              <li><a href="https://github.com/kawal393/digital-gallowsapex-infrastructurecom" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors inline-flex items-center gap-1"><Github className="h-3 w-3" /> GitHub <ExternalLink className="h-3 w-3" /></a></li>
            </ul>
            <h4 className="text-sm font-semibold text-foreground mt-4 mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pledge" className="hover:text-gold transition-colors">Patent Pledge</Link></li>
              <li><Link to="/seal" className="hover:text-gold transition-colors">Seal Any File</Link></li>
              <li><Link to="/api" className="hover:text-gold transition-colors">Unified API</Link></li>
              <li><Link to="/mcp" className="hover:text-gold transition-colors">MCP Server</Link></li>
              <li><Link to="/challenge" className="hover:text-gold transition-colors">Break APEX PSI</Link></li>
              <li><Link to="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-gold transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="hover:text-gold transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-muted-foreground font-mono">
            <Link to="/connect" className="hover:text-gold">MCP-native</Link>
            <span className="text-border">·</span>
            <a href="/llms.txt" className="hover:text-gold">llms.txt indexed</a>
            <span className="text-border">·</span>
            <Link to="/stream" className="hover:text-gold">Bitcoin-anchored</Link>
            <span className="text-border">·</span>
            <Link to="/quantum" className="hover:text-gold">Post-quantum (NIST FIPS 204)</Link>
            <span className="text-border">·</span>
            <a href="https://www.rfc-editor.org/rfc/rfc8785" target="_blank" rel="noopener noreferrer" className="hover:text-gold">RFC 8785</a>
            <span className="text-border">·</span>
            <Link to="/auth" className="hover:text-gold">Sign in with Google</Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] text-muted-foreground font-mono">
            <span>Australian Provisional Patent — Filed</span>
            <span className="hidden sm:inline text-border">|</span>
            <Link to="/portfolio" className="hover:text-gold">IETF portfolio — PSI 00-09</Link>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              © 2026 Apex Intelligence Empire. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Proof of Stateful Integrity™
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
