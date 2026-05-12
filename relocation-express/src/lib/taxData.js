// src/lib/taxData.js
// US State + Major City Local Tax Data — 2024 tax year
// Effective rates at $185k-$210k income bracket (single filer, standard deduction)
// Federal standard deduction: $14,600 (single)
//
// Sources: state tax authority websites, Tax Foundation, SmartAsset
// Effective rates calculated at ~$190k AGI after standard deduction

// ─── Federal tax calculator ────────────────────────────────────────────────
// filingStatus: "single" | "married" | "head"
// dependents: number of qualifying children (for Child Tax Credit)
export function calcFederalEffectiveRate(grossSalary, filingStatus = "single", dependents = 0) {
  // 2024 standard deductions
  const stdDeduction = {
    single:  14600,
    married: 29200,
    head:    21900,
  }[filingStatus] || 14600;

  const taxable = Math.max(0, grossSalary - stdDeduction);

  // 2024 tax brackets
  const brackets = {
    single: [
      [11600,    0.10],
      [47150,    0.12],
      [100525,   0.22],
      [191950,   0.24],
      [243725,   0.32],
      [609350,   0.35],
      [Infinity, 0.37],
    ],
    married: [
      [23200,    0.10],
      [94300,    0.12],
      [201050,   0.22],
      [383900,   0.24],
      [487450,   0.32],
      [731200,   0.35],
      [Infinity, 0.37],
    ],
    head: [
      [16550,    0.10],
      [63100,    0.12],
      [100500,   0.22],
      [191950,   0.24],
      [243700,   0.32],
      [609350,   0.35],
      [Infinity, 0.37],
    ],
  }[filingStatus] || [];

  let tax = 0, prev = 0;
  for (const [limit, rate] of brackets) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, limit) - prev) * rate;
    prev = limit;
  }

  // Child Tax Credit 2024: $2,000 per child, phases out above $200k (single) / $400k (married)
  const phaseoutThreshold = filingStatus === "married" ? 400000 : 200000;
  const phaseoutAmount = Math.max(0, grossSalary - phaseoutThreshold);
  const phaseoutReduction = Math.ceil(phaseoutAmount / 1000) * 50;
  const maxCredit = dependents * 2000;
  const childCredit = Math.max(0, maxCredit - phaseoutReduction);
  tax = Math.max(0, tax - childCredit);

  return Math.round((tax / grossSalary) * 10000) / 10000;
}

// Returns detailed federal tax breakdown for display
export function calcFederalTaxDetail(grossSalary, filingStatus = "single", dependents = 0) {
  const stdDeduction = { single: 14600, married: 29200, head: 21900 }[filingStatus] || 14600;
  const taxable = Math.max(0, grossSalary - stdDeduction);
  const rate = calcFederalEffectiveRate(grossSalary, filingStatus, dependents);
  const tax = Math.round(grossSalary * rate);
  const phaseoutThreshold = filingStatus === "married" ? 400000 : 200000;
  const phaseoutAmount = Math.max(0, grossSalary - phaseoutThreshold);
  const phaseoutReduction = Math.ceil(phaseoutAmount / 1000) * 50;
  const childCredit = Math.max(0, dependents * 2000 - phaseoutReduction);
  return { taxable, stdDeduction, tax, effectiveRate: rate, childCredit, filingStatus, dependents };
}

// ─── State tax data ────────────────────────────────────────────────────────
// effectiveRate: effective rate at ~$185k-$210k gross (single filer)
// calculator: optional function for more precise calculation
const STATE_TAX = {
  // No income tax states
  AK: { name: "Alaska",       effectiveRate: 0.000, hasIncomeTax: false },
  FL: { name: "Florida",      effectiveRate: 0.000, hasIncomeTax: false },
  NV: { name: "Nevada",       effectiveRate: 0.000, hasIncomeTax: false },
  NH: { name: "New Hampshire",effectiveRate: 0.000, hasIncomeTax: false }, // only dividends/interest
  SD: { name: "South Dakota", effectiveRate: 0.000, hasIncomeTax: false },
  TN: { name: "Tennessee",    effectiveRate: 0.000, hasIncomeTax: false },
  TX: { name: "Texas",        effectiveRate: 0.000, hasIncomeTax: false },
  WA: { name: "Washington",   effectiveRate: 0.000, hasIncomeTax: false },
  WY: { name: "Wyoming",      effectiveRate: 0.000, hasIncomeTax: false },

  // Low-tax states
  AZ: { name: "Arizona",      effectiveRate: 0.025, hasIncomeTax: true }, // flat 2.5%
  CO: { name: "Colorado",     effectiveRate: 0.044, hasIncomeTax: true }, // flat 4.4%
  ID: { name: "Idaho",        effectiveRate: 0.058, hasIncomeTax: true },
  IN: { name: "Indiana",      effectiveRate: 0.030, hasIncomeTax: true }, // flat 3.0%
  KY: { name: "Kentucky",     effectiveRate: 0.045, hasIncomeTax: true }, // flat 4.5%
  MI: { name: "Michigan",     effectiveRate: 0.043, hasIncomeTax: true }, // flat 4.25%
  MS: { name: "Mississippi",  effectiveRate: 0.047, hasIncomeTax: true },
  MT: { name: "Montana",      effectiveRate: 0.059, hasIncomeTax: true },
  NC: { name: "North Carolina",effectiveRate: 0.045, hasIncomeTax: true }, // flat 4.5%
  ND: { name: "North Dakota", effectiveRate: 0.020, hasIncomeTax: true },
  OH: { name: "Ohio",         effectiveRate: 0.035, hasIncomeTax: true },
  OK: { name: "Oklahoma",     effectiveRate: 0.047, hasIncomeTax: true },
  PA: { name: "Pennsylvania", effectiveRate: 0.031, hasIncomeTax: true }, // flat 3.07%
  UT: { name: "Utah",         effectiveRate: 0.046, hasIncomeTax: true }, // flat 4.55%

  // Mid-tax states
  AL: { name: "Alabama",      effectiveRate: 0.050, hasIncomeTax: true },
  AR: { name: "Arkansas",     effectiveRate: 0.059, hasIncomeTax: true },
  DE: { name: "Delaware",     effectiveRate: 0.066, hasIncomeTax: true },
  GA: { name: "Georgia",      effectiveRate: 0.055, hasIncomeTax: true },
  HI: { name: "Hawaii",       effectiveRate: 0.090, hasIncomeTax: true },
  IA: { name: "Iowa",         effectiveRate: 0.057, hasIncomeTax: true },
  IL: { name: "Illinois",     effectiveRate: 0.049, hasIncomeTax: true }, // flat 4.95%
  KS: { name: "Kansas",       effectiveRate: 0.055, hasIncomeTax: true },
  LA: { name: "Louisiana",    effectiveRate: 0.042, hasIncomeTax: true },
  MA: { name: "Massachusetts",effectiveRate: 0.090, hasIncomeTax: true }, // 5% + 4% surtax >$1M
  MD: { name: "Maryland",     effectiveRate: 0.058, hasIncomeTax: true },
  ME: { name: "Maine",        effectiveRate: 0.068, hasIncomeTax: true },
  MN: { name: "Minnesota",    effectiveRate: 0.078, hasIncomeTax: true },
  MO: { name: "Missouri",     effectiveRate: 0.053, hasIncomeTax: true },
  NE: { name: "Nebraska",     effectiveRate: 0.062, hasIncomeTax: true },
  NM: { name: "New Mexico",   effectiveRate: 0.054, hasIncomeTax: true },
  NY: { name: "New York",     effectiveRate: 0.0685, hasIncomeTax: true },
  OR: { name: "Oregon",       effectiveRate: 0.088, hasIncomeTax: true },
  RI: { name: "Rhode Island", effectiveRate: 0.060, hasIncomeTax: true },
  SC: { name: "South Carolina",effectiveRate: 0.063, hasIncomeTax: true },
  VA: { name: "Virginia",     effectiveRate: 0.055, hasIncomeTax: true },
  VT: { name: "Vermont",      effectiveRate: 0.066, hasIncomeTax: true },
  WI: { name: "Wisconsin",    effectiveRate: 0.065, hasIncomeTax: true },
  WV: { name: "West Virginia",effectiveRate: 0.055, hasIncomeTax: true },

  // High-tax states
  CA: { name: "California",   effectiveRate: 0.093, hasIncomeTax: true },
  CT: { name: "Connecticut",  effectiveRate: 0.064, hasIncomeTax: true },
  DC: { name: "Washington DC",effectiveRate: 0.085, hasIncomeTax: true },
  NJ: { name: "New Jersey",   effectiveRate: 0.064, hasIncomeTax: true },
};

// ─── City local tax data ───────────────────────────────────────────────────
// Local income taxes levied by cities/municipalities
// effectiveRate at ~$185k-$210k income
const CITY_LOCAL_TAX = {
  // New York
  "new york city":    { state: "NY", rate: 0.0388, name: "NYC Local" },
  "nyc":              { state: "NY", rate: 0.0388, name: "NYC Local" },
  "manhattan":        { state: "NY", rate: 0.0388, name: "NYC Local" },
  "brooklyn":         { state: "NY", rate: 0.0388, name: "NYC Local" },
  "queens":           { state: "NY", rate: 0.0388, name: "NYC Local" },
  "bronx":            { state: "NY", rate: 0.0388, name: "NYC Local" },
  "staten island":    { state: "NY", rate: 0.0388, name: "NYC Local" },
  "yonkers":          { state: "NY", rate: 0.0155, name: "Yonkers Local" },

  // Pennsylvania
  "philadelphia":     { state: "PA", rate: 0.0375, name: "Philadelphia Wage Tax" },
  "pittsburgh":       { state: "PA", rate: 0.030,  name: "Pittsburgh Local" },
  "allentown":        { state: "PA", rate: 0.020,  name: "Allentown Local" },

  // Ohio
  "columbus":         { state: "OH", rate: 0.025,  name: "Columbus City Tax" },
  "cleveland":        { state: "OH", rate: 0.025,  name: "Cleveland City Tax" },
  "cincinnati":       { state: "OH", rate: 0.019,  name: "Cincinnati City Tax" },
  "toledo":           { state: "OH", rate: 0.025,  name: "Toledo City Tax" },
  "akron":            { state: "OH", rate: 0.025,  name: "Akron City Tax" },
  "dayton":           { state: "OH", rate: 0.025,  name: "Dayton City Tax" },

  // Michigan
  "detroit":          { state: "MI", rate: 0.024,  name: "Detroit City Tax" },
  "grand rapids":     { state: "MI", rate: 0.015,  name: "Grand Rapids City Tax" },
  "flint":            { state: "MI", rate: 0.010,  name: "Flint City Tax" },
  "lansing":          { state: "MI", rate: 0.010,  name: "Lansing City Tax" },

  // Maryland
  "baltimore":        { state: "MD", rate: 0.032,  name: "Baltimore City Tax" },
  "montgomery county":{ state: "MD", rate: 0.032,  name: "Montgomery County Tax" },
  "prince george":    { state: "MD", rate: 0.032,  name: "PG County Tax" },

  // Indiana
  "indianapolis":     { state: "IN", rate: 0.020,  name: "Marion County Tax" },
  "fort wayne":       { state: "IN", rate: 0.015,  name: "Allen County Tax" },

  // Kentucky
  "louisville":       { state: "KY", rate: 0.028,  name: "Louisville Occupational Tax" },
  "lexington":        { state: "KY", rate: 0.022,  name: "Lexington Occupational Tax" },

  // Missouri
  "kansas city":      { state: "MO", rate: 0.010,  name: "Kansas City Earnings Tax" },
  "st. louis":        { state: "MO", rate: 0.010,  name: "St. Louis Earnings Tax" },
  "saint louis":      { state: "MO", rate: 0.010,  name: "St. Louis Earnings Tax" },

  // Iowa
  "des moines":       { state: "IA", rate: 0.010,  name: "Des Moines Local" },

  // Alabama
  "birmingham":       { state: "AL", rate: 0.010,  name: "Birmingham Occupational Tax" },
  "gadsden":          { state: "AL", rate: 0.020,  name: "Gadsden Occupational Tax" },

  // West Virginia
  "charleston":       { state: "WV", rate: 0.010,  name: "Charleston City Tax" },
  "huntington":       { state: "WV", rate: 0.010,  name: "Huntington City Tax" },

  // Delaware
  "wilmington":       { state: "DE", rate: 0.013,  name: "Wilmington Wage Tax" },

  // Oregon
  "portland":         { state: "OR", rate: 0.010,  name: "Portland Metro SHS" }, // approx
};

// State abbreviation lookup by common name
const STATE_NAME_TO_ABBR = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "district of columbia": "DC", "washington dc": "DC", "washington d.c.": "DC",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY",
};

// City to state mapping for common cities (helps resolve state from city name alone)
const CITY_TO_STATE = {
  // Texas
  "houston": "TX", "dallas": "TX", "san antonio": "TX", "austin": "TX",
  "fort worth": "TX", "el paso": "TX", "arlington": "TX", "corpus christi": "TX",
  "plano": "TX", "laredo": "TX", "lubbock": "TX", "garland": "TX",
  "irving": "TX", "amarillo": "TX", "frisco": "TX", "mckinney": "TX",
  "grand prairie": "TX", "mesquite": "TX", "killeen": "TX", "pasadena": "TX",
  "denton": "TX", "carrollton": "TX", "midland": "TX", "round rock": "TX",
  "richardson": "TX", "allen": "TX", "lewisville": "TX", "tyler": "TX",

  // California
  "los angeles": "CA", "san diego": "CA", "san jose": "CA", "san francisco": "CA",
  "fresno": "CA", "sacramento": "CA", "long beach": "CA", "oakland": "CA",
  "bakersfield": "CA", "anaheim": "CA", "santa ana": "CA", "riverside": "CA",
  "stockton": "CA", "irvine": "CA", "chula vista": "CA", "fremont": "CA",
  "san bernardino": "CA", "modesto": "CA", "fontana": "CA", "santa clarita": "CA",

  // New York
  "new york": "NY", "buffalo": "NY", "rochester": "NY", "yonkers": "NY",
  "syracuse": "NY", "albany": "NY", "new rochelle": "NY", "mount vernon": "NY",

  // Florida
  "jacksonville": "FL", "miami": "FL", "tampa": "FL", "orlando": "FL",
  "st. petersburg": "FL", "saint petersburg": "FL", "hialeah": "FL",
  "tallahassee": "FL", "fort lauderdale": "FL", "port st. lucie": "FL",
  "cape coral": "FL", "pembroke pines": "FL", "hollywood": "FL",
  "gainesville": "FL", "miramar": "FL", "coral springs": "FL",
  "clearwater": "FL", "boca raton": "FL", "west palm beach": "FL",

  // Illinois
  "chicago": "IL", "aurora": "IL", "joliet": "IL", "naperville": "IL",
  "rockford": "IL", "springfield": "IL", "peoria": "IL", "elgin": "IL",

  // Pennsylvania
  "philadelphia": "PA", "pittsburgh": "PA", "allentown": "PA",
  "erie": "PA", "reading": "PA", "scranton": "PA",

  // Ohio
  "columbus": "OH", "cleveland": "OH", "cincinnati": "OH", "toledo": "OH",
  "akron": "OH", "dayton": "OH", "parma": "OH", "canton": "OH",
  "youngstown": "OH", "lorain": "OH",

  // Georgia
  "atlanta": "GA", "columbus": "GA", "savannah": "GA", "athens": "GA",
  "macon": "GA", "roswell": "GA", "albany": "GA", "marietta": "GA",

  // North Carolina
  "charlotte": "NC", "raleigh": "NC", "greensboro": "NC", "durham": "NC",
  "winston-salem": "NC", "fayetteville": "NC", "cary": "NC", "wilmington": "NC",

  // Michigan
  "detroit": "MI", "grand rapids": "MI", "warren": "MI", "sterling heights": "MI",
  "lansing": "MI", "ann arbor": "MI", "flint": "MI", "dearborn": "MI",

  // Arizona
  "phoenix": "AZ", "tucson": "AZ", "mesa": "AZ", "chandler": "AZ",
  "scottsdale": "AZ", "gilbert": "AZ", "tempe": "AZ", "peoria": "AZ",

  // Washington
  "seattle": "WA", "spokane": "WA", "tacoma": "WA", "vancouver": "WA",
  "bellevue": "WA", "kent": "WA", "everett": "WA", "renton": "WA",

  // Colorado
  "denver": "CO", "colorado springs": "CO", "aurora": "CO", "fort collins": "CO",
  "lakewood": "CO", "thornton": "CO", "arvada": "CO", "westminster": "CO",
  "pueblo": "CO", "boulder": "CO",

  // Virginia
  "virginia beach": "VA", "norfolk": "VA", "chesapeake": "VA", "richmond": "VA",
  "newport news": "VA", "alexandria": "VA", "hampton": "VA", "roanoke": "VA",
  "portsmouth": "VA", "suffolk": "VA", "arlington": "VA",

  // Massachusetts
  "boston": "MA", "worcester": "MA", "springfield": "MA", "lowell": "MA",
  "cambridge": "MA", "new bedford": "MA", "brockton": "MA", "quincy": "MA",

  // Tennessee
  "memphis": "TN", "nashville": "TN", "knoxville": "TN", "chattanooga": "TN",
  "clarksville": "TN", "murfreesboro": "TN", "franklin": "TN", "jackson": "TN",

  // Indiana
  "indianapolis": "IN", "fort wayne": "IN", "evansville": "IN", "south bend": "IN",
  "carmel": "IN", "fishers": "IN", "hammond": "IN", "muncie": "IN",

  // Missouri
  "kansas city": "MO", "st. louis": "MO", "saint louis": "MO", "springfield": "MO",
  "columbia": "MO", "independence": "MO", "lee's summit": "MO", "o'fallon": "MO",

  // Maryland
  "baltimore": "MD", "frederick": "MD", "gaithersburg": "MD", "rockville": "MD",
  "bowie": "MD", "hagerstown": "MD", "annapolis": "MD",

  // Wisconsin
  "milwaukee": "WI", "madison": "WI", "green bay": "WI", "kenosha": "WI",
  "racine": "WI", "appleton": "WI", "waukesha": "WI", "oshkosh": "WI",

  // Minnesota
  "minneapolis": "MN", "saint paul": "MN", "st. paul": "MN", "rochester": "MN",
  "duluth": "MN", "bloomington": "MN", "brooklyn park": "MN", "plymouth": "MN",

  // Nevada
  "las vegas": "NV", "henderson": "NV", "reno": "NV", "north las vegas": "NV",
  "sparks": "NV", "carson city": "NV",

  // Oregon
  "portland": "OR", "eugene": "OR", "salem": "OR", "gresham": "OR",
  "hillsboro": "OR", "beaverton": "OR", "bend": "OR", "medford": "OR",

  // New Jersey
  "newark": "NJ", "jersey city": "NJ", "paterson": "NJ", "elizabeth": "NJ",
  "trenton": "NJ", "clifton": "NJ", "camden": "NJ", "passaic": "NJ",
  "union city": "NJ", "east orange": "NJ", "bayonne": "NJ", "hoboken": "NJ",

  // Kentucky
  "louisville": "KY", "lexington": "KY", "bowling green": "KY", "owensboro": "KY",
  "covington": "KY", "richmond": "KY", "georgetown": "KY",

  // Louisiana
  "new orleans": "LA", "baton rouge": "LA", "shreveport": "LA", "metairie": "LA",
  "lafayette": "LA", "lake charles": "LA", "kenner": "LA", "bossier city": "LA",

  // South Carolina
  "columbia": "SC", "charleston": "SC", "north charleston": "SC", "mount pleasant": "SC",
  "rock hill": "SC", "greenville": "SC", "summerville": "SC",

  // Alabama
  "birmingham": "AL", "montgomery": "AL", "huntsville": "AL", "mobile": "AL",
  "tuscaloosa": "AL", "hoover": "AL", "dothan": "AL", "auburn": "AL",

  // Oklahoma
  "oklahoma city": "OK", "tulsa": "OK", "norman": "OK", "broken arrow": "OK",
  "lawton": "OK", "edmond": "OK", "moore": "OK",

  // Connecticut
  "bridgeport": "CT", "new haven": "CT", "hartford": "CT", "stamford": "CT",
  "waterbury": "CT", "norwalk": "CT", "danbury": "CT",

  // Utah
  "salt lake city": "UT", "west valley city": "UT", "provo": "UT", "west jordan": "UT",
  "orem": "UT", "sandy": "UT", "ogden": "UT", "st. george": "UT",

  // Iowa
  "des moines": "IA", "cedar rapids": "IA", "davenport": "IA", "sioux city": "IA",
  "iowa city": "IA", "waterloo": "IA",

  // Arkansas
  "little rock": "AR", "fort smith": "AR", "fayetteville": "AR", "springdale": "AR",
  "jonesboro": "AR",

  // Kansas
  "wichita": "KS", "overland park": "KS", "kansas city": "KS", "topeka": "KS",
  "olathe": "KS", "lawrence": "KS",

  // Mississippi
  "jackson": "MS", "gulfport": "MS", "southaven": "MS", "hattiesburg": "MS",
  "biloxi": "MS", "meridian": "MS",

  // New Mexico
  "albuquerque": "NM", "las cruces": "NM", "rio rancho": "NM", "santa fe": "NM",
  "roswell": "NM",

  // Hawaii
  "honolulu": "HI", "pearl city": "HI", "hilo": "HI", "kailua": "HI",

  // Idaho
  "boise": "ID", "nampa": "ID", "meridian": "ID", "idaho falls": "ID",
  "pocatello": "ID", "caldwell": "ID",

  // West Virginia
  "charleston": "WV", "huntington": "WV", "morgantown": "WV", "parkersburg": "WV",

  // Nebraska
  "omaha": "NE", "lincoln": "NE", "bellevue": "NE", "grand island": "NE",

  // Delaware
  "wilmington": "DE", "dover": "DE", "newark": "DE",

  // Maine
  "portland": "ME", "lewiston": "ME", "bangor": "ME", "south portland": "ME",

  // Rhode Island
  "providence": "RI", "cranston": "RI", "warwick": "RI", "pawtucket": "RI",

  // Alaska
  "anchorage": "AK", "fairbanks": "AK", "juneau": "AK",

  // Wyoming
  "cheyenne": "WY", "casper": "WY", "laramie": "WY",

  // Montana
  "billings": "MT", "missoula": "MT", "great falls": "MT", "bozeman": "MT",

  // South Dakota
  "sioux falls": "SD", "rapid city": "SD", "aberdeen": "SD",

  // North Dakota
  "fargo": "ND", "bismarck": "ND", "grand forks": "ND", "minot": "ND",

  // Vermont
  "burlington": "VT", "south burlington": "VT", "rutland": "VT",

  // New Hampshire
  "manchester": "NH", "nashua": "NH", "concord": "NH", "dover": "NH",
};

// ─── Main lookup function ──────────────────────────────────────────────────

/**
 * Look up tax rates for a city string like "New York, NY" or "Plano, TX"
 * Returns { stateAbbr, stateName, stateRate, localRate, localName, totalStateLocal, found }
 */
export function lookupCityTax(cityString) {
  if (!cityString) return notFound();

  const input = cityString.toLowerCase().trim();

  // Try to extract state abbreviation from "City, ST" or "City, State" format
  let stateAbbr = null;
  let cityPart = input;

  const commaMatch = input.match(/^(.+),\s*([a-z]{2})$/);
  const longStateMatch = input.match(/^(.+),\s*(.+)$/);

  if (commaMatch) {
    const possibleAbbr = commaMatch[2].toUpperCase();
    if (STATE_TAX[possibleAbbr]) {
      stateAbbr = possibleAbbr;
      cityPart = commaMatch[1].trim();
    }
  }

  if (!stateAbbr && longStateMatch) {
    const possibleState = longStateMatch[2].trim().toLowerCase();
    if (STATE_NAME_TO_ABBR[possibleState]) {
      stateAbbr = STATE_NAME_TO_ABBR[possibleState];
      cityPart = longStateMatch[1].trim();
    }
  }

  // If no state from format, look up by city name
  if (!stateAbbr) {
    const mapped = CITY_TO_STATE[cityPart];
    if (mapped) stateAbbr = mapped;
  }

  // Normalize city aliases for local tax lookup
  let localLookupKey = cityPart;
  // "new york" in NY context = NYC
  if ((cityPart === "new york" || cityPart === "ny") && stateAbbr === "NY") {
    localLookupKey = "new york city";
  }
  // Handle "harrison" NJ and other suburb cases — no local tax
  // Handle common abbreviations
  if (cityPart === "nyc" || cityPart === "manhattan" || cityPart === "brooklyn" ||
      cityPart === "queens" || cityPart === "bronx" || cityPart === "staten island") {
    localLookupKey = "new york city";
  }

  // Look up local tax
  let localRate = 0;
  let localName = "None";
  const localData = CITY_LOCAL_TAX[localLookupKey];
  if (localData) {
    localRate = localData.rate;
    localName = localData.name;
    // If no state yet, get it from local data
    if (!stateAbbr) stateAbbr = localData.state;
  }

  if (!stateAbbr) return notFound(cityString);

  const stateData = STATE_TAX[stateAbbr];
  if (!stateData) return notFound(cityString);

  return {
    found: true,
    cityInput: cityString,
    stateAbbr,
    stateName: stateData.name,
    stateRate: stateData.effectiveRate,
    localRate,
    localName,
    totalStateLocal: Math.round((stateData.effectiveRate + localRate) * 10000) / 10000,
    hasIncomeTax: stateData.hasIncomeTax,
  };
}

function notFound(cityString = "") {
  return {
    found: false,
    cityInput: cityString,
    stateAbbr: null,
    stateName: "Unknown",
    stateRate: null,
    localRate: null,
    localName: "Unknown",
    totalStateLocal: null,
    hasIncomeTax: null,
  };
}

/**
 * Get a formatted tax summary string for injection into the prompt
 * @param {string} cityString
 * @param {number} grossSalary
 * @param {string} filingStatus - "single" | "married" | "head"
 * @param {number} dependents - number of qualifying children
 */
export function formatTaxSummary(cityString, grossSalary, filingStatus = "single", dependents = 0) {
  const tax = lookupCityTax(cityString);
  const federalRate = calcFederalEffectiveRate(grossSalary, filingStatus, dependents);
  const detail = calcFederalTaxDetail(grossSalary, filingStatus, dependents);

  if (!tax.found) {
    return `Tax data not found for "${cityString}" — AI must calculate federal (${(federalRate*100).toFixed(2)}% effective for ${filingStatus}, ${dependents} dep) + state + local manually.`;
  }

  const totalEffective = Math.round((federalRate + tax.totalStateLocal) * 10000) / 10000;
  const takeHome = Math.round(grossSalary * (1 - totalEffective));
  const filingLabel = { single: "Single", married: "Married Filing Jointly", head: "Head of Household" }[filingStatus] || "Single";

  return [
    `VERIFIED TAX RATES for ${cityString} at $${grossSalary.toLocaleString()} gross (2024, ${filingLabel}${dependents > 0 ? `, ${dependents} dependent${dependents > 1 ? "s" : ""}` : ""}):`,
    `  Federal effective rate:      ${(federalRate * 100).toFixed(2)}% (taxable: $${detail.taxable.toLocaleString()}, std deduction: $${detail.stdDeduction.toLocaleString()}${detail.childCredit > 0 ? `, child credit: $${detail.childCredit.toLocaleString()}` : ""})`,
    `  State effective rate (${tax.stateAbbr}): ${(tax.stateRate * 100).toFixed(2)}%${tax.hasIncomeTax ? "" : " (no state income tax)"}`,
    `  Local effective rate:        ${(tax.localRate * 100).toFixed(2)}%${tax.localRate > 0 ? ` (${tax.localName})` : " (no local income tax)"}`,
    `  ─────────────────────────────────────`,
    `  TOTAL effective rate:        ${(totalEffective * 100).toFixed(2)}%`,
    `  Estimated annual take-home:  $${takeHome.toLocaleString()}`,
    `  Monthly take-home:           $${Math.round(takeHome/12).toLocaleString()}`,
    `  USE THESE EXACT VALUES. Do not recalculate or override.`,
  ].join("\n");
}
