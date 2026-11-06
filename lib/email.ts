/*
  Email address checks shared by the sign-up form, the booking form, the
  booking API and the admin portal. Safe to import on the client.

  Deliberately stricter than RFC 5322: no whitespace, control characters,
  quotes, backslashes, brackets or the separators ; , < > that a mail header
  would read as the start of another address. Real addresses do not need them,
  and a guest-supplied address goes into Reply-To and To headers.

  This only checks the shape. Nobody proves they own the address (no
  confirmation email yet); see README "Open items".
*/
const PART = "[^\\s@\"'`;,<>()\\[\\]\\\\\\x00-\\x1f\\x7f]+";
const EMAIL = new RegExp(`^${PART}@${PART}\\.${PART}$`);

export const MAX_EMAIL_LENGTH = 200;

export function isValidEmail(value: string) {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL.test(value);
}

/*
  Removes control characters (CR, LF, NUL, tab and friends) and the Unicode
  line separators, so a value can never start a new line in a mail header.
*/
const CONTROL = new RegExp(`[\x00-\x1f\x7f${String.fromCharCode(0x85, 0x2028, 0x2029)}]`, "g");
export const stripControl = (value: string) => value.replace(CONTROL, "");
