/**
 * Pul summasini formatlash (masalan: 1,250,000 so'm)
 */
export function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

/**
 * Sana formatlash (masalan: 15.03.2025)
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/**
 * Telefon raqamni to'g'ri shaklda saqlash: +998XXXXXXXXX
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const localDigits = digits.startsWith('998') ? digits.slice(3) : digits;
  const valid9 = localDigits.slice(0, 9);
  return '+998' + valid9;
}
