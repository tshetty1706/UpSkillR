import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

// List of excluded dependent territories / non-sovereign regions
const EXCLUDED_TERRITORIES = new Set([
  'IO', // British Indian Ocean Territory
  'BV', // Bouvet Island
  'TF', // French Southern Territories
  'HM', // Heard Island and McDonald Islands
  'GS', // South Georgia and the South Sandwich Islands
  'SJ', // Svalbard and Jan Mayen
  'UM', // United States Minor Outlying Islands
  'AX', // Åland Islands
  'AQ', // Antarctica
  'CX', // Christmas Island
  'CC', // Cocos (Keeling) Islands
  'NF'  // Norfolk Island
]);

// Map ISO country codes to readable names & standard phone length rules
const COUNTRY_NAME_MAP = {
  IN: { name: 'India', minLength: 10, maxLength: 10 },
  US: { name: 'United States', minLength: 10, maxLength: 10 },
  GB: { name: 'United Kingdom', minLength: 10, maxLength: 10 },
  CA: { name: 'Canada', minLength: 10, maxLength: 10 },
  AU: { name: 'Australia', minLength: 9, maxLength: 9 },
  DE: { name: 'Germany', minLength: 10, maxLength: 11 },
  FR: { name: 'France', minLength: 9, maxLength: 9 },
  JP: { name: 'Japan', minLength: 10, maxLength: 10 },
  CN: { name: 'China', minLength: 11, maxLength: 11 },
  BR: { name: 'Brazil', minLength: 10, maxLength: 11 },
  ID: { name: 'Indonesia', minLength: 9, maxLength: 12 },
  PK: { name: 'Pakistan', minLength: 10, maxLength: 10 },
  BD: { name: 'Bangladesh', minLength: 10, maxLength: 10 },
  RU: { name: 'Russia', minLength: 10, maxLength: 10 },
  MX: { name: 'Mexico', minLength: 10, maxLength: 10 },
  NG: { name: 'Nigeria', minLength: 10, maxLength: 10 },
  EG: { name: 'Egypt', minLength: 10, maxLength: 10 },
  ZA: { name: 'South Africa', minLength: 9, maxLength: 9 },
  AE: { name: 'United Arab Emirates', minLength: 9, maxLength: 9 },
  SG: { name: 'Singapore', minLength: 8, maxLength: 8 },
  NZ: { name: 'New Zealand', minLength: 8, maxLength: 10 },
  IT: { name: 'Italy', minLength: 9, maxLength: 10 },
  ES: { name: 'Spain', minLength: 9, maxLength: 9 },
  NL: { name: 'Netherlands', minLength: 9, maxLength: 9 },
  SE: { name: 'Sweden', minLength: 9, maxLength: 9 },
  CH: { name: 'Switzerland', minLength: 9, maxLength: 9 },
  KR: { name: 'South Korea', minLength: 9, maxLength: 10 },
  MY: { name: 'Malaysia', minLength: 9, maxLength: 10 },
  PH: { name: 'Philippines', minLength: 10, maxLength: 10 },
  VN: { name: 'Vietnam', minLength: 9, maxLength: 10 },
  TH: { name: 'Thailand', minLength: 9, maxLength: 9 },
  SA: { name: 'Saudi Arabia', minLength: 9, maxLength: 9 },
  IE: { name: 'Ireland', minLength: 9, maxLength: 9 },
  NP: { name: 'Nepal', minLength: 10, maxLength: 10 },
  LK: { name: 'Sri Lanka', minLength: 9, maxLength: 9 },
  KE: { name: 'Kenya', minLength: 9, maxLength: 9 },
  AR: { name: 'Argentina', minLength: 10, maxLength: 10 },
  CL: { name: 'Chile', minLength: 9, maxLength: 9 },
  CO: { name: 'Colombia', minLength: 10, maxLength: 10 },
  PL: { name: 'Poland', minLength: 9, maxLength: 9 },
  UA: { name: 'Ukraine', minLength: 9, maxLength: 9 },
  AT: { name: 'Austria', minLength: 10, maxLength: 11 },
  BE: { name: 'Belgium', minLength: 9, maxLength: 9 },
  DK: { name: 'Denmark', minLength: 8, maxLength: 8 },
  FI: { name: 'Finland', minLength: 9, maxLength: 10 },
  NO: { name: 'Norway', minLength: 8, maxLength: 8 },
  PT: { name: 'Portugal', minLength: 9, maxLength: 9 },
  GR: { name: 'Greece', minLength: 10, maxLength: 10 },
  TR: { name: 'Turkey', minLength: 10, maxLength: 10 },
  IL: { name: 'Israel', minLength: 9, maxLength: 9 }
};

const getCountryName = (isoCode) => {
  if (COUNTRY_NAME_MAP[isoCode]) return COUNTRY_NAME_MAP[isoCode].name;
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return regionNames.of(isoCode) || isoCode;
  } catch (e) {
    return isoCode;
  }
};

const getPhoneLengthRules = (isoCode) => {
  if (COUNTRY_NAME_MAP[isoCode]) {
    return {
      minLength: COUNTRY_NAME_MAP[isoCode].minLength,
      maxLength: COUNTRY_NAME_MAP[isoCode].maxLength
    };
  }
  return { minLength: 7, maxLength: 12 };
};

// Build clean array of sovereign countries
export const ALL_COUNTRIES = getCountries()
  .filter((iso) => !EXCLUDED_TERRITORIES.has(iso))
  .map((iso) => {
    let callingCode = '';
    try {
      callingCode = '+' + getCountryCallingCode(iso);
    } catch (e) {
      callingCode = '+1';
    }
    const name = getCountryName(iso);
    const rules = getPhoneLengthRules(iso);

    return {
      code: iso,
      name,
      callingCode,
      label: name, // Clean country name display
      searchStr: `${name} ${callingCode} ${iso}`.toLowerCase(),
      minLength: rules.minLength,
      maxLength: rules.maxLength
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

// Default country: India
export const DEFAULT_COUNTRY = ALL_COUNTRIES.find((c) => c.code === 'IN') || ALL_COUNTRIES[0];

export const findCountryByNameOrCode = (countryName, countryCode) => {
  if (!countryName && !countryCode) return DEFAULT_COUNTRY;
  const match = ALL_COUNTRIES.find((c) => {
    if (countryName && c.name.toLowerCase() === countryName.toLowerCase()) return true;
    if (countryCode && c.callingCode === countryCode) return true;
    return false;
  });
  return match || DEFAULT_COUNTRY;
};
