const COUNTRY_TO_LANG: Record<string, { lang: string; currency: string; countryName: string }> = {
  US: { lang: 'en', currency: 'USD', countryName: 'United States' },
  GB: { lang: 'en', currency: 'GBP', countryName: 'United Kingdom' },
  CA: { lang: 'en', currency: 'USD', countryName: 'Canada' },
  AU: { lang: 'en', currency: 'USD', countryName: 'Australia' },
  PK: { lang: 'ur', currency: 'PKR', countryName: 'Pakistan' },
  IN: { lang: 'hi', currency: 'INR', countryName: 'India' },
  BD: { lang: 'bn', currency: 'BDT', countryName: 'Bangladesh' },
  SA: { lang: 'ar', currency: 'SAR', countryName: 'Saudi Arabia' },
  AE: { lang: 'ar', currency: 'AED', countryName: 'United Arab Emirates' },
  EG: { lang: 'ar', currency: 'USD', countryName: 'Egypt' },
  QA: { lang: 'ar', currency: 'SAR', countryName: 'Qatar' },
  KW: { lang: 'ar', currency: 'USD', countryName: 'Kuwait' },
  ES: { lang: 'es', currency: 'EUR', countryName: 'Spain' },
  MX: { lang: 'es', currency: 'USD', countryName: 'Mexico' },
  AR: { lang: 'es', currency: 'USD', countryName: 'Argentina' },
  CO: { lang: 'es', currency: 'USD', countryName: 'Colombia' },
  FR: { lang: 'fr', currency: 'EUR', countryName: 'France' },
  DE: { lang: 'de', currency: 'EUR', countryName: 'Germany' },
  AT: { lang: 'de', currency: 'EUR', countryName: 'Austria' },
  CH: { lang: 'de', currency: 'EUR', countryName: 'Switzerland' },
  IT: { lang: 'it', currency: 'EUR', countryName: 'Italy' },
  PT: { lang: 'pt', currency: 'EUR', countryName: 'Portugal' },
  BR: { lang: 'pt', currency: 'BRL', countryName: 'Brazil' },
  JP: { lang: 'ja', currency: 'JPY', countryName: 'Japan' },
  KR: { lang: 'ko', currency: 'KRW', countryName: 'South Korea' },
  CN: { lang: 'zh', currency: 'CNY', countryName: 'China' },
  TW: { lang: 'zh', currency: 'USD', countryName: 'Taiwan' },
  HK: { lang: 'zh', currency: 'USD', countryName: 'Hong Kong' },
  TR: { lang: 'tr', currency: 'TRY', countryName: 'Turkey' },
  RU: { lang: 'ru', currency: 'RUB', countryName: 'Russia' },
};

const SUPPORTED_UI_CODES = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'hi', 'ur', 'zh', 'ja', 'ko', 'tr', 'ru', 'bn',
]);

export default function handler(req: any, res: any) {
  const headers = req.headers || {};
  const rawCountry = String(
    headers['x-vercel-ip-country'] ||
      headers['cf-ipcountry'] ||
      headers['x-appengine-country'] ||
      ''
  )
    .trim()
    .toUpperCase();

  const acceptLangRaw = String(headers['accept-language'] || '');
  const primaryAcceptLang = acceptLangRaw.split(',')[0]?.split(';')[0]?.trim() || 'en';
  const acceptLangBase = primaryAcceptLang.split('-')[0].toLowerCase();

  const countryInfo = COUNTRY_TO_LANG[rawCountry];
  const defaultAppLang =
    countryInfo?.lang ||
    (SUPPORTED_UI_CODES.has(acceptLangBase) ? acceptLangBase : 'en');

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    countryCode: rawCountry || null,
    countryName: countryInfo?.countryName || null,
    currency: countryInfo?.currency || 'USD',
    defaultAppLang,
    acceptLanguage: primaryAcceptLang,
  });
}
