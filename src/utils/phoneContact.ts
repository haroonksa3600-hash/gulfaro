export function normalizeWhatsAppDigits(rawPhone: string): string {
  if (!rawPhone) return '';
  const compact = rawPhone
    .trim()
    .replace(/[\s()\-.\u00A0+]/g, '')
    .replace(/^00/, '');
  return compact.replace(/\D/g, '');
}

export function buildWhatsAppChatUrl(rawPhone: string): string | null {
  const digits = normalizeWhatsAppDigits(rawPhone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function buildTelHref(rawPhone: string): string | null {
  if (!rawPhone) return null;
  const compact = rawPhone.trim().replace(/[\s()\-.\u00A0]/g, '');
  const hasLeadingPlus = compact.startsWith('+');
  const digits = compact.replace(/\D/g, '');
  if (!digits) return null;
  return hasLeadingPlus ? `tel:+${digits}` : `tel:${digits}`;
}
