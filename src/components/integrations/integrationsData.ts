export type IntegrationStatus = "available" | "development" | "soon";

export interface Integration {
  slug: string;
  name: string;
  category: "AI Agents" | "LLM Frameworks" | "Automation" | "Data" | "Auth" | "Compliance" | "Cloud";
  initials: string;
  description: string;
  install: string;
  status: IntegrationStatus;
  docs: string;
  docsExternal?: boolean;
}

export const GITHUB_REPO = "https://github.com/kawal393/digital-gallowsapex-infrastructurecom";

export const CATEGORIES = [
  "All",
  "AI Agents",
  "LLM Frameworks",
  "Automation",
  "Data",
  "Auth",
  "Compliance",
  "Cloud",
] as const;

export const STATUS_META: Record<IntegrationStatus, { label: string; className: string }> = {
  available: {
    label: "Available Now",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  development: {
    label: "In Development",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  },
  soon: {
    label: "Coming Soon",
    className: "border-border bg-muted/30 text-muted-foreground",
  },
};

export const INTEGRATIONS: Integration[] = [
  {
    slug: "anthropic-mcp",
    name: "MCP Server for Anthropic",
    category: "AI Agents",
    initials: "MCP",
    description: "Exposes seal, verify, anchor, cite and audit as Model Context Protocol tools for Claude and any MCP client.",
    install: "npx -y @apex/psi-mcp install",
    status: "available",
    docs: "/mcp",
  },
  {
    slug: "langchain",
    name: "LangChain",
    category: "LLM Frameworks",
    initials: "LC",
    description: "Callback handler that seals every chain and agent step, returning a PSI receipt per run.",
    install: "pip install apex-psi-langchain",
    status: "development",
    docs: "/sdk",
  },
  {
    slug: "composio",
    name: "Composio",
    category: "AI Agents",
    initials: "CO",
    description: "APEX PSI as a Composio tool so hosted agents can seal and verify evidence inside existing action sets.",
    install: "npm i @apex/psi-composio",
    status: "development",
    docs: "/api",
  },
  {
    slug: "nango",
    name: "Nango",
    category: "Auth",
    initials: "NG",
    description: "Managed OAuth and sync integration that pipes third-party records into the PSI evidence ledger.",
    install: "npm i @apex/psi-nango",
    status: "soon",
    docs: "/api",
  },
  {
    slug: "arcade",
    name: "Arcade",
    category: "AI Agents",
    initials: "AR",
    description: "Authenticated tool-calling runtime wrapper that attaches a PSI receipt to each executed tool call.",
    install: "pip install apex-psi-arcade",
    status: "soon",
    docs: "/api",
  },
  {
    slug: "huggingface",
    name: "Hugging Face Spaces",
    category: "Data",
    initials: "HF",
    description: "Public demo Space that hashes a file in-browser and returns a signed, independently checkable receipt.",
    install: "git clone https://huggingface.co/spaces/apex-psi/seal",
    status: "development",
    docs: "/seal",
  },
  {
    slug: "make",
    name: "Make.com",
    category: "Automation",
    initials: "MK",
    description: "Scenario module that seals any payload mid-flow and stores the receipt hash on the record.",
    install: "curl -s https://ai-governance-standard.com/.well-known/apex-protocol.json",
    status: "development",
    docs: "/api",
  },
  {
    slug: "pipedream",
    name: "Pipedream",
    category: "Automation",
    initials: "PD",
    description: "Workflow step that calls the public notarize endpoint and emits the receipt to downstream steps.",
    install: "npm i @apex/psi-node",
    status: "development",
    docs: "/api",
  },
  {
    slug: "activepieces",
    name: "Activepieces",
    category: "Automation",
    initials: "AP",
    description: "Open-source automation piece for sealing and verifying hashes inside self-hosted flows.",
    install: "npm i @apex/psi-activepieces",
    status: "soon",
    docs: "/api",
  },
  {
    slug: "zapier",
    name: "Zapier",
    category: "Automation",
    initials: "ZP",
    description: "Webhook-based Zap action that notarizes an event and returns the verify URL for the receipt.",
    install: "curl -X POST https://ai-governance-standard.com/api/v1/notarize",
    status: "soon",
    docs: "/api",
  },
  {
    slug: "vercel-ai",
    name: "Vercel AI SDK",
    category: "LLM Frameworks",
    initials: "V",
    description: "Middleware that wraps streamText and generateText so each generation ships a Compliance-Receipt header.",
    install: "npm i @apex/psi-vercel-ai",
    status: "available",
    docs: "/sdk",
  },
  {
    slug: "openai-functions",
    name: "OpenAI Function Calling",
    category: "Compliance",
    initials: "AI",
    description: "Drop-in wrapper for chat completions and tool calls that seals each function result before it is used.",
    install: "npm i @apex/psi-openai",
    status: "available",
    docs: "/sdk",
  },
];

export const HERO_INTEGRATIONS = [
  { label: "Anthropic MCP", slug: "anthropic-mcp" },
  { label: "LangChain", slug: "langchain" },
  { label: "Composio", slug: "composio" },
  { label: "Nango", slug: "nango" },
  { label: "Hugging Face", slug: "huggingface" },
  { label: "Make", slug: "make" },
  { label: "Pipedream", slug: "pipedream" },
  { label: "Activepieces", slug: "activepieces" },
  { label: "Zapier", slug: "zapier" },
];
