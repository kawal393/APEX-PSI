// ═══════════════════════════════════════════════════════════════════════
// THE UNIVERSAL LEDGER — 100 curated records.
// Sealing is preservation, not endorsement. Excerpts are public-domain
// translations; works still under copyright appear as citation + digest only.
// receipt_id / decision_digest / sealed_at are filled by the guarded
// one-time genesis seal and cached in localStorage.
// ═══════════════════════════════════════════════════════════════════════

export type LedgerDomain = "history" | "science" | "spirituality" | "philosophy";

export interface UniversalLedgerRow {
  id: string;
  domain: LedgerDomain;
  title: string;
  era: string;
  source: string;
  kind: "EXCERPT" | "CITATION";
  text?: string;
  receipt_id: string;
  decision_digest: string;
  sealed_at: string;
}

const H = "history" as const;
const S = "science" as const;
const T = "spirituality" as const;
const P = "philosophy" as const;

type Seed = [string, LedgerDomain, string, string, string, "EXCERPT" | "CITATION", string?];

const seeds: Seed[] = [
  ["001", H, "Code of Hammurabi", "c.1750 BCE", "Public-domain translation", "EXCERPT", "If any one ensnare another, putting a ban upon him, but he can not prove it, then he that ensnared him shall be put to death."],
  ["002", H, "Cyrus Cylinder", "c.539 BCE", "Public-domain translation", "EXCERPT", "I am Cyrus, king of the world, great king, mighty king, king of Babylon."],
  ["003", H, "Edicts of Ashoka", "c.250 BCE", "Public-domain translation", "EXCERPT", "All men are my children."],
  ["004", H, "Twelve Tables", "c.450 BCE", "Public-domain translation", "EXCERPT", "If a plaintiff summon defendant to court, he shall go."],
  ["005", H, "Rosetta Stone", "196 BCE", "Budge translation", "EXCERPT", "This decree shall be inscribed on a stela of hard stone in the sacred and the current characters."],
  ["006", H, "Magna Carta", "1215", "Public domain", "EXCERPT", "No free man shall be seized or imprisoned except by the lawful judgement of his equals or by the law of the land."],
  ["007", H, "English Bill of Rights", "1689", "Public domain", "EXCERPT", "The pretended power of suspending the laws by regal authority without consent of Parliament is illegal."],
  ["008", H, "US Declaration of Independence", "1776", "Public domain", "EXCERPT", "We hold these truths to be self-evident, that all men are created equal."],
  ["009", H, "US Constitution Preamble", "1787", "Public domain", "EXCERPT", "We the People of the United States, in Order to form a more perfect Union..."],
  ["010", H, "Declaration of the Rights of Man", "1789", "Public-domain translation", "EXCERPT", "Men are born and remain free and equal in rights."],
  ["011", H, "US Bill of Rights", "1791", "Public domain", "EXCERPT", "Congress shall make no law respecting an establishment of religion, or abridging the freedom of speech."],
  ["012", H, "Eureka Oath (Australia)", "1854", "Public domain", "EXCERPT", "We swear by the Southern Cross to stand truly by each other and fight to defend our rights and liberties."],
  ["013", H, "Treaty of Waitangi", "1840", "Translation contested", "CITATION"],
  ["014", H, "Emancipation Proclamation", "1863", "Public domain", "EXCERPT", "All persons held as slaves within any State so designated shall be then, thenceforward, and forever free."],
  ["015", H, "Gettysburg Address", "1863", "Public domain", "EXCERPT", "That this nation, under God, shall have a new birth of freedom."],
  ["016", H, "Lincoln Second Inaugural", "1865", "Public domain", "EXCERPT", "With malice toward none; with charity for all."],
  ["017", H, "Declaration of Sentiments", "1848", "Public domain", "EXCERPT", "We hold these truths to be self-evident: that all men and women are created equal."],
  ["018", H, "Australian Constitution Preamble", "1900", "Public domain", "EXCERPT", "Whereas the people have agreed to unite in one indissoluble Federal Commonwealth."],
  ["019", H, "Universal Declaration of Human Rights", "1948", "United Nations", "EXCERPT", "All human beings are born free and equal in dignity and rights."],
  ["020", H, "UN Charter Preamble", "1945", "United Nations", "EXCERPT", "We the peoples of the United Nations determined to save succeeding generations from the scourge of war."],
  ["021", H, "Geneva Conventions, Common Article 3", "1949", "Citation only", "CITATION"],
  ["022", H, "Statute of Westminster", "1931", "Citation only", "CITATION"],
  ["023", H, "Atlantic Charter", "1941", "Public domain", "EXCERPT", "They desire to see no territorial changes that do not accord with the freely expressed wishes of the peoples concerned."],
  ["024", H, "Letter from Birmingham Jail", "1963", "Copyright: estate", "CITATION"],
  ["025", H, "Armistice of 11 November 1918", "1918", "Citation only", "CITATION"],

  ["026", S, "Euclid, Elements", "c.300 BCE", "Heath translation", "EXCERPT", "A point is that which has no part."],
  ["027", S, "Archimedes, via Pappus", "c.250 BCE", "Public domain", "EXCERPT", "Give me a place to stand, and I shall move the Earth."],
  ["028", S, "Copernicus, De Revolutionibus", "1543", "Public-domain translation", "EXCERPT", "In the middle of all sits the Sun."],
  ["029", S, "Galileo, Sidereus Nuncius", "1610", "Public-domain translation", "EXCERPT", "The Moon is not robed in a smooth and polished body, but is like the face of the Earth itself."],
  ["030", S, "Newton, Principia — Scholium on Time", "1687", "Motte translation", "EXCERPT", "Absolute, true, and mathematical time, of itself, and from its own nature, flows equably without relation to anything external."],
  ["031", S, "Darwin, On the Origin of Species", "1859", "Public domain", "EXCERPT", "There is grandeur in this view of life."],
  ["032", S, "Maxwell, A Dynamical Theory of the Electromagnetic Field", "1865", "Public domain", "EXCERPT", "Light consists in the transverse undulations of the same medium which is the cause of electric and magnetic phenomena."],
  ["033", S, "Einstein, On the Electrodynamics of Moving Bodies", "1905", "1923 public-domain translation", "EXCERPT", "Maxwell's electrodynamics, when applied to moving bodies, leads to asymmetries which do not appear to be inherent in the phenomena."],
  ["034", S, "Einstein, The Foundation of the General Theory of Relativity", "1916", "Citation only", "CITATION"],
  ["035", S, "Planck, On the Law of Energy Distribution", "1900", "Citation only", "CITATION"],
  ["036", S, "Mendel, Experiments on Plant Hybridisation", "1866", "Citation only", "CITATION"],
  ["037", S, "Noether, Invariante Variationsprobleme", "1918", "Citation only", "CITATION"],
  ["038", S, "Schrödinger, Quantisation as an Eigenvalue Problem", "1926", "Citation only", "CITATION"],
  ["039", S, "Heisenberg, Uncertainty Paper", "1927", "Citation only", "CITATION"],
  ["040", S, "Hubble, Distance–Radial Velocity Relation", "1929", "Citation only", "CITATION"],
  ["041", S, "Turing, On Computable Numbers", "1936", "Citation only", "CITATION"],
  ["042", S, "Shannon, A Mathematical Theory of Communication", "1948", "Citation only", "CITATION"],
  ["043", S, "Watson & Crick, Molecular Structure of Nucleic Acids", "1953", "Citation only", "CITATION"],
  ["044", S, "Higgs, Broken Symmetries", "1964", "Citation only", "CITATION"],
  ["045", S, "ARPANET first message", "1969", "Factual record", "EXCERPT", "LO"],
  ["046", S, "Apollo 11 Plaque", "1969", "US Government, public domain", "EXCERPT", "Here men from the planet Earth first set foot upon the Moon. We came in peace for all mankind."],
  ["047", S, "Arecibo Message", "1974", "Citation only", "CITATION"],
  ["048", S, "Voyager Golden Record", "1977", "Factual record", "EXCERPT", "115 images, 90 minutes of music, greetings in 55 languages."],
  ["049", S, "Bitcoin genesis coinbase", "2009", "Chain data", "EXCERPT", "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks."],
  ["050", S, "Sagan, Pale Blue Dot", "1994", "Copyright", "CITATION"],

  ["051", T, "Nasadiya Sukta (Rig Veda 10.129)", "c.1500 BCE", "Müller translation", "EXCERPT", "Then there was neither non-existent nor existent."],
  ["052", T, "Isha Upanishad", "c.700 BCE", "Müller translation", "EXCERPT", "All this, whatsoever moves on earth, is to be hidden in the Lord."],
  ["053", T, "Bhagavad Gita 2.47", "c.200 BCE", "Arnold translation", "EXCERPT", "Thy right is to the work alone, not to its fruits."],
  ["054", T, "Dhammapada 1.1", "c.300 BCE", "Müller translation", "EXCERPT", "All that we are is the result of what we have thought."],
  ["055", T, "Tao Te Ching 1", "c.400 BCE", "Legge translation", "EXCERPT", "The Tao that can be trodden is not the enduring and unchanging Tao."],
  ["056", T, "Heart Sutra", "c.200 CE", "Public-domain translation", "EXCERPT", "Form is emptiness, emptiness is form."],
  ["057", T, "Hsin Hsin Ming", "c.600", "Public-domain translation", "EXCERPT", "The Great Way is not difficult for those who have no preferences."],
  ["058", T, "Quran, Al-Fatiha", "c.610", "Sale translation, 1734", "EXCERPT", "Praise be to God, the Lord of all creatures."],
  ["059", T, "Mul Mantar", "c.1469", "Public-domain translation", "EXCERPT", "There is but One God; true is His name; creative His personality and immortal His form."],
  ["060", T, "Psalm 23 (KJV)", "1611", "Public domain", "EXCERPT", "The Lord is my shepherd; I shall not want."],
  ["061", T, "Ecclesiastes 3:1 (KJV)", "1611", "Public domain", "EXCERPT", "To every thing there is a season, and a time to every purpose under the heaven."],
  ["062", T, "John 1:1 (KJV)", "1611", "Public domain", "EXCERPT", "In the beginning was the Word, and the Word was with God, and the Word was God."],
  ["063", T, "Book of the Dead (Papyrus of Ani)", "c.1250 BCE", "Budge translation", "EXCERPT", "I have not done falsehood against men, I have not impoverished my associates."],
  ["064", T, "Emerald Tablet", "c.800", "Newton translation", "EXCERPT", "That which is below is like that which is above, and that which is above is like that which is below."],
  ["065", T, "Rumi, Masnavi — opening", "1273", "Whinfield translation", "EXCERPT", "Listen to the reed how it complains, lamenting its separations."],
  ["066", T, "Kabir", "c.1500", "Tagore translation, 1915", "EXCERPT", "The flute of the infinite is played without ceasing, and its sound is love."],
  ["067", T, "The Cloud of Unknowing", "c.1375", "Citation only", "CITATION"],
  ["068", T, "Gathas (Yasna 30)", "c.1000 BCE", "Darmesteter translation", "EXCERPT", "Hear with your ears the highest truths I proclaim."],
  ["069", T, "Yoga Sutras 1.2", "c.200 CE", "Public-domain translation", "EXCERPT", "Yoga is the stilling of the changing states of the mind."],
  ["070", T, "I Ching, Qian hexagram", "c.900 BCE", "Legge translation", "EXCERPT", "Heaven moves vigorously; the superior man nerves himself to ceaseless activity."],
  ["071", T, "Bardo Thodol", "c.1400", "Evans-Wentz translation", "EXCERPT", "O nobly-born, that which is called death being come to you now, be resolved to continue in your own right mind."],
  ["072", T, "Gospel of Thomas", "c.100", "Modern translations copyrighted", "CITATION"],
  ["073", T, "Great Isaiah Scroll", "c.125 BCE", "Modern translations copyrighted", "CITATION"],
  ["074", T, "Popol Vuh", "c.1554", "Public-domain translation", "EXCERPT", "This is the beginning of the ancient word, here in this place called Quiché."],
  ["075", T, "Völuspá (Poetic Edda)", "c.1270", "Thorpe translation, 1866", "EXCERPT", "Of old was the age when Ymir lived; was nor sand nor sea, nor gloomy waves."],

  ["076", P, "Heraclitus, fragment 91", "c.500 BCE", "Bywater translation", "EXCERPT", "Upon those who step into the same rivers, different and ever different waters flow."],
  ["077", P, "Parmenides", "c.450 BCE", "Public-domain translation", "EXCERPT", "It is the same thing that can be thought and that can be."],
  ["078", P, "Plato, Republic", "c.375 BCE", "Jowett translation", "EXCERPT", "The heaviest penalty for declining to rule is to be ruled by someone inferior."],
  ["079", P, "Aristotle, Metaphysics", "c.350 BCE", "Public-domain translation", "EXCERPT", "All men by nature desire to know."],
  ["080", P, "Analects 1.1", "c.475 BCE", "Legge translation", "EXCERPT", "Is it not pleasant to learn with a constant perseverance and application?"],
  ["081", P, "Sun Tzu, The Art of War", "c.500 BCE", "Giles translation", "EXCERPT", "All warfare is based on deception."],
  ["082", P, "Zhuangzi", "c.300 BCE", "Giles translation", "EXCERPT", "Now I do not know whether I was then a man dreaming I was a butterfly, or whether I am now a butterfly dreaming I am a man."],
  ["083", P, "Epicurus, Letter to Menoeceus", "c.300 BCE", "Public-domain translation", "EXCERPT", "Death is nothing to us."],
  ["084", P, "Lucretius, De Rerum Natura", "c.55 BCE", "Public-domain translation", "EXCERPT", "Nothing can be created from nothing."],
  ["085", P, "Marcus Aurelius, Meditations", "c.170", "Long translation", "EXCERPT", "The universe is change; our life is what our thoughts make it."],
  ["086", P, "Epictetus, Enchiridion 1", "c.125", "Public-domain translation", "EXCERPT", "Some things are in our control and others not."],
  ["087", P, "Seneca, On the Shortness of Life", "c.49", "Public-domain translation", "EXCERPT", "It is not that we have a short time to live, but that we waste a lot of it."],
  ["088", P, "Augustine, Confessions", "c.400", "Public-domain translation", "EXCERPT", "Thou hast made us for Thyself, and our heart is restless until it finds its rest in Thee."],
  ["089", P, "Boethius, Consolation of Philosophy", "524", "Public-domain translation", "EXCERPT", "In all adversity of fortune, the most wretched kind is once to have been happy."],
  ["090", P, "Aquinas, Summa Theologiae", "1274", "Citation only", "CITATION"],
  ["091", P, "Machiavelli, The Prince", "1532", "Public-domain translation", "EXCERPT", "It is much safer to be feared than to be loved."],
  ["092", P, "Montaigne, Essais", "1580", "Public-domain translation", "EXCERPT", "Que sais-je? — What do I know?"],
  ["093", P, "Descartes, Discourse on Method", "1637", "Public-domain translation", "EXCERPT", "I think, therefore I am."],
  ["094", P, "Spinoza, Ethics", "1677", "Elwes translation", "EXCERPT", "Whatsoever is, is in God, and without God nothing can be, or be conceived."],
  ["095", P, "Pascal, Pensées", "1670", "Trotter translation", "EXCERPT", "The heart has its reasons, which reason knows nothing of."],
  ["096", P, "Hobbes, Leviathan", "1651", "Public domain", "EXCERPT", "The life of man: solitary, poor, nasty, brutish, and short."],
  ["097", P, "Locke, Second Treatise", "1689", "Public domain", "EXCERPT", "Wherever law ends, tyranny begins."],
  ["098", P, "Hume, An Enquiry Concerning Human Understanding", "1748", "Public domain", "EXCERPT", "A wise man proportions his belief to the evidence."],
  ["099", P, "Kant, What Is Enlightenment?", "1784", "Public-domain translation", "EXCERPT", "Sapere aude! Have courage to use your own understanding."],
  ["100", P, "Wittgenstein, Tractatus — proposition 1", "1921", "Ogden translation, 1922", "EXCERPT", "The world is all that is the case."],
];

export const UNIVERSAL_LEDGER: UniversalLedgerRow[] = seeds.map(
  ([id, domain, title, era, source, kind, text]) => ({
    id,
    domain,
    title,
    era,
    source,
    kind,
    ...(text ? { text } : {}),
    receipt_id: "",
    decision_digest: "",
    sealed_at: "",
  }),
);

export const DOMAIN_LABEL: Record<LedgerDomain, string> = {
  history: "HISTORY",
  science: "SCIENCE",
  spirituality: "SPIRITUALITY",
  philosophy: "PHILOSOPHY",
};

export const LEDGER_RECEIPTS_KEY = "universal-ledger-receipts";

export interface StoredReceipt {
  receipt_id: string;
  decision_digest: string;
  sealed_at: string;
}

export const readStoredReceipts = (): Record<string, StoredReceipt> => {
  try {
    const raw = localStorage.getItem(LEDGER_RECEIPTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredReceipt>) : {};
  } catch {
    return {};
  }
};

export const writeStoredReceipt = (id: string, receipt: StoredReceipt) => {
  const all = readStoredReceipts();
  all[id] = receipt;
  localStorage.setItem(LEDGER_RECEIPTS_KEY, JSON.stringify(all));
};

export const FENCE =
  "A receipt certifies that a text existed, intact, at a time. It certifies existence, integrity and timestamp — never the truth of the text's claims. Inclusion follows a published curation rule and expresses no opinion on any claim, tradition, or person.";

export const CURATION_RULE =
  "Displayed excerpts are public-domain translations. Works still under copyright appear as citation plus digest only. Domains are balanced: 25 history, 25 science, 25 spirituality, 25 philosophy. Sealing is preservation, not endorsement.";
