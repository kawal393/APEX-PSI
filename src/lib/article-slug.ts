// Slugs are public URLs that a stranger has already copied. When a correction renames
// an article, the old address has to keep working, so the slug is rewritten and the
// reader is moved to the current one.
//
// This table is the single source for all three places that have to agree:
//   scripts/article-claims-fix.mjs   renames the stored slug
//   scripts/article-claims-check.mjs proves every banned token has a rule here
//   src/pages/Article.tsx           redirects an old address to the new one
export const SLUG_REWRITES: Array<[string, string]> = [
  ["cryptographic-truth", "cryptographic-evidence"],
];

export const rewriteArticleSlug = (slug: string): string =>
  SLUG_REWRITES.reduce((acc, [from, to]) => acc.split(from).join(to), slug);
