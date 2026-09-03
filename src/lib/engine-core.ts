// ═══════════════════════════════════════════════════════════════════════
// APEX PSI — Compliance Engine
// Real Web Crypto API • Real Merkle Trees • Real Predicate Verification
// ═══════════════════════════════════════════════════════════════════════

// ── Types ──────────────────────────────────────────────────────────────

export interface Predicate {
  id: string;
  name: string;
  article: string;
  description: string;
  violationPatterns: string[];
  riskLevel: 'HIGH' | 'UNACCEPTABLE' | 'LIMITED' | 'MINIMAL';
  enforcementDate: string;
}

export type GallowsPhase = 'IDLE' | 'COMMITTED' | 'CHALLENGED' | 'PROVING' | 'VERIFIED' | 'PAUSED';

export interface CommitRecord {
  id: string;
  action: string;
  predicateId: string;
  timestamp: string;
  commitHash: string;
  merkleLeafHash: string;
  phase: GallowsPhase;
  challengeHash?: string;
  proofHash?: string;
  merkleProof?: MerkleProofPath;
  merkleRoot?: string;
  verificationTimeMs?: number;
  status?: 'APPROVED' | 'BLOCKED';
  violationFound?: string;
  challengedAt?: string;
  provenAt?: string;
  protocolPauseAt?: string;
  sequenceNumber?: number;
  ed25519Signature?: string;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: string;
  index?: number;
}

export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

export type MerkleProofPath = MerkleProofStep[];

export interface MerkleTreeState {
  root: string;
  leaves: string[];
  depth: number;
  nodeCount: number;
}

// Keep backward compat
export interface GallowsResult {
  status: 'APPROVED' | 'BLOCKED';
  verificationTimeMs: number;
  auditHash: string;
  predicateId: string;
  timestamp: string;
  actionSummary: string;
  violationFound?: string;
}

// ── Predicates ─────────────────────────────────────────────────────────

export const PREDICATES: Predicate[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // EU AI ACT 2026 PREDICATES
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'EU_ART_5',
    name: 'Prohibited AI Practices',
    article: 'Article 5',
    description: 'Bans AI systems that deploy subliminal manipulation, exploit vulnerabilities, enable social scoring by governments, or perform real-time biometric identification in public spaces.',
    violationPatterns: ['subliminal manipulation', 'exploit vulnerability', 'social scoring', 'mass surveillance', 'biometric identification public', 'manipulate behavior'],
    riskLevel: 'UNACCEPTABLE',
    enforcementDate: '2025-02-02',
  },
  {
    id: 'EU_ART_6',
    name: 'High-Risk Classification',
    article: 'Article 6',
    description: 'AI systems used as safety components or in Annex III areas (biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice) are classified high-risk.',
    violationPatterns: ['unclassified high risk', 'no risk assessment', 'skip classification', 'bypass annex iii', 'undeclared safety component'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_9',
    name: 'Risk Management System',
    article: 'Article 9',
    description: 'High-risk AI systems must implement a continuous, iterative risk management system throughout the entire lifecycle, identifying and mitigating risks to health, safety, and fundamental rights.',
    violationPatterns: ['no risk management', 'skip risk assessment', 'static risk', 'no lifecycle monitoring', 'ignore residual risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_11',
    name: 'Technical Documentation',
    article: 'Article 11',
    description: 'Technical documentation must be drawn up before a high-risk AI system is placed on the market, demonstrating compliance and providing authorities with information to assess conformity.',
    violationPatterns: ['no documentation', 'undocumented model', 'missing technical docs', 'no conformity record', 'skip documentation'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_12',
    name: 'Record-Keeping',
    article: 'Article 12',
    description: 'High-risk AI systems must include logging capabilities that enable automatic recording of events relevant to identifying risks and substantial modifications throughout the lifecycle.',
    violationPatterns: ['no logging', 'disable audit trail', 'no record keeping', 'delete logs', 'unauditable', 'no event recording'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_13',
    name: 'Transparency & Information',
    article: 'Article 13',
    description: 'High-risk AI systems must be designed to be sufficiently transparent to enable deployers to interpret outputs and use them appropriately.',
    violationPatterns: ['black box', 'no interpretability', 'opaque model', 'unexplainable', 'no transparency', 'hidden logic'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_14',
    name: 'Human Oversight',
    article: 'Article 14',
    description: 'High-risk AI systems must allow effective human oversight, including ability to fully understand, monitor, intervene, and halt the system (kill switch mandate).',
    violationPatterns: ['autonomous decision', 'no human review', 'override human', 'bypass approval', 'without human', 'remove oversight', 'disable kill switch'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_15',
    name: 'Accuracy, Robustness & Cybersecurity',
    article: 'Article 15',
    description: 'High-risk AI must achieve appropriate accuracy, be resilient to errors and inconsistencies, and be robust against unauthorized third-party manipulation.',
    violationPatterns: ['unverified data', 'no validation', 'untested model', 'fabricated', 'unvalidated', 'no adversarial testing', 'skip security'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_50',
    name: 'Transparency for GPAI & Content',
    article: 'Article 50',
    description: 'AI-generated content (text, audio, image, video) must be machine-readable as AI-generated. Deepfakes must be disclosed. Users must be informed of AI interactions.',
    violationPatterns: ['undisclosed ai', 'no attribution', 'hidden synthetic', 'deepfake without label', 'without disclosure', 'unlabeled generation'],
    riskLevel: 'LIMITED',
    enforcementDate: '2026-08-02',
  },
  {
    id: 'EU_ART_52',
    name: 'AI Interaction Disclosure',
    article: 'Article 52',
    description: 'Persons interacting with AI must be informed they are doing so. AI systems generating deep fakes or synthetic content must disclose this fact clearly.',
    violationPatterns: ['impersonate human', 'pretend to be person', 'hide ai identity', 'no bot disclosure', 'pose as human', 'conceal ai nature'],
    riskLevel: 'LIMITED',
    enforcementDate: '2026-08-02',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MiFID II — Markets in Financial Instruments Directive (EU 2014/65)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'MIFID_ART_16',
    name: 'Organizational Requirements',
    article: 'MiFID II Art. 16',
    description: 'Investment firms using algorithmic trading must have effective systems and risk controls to ensure trading systems are resilient, have sufficient capacity, and are subject to appropriate trading thresholds.',
    violationPatterns: ['no algo controls', 'unmonitored trading', 'no circuit breaker', 'uncapped orders', 'no kill switch trading', 'bypass trading limits'],
    riskLevel: 'HIGH',
    enforcementDate: '2018-01-03',
  },
  {
    id: 'MIFID_ART_17',
    name: 'Algorithmic Trading',
    article: 'MiFID II Art. 17',
    description: 'Firms engaged in algorithmic trading must notify competent authorities, ensure systems prevent market disorder, maintain records of all orders and cancellations, and test algorithms.',
    violationPatterns: ['untested algorithm', 'no market abuse check', 'flash crash risk', 'no order records', 'unregistered algo', 'market manipulation'],
    riskLevel: 'HIGH',
    enforcementDate: '2018-01-03',
  },
  {
    id: 'MIFID_ART_25',
    name: 'Suitability & Appropriateness',
    article: 'MiFID II Art. 25',
    description: 'When providing investment advice or portfolio management, firms must obtain information about the client\'s knowledge, experience, financial situation, and investment objectives.',
    violationPatterns: ['no suitability check', 'unsuitable advice', 'ignore client profile', 'no risk assessment client', 'skip kyc', 'no appropriateness test'],
    riskLevel: 'HIGH',
    enforcementDate: '2018-01-03',
  },
  {
    id: 'MIFID_ART_27',
    name: 'Best Execution',
    article: 'MiFID II Art. 27',
    description: 'Firms must take all sufficient steps to obtain the best possible result for clients when executing orders, taking into account price, costs, speed, and likelihood of execution.',
    violationPatterns: ['worst execution', 'no best execution', 'front running', 'client disadvantage', 'no execution policy', 'ignore best price'],
    riskLevel: 'HIGH',
    enforcementDate: '2018-01-03',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DORA — Digital Operational Resilience Act (EU 2022/2554)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'DORA_ART_5',
    name: 'ICT Risk Management Framework',
    article: 'DORA Art. 5',
    description: 'Financial entities shall have in place an internal governance and control framework that ensures effective and prudent management of ICT risk.',
    violationPatterns: ['no ict governance', 'no risk framework', 'unmanaged cyber risk', 'no security controls', 'no incident response', 'ignore ict risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },
  {
    id: 'DORA_ART_6',
    name: 'ICT Systems & Tools',
    article: 'DORA Art. 6',
    description: 'Financial entities shall use and maintain updated ICT systems, protocols, and tools that are appropriate to support their operations and protect data.',
    violationPatterns: ['outdated systems', 'unpatched software', 'legacy vulnerability', 'no system updates', 'insecure infrastructure', 'end of life software'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },
  {
    id: 'DORA_ART_9',
    name: 'Protection & Prevention',
    article: 'DORA Art. 9',
    description: 'Financial entities shall continuously monitor and control ICT security, minimize impact of ICT risk through appropriate tools, policies, and procedures.',
    violationPatterns: ['no monitoring', 'no threat detection', 'disabled security', 'no access controls', 'unprotected data', 'no encryption'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },
  {
    id: 'DORA_ART_11',
    name: 'Backup & Recovery',
    article: 'DORA Art. 11',
    description: 'Financial entities shall develop ICT business continuity policy and disaster recovery plans, test backup procedures, and ensure restoration capabilities.',
    violationPatterns: ['no backup', 'no disaster recovery', 'untested recovery', 'no business continuity', 'no failover', 'single point of failure'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },
  {
    id: 'DORA_ART_17',
    name: 'ICT Incident Reporting',
    article: 'DORA Art. 17',
    description: 'Financial entities shall report major ICT-related incidents to competent authorities using standard templates and within prescribed timeframes.',
    violationPatterns: ['unreported incident', 'delayed reporting', 'hidden breach', 'no incident log', 'concealed attack', 'suppressed alert'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },
  {
    id: 'DORA_ART_26',
    name: 'Third-Party ICT Risk',
    article: 'DORA Art. 26',
    description: 'Financial entities shall manage ICT third-party risk as integral part of ICT risk, including due diligence, contractual arrangements, and exit strategies.',
    violationPatterns: ['no vendor assessment', 'unvetted third party', 'no exit strategy', 'no vendor monitoring', 'uncontrolled outsourcing', 'no supply chain risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-01-17',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // NIST AI RMF 1.0 (United States)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'NIST_GOVERN',
    name: 'GOVERN Function',
    article: 'NIST AI RMF — GOVERN',
    description: 'Cultivate and implement a culture of risk management within organizations designing, developing, deploying, or using AI systems.',
    violationPatterns: ['no ai governance', 'no risk culture', 'no accountability framework', 'ungoverned ai', 'no oversight structure'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-01-26',
  },
  {
    id: 'NIST_MAP',
    name: 'MAP Function',
    article: 'NIST AI RMF — MAP',
    description: 'Context is recognized and risks related to context are identified. Map AI system interdependencies and potential impacts.',
    violationPatterns: ['unmapped risk', 'no context analysis', 'no impact assessment', 'no stakeholder analysis', 'ignore interdependencies'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-01-26',
  },
  {
    id: 'NIST_MEASURE',
    name: 'MEASURE Function',
    article: 'NIST AI RMF — MEASURE',
    description: 'Employ quantitative, qualitative, or mixed-method tools and techniques to analyze, benchmark, and monitor AI risk and related impacts.',
    violationPatterns: ['no measurement', 'no benchmarks', 'untested performance', 'no bias metrics', 'no fairness testing'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-01-26',
  },
  {
    id: 'NIST_MANAGE',
    name: 'MANAGE Function',
    article: 'NIST AI RMF — MANAGE',
    description: 'Allocate risk resources to mapped and measured risks on a regular basis. Manage AI risks through treatment, transfer, avoidance, or acceptance.',
    violationPatterns: ['unmanaged risk', 'no mitigation plan', 'no risk treatment', 'ignored findings', 'no remediation'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-01-26',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // UK AI SAFETY INSTITUTE
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'UK_AISI_SAFETY',
    name: 'Safety Testing',
    article: 'UK AISI — Safety Evaluation',
    description: 'AI systems must undergo rigorous safety testing including red-teaming, adversarial testing, and capability evaluations before deployment.',
    violationPatterns: ['no safety testing', 'untested deployment', 'skip red team', 'no adversarial test', 'no capability eval'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-11-01',
  },
  {
    id: 'UK_AISI_TRANSPARENCY',
    name: 'Model Transparency',
    article: 'UK AISI — Transparency',
    description: 'Developers must provide transparency about model capabilities, limitations, and appropriate use cases.',
    violationPatterns: ['hidden capabilities', 'no model card', 'undisclosed limitations', 'no use case guidance', 'opaque deployment'],
    riskLevel: 'LIMITED',
    enforcementDate: '2025-11-01',
  },
  {
    id: 'UK_AISI_CONTROL',
    name: 'Human Control',
    article: 'UK AISI — Human Control',
    description: 'Appropriate human oversight and control mechanisms must be maintained throughout the AI lifecycle.',
    violationPatterns: ['no human control', 'autonomous without oversight', 'removed human loop', 'no intervention mechanism', 'uncontrolled autonomy'],
    riskLevel: 'HIGH',
    enforcementDate: '2025-11-01',
  },
  {
    id: 'UK_AISI_SOCIETAL',
    name: 'Societal Wellbeing',
    article: 'UK AISI — Societal Impact',
    description: 'AI systems must be developed and deployed with consideration for broader societal impacts and wellbeing.',
    violationPatterns: ['ignore societal impact', 'no impact study', 'harmful deployment', 'no public interest', 'negative externalities'],
    riskLevel: 'LIMITED',
    enforcementDate: '2025-11-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CANADA AIDA — Artificial Intelligence and Data Act (Bill C-27)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'CA_AIDA_RISK',
    name: 'Risk Assessment',
    article: 'AIDA — Risk Assessment',
    description: 'Persons responsible for high-impact AI systems must assess whether the system is a high-impact system and conduct risk assessments.',
    violationPatterns: ['no risk assessment', 'unassessed ai system', 'skip impact evaluation', 'no high-impact check', 'undeclared risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'CA_AIDA_MITIGATE',
    name: 'Risk Mitigation',
    article: 'AIDA — Mitigation Measures',
    description: 'Establish measures to mitigate risks of harm or biased output identified through risk assessment.',
    violationPatterns: ['no mitigation', 'unmitigated bias', 'no corrective action', 'ignore bias findings', 'no harm reduction'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'CA_AIDA_RECORDS',
    name: 'Record-Keeping',
    article: 'AIDA — Records',
    description: 'Maintain records of risk assessments, mitigation measures, and monitoring activities for high-impact AI systems.',
    violationPatterns: ['no records kept', 'deleted assessment records', 'no audit trail aida', 'incomplete documentation', 'missing mitigation records'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'CA_AIDA_NOTIFY',
    name: 'Notification Obligation',
    article: 'AIDA — Notification',
    description: 'Notify the Minister if a high-impact AI system results or is likely to result in material harm.',
    violationPatterns: ['unreported harm', 'no notification', 'concealed incident', 'hidden material harm', 'suppressed ai incident'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-06-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // NDIS QUALITY & SAFEGUARDS (Australia)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'NDIS_SCREENING',
    name: 'Worker Screening',
    article: 'NDIS Practice Standard — Worker Screening',
    description: 'All workers and key personnel involved in NDIS service delivery must undergo and maintain valid worker screening checks.',
    violationPatterns: ['unscreened worker', 'expired screening', 'no background check', 'bypass worker check', 'unverified personnel'],
    riskLevel: 'HIGH',
    enforcementDate: '2020-07-01',
  },
  {
    id: 'NDIS_INCIDENT',
    name: 'Incident Management',
    article: 'NDIS Practice Standard — Incident Management',
    description: 'Providers must have systems to identify, manage, resolve, and learn from incidents including reportable incidents to the NDIS Commission.',
    violationPatterns: ['unreported incident ndis', 'no incident management', 'concealed participant harm', 'no reportable incident process', 'hidden abuse'],
    riskLevel: 'HIGH',
    enforcementDate: '2020-07-01',
  },
  {
    id: 'NDIS_RESTRICTIVE',
    name: 'Restrictive Practices',
    article: 'NDIS Practice Standard — Restrictive Practices',
    description: 'Restrictive practices must only be used as a last resort, with appropriate authorisation, and must be reported to the NDIS Commission.',
    violationPatterns: ['unauthorized restraint', 'unreported restrictive practice', 'no behaviour support plan', 'unapproved seclusion', 'excessive restriction'],
    riskLevel: 'UNACCEPTABLE',
    enforcementDate: '2020-07-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUSTRALIA PRIVACY ACT 2026 AMENDMENTS (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'AU_PRIVACY_15C',
    name: 'Automated Decision Transparency',
    article: 'Privacy Act s15C',
    description: 'Organizations must inform individuals when a substantially automated decision is made that significantly affects their rights or interests, including the logic involved.',
    violationPatterns: ['undisclosed automated decision', 'hidden algorithmic decision', 'no decision transparency', 'secret automated process', 'concealed ai decision'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-12-10',
  },
  {
    id: 'AU_PRIVACY_26WA',
    name: 'AI System Registration',
    article: 'Privacy Act s26WA',
    description: 'High-risk AI systems processing personal information must be registered with the Australian Information Commissioner, including purpose, data categories, and risk assessments.',
    violationPatterns: ['unregistered ai system', 'no oaic registration', 'undeclared ai processing', 'unregistered high risk ai', 'no system registration'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-12-10',
  },
  {
    id: 'AU_PRIVACY_26WB',
    name: 'Algorithmic Impact Assessment',
    article: 'Privacy Act s26WB',
    description: 'Organizations must conduct and document algorithmic impact assessments for AI systems that process personal information at scale, assessing risks to privacy, fairness, and autonomy.',
    violationPatterns: ['no algorithmic impact assessment', 'no aia conducted', 'skip privacy impact', 'no fairness assessment', 'undocumented ai risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-12-10',
  },
  {
    id: 'AU_PRIVACY_26WC',
    name: 'Right to Explanation',
    article: 'Privacy Act s26WC',
    description: 'Individuals have the right to receive a meaningful explanation of how an automated decision was made, including the key factors and data used, within 30 days of request.',
    violationPatterns: ['denied explanation', 'no right to explanation', 'refused decision rationale', 'unexplainable decision', 'no meaningful explanation'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-12-10',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INDIA IT AMENDMENT RULES 2026 (NEW)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'IN_IT_LABEL',
    name: 'AI Content Labeling',
    article: 'IT Rules 2026 — Rule 3(1)(b)(v)',
    description: 'All AI-generated or AI-modified content must be clearly labeled as such. Social media intermediaries must ensure AI content carries persistent machine-readable metadata.',
    violationPatterns: ['unlabeled ai content', 'no ai label', 'unmarked generated content', 'hidden ai origin', 'no content attribution india'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'IN_IT_DEEPFAKE',
    name: 'Deepfake Prohibition',
    article: 'IT Rules 2026 — Rule 3(1)(b)(vi)',
    description: 'AI-generated deepfakes depicting real persons must be removed within 24 hours of reporting. Platforms must deploy detection systems and maintain removal records.',
    violationPatterns: ['deepfake distribution', 'no deepfake detection', 'delayed deepfake removal', 'synthetic impersonation', 'no takedown compliance india'],
    riskLevel: 'UNACCEPTABLE',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'IN_IT_ALGO_TRANSPARENCY',
    name: 'Algorithmic Transparency',
    article: 'IT Rules 2026 — Rule 3(2)(b)',
    description: 'Significant social media intermediaries must publish algorithmic transparency reports explaining recommendation systems, content ranking, and personalization logic.',
    violationPatterns: ['no algo transparency report', 'hidden recommendation system', 'undisclosed ranking', 'opaque personalization', 'no algorithmic disclosure india'],
    riskLevel: 'LIMITED',
    enforcementDate: '2026-06-01',
  },
  {
    id: 'IN_IT_USER_NOTIFY',
    name: 'User Notification',
    article: 'IT Rules 2026 — Rule 3(2)(c)',
    description: 'Users must be notified when AI systems are used to moderate, flag, or take action on their content, including the right to appeal automated decisions.',
    violationPatterns: ['no user notification ai', 'hidden content moderation', 'no appeal mechanism', 'undisclosed ai moderation', 'secret automated action'],
    riskLevel: 'LIMITED',
    enforcementDate: '2026-06-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // COLORADO AI ACT (SB 24-205)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'CO_AI_IMPACT',
    name: 'Algorithmic Impact Assessment',
    article: 'CO SB 24-205 § 6-1-1703',
    description: 'Developers and deployers of high-risk AI systems must complete impact assessments before deployment, evaluating risks of algorithmic discrimination.',
    violationPatterns: ['no impact assessment colorado', 'skip algo discrimination check', 'no bias evaluation', 'undocumented ai risk co', 'no pre-deployment assessment'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-02-01',
  },
  {
    id: 'CO_AI_DISCLOSURE',
    name: 'Consumer Disclosure',
    article: 'CO SB 24-205 § 6-1-1704',
    description: 'Deployers must notify consumers when a high-risk AI system makes or is a substantial factor in making a consequential decision, with explanation of the decision.',
    violationPatterns: ['no consumer disclosure co', 'hidden ai decision', 'no consequential decision notice', 'undisclosed ai involvement', 'no explanation provided'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-02-01',
  },
  {
    id: 'CO_AI_GOVERNANCE',
    name: 'Risk Management Program',
    article: 'CO SB 24-205 § 6-1-1702',
    description: 'Deployers must implement a risk management policy and governance program to identify, document, and mitigate risks of algorithmic discrimination.',
    violationPatterns: ['no risk management co', 'no governance program', 'no discrimination mitigation', 'ungoverned high risk ai co', 'no algo fairness program'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-02-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CALIFORNIA AUTOMATED DECISION TOOLS (AB 2930 / SB 1047)
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'CA_ADT_IMPACT',
    name: 'Impact Assessment',
    article: 'CA AB 2930 — Impact Assessment',
    description: 'Deployers of automated decision tools must perform impact assessments before use and annually thereafter, evaluating risks of adverse impacts on protected classes.',
    violationPatterns: ['no impact assessment ca', 'no annual review adt', 'skip adverse impact check', 'no protected class analysis', 'undocumented adt risk'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-01-01',
  },
  {
    id: 'CA_ADT_NOTICE',
    name: 'Consumer Notification',
    article: 'CA AB 2930 — Notice',
    description: 'Deployers must provide clear notice to individuals subject to automated decision tools, including the purpose of the tool and the right to opt out where feasible.',
    violationPatterns: ['no adt notice', 'no opt out offered', 'hidden automated decision ca', 'no purpose disclosure adt', 'denied opt out right'],
    riskLevel: 'HIGH',
    enforcementDate: '2026-01-01',
  },
  {
    id: 'CA_FRONTIER_SAFETY',
    name: 'Frontier Model Safety',
    article: 'CA SB 1047 — Safety Protocols',
    description: 'Developers of frontier AI models exceeding compute thresholds must implement safety protocols, conduct pre-deployment testing, and maintain ability to shut down the model.',
    violationPatterns: ['no frontier safety protocol', 'no pre-deployment test', 'no shutdown capability', 'untested frontier model', 'no safety evaluation ca'],
    riskLevel: 'UNACCEPTABLE',
    enforcementDate: '2026-01-01',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ISO 42001 — AI MANAGEMENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'ISO_42001_CONTEXT',
    name: 'Organizational Context',
    article: 'ISO 42001 Clause 4',
    description: 'Organizations shall determine external and internal issues relevant to AI management, understand stakeholder needs, and define the scope of the AI management system.',
    violationPatterns: ['no organizational context', 'undefined ai scope', 'no stakeholder analysis iso', 'missing aims boundary', 'no context determination'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-12-18',
  },
  {
    id: 'ISO_42001_LEADERSHIP',
    name: 'Leadership & Commitment',
    article: 'ISO 42001 Clause 5',
    description: 'Top management shall demonstrate leadership and commitment to the AI management system, establish AI policy, and assign roles and responsibilities.',
    violationPatterns: ['no ai policy', 'no leadership commitment', 'unassigned ai roles', 'no management review ai', 'missing ai governance leadership'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-12-18',
  },
  {
    id: 'ISO_42001_RISK',
    name: 'Risk Treatment',
    article: 'ISO 42001 Clause 6.1',
    description: 'Organizations shall plan actions to address AI risks and opportunities, conduct AI risk assessments, and implement AI risk treatment plans with controls from Annex A.',
    violationPatterns: ['no iso risk treatment', 'no annex a controls', 'no ai risk plan', 'unaddressed ai risks iso', 'no risk treatment plan'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-12-18',
  },
  {
    id: 'ISO_42001_PERFORMANCE',
    name: 'Performance Evaluation',
    article: 'ISO 42001 Clause 9',
    description: 'Organizations shall monitor, measure, analyse and evaluate AI management system performance, conduct internal audits, and management reviews.',
    violationPatterns: ['no performance monitoring iso', 'no internal audit ai', 'no management review', 'unmeasured ai performance', 'no kpi tracking ai'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-12-18',
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ISO 23894 — AI RISK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'ISO_23894_LIFECYCLE',
    name: 'AI Lifecycle Risk',
    article: 'ISO 23894 — Lifecycle Integration',
    description: 'AI risk management shall be integrated throughout the entire AI system lifecycle from design through decommission, with continuous monitoring and reassessment.',
    violationPatterns: ['no lifecycle risk management', 'no continuous monitoring iso', 'no decommission plan', 'static risk assessment iso', 'no lifecycle integration'],
    riskLevel: 'HIGH',
    enforcementDate: '2023-02-15',
  },
];

// ── Cryptographic Primitives ───────────────────────────────────────────

export async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateCommitId(): Promise<string> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `APEX-${hex.substring(0, 8).toUpperCase()}-${hex.substring(8, 12).toUpperCase()}`;
}

// ── Merkle Tree Implementation ─────────────────────────────────────────

export class MerkleTree {
  private leaves: string[] = [];
  private layers: string[][] = [];

  constructor(leaves: string[] = []) {
    this.leaves = [...leaves];
    if (leaves.length > 0) {
      // Will be built async via initFromLeaves
    }
  }

  private async computeLayers(): Promise<string[][]> {
    if (this.leaves.length === 0) return [['0'.repeat(64)]];

    let currentLayer = [...this.leaves];
    const layers: string[][] = [currentLayer];

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : currentLayer[i]; // duplicate last if odd
        const combined = left < right ? left + right : right + left; // canonical ordering
        const parentHash = await hashSHA256(combined);
        nextLayer.push(parentHash);
      }
      currentLayer = nextLayer;
      layers.push(currentLayer);
    }

    return layers;
  }

  /**
   * Initialize tree from existing leaves (for persistence recovery)
   */
  async initFromLeaves(leaves: string[]): Promise<void> {
    this.leaves = [...leaves];
    this.layers = await this.computeLayers();
  }

  async addLeaf(leafHash: string): Promise<void> {
    this.leaves.push(leafHash);
    this.layers = await this.computeLayers();
  }

  async getRoot(): Promise<string> {
    if (this.layers.length === 0) {
      this.layers = await this.computeLayers();
    }
    const topLayer = this.layers[this.layers.length - 1];
    return topLayer ? topLayer[0] : '0'.repeat(64);
  }

  async getProof(leafIndex: number): Promise<MerkleProofPath> {
    if (this.layers.length === 0) {
      this.layers = await this.computeLayers();
    }

    const proof: MerkleProofPath = [];
    let idx = leafIndex;

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i];
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;

      if (siblingIdx < layer.length) {
        proof.push({
          hash: layer[siblingIdx],
          position: isRight ? 'left' : 'right',
        });
      }

      idx = Math.floor(idx / 2);
    }

    return proof;
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  getDepth(): number {
    return this.layers.length;
  }

  getState(): MerkleTreeState {
    return {
      root: this.layers.length > 0 ? this.layers[this.layers.length - 1][0] : '0'.repeat(64),
      leaves: [...this.leaves],
      depth: this.layers.length,
      nodeCount: this.layers.reduce((sum, l) => sum + l.length, 0),
    };
  }

  getLayers(): string[][] {
    return this.layers.map(l => [...l]);
  }

  /**
   * Clear all state (for reset)
   */
  clear(): void {
    this.leaves = [];
    this.layers = [];
  }
}

// ── Static Verification (Merkle proof verification without tree) ───────

export async function verifyMerkleProof(
  leafHash: string,
  proof: MerkleProofPath,
  root: string
): Promise<boolean> {
  let computedHash = leafHash;

  for (const step of proof) {
    const left = step.position === 'left' ? step.hash : computedHash;
    const right = step.position === 'left' ? computedHash : step.hash;
    const combined = left < right ? left + right : right + left;
    computedHash = await hashSHA256(combined);
  }

  return computedHash === root;
}

// ── Compliance Check ───────────────────────────────────────────────────

export function checkCompliance(actionText: string, predicateId: string): { compliant: boolean; violationFound?: string; predicate?: Predicate } {
  const predicate = PREDICATES.find(p => p.id === predicateId);
  if (!predicate) return { compliant: true };

  const lowerAction = actionText.toLowerCase();
  for (const pattern of predicate.violationPatterns) {
    if (lowerAction.includes(pattern)) {
      return { compliant: false, violationFound: pattern, predicate };
    }
  }
  return { compliant: true, predicate };
}

// ── Full Pipeline: Commit → Challenge → Prove → Verify ─────────────────

const globalTree = new MerkleTree();
let commitLog: CommitRecord[] = [];
let systemPaused = false;
let initialized = false;

export function isSystemPaused(): boolean {
  return systemPaused;
}

export function toggleProtocolPause(): { paused: boolean; timestamp: string } {
  systemPaused = !systemPaused;
  const timestamp = new Date().toISOString();
  return { paused: systemPaused, timestamp };
}

export function getCommitLog(): CommitRecord[] {
  return [...commitLog];
}

export function getTreeState(): MerkleTreeState & { layers: string[][] } {
  return {
    ...globalTree.getState(),
    layers: globalTree.getLayers(),
  };
}

/**
 * Initialize engine from persisted ledger entries
 * Call this on page load to restore cryptographic state
 */
export async function initializeFromLedger(entries: {
  id: string;
  commit_id: string;
  action: string;
  predicate_id: string;
  phase: string;
  status: string | null;
  commit_hash: string;
  merkle_leaf_hash: string;
  challenge_hash: string | null;
  proof_hash: string | null;
  merkle_root: string | null;
  merkle_proof: MerkleProofPath | null;
  violation_found: string | null;
  verification_time_ms: number | null;
  challenged_at: string | null;
  proven_at: string | null;
  created_at: string;
}[]): Promise<{ loaded: number; merkleRoot: string }> {
  if (initialized && entries.length === 0) {
    return { loaded: 0, merkleRoot: await globalTree.getRoot() };
  }

  // Sort by created_at ascending to rebuild in correct order
  const sorted = [...entries].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Extract leaf hashes and rebuild tree
  const leafHashes = sorted.map(e => e.merkle_leaf_hash);
  await globalTree.initFromLeaves(leafHashes);

  // Reconstruct commit log
  commitLog = sorted.map(e => ({
    id: e.commit_id,
    action: e.action,
    predicateId: e.predicate_id,
    timestamp: e.created_at,
    commitHash: e.commit_hash,
    merkleLeafHash: e.merkle_leaf_hash,
    phase: e.phase as GallowsPhase,
    challengeHash: e.challenge_hash ?? undefined,
    proofHash: e.proof_hash ?? undefined,
    merkleProof: e.merkle_proof ?? undefined,
    merkleRoot: e.merkle_root ?? undefined,
    verificationTimeMs: e.verification_time_ms ?? undefined,
    status: e.status as 'APPROVED' | 'BLOCKED' | undefined,
    violationFound: e.violation_found ?? undefined,
    challengedAt: e.challenged_at ?? undefined,
    provenAt: e.proven_at ?? undefined,
    sequenceNumber: (e as any).sequence_number ?? undefined,
    ed25519Signature: (e as any).ed25519_signature ?? undefined,
  })).reverse(); // Reverse so newest is first in commit log

  initialized = true;
  const merkleRoot = await globalTree.getRoot();
  
  return { loaded: sorted.length, merkleRoot };
}

/**
 * Check if engine is initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Reset engine state (for testing)
 */
export function resetEngine(): void {
  globalTree.clear();
  commitLog = [];
  systemPaused = false;
  initialized = false;
}

/**
 * Update a local record with server-side values
 * Used to sync client state with server after challenge/prove
 */
export function updateRecordFromServer(
  commitId: string,
  serverData: Partial<CommitRecord>
): CommitRecord | null {
  const idx = commitLog.findIndex(r => r.id === commitId);
  if (idx === -1) return null;

  const updatedRecord = { ...commitLog[idx], ...serverData };
  commitLog[idx] = updatedRecord;
  
  return updatedRecord;
}

// ── Verification Mode ──────────────────────────────────────────────────

export type VerificationMode = 'OPTIMISTIC' | 'DETERMINISTIC';

let verificationMode: VerificationMode = 'DETERMINISTIC'; // Default: DETERMINISTIC for safety

export function getVerificationMode(): VerificationMode {
  return verificationMode;
}

export function setVerificationMode(mode: VerificationMode): void {
  verificationMode = mode;
}

/**
 * Deterministic pre-flight check.
 * For UNACCEPTABLE and HIGH risk predicates, violations are blocked BEFORE commit.
 * This eliminates the "Optimistic Flaw" — no non-compliant action enters the ledger.
 */
export function deterministicPreFlight(action: string, predicateId: string): {
  allowed: boolean;
  mode: VerificationMode;
  violationFound?: string;
  riskLevel?: string;
} {
  const predicate = PREDICATES.find(p => p.id === predicateId);
  if (!predicate) return { allowed: true, mode: verificationMode };

  // DETERMINISTIC mode: block before commit for UNACCEPTABLE and HIGH risk
  if (verificationMode === 'DETERMINISTIC' && (predicate.riskLevel === 'UNACCEPTABLE' || predicate.riskLevel === 'HIGH')) {
    const { compliant, violationFound } = checkCompliance(action, predicateId);
    if (!compliant) {
      return {
        allowed: false,
        mode: 'DETERMINISTIC',
        violationFound,
        riskLevel: predicate.riskLevel,
      };
    }
  }

  // OPTIMISTIC mode for LIMITED/MINIMAL: allow commit, verify on challenge
  return { allowed: true, mode: verificationMode, riskLevel: predicate.riskLevel };
}

// Phase 1: COMMIT — Hash the action into a Merkle leaf
export async function commitAction(action: string, predicateId: string): Promise<CommitRecord> {
  if (systemPaused) {
    throw new Error('PROTOCOL PAUSE ACTIVE — All operations halted by human oversight authority (EU AI Act Art. 14)');
  }

  // ── DETERMINISTIC PRE-FLIGHT ──
  // UNACCEPTABLE/HIGH risk predicates are blocked BEFORE entering the ledger.
  // This is the fix for the "Optimistic Flaw" — the math must be Immaculate.
  const preFlight = deterministicPreFlight(action, predicateId);
  if (!preFlight.allowed) {
    throw new Error(
      `DETERMINISTIC BLOCK — Action rejected before commit. ` +
      `Risk level: ${preFlight.riskLevel}. ` +
      `Violation: "${preFlight.violationFound}". ` +
      `No non-compliant action enters the ledger.`
    );
  }

  const t0 = performance.now();
  const id = await generateCommitId();
  const timestamp = new Date().toISOString();

  // Create commit hash: H(action | predicateId | timestamp)
  const commitHash = await hashSHA256(`${action}|${predicateId}|${timestamp}`);

  // Create Merkle leaf: H(commitId | commitHash)
  const merkleLeafHash = await hashSHA256(`${id}|${commitHash}`);

  // Add to Merkle tree
  await globalTree.addLeaf(merkleLeafHash);
  const merkleRoot = await globalTree.getRoot();

  const record: CommitRecord = {
    id,
    action,
    predicateId,
    timestamp,
    commitHash,
    merkleLeafHash,
    phase: 'COMMITTED',
    merkleRoot,
    verificationTimeMs: Math.round((performance.now() - t0) * 100) / 100,
  };

  commitLog = [record, ...commitLog];
  return record;
}

// Phase 2: CHALLENGE — Regulator challenges a committed action
export async function challengeCommit(commitId: string): Promise<CommitRecord> {
  if (systemPaused) {
    throw new Error('PROTOCOL PAUSE ACTIVE — All operations halted by human oversight authority (EU AI Act Art. 14)');
  }

  const t0 = performance.now();
  const idx = commitLog.findIndex(r => r.id === commitId);
  if (idx === -1) throw new Error(`Commit ${commitId} not found in ledger`);

  const record = { ...commitLog[idx] };
  const challengeTimestamp = new Date().toISOString();

  // Challenge hash: H(commitHash | challengeTimestamp | predicateId)
  record.challengeHash = await hashSHA256(`${record.commitHash}|${challengeTimestamp}|${record.predicateId}`);
  record.challengedAt = challengeTimestamp;
  record.phase = 'CHALLENGED';

  // Run compliance check
  const { compliant, violationFound } = checkCompliance(record.action, record.predicateId);
  record.status = compliant ? 'APPROVED' : 'BLOCKED';
  record.violationFound = violationFound;

  record.verificationTimeMs = Math.round((performance.now() - t0) * 100) / 100;
  commitLog[idx] = record;
  return record;
}

// Phase 3: PROVE — Generate Merkle inclusion proof
export async function proveCommit(commitId: string): Promise<CommitRecord> {
  if (systemPaused) {
    throw new Error('PROTOCOL PAUSE ACTIVE — All operations halted by human oversight authority (EU AI Act Art. 14)');
  }

  const t0 = performance.now();
  const idx = commitLog.findIndex(r => r.id === commitId);
  if (idx === -1) throw new Error(`Commit ${commitId} not found in ledger`);

  const record = { ...commitLog[idx] };

  // Find the leaf index in the tree
  const treeState = globalTree.getState();
  const leafIndex = treeState.leaves.indexOf(record.merkleLeafHash);
  if (leafIndex === -1) throw new Error('Merkle leaf not found in tree');

  // Generate Merkle proof
  const merkleProof = await globalTree.getProof(leafIndex);
  const merkleRoot = await globalTree.getRoot();

  // Proof hash: H(merkleRoot | proofPath | status)
  const proofData = `${merkleRoot}|${JSON.stringify(merkleProof)}|${record.status || 'PENDING'}`;
  record.proofHash = await hashSHA256(proofData);
  record.merkleProof = merkleProof;
  record.merkleRoot = merkleRoot;
  record.provenAt = new Date().toISOString();
  record.phase = 'VERIFIED';

  record.verificationTimeMs = (record.verificationTimeMs || 0) + Math.round((performance.now() - t0) * 100) / 100;
  commitLog[idx] = record;
  return record;
}

// Verify any hash against the current Merkle root
export async function verifyHash(hash: string): Promise<{
  found: boolean;
  record?: CommitRecord;
  verified: boolean;
  merkleRoot: string;
}> {
  const merkleRoot = await globalTree.getRoot();
  const record = commitLog.find(
    r => r.commitHash === hash || r.merkleLeafHash === hash || r.proofHash === hash || r.challengeHash === hash
  );

  if (!record) {
    return { found: false, verified: false, merkleRoot };
  }

  // Verify Merkle inclusion if proof exists
  let verified = false;
  if (record.merkleProof && record.merkleRoot) {
    verified = await verifyMerkleProof(record.merkleLeafHash, record.merkleProof, record.merkleRoot);
  }

  return { found: true, record, verified, merkleRoot };
}

// Legacy compat
export async function runGallows(actionText: string, predicateId: string): Promise<GallowsResult> {
  const record = await commitAction(actionText, predicateId);
  const challenged = await challengeCommit(record.id);
  const proven = await proveCommit(record.id);

  return {
    status: proven.status || 'APPROVED',
    verificationTimeMs: proven.verificationTimeMs || 0,
    auditHash: proven.proofHash || proven.commitHash,
    predicateId,
    timestamp: proven.timestamp,
    actionSummary: actionText.length > 80 ? actionText.substring(0, 77) + '...' : actionText,
    violationFound: proven.violationFound,
  };
}
