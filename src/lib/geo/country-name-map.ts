// GA4/GSC report country names via Google's own list (mostly ISO short
// English names). The world-atlas/Natural Earth topojson dataset uses a
// different naming convention in places -- this maps the common
// mismatches so those countries still find their polygon on the map.
// Anything not listed here is assumed to already match by name.
export const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  "Ivory Coast": "Côte d'Ivoire",
  "Congo - Kinshasa": "Dem. Rep. Congo",
  "Congo - Brazzaville": "Congo",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Republic of the Congo": "Congo",
  Eswatini: "eSwatini",
  "North Macedonia": "Macedonia",
  "Bosnia & Herzegovina": "Bosnia and Herz.",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "Myanmar (Burma)": "Myanmar",
  "Central African Republic": "Central African Rep.",
  "Equatorial Guinea": "Eq. Guinea",
  "South Sudan": "S. Sudan",
  "Solomon Islands": "Solomon Is.",
  "Falkland Islands": "Falkland Is.",
  "Timor-Leste": "Timor-Leste",
  "Western Sahara": "W. Sahara",
  "Trinidad & Tobago": "Trinidad and Tobago",
  "Czech Republic": "Czechia",
};

export function toMapCountryName(reportedName: string): string {
  return COUNTRY_NAME_ALIASES[reportedName] ?? reportedName;
}
