export const EXTERNAL_LINK_ERROR_MESSAGE =
  'External links are not allowed on Gulfaro. Please remove all website, app, or platform links. You can provide your contact email address and phone number only.';

const COMMON_TLDS =
  'com|net|org|io|co|me|ae|sa|qa|kw|bh|om|info|biz|site|online|xyz|app|dev|tech|jobs|careers|edu|gov|uk|us|pk|in|ph|eg|jo|lb|tv|gg|ly|gl|be|at|cc|ai|pro|link|click|top|shop|store|agency|cloud|work|live|ee';

const KNOWN_PLATFORM_HOSTS = [
  'wa\\.me',
  'chat\\.whatsapp\\.com',
  'api\\.whatsapp\\.com',
  'whatsapp\\.com',
  't\\.me',
  'telegram\\.me',
  'telegram\\.dog',
  'lnkd\\.in',
  'linkedin\\.com',
  'facebook\\.com',
  'fb\\.com',
  'fb\\.me',
  'instagram\\.com',
  'instagr\\.am',
  'twitter\\.com',
  'x\\.com',
  't\\.co',
  'youtube\\.com',
  'youtu\\.be',
  'tiktok\\.com',
  'snapchat\\.com',
  'discord\\.gg',
  'discord\\.com',
  'bit\\.ly',
  'tinyurl\\.com',
  'goo\\.gl',
  'shorturl\\.at',
  'rebrand\\.ly',
  'ow\\.ly',
  'is\\.gd',
  'cutt\\.ly',
  'rb\\.gy',
  'forms\\.gle',
  'docs\\.google\\.com',
  'drive\\.google\\.com',
  'dropbox\\.com',
  'indeed\\.com',
  'bayt\\.com',
  'naukrigulf\\.com',
  'gulftalent\\.com',
  'glassdoor\\.com',
  'monster\\.com',
  'linktr\\.ee',
  'bio\\.link',
  'carrd\\.co'
];

const SAFE_TECH_OR_ABBR_REGEX =
  /\b(?:(?:node|next|react|vue|nuxt|express|nest|angular|three|chart|d3|p5|electron)\.js|(?:asp|vb)\.net|(?:b|m)\.tech|(?:b|m)\.sc|ph\.d|e\.g|i\.e|p\.o)\b(?!\/)/gi;

const STANDALONE_EMAIL_REGEX =
  /(^|[\s,(:"'\[])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=$|[\s),;:"'\].!?])/g;

const PROTOCOL_OR_WWW_REGEX =
  /(?:h\s*t\s*t\s*p\s*s?\s*:|h\s*x\s*x\s*p\s*s?\s*:|f\s*t\s*p\s*:|(?:^|[\s(,:"'\[])w\s*w\s*w\s*(?:\.|\[dot\]|\(dot\)|\{dot\})|\bhttps?:\/\/|\bwww\.)/i;

const KNOWN_PLATFORM_REGEX = new RegExp(
  `(?:^|[\\s(,:"'\\[/]|@)(?:${KNOWN_PLATFORM_HOSTS.join('|')})(?:\\/[^\\s]*)?(?=$|[\\s),;:"'\\].!?/])`,
  'i'
);

const OBFUSCATED_BRACKET_DOT_REGEX =
  /[a-zA-Z0-9-]{2,}\s*(?:\[dot\]|\(dot\)|\{dot\})\s*[a-zA-Z]{2,}/i;

const OBFUSCATED_WORD_DOT_REGEX = new RegExp(
  `\\b[a-zA-Z0-9-]{2,}\\s+dot\\s+(?:${COMMON_TLDS})\\b`,
  'i'
);

const SPACED_DOT_DOMAIN_REGEX = new RegExp(
  `(?:^|[\\s(,:"'\\[])[a-zA-Z0-9-]{2,}(?:\\s*\\.\\s*[a-zA-Z0-9-]{2,})*\\s*\\.\\s*(?:${COMMON_TLDS})(?::\\d+)?(?:\\/[^\\s]*)?(?=$|[\\s),;:"'\\].!?])`,
  'i'
);

const DOMAIN_WITH_PATH_REGEX =
  /(?:^|[\s(,:"'\[])[a-zA-Z0-9-]{2,}(?:\.[a-zA-Z0-9-]{2,})*\.[a-zA-Z]{2,10}\/[^\s]{1,}/i;

function stripInvisibleChars(input: string): string {
  return input.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

export function containsExternalLink(
  rawValue: string | undefined | null,
  options?: { isEmailField?: boolean; isPhoneField?: boolean }
): boolean {
  if (!rawValue || typeof rawValue !== 'string') return false;
  const trimmed = stripInvisibleChars(rawValue).trim();
  if (!trimmed) return false;

  // Contact Email field: allow a clean single email address, block URLs/domains/links
  if (options?.isEmailField) {
    if (
      PROTOCOL_OR_WWW_REGEX.test(trimmed) ||
      KNOWN_PLATFORM_REGEX.test(trimmed) ||
      OBFUSCATED_BRACKET_DOT_REGEX.test(trimmed) ||
      OBFUSCATED_WORD_DOT_REGEX.test(trimmed) ||
      trimmed.includes('/')
    ) {
      return true;
    }

    const cleanEmailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (cleanEmailPattern.test(trimmed)) {
      return false;
    }

    // If user typed a domain without @ (e.g. company.com) in the email box, flag it
    if (SPACED_DOT_DOMAIN_REGEX.test(trimmed) || DOMAIN_WITH_PATH_REGEX.test(trimmed)) {
      return true;
    }
    return false;
  }

  // Contact Phone field: allow digits, +, spaces, hyphens, parentheses; block any link/domain
  if (options?.isPhoneField) {
    if (
      PROTOCOL_OR_WWW_REGEX.test(trimmed) ||
      KNOWN_PLATFORM_REGEX.test(trimmed) ||
      OBFUSCATED_BRACKET_DOT_REGEX.test(trimmed) ||
      OBFUSCATED_WORD_DOT_REGEX.test(trimmed) ||
      SPACED_DOT_DOMAIN_REGEX.test(trimmed) ||
      DOMAIN_WITH_PATH_REGEX.test(trimmed)
    ) {
      return true;
    }
    return false;
  }

  // Step 1: Catch protocols & www (normal or spaced/obfuscated)
  if (PROTOCOL_OR_WWW_REGEX.test(trimmed)) {
    return true;
  }

  // Step 2: Catch known social, messaging, shortener, and external job platforms
  if (KNOWN_PLATFORM_REGEX.test(trimmed)) {
    return true;
  }

  // Step 3: Mask legitimate email addresses so "Apply at hr@company.com" passes
  let working = trimmed.replace(STANDALONE_EMAIL_REGEX, (full, prefix, emailPart) => {
    const lowerEmail = String(emailPart).toLowerCase();
    // If someone disguised a known link domain inside an email-like token
    if (KNOWN_PLATFORM_REGEX.test(lowerEmail)) {
      return full;
    }
    return `${prefix} __GULFARO_EMAIL__ `;
  });

  // Step 4: Mask safe technical terms & academic abbreviations (e.g., React.js, B.Tech, M.Sc, ASP.NET)
  working = working.replace(SAFE_TECH_OR_ABBR_REGEX, ' __SAFE_TERM__ ');

  // Step 5: Check obfuscated [dot] / (dot) / {dot} / " dot " and spaced/regular domain names
  if (
    OBFUSCATED_BRACKET_DOT_REGEX.test(working) ||
    OBFUSCATED_WORD_DOT_REGEX.test(working) ||
    SPACED_DOT_DOMAIN_REGEX.test(working) ||
    DOMAIN_WITH_PATH_REGEX.test(working)
  ) {
    return true;
  }

  return false;
}

export interface ExternalLinkValidationResult {
  valid: boolean;
  invalidFields: string[];
  message: string | null;
}

export function validateJobFieldsForExternalLinks(
  fields: Record<string, string | string[] | number | undefined | null>
): ExternalLinkValidationResult {
  const invalidFields: string[] = [];

  for (const [fieldKey, rawVal] of Object.entries(fields)) {
    if (rawVal === undefined || rawVal === null) continue;
    const isEmailField = fieldKey === 'contactEmail';
    const isPhoneField = fieldKey === 'contactPhone' || fieldKey === 'contactWhatsapp';

    const textToCheck = Array.isArray(rawVal)
      ? rawVal.map(v => String(v ?? '')).join('\n')
      : String(rawVal);

    if (containsExternalLink(textToCheck, { isEmailField, isPhoneField })) {
      invalidFields.push(fieldKey);
    }
  }

  if (invalidFields.length > 0) {
    return {
      valid: false,
      invalidFields,
      message: EXTERNAL_LINK_ERROR_MESSAGE
    };
  }

  return {
    valid: true,
    invalidFields: [],
    message: null
  };
}
