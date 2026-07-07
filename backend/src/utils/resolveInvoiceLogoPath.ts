import * as fs from 'fs';
import * as path from 'path';

/** Resolve logo.png for PDF generation (dev, Railway, Docker). */
export function resolveInvoiceLogoPath(): string | null {
  const candidates = [
    path.join(__dirname, '../../assets/invoice/logo.png'),
    path.join(__dirname, '../../../assets/invoice/logo.png'),
    path.join(process.cwd(), 'assets/invoice/logo.png'),
    path.join(process.cwd(), 'backend/assets/invoice/logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
