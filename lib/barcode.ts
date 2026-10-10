/** GTIN (EAN-8 / UPC-A / EAN-13 / GTIN-14) check-digit validation. Filters out most scanner misreads. */
export function isValidGtin(code: string): boolean {
  if (!/^\d+$/.test(code) || ![8, 12, 13, 14].includes(code.length)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  // From the right (excluding the check digit) weights alternate 3, 1, 3, 1…
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/**
 * A scanner reports many frames per second, and occasionally a wrong code on a blurry one.
 * Accept a code only after it has been read twice in a row within `windowMs`.
 */
export function createStableReader(windowMs = 2000, required = 2) {
  let last = "";
  let count = 0;
  let at = 0;
  return (code: string, now = Date.now()): boolean => {
    if (!isValidGtin(code)) return false;
    if (code === last && now - at <= windowMs) count++;
    else { last = code; count = 1; }
    at = now;
    return count >= required;
  };
}
