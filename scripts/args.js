export function integerOption(value, key, min = 0) {
  if (!/^-?\d+$/.test(value ?? '') || !Number.isSafeInteger(Number(value)) || Number(value) < min) {
    throw new Error('Invalid or missing --' + key);
  }
  return Number(value);
}
