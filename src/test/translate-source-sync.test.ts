import { describe, it, expect } from "vitest";
import en from "@/i18n/locales/en.json";
import { LANGUAGES } from "@/i18n";
import { EN_SOURCE, TARGET_LANGUAGES } from "../../supabase/functions/translate/source";

// The translation service translates only its own copy of the site text.
// If this fails, run: node scripts/sync-translate-source.mjs
describe("translation service source", () => {
  it("matches the site's English text exactly", () => {
    expect(EN_SOURCE).toEqual(en);
  });
  it("offers exactly the site's languages (English excluded)", () => {
    expect(Object.keys(TARGET_LANGUAGES).sort()).toEqual(
      Object.keys(LANGUAGES).filter((k) => k !== "en").sort(),
    );
  });
});
