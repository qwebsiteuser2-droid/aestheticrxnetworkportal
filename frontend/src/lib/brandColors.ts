/** Brand colors aligned with logo.svg / logo.png (nameGrad stops) */
export const BRAND = {
  blue: '#1E6BFF',
  blueDark: '#0837D7',
  gold: '#F5C24C',
  goldDark: '#D59225',
  /** Light blue at logo nameGrad ~60% — matches X and Ne in the wordmark */
  teal: '#35B7D6',
  lightBlue: '#35B7D6',
  green: '#7AAC52',
} as const;

/** logo.svg #nameGrad — full wordmark gradient reference */
export const BRAND_NAME_GRADIENT = `linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.teal} 60%, ${BRAND.goldDark} 100%)`;
