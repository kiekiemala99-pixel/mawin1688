export function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

export function isThaiPhone(raw: string) {
  return /^0\d{8,9}$/.test(normalizePhone(raw));
}

/** Better Auth requires an email; phone is the real login id. */
export function phoneToEmail(raw: string) {
  const digits = normalizePhone(raw);
  return `${digits || "unknown"}@members.mawin1688.app`;
}
