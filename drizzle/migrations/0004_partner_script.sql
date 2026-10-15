CREATE TABLE public.partner_script (
  id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  approved_script text NOT NULL,
  may_say text[] NOT NULL DEFAULT '{}',
  may_not_say text[] NOT NULL DEFAULT '{}',
  banned_terms text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_script TO anon, authenticated;
GRANT ALL ON public.partner_script TO service_role;
ALTER TABLE public.partner_script ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved partner script is public" ON public.partner_script FOR SELECT USING (true);

INSERT INTO public.partner_script (id, approved_script, may_say, may_not_say, banned_terms) VALUES (
 'founding-v1',
 'APEX PSI is an open protocol for tamper-evident receipts. When an AI system or a person makes a decision, APEX canonicalises the record, fingerprints it with SHA-256, signs it (Ed25519 plus a post-quantum ML-DSA-65 signature) and commits it to an append-only Merkle ledger. Anyone can later check, offline and for free, that the record has not changed since it was sealed. The protocol is published as individual IETF Internet-Drafts (not IETF standards). Verification is MIT-licensed and free; the hosted service has a free allowance and paid plans for higher volume. I am an independent Founding Member referral partner of APEX, not an employee, director or owner. For a technical or commercial conversation I will introduce you directly to the founder.',
 ARRAY['APEX proves a record has not changed since it was sealed, and when it was sealed.','Verification is free and works offline.','The protocol is described in individual IETF Internet-Drafts.','I am an independent referral partner and receive a disclosed referral fee.'],
 ARRAY['That APEX makes anyone legally compliant or satisfies any law.','That the drafts are IETF standards or endorsed by the IETF.','Any customer, revenue, investor or partnership figure not published on the website.','That I own, represent, or can sign for APEX, or that APEX is a government or official body.','Any price, discount or contract term — refer to the founder.'],
 ARRAY['guaranteed compliance','fully compliant','certified compliant','legally binding','government approved','ietf standard','endorsed by the ietf','sovereign','tribunal','digital gallows','citizenship','guaranteed returns','equity','shareholder','co-founder','official partner of']
);