/**
 * THE INVERSE STANDARD — public record of verification adoption.
 *
 * HONESTY RULE: nothing may be invented here. An organisation is added to
 * VERIFYING only once it has sealed a public document with APEX PSI, and the
 * date recorded is the date of that first seal. The UNVERIFIED list records
 * organisations that have publicly been asked and have not sealed — it carries
 * no score, no judgement and no ranking. Both arrays start empty on purpose.
 */

export interface VerifyingOrg {
  /** Organisation name, exactly as it publishes it. */
  name: string;
  /** ISO date (YYYY-MM-DD) of the first public seal. */
  firstSealed: string;
  /** SHA-256 of the first sealed document, if published. */
  hash?: string;
  /** Link to the sealed artefact or its receipt. */
  artifact?: string;
}

export const VERIFYING: VerifyingOrg[] = [];

export const UNVERIFIED: string[] = [];

/** Oldest first — first to adopt at the top. */
export const verifyingSorted = () =>
  [...VERIFYING].sort((a, b) => a.firstSealed.localeCompare(b.firstSealed));

/** Alphabetical only. No ranking. */
export const unverifiedSorted = () =>
  [...UNVERIFIED].sort((a, b) => a.localeCompare(b));
