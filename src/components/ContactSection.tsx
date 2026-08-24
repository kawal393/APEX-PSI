import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { forwardRef, useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, ExternalLink, Github } from "lucide-react";
import { useTranslation } from "react-i18next";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`;

const ContactSection = forwardRef<HTMLElement>((_, ref) => {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          company: formData.get("company"),
          role: formData.get("role"),
          message: formData.get("message"),
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      toast.success("Petition received. The registry will respond at its own cadence.");
      form.reset();
    } catch {
      toast.error("Something went wrong. Please email apexinfrastructure369@gmail.com directly.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section ref={ref} className="relative py-24 px-4" id="contact">
      <div className="container mx-auto max-w-4xl">
        <div className="grid md:grid-cols-5 gap-12">
          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-gold font-semibold tracking-widest uppercase text-sm mb-3">The Registry</p>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Petition the Registry
              </h2>
              <p className="text-muted-foreground text-sm mb-8">
                The standard exists. The infrastructure is live. State your case — the registry reviews on its own cadence.
              </p>

              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gold flex-shrink-0" />
                  <a href="mailto:apexinfrastructure369@gmail.com" className="hover:text-gold transition-colors">
                    apexinfrastructure369@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-gold flex-shrink-0" />
                  <a href="https://apex-infrastructure.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    apex-infrastructure.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Github className="h-4 w-4 text-gold flex-shrink-0" />
                  <a href="https://github.com/kawal393/APEX-PSI" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                    GitHub Repository
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gold flex-shrink-0" />
                  <span>Victoria, Australia</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="md:col-span-3">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="name" placeholder="Full Name" required maxLength={100} className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                <Input name="email" placeholder="Email" type="email" required maxLength={255} className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="company" placeholder="Company Name" required maxLength={100} className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                <Input name="role" placeholder="Role / Title (optional)" maxLength={100} className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <Textarea
                name="message"
                placeholder="State your AI systems, jurisdictions, and the predicate you require proven."
                rows={4}
                maxLength={1000}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
              <Button variant="hero" className="w-full" disabled={sending}>
                {sending ? "Filing..." : "Submit Petition"}
              </Button>
            </motion.form>
          </div>
        </div>
      </div>
    </section>
  );
});

ContactSection.displayName = "ContactSection";

export default ContactSection;
