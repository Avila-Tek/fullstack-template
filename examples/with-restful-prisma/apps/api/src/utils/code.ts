export function generateCode() {
  const numbers = '1234567890'.repeat(4);
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  const upperChars = lowerChars.toUpperCase();
  const chars = numbers + lowerChars + upperChars;

  const code = Array.from(
    { length: 50 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return code;
}
