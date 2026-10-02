export type Language = 'fr' | 'en';

export interface CountryInfo {
  id: string; // ISO 2-letter
  nameEn: string;
  nameFr: string;
  dialCode: string;
  flag: string;
  defaultLang: Language;
  airtelBrand: string;
  minDigits: number;
  maxDigits: number;
  validPrefixes: string[];
  placeholder: string;
  example: string;
  timezones: string[];
  descriptionEn: string;
  descriptionFr: string;
}

export const AIRTEL_COUNTRIES: CountryInfo[] = [
  {
    id: 'TD',
    nameEn: 'Chad',
    nameFr: 'Tchad',
    dialCode: '+235',
    flag: '🇹🇩',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Tchad',
    minDigits: 8,
    maxDigits: 8,
    validPrefixes: ['63', '65', '66', '68', '93', '95', '99', '6', '9'],
    placeholder: '66 12 34 56',
    example: '66xxxxxx',
    timezones: ['Africa/Ndjamena'],
    descriptionEn: '8 digits starting with 6 or 9 (e.g. 66xxxxxx)',
    descriptionFr: '8 chiffres commençant par 6 ou 9 (ex: 66xxxxxx)',
  },
  {
    id: 'CG',
    nameEn: 'Congo',
    nameFr: 'Congo',
    dialCode: '+242',
    flag: '🇨🇬',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Congo (Brazzaville)',
    minDigits: 8,
    maxDigits: 9,
    validPrefixes: ['04', '05', '06', '4', '5', '6'],
    placeholder: '06 123 4567',
    example: '06xxxxxxx',
    timezones: ['Africa/Brazzaville'],
    descriptionEn: '9 digits starting with 04, 05, or 06',
    descriptionFr: '9 chiffres commençant par 04, 05 ou 06',
  },
  {
    id: 'CD',
    nameEn: 'Democratic Republic of the Congo',
    nameFr: 'Rép. Dém. du Congo (RDC)',
    dialCode: '+243',
    flag: '🇨🇩',
    defaultLang: 'fr',
    airtelBrand: 'Airtel RDC',
    minDigits: 9,
    maxDigits: 9,
    validPrefixes: ['97', '98', '99', '9'],
    placeholder: '99 123 4567',
    example: '99xxxxxxx',
    timezones: ['Africa/Kinshasa', 'Africa/Lubumbashi'],
    descriptionEn: '9 digits starting with 97, 98, or 99',
    descriptionFr: '9 chiffres commençant par 97, 98 ou 99',
  },
  {
    id: 'GA',
    nameEn: 'Gabon',
    nameFr: 'Gabon',
    dialCode: '+241',
    flag: '🇬🇦',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Gabon',
    minDigits: 8,
    maxDigits: 9,
    validPrefixes: ['074', '076', '077', '74', '76', '77', '04', '07', '7'],
    placeholder: '074 12 34 56',
    example: '074xxxxxx',
    timezones: ['Africa/Libreville'],
    descriptionEn: '8 to 9 digits starting with 074, 076, 077 or 74, 77',
    descriptionFr: '8 à 9 chiffres commençant par 074, 076, 077 ou 74, 77',
  },
  {
    id: 'KE',
    nameEn: 'Kenya',
    nameFr: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪',
    defaultLang: 'en',
    airtelBrand: 'Airtel Kenya',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['73', '75', '78', '10', '073', '075', '078', '010', '7', '1'],
    placeholder: '733 123 456',
    example: '73xxxxxxx',
    timezones: ['Africa/Nairobi'],
    descriptionEn: '9 digits starting with 73, 75, 78, or 10',
    descriptionFr: '9 chiffres commençant par 73, 75, 78 ou 10',
  },
  {
    id: 'MG',
    nameEn: 'Madagascar',
    nameFr: 'Madagascar',
    dialCode: '+261',
    flag: '🇲🇬',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Madagascar',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['33', '033', '3'],
    placeholder: '33 12 345 67',
    example: '33xxxxxxx',
    timezones: ['Africa/Antananarivo'],
    descriptionEn: '9 digits starting with 33 (e.g. 33xxxxxxx)',
    descriptionFr: '9 chiffres commençant par 33 (ex: 33xxxxxxx)',
  },
  {
    id: 'MW',
    nameEn: 'Malawi',
    nameFr: 'Malawi',
    dialCode: '+265',
    flag: '🇲🇼',
    defaultLang: 'en',
    airtelBrand: 'Airtel Malawi',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['99', '98', '099', '098', '9'],
    placeholder: '99 123 4567',
    example: '99xxxxxxx',
    timezones: ['Africa/Blantyre'],
    descriptionEn: '9 digits starting with 99 or 98',
    descriptionFr: '9 chiffres commençant par 99 ou 98',
  },
  {
    id: 'NE',
    nameEn: 'Niger',
    nameFr: 'Niger',
    dialCode: '+227',
    flag: '🇳🇪',
    defaultLang: 'fr',
    airtelBrand: 'Airtel Niger',
    minDigits: 8,
    maxDigits: 8,
    validPrefixes: ['90', '91', '92', '96', '97', '98', '99', '9'],
    placeholder: '96 12 34 56',
    example: '96xxxxxx',
    timezones: ['Africa/Niamey'],
    descriptionEn: '8 digits starting with 90, 91, 92, 96, 97, 98, 99',
    descriptionFr: '8 chiffres commençant par 90, 91, 92, 96, 97, 98, 99',
  },
  {
    id: 'NG',
    nameEn: 'Nigeria',
    nameFr: 'Nigéria',
    dialCode: '+234',
    flag: '🇳🇬',
    defaultLang: 'en',
    airtelBrand: 'Airtel Nigeria',
    minDigits: 10,
    maxDigits: 11,
    validPrefixes: [
      '802', '808', '812', '701', '708', '902', '907', '901', '904', '912',
      '0802', '0808', '0812', '0701', '0708', '0902', '0907', '0901', '0904', '0912',
      '8', '7', '9'
    ],
    placeholder: '802 123 4567',
    example: '802xxxxxxx',
    timezones: ['Africa/Lagos'],
    descriptionEn: '10 digits starting with 802, 808, 812, 701, 708, 902, etc.',
    descriptionFr: '10 chiffres commençant par 802, 808, 812, 701, 708, 902, etc.',
  },
  {
    id: 'RW',
    nameEn: 'Rwanda',
    nameFr: 'Rwanda',
    dialCode: '+250',
    flag: '🇷🇼',
    defaultLang: 'en',
    airtelBrand: 'Airtel Rwanda',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['73', '72', '073', '072', '7'],
    placeholder: '73 123 4567',
    example: '73xxxxxxx',
    timezones: ['Africa/Kigali'],
    descriptionEn: '9 digits starting with 73 or 72',
    descriptionFr: '9 chiffres commençant par 73 ou 72',
  },
  {
    id: 'SC',
    nameEn: 'Seychelles',
    nameFr: 'Seychelles',
    dialCode: '+248',
    flag: '🇸🇨',
    defaultLang: 'en',
    airtelBrand: 'Airtel Seychelles',
    minDigits: 7,
    maxDigits: 7,
    validPrefixes: ['25', '26', '27', '28', '2'],
    placeholder: '251 2345',
    example: '25xxxxxx',
    timezones: ['Indian/Mahe'],
    descriptionEn: '7 digits starting with 25, 26, 27, or 28',
    descriptionFr: '7 chiffres commençant par 25, 26, 27 ou 28',
  },
  {
    id: 'TZ',
    nameEn: 'Tanzania',
    nameFr: 'Tanzanie',
    dialCode: '+255',
    flag: '🇹🇿',
    defaultLang: 'en',
    airtelBrand: 'Airtel Tanzania',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['78', '68', '69', '078', '068', '069', '7', '6'],
    placeholder: '784 123 456',
    example: '78xxxxxxx',
    timezones: ['Africa/Dar_es_Salaam'],
    descriptionEn: '9 digits starting with 78, 68, or 69',
    descriptionFr: '9 chiffres commençant par 78, 68 ou 69',
  },
  {
    id: 'UG',
    nameEn: 'Uganda',
    nameFr: 'Ouganda',
    dialCode: '+256',
    flag: '🇺🇬',
    defaultLang: 'en',
    airtelBrand: 'Airtel Uganda',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['70', '74', '75', '070', '074', '075', '7'],
    placeholder: '701 234 567',
    example: '70xxxxxxx',
    timezones: ['Africa/Kampala'],
    descriptionEn: '9 digits starting with 70, 74, or 75',
    descriptionFr: '9 chiffres commençant par 70, 74 ou 75',
  },
  {
    id: 'ZM',
    nameEn: 'Zambia',
    nameFr: 'Zambie',
    dialCode: '+260',
    flag: '🇿🇲',
    defaultLang: 'en',
    airtelBrand: 'Airtel Zambia',
    minDigits: 9,
    maxDigits: 10,
    validPrefixes: ['97', '77', '097', '077', '9', '7'],
    placeholder: '97 123 4567',
    example: '97xxxxxxx',
    timezones: ['Africa/Lusaka'],
    descriptionEn: '9 digits starting with 97 or 77',
    descriptionFr: '9 chiffres commençant par 97 ou 77',
  },
];

/**
 * Validate phone number against Airtel numbering plan for a country
 */
export function validateAirtelPhone(
  country: CountryInfo,
  rawPhone: string
): { isValid: boolean; normalized: string; errorEn?: string; errorFr?: string } {
  // Strip non-digits
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) {
    return {
      isValid: false,
      normalized: '',
      errorEn: 'Please enter your Airtel phone number',
      errorFr: 'Veuillez saisir votre numéro de téléphone Airtel',
    };
  }

  // If user included international dial code prefix (e.g. 243, 254), strip it
  const dialDigits = country.dialCode.replace(/\D/g, '');
  if (digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  }

  // Check length bounds
  if (digits.length < country.minDigits) {
    return {
      isValid: false,
      normalized: digits,
      errorEn: `Number too short for ${country.airtelBrand}. Expected ${country.descriptionEn}.`,
      errorFr: `Numéro trop court pour ${country.airtelBrand}. Attendu : ${country.descriptionFr}.`,
    };
  }

  if (digits.length > country.maxDigits) {
    return {
      isValid: false,
      normalized: digits,
      errorEn: `Number too long for ${country.airtelBrand}. Expected max ${country.maxDigits} digits.`,
      errorFr: `Numéro trop long pour ${country.airtelBrand}. Maximum ${country.maxDigits} chiffres attendus.`,
    };
  }

  // Check prefix validity
  const matchesPrefix = country.validPrefixes.some((prefix) => digits.startsWith(prefix));

  if (!matchesPrefix) {
    return {
      isValid: false,
      normalized: digits,
      errorEn: `Invalid prefix for ${country.airtelBrand}. Expected ${country.descriptionEn}.`,
      errorFr: `Préfixe non reconnu pour ${country.airtelBrand}. Attendu : ${country.descriptionFr}.`,
    };
  }

  return {
    isValid: true,
    normalized: digits,
  };
}

/**
 * Smart detect user country based on timeZone or browser locale
 */
export function detectUserCountry(): CountryInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz) {
      const match = AIRTEL_COUNTRIES.find((c) =>
        c.timezones.some((zone) => zone.toLowerCase() === tz.toLowerCase() || tz.toLowerCase().includes(c.id.toLowerCase()))
      );
      if (match) return match;

      // Check timezone strings like 'Nairobi', 'Kinshasa', 'Lagos'
      for (const country of AIRTEL_COUNTRIES) {
        for (const zone of country.timezones) {
          const city = zone.split('/')[1]?.toLowerCase();
          if (city && tz.toLowerCase().includes(city)) {
            return country;
          }
        }
      }
    }
  } catch {}

  // Fallback to Congo (DRC) or Kenya based on language
  try {
    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('en')) {
      const kenya = AIRTEL_COUNTRIES.find((c) => c.id === 'KE');
      if (kenya) return kenya;
    }
  } catch {}

  // Default to DRC
  return AIRTEL_COUNTRIES.find((c) => c.id === 'CD') || AIRTEL_COUNTRIES[0];
}
