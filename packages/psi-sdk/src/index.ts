// ═══════════════════════════════════════════════════════════════════════
// @apex/gallows-sdk — Runtime Compliance Verification SDK
// Block non-compliant AI actions BEFORE they reach end users
// ═══════════════════════════════════════════════════════════════════════

export interface ApexConfig {
  /** Your APEX project endpoint */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default predicates to check against */
  predicates?: string[];
  /** Verification mode: 'blocking' halts response, 'monitoring' logs only */
  mode?: 'blocking' | 'monitoring';
  /** Timeout in ms (default: 5000) */
  timeout?: number;
  /** Enable local pattern cache for sub-15ms verification */
  localCache?: boolean;
}

export interface VerifyResult {
  compliant: boolean;
  commitId: string;
  status: 'APPROVED' | 'BLOCKED';
  predicateId: string;
  commitHash: string;
  merkleLeafHash: string;
  violationFound?: string;
  verificationTimeMs: number;
  mpcConsensus?: {
    nodesResponded: number;
    threshold: string;
    consensusSignature: string;
  };
}

export interface CommitResult {
  commitId: string;
  commitHash: string;
  merkleLeafHash: string;
  timestamp: string;
}

export interface MiddlewareOptions {
  /** Which predicates to enforce */
  predicates: string[];
  /** 'blocking' stops response, 'monitoring' logs and continues */
  mode: 'blocking' | 'monitoring';
  /** Custom handler for violations */
  onViolation?: (result: VerifyResult, req: any, res: any) => void;
  /** Skip verification for certain paths */
  skipPaths?: string[];
}

// Local violation pattern cache for sub-15ms verification
const PATTERN_CACHE: Record<string, string[]> = {
  EU_ART_5: ["subliminal manipulation", "exploit vulnerability", "social scoring", "mass surveillance", "biometric identification public", "manipulate behavior"],
  EU_ART_6: ["unclassified high risk", "no risk assessment", "skip classification", "bypass annex iii"],
  EU_ART_9: ["no risk management", "skip risk assessment", "static risk", "no lifecycle monitoring"],
  EU_ART_11: ["no documentation", "undocumented model", "missing technical docs"],
  EU_ART_12: ["no logging", "disable audit trail", "no record keeping", "delete logs", "unauditable"],
  EU_ART_13: ["black box", "no interpretability", "opaque model", "unexplainable", "no transparency"],
  EU_ART_14: ["autonomous decision", "no human review", "override human", "bypass approval", "without human", "disable kill switch"],
  EU_ART_15: ["unverified data", "no validation", "untested model", "fabricated"],
  EU_ART_50: ["undisclosed ai", "no attribution", "hidden synthetic", "deepfake without label", "without disclosure"],
  EU_ART_52: ["impersonate human", "pretend to be person", "hide ai identity", "no bot disclosure"],
  MIFID_ART_16: ["no algo controls", "unmonitored trading", "no circuit breaker"],
  MIFID_ART_17: ["untested algorithm", "no market abuse check", "flash crash risk", "market manipulation"],
  MIFID_ART_25: ["no suitability check", "unsuitable advice", "ignore client profile"],
  MIFID_ART_27: ["worst execution", "no best execution", "front running"],
  DORA_ART_5: ["no ict governance", "no risk framework", "unmanaged cyber risk"],
  DORA_ART_6: ["outdated systems", "unpatched software", "legacy vulnerability"],
  DORA_ART_9: ["no monitoring", "no threat detection", "disabled security"],
  DORA_ART_11: ["no backup", "no disaster recovery", "untested recovery"],
  DORA_ART_17: ["unreported incident", "delayed reporting", "hidden breach"],
  DORA_ART_26: ["no vendor assessment", "unvetted third party", "no exit strategy"],
  // NIST AI RMF (United States)
  NIST_MAP_1: ["no intended purpose", "undefined use case", "missing context", "no stakeholder analysis"],
  NIST_MEASURE_2: ["no bias testing", "untested fairness", "no performance metric", "unvalidated model"],
  NIST_MANAGE_3: ["no risk treatment", "unmitigated risk", "no incident response", "ignored risk"],
  NIST_GOVERN_1: ["no ai governance", "no accountability", "no responsible ai policy", "ungoverned ai"],
  // UK AI Safety Institute
  UK_AISI_1: ["unsafe deployment", "no safety testing", "untested capability", "no red teaming"],
  UK_AISI_2: ["no eval framework", "missing safety eval", "no capability assessment", "unassessed risk"],
  UK_AISI_3: ["deceptive ai", "misaligned objective", "no alignment testing", "goal misalignment"],
  // Canada Bill C-27 / AIDA
  CA_AIDA_5: ["no impact assessment", "unassessed ai system", "no high impact review"],
  CA_AIDA_6: ["no mitigation measures", "unmitigated harm", "no bias mitigation"],
  CA_AIDA_7: ["no transparency report", "undisclosed ai use", "no public disclosure"],
  CA_AIDA_11: ["no record keeping", "deleted records", "no audit records"],
  // EU AI Act — additional
  EU_ART_10: ["biased training data", "unrepresentative data", "no data governance", "data quality unknown"],
  EU_ANNEX_III: ["unclassified high-risk", "no annex iii assessment", "skip high-risk review", "undeclared high-risk"],
  // NDIS (Australia)
  NDIS_PRACTICE: ["no practice standards", "unqualified provider", "no participant consent", "restrictive practice"],
  NDIS_QUALITY: ["no quality indicators", "failed quality audit", "no continuous improvement", "non-compliant service"],
};

/**
 * APEX PSI SDK
 * 
 * @example
 * ```typescript
 * import { ApexGallows } from '@apex/gallows-sdk';
 * 
 * const gallows = new ApexGallows({
 *   endpoint: 'https://your-project.supabase.co/functions/v1',
 *   predicates: ['EU_ART_14', 'EU_ART_50'],
 *   mode: 'blocking',
 * });
 * 
 * // Verify before sending AI response
 * const result = await gallows.verify('AI-generated summary', 'EU_ART_50');
 * if (!result.compliant) {
 *   console.log('BLOCKED:', result.violationFound);
 * }
 * ```
 */
export class ApexGallows {
  private config: Required<ApexConfig>;

  constructor(config: ApexConfig) {
    this.config = {
      endpoint: config.endpoint.replace(/\/$/, ''),
      apiKey: config.apiKey || '',
      predicates: config.predicates || ['EU_ART_50'],
      mode: config.mode || 'blocking',
      timeout: config.timeout || 5000,
      localCache: config.localCache ?? true,
    };
  }

  /**
   * Quick local compliance check (sub-1ms, no network).
   * Use for pre-flight screening before full cryptographic verification.
   */
  checkLocal(action: string, predicateId: string): { compliant: boolean; violationFound?: string } {
    const patterns = PATTERN_CACHE[predicateId];
    if (!patterns) return { compliant: true };
    
    const lower = action.toLowerCase();
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return { compliant: false, violationFound: pattern };
      }
    }
    return { compliant: true };
  }

  /**
   * Full cryptographic verification via server.
   * Commits action, challenges, and proves through the full pipeline.
   */
  async verify(action: string, predicateId?: string): Promise<VerifyResult> {
    const predicate = predicateId || this.config.predicates[0];
    const t0 = Date.now();

    // Step 1: Local pre-flight check
    if (this.config.localCache) {
      const local = this.checkLocal(action, predicate);
      if (!local.compliant && this.config.mode === 'blocking') {
        return {
          compliant: false,
          commitId: 'LOCAL-PREFLIGHT',
          status: 'BLOCKED',
          predicateId: predicate,
          commitHash: '',
          merkleLeafHash: '',
          violationFound: local.violationFound,
          verificationTimeMs: Date.now() - t0,
        };
      }
    }

    // Step 2: Server-side commit
    const commitResult = await this.commit(action, predicate);

    // Step 3: Challenge
    const challengeResp = await this._fetch('challenge-action', { commit_id: commitResult.commitId });

    // Step 4: Prove (with MPC consensus)
    const proveResp = await this._fetch('prove-action', { commit_id: commitResult.commitId });

    // Step 5: MPC verification (optional, for distributed consensus)
    let mpcConsensus;
    try {
      const mpcResp = await this._fetch('mpc-coordinator', { commit_id: commitResult.commitId });
      if (mpcResp.success) {
        mpcConsensus = {
          nodesResponded: mpcResp.nodes_responded,
          threshold: mpcResp.threshold,
          consensusSignature: mpcResp.consensus_signature,
        };
      }
    } catch {
      // MPC is best-effort
    }

    return {
      compliant: proveResp.status === 'APPROVED',
      commitId: commitResult.commitId,
      status: proveResp.status,
      predicateId: predicate,
      commitHash: commitResult.commitHash,
      merkleLeafHash: commitResult.merkleLeafHash,
      violationFound: proveResp.violation_found,
      verificationTimeMs: Date.now() - t0,
      mpcConsensus,
    };
  }

  /**
   * Commit an action to the ledger without full verification.
   */
  async commit(action: string, predicateId?: string): Promise<CommitResult> {
    const predicate = predicateId || this.config.predicates[0];
    const resp = await this._fetch('commit-action', {
      action,
      predicate_id: predicate,
      client_commit_hash: '',
      client_leaf_hash: '',
    });

    return {
      commitId: resp.commit_id,
      commitHash: resp.commit_hash,
      merkleLeafHash: resp.merkle_leaf_hash,
      timestamp: resp.timestamp,
    };
  }

  /**
   * Express/Node.js middleware for runtime inference blocking.
   * 
   * @example
   * ```typescript
   * app.use('/api/ai', gallows.middleware({
   *   predicates: ['EU_ART_14', 'EU_ART_50'],
   *   mode: 'blocking',
   * }));
   * ```
   */
  middleware(options: MiddlewareOptions) {
    return async (req: any, res: any, next: any) => {
      // Skip specified paths
      if (options.skipPaths?.some(p => req.path?.startsWith(p))) {
        return next();
      }

      try {
        // Extract AI response content from request/response
        const originalJson = res.json.bind(res);
        res.json = async (body: any) => {
          const content = typeof body === 'string' ? body : JSON.stringify(body);

          // Check each predicate
          for (const predicateId of options.predicates) {
            const result = await this.verify(content, predicateId);

            if (!result.compliant) {
              if (options.mode === 'blocking') {
                if (options.onViolation) {
                  return options.onViolation(result, req, res);
                }
                return originalJson({
                  error: 'COMPLIANCE_VIOLATION',
                  blocked: true,
                  predicateId,
                  violation: result.violationFound,
                  commitId: result.commitId,
                  message: `Action blocked by EU AI Act ${predicateId}`,
                });
              }
              // Monitoring mode: log and continue
              console.warn(`[APEX] Violation detected: ${result.violationFound} (${predicateId})`);
            }
          }

          return originalJson(body);
        };

        next();
      } catch (err) {
        // Fail-open: if verification fails, allow through with warning
        console.error('[APEX] Middleware error:', err);
        next();
      }
    };
  }

  private async _fetch(fn: string, body: object): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const resp = await fetch(`${this.config.endpoint}/${fn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`APEX API error: ${resp.status}`);
      }

      return await resp.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ── React Hook ─────────────────────────────────────────────────────────

/**
 * React hook for client-side compliance verification.
 * 
 * @example
 * ```tsx
 * const { verify, isVerifying, lastResult } = useGallowsVerify({
 *   endpoint: 'https://your-project.supabase.co/functions/v1',
 *   predicates: ['EU_ART_50'],
 * });
 * 
 * const handleSubmit = async (aiResponse: string) => {
 *   const result = await verify(aiResponse);
 *   if (result.compliant) {
 *     displayToUser(aiResponse);
 *   }
 * };
 * ```
 */
export function useGallowsVerify(config: ApexConfig) {
  // Note: This is a framework-agnostic implementation
  // For React, import { useState, useCallback } from 'react'
  const gallows = new ApexGallows(config);

  return {
    verify: (action: string, predicateId?: string) => gallows.verify(action, predicateId),
    checkLocal: (action: string, predicateId: string) => gallows.checkLocal(action, predicateId),
    commit: (action: string, predicateId?: string) => gallows.commit(action, predicateId),
  };
}

export default ApexGallows;
