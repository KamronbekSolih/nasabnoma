/** UI dates are entered/shown as dd.mm.yyyy; storage stays ISO (yyyy-mm-dd) for the DB `date` columns. */

const DMY_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

export function isoToDMY(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}`;
}

/** Returns the ISO date, or null for an empty input. Throws on a non-empty value that doesn't match dd.mm.yyyy. */
export function dmyToISO(dmy: string | null | undefined): string | null {
  const trimmed = dmy?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(DMY_PATTERN);
  if (!match) {
    throw new Error(`Sana noto'g'ri formatda: "${trimmed}". kk.oo.yyyy dan foydalaning.`);
  }
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}
