// Hardcoded brand/entity terms used to classify Search Console queries as
// "branded" (the searcher already knows one of these names) vs
// "non-branded" (generic/discovery search). Matched case-insensitively as
// a substring of the raw query text -- edit this list directly as brand
// names, sub-brands, or common misspellings change; there's no UI for it.
//
// "netsuri" (a truncated misspelling seen in real GSC data) is
// deliberately NOT included: it's also a literal prefix of "netsurion", an
// unrelated third-party cybersecurity vendor that shows up in the same
// impression data, and including it would misclassify searches for that
// company as branded.
//
// "Orrin Klopper" is Netsurit's actual CEO (confirmed against real query
// data, e.g. "orrin klopper netsurit"); "Orrin Klooper" is kept alongside
// it in case that's the intended spelling from wherever this list
// originated.
export const BRAND_TERMS = [
  "netsurit",
  "netsureit",
  "netsure it",
  "avaunt",
  "iteam consulting",
  "omnipotech",
  "orrin klopper",
  "orrin klooper",
] as const;
