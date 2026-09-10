import PDFDocument from 'pdfkit';
import { AppDataSource } from '../db/data-source';
import { Invoice, InvoiceCounter, InvoiceLineItem } from '../models/Invoice';
import { Order } from '../models/Order';
import gmailService from './gmailService';
import { INVOICE_BRAND } from './invoiceBrand';
import { resolveInvoiceLogoPath } from '../utils/resolveInvoiceLogoPath';
import { PRICE_TBD_AT_DELIVERY, hasProductPrice, parseProductPrice, SHOW_CATALOGUE_PRICES_TO_USERS } from '../utils/productPrice';

const BRAND_EMAIL =
  process.env.INVOICE_BRAND_EMAIL ||
  process.env.GMAIL_API_USER_EMAIL ||
  process.env.GMAIL_USER ||
  'aestheticrxnetwork@gmail.com';

const MIN_TABLE_ROWS = 28;

export interface InvoiceDraft {
  clinicName: string;
  doctorName: string;
  invoiceDate: string;
  invoiceNumber?: string;
  customFooter?: string;
  lineItems: InvoiceLineItem[];
  orderId?: string | null;
  doctorId?: string | null;
  source?: 'manual' | 'order';
  createdBy?: string | null;
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function fmtDate(iso: string): string {
  const d = new Date(iso + (iso.includes('T') ? '' : 'T00:00:00'));
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function lineTotal(item: InvoiceLineItem): number | null {
  if (item.unitPrice == null || !Number.isFinite(Number(item.unitPrice))) return null;
  return Number(item.qty) * Number(item.unitPrice);
}

export function computeGrandTotal(items: InvoiceLineItem[]): number {
  return items.reduce((s, r) => {
    const t = lineTotal(r);
    return s + (t ?? 0);
  }, 0);
}

function formatUnitPriceCell(item: InvoiceLineItem): string {
  if (item.unitPrice == null || !Number.isFinite(Number(item.unitPrice))) {
    return PRICE_TBD_AT_DELIVERY;
  }
  return fmtNum(Number(item.unitPrice));
}

function formatLineTotalCell(item: InvoiceLineItem): string {
  const t = lineTotal(item);
  if (t == null) return PRICE_TBD_AT_DELIVERY;
  return fmtNum(t);
}

function invoiceHasAnyTbd(items: InvoiceLineItem[]): boolean {
  return items.some((r) => r.unitPrice == null || !Number.isFinite(Number(r.unitPrice)));
}

function formatInvoiceNumber(n: number): string {
  return `Rx# ${n}`;
}

/** Wordmark colors aligned with BrandTitle / logo.svg (Ne = blue + gold). */
function drawBrandWordmark(doc: PDFKit.PDFDocument, x: number, y: number, fontSize = 24): number {
  doc.font('Helvetica-Bold').fontSize(fontSize);
  const segments: { text: string; color: string }[] = [
    { text: 'Aesthetic', color: INVOICE_BRAND.blue },
    { text: 'R', color: INVOICE_BRAND.blue },
    { text: 'X', color: INVOICE_BRAND.teal },
    { text: 'N', color: INVOICE_BRAND.blue },
    { text: 'e', color: INVOICE_BRAND.gold },
    { text: 'twork', color: INVOICE_BRAND.goldDark },
  ];
  let cx = x;
  for (const seg of segments) {
    doc.fillColor(seg.color);
    doc.text(seg.text, cx, y, { lineBreak: false });
    cx += doc.widthOfString(seg.text);
  }
  return cx;
}

function drawGrandTotalRow(
  doc: PDFKit.PDFDocument,
  y: number,
  pageLeft: number,
  tableWidth: number,
  colX: number[],
  colW: number[],
  grandDisplay: string
): number {
  const grandH = 20;
  doc.strokeColor(INVOICE_BRAND.tableHeader).lineWidth(1.5);
  doc.moveTo(pageLeft, y).lineTo(pageLeft + tableWidth, y).stroke();
  y += 4;
  doc.rect(pageLeft, y, tableWidth, grandH).fill('#ffffff');
  doc.strokeColor(INVOICE_BRAND.tableHeader).lineWidth(1.5);
  doc.moveTo(pageLeft, y + grandH).lineTo(pageLeft + tableWidth, y + grandH).stroke();

  const totalColX = colX[4] ?? pageLeft;
  const totalColW = colW[4] ?? 80;
  const labelWidth = totalColX - pageLeft - 12;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(INVOICE_BRAND.blue)
    .text('Grand Total', pageLeft + 4, y + 5, { width: labelWidth, align: 'right' });

  doc
    .font('Helvetica-Bold')
    .fontSize(grandDisplay === PRICE_TBD_AT_DELIVERY ? 9 : 11)
    .fillColor(INVOICE_BRAND.blue)
    .text(grandDisplay, totalColX + 2, y + 5, { width: totalColW - 6, align: 'right' });

  return y + grandH;
}

class InvoiceService {
  async allocateInvoiceNumber(): Promise<string> {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(InvoiceCounter);
      let row = await repo.findOne({ where: { id: 1 } });
      if (!row) {
        row = repo.create({ id: 1, next_number: 2001 });
        await repo.save(row);
      }
      const num = row.next_number;
      row.next_number = num + 1;
      await repo.save(row);
      return formatInvoiceNumber(num);
    });
  }

  async peekNextInvoiceNumber(): Promise<string> {
    const row = await AppDataSource.getRepository(InvoiceCounter).findOne({ where: { id: 1 } });
    const num = row?.next_number ?? 2001;
    return formatInvoiceNumber(num);
  }

  orderToLineItems(order: Order): InvoiceLineItem[] {
    const product = order.product;
    let unitPrice: number | null = null;
    if (SHOW_CATALOGUE_PRICES_TO_USERS) {
      const cataloguePrice = parseProductPrice(product?.price);
      unitPrice = cataloguePrice;
      if (unitPrice == null && hasProductPrice(order.order_total) && Number(order.order_total) > 0) {
        unitPrice = Number(order.order_total) / (order.qty || 1);
      }
    }
    return [
      {
        qty: order.qty,
        item: product?.name || 'Product',
        description: product?.description || order.notes || '',
        unitPrice,
      },
    ];
  }

  draftFromOrder(order: Order): InvoiceDraft {
    const doctor = order.doctor;
    return {
      clinicName: doctor?.clinic_name || '',
      doctorName: doctor?.doctor_name || '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      lineItems: this.orderToLineItems(order),
      orderId: order.id,
      doctorId: order.doctor_id,
      source: 'order',
    };
  }

  /** One challan for an entire cart checkout (batch). */
  draftFromOrders(orders: Order[]): InvoiceDraft {
    const first = orders[0]!;
    const doctor = first.doctor;
    return {
      clinicName: doctor?.clinic_name || '',
      doctorName: doctor?.doctor_name || '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      lineItems: orders.flatMap((o) => this.orderToLineItems(o)),
      orderId: first.id,
      doctorId: first.doctor_id,
      source: 'order',
    };
  }

  generatePdfBuffer(draft: InvoiceDraft & { invoiceNumber: string }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const items = draft.lineItems;
        const grand = computeGrandTotal(items);
        const grandDisplay = invoiceHasAnyTbd(items)
          ? PRICE_TBD_AT_DELIVERY
          : fmtNum(grand);
        const pageLeft = 40;
        const tableWidth = 515;
        const headerH = 20;
        const minRowH = 18;
        const rowPadY = 5;
        const pageBottom = doc.page.height - 60;

        const logoPath = resolveInvoiceLogoPath();
        const logoSize = 96;
        if (logoPath) {
          doc.image(logoPath, pageLeft, 36, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
        } else {
          console.warn('⚠️ Invoice logo not found — checked assets/invoice/logo.png paths');
        }

        const brandX = pageLeft + logoSize + 14;
        drawBrandWordmark(doc, brandX, 40, 24);

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(INVOICE_BRAND.goldDark)
          .text('CONNECTED AESTHETIC CARE', brandX, 72, { characterSpacing: 0.8 });

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(INVOICE_BRAND.blue)
          .text(BRAND_EMAIL, brandX, 88);

        doc.font('Helvetica-Bold').fontSize(10).fillColor(INVOICE_BRAND.text);
        doc.text(`Date: ${fmtDate(draft.invoiceDate)}`, 380, 44, { width: 175, align: 'right' });
        doc.text(`Invoice No: ${draft.invoiceNumber}`, 380, 60, { width: 175, align: 'right' });

        let y = 148;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(INVOICE_BRAND.text);
        doc.text('Bill To:', pageLeft, y);
        doc.font('Helvetica').fontSize(11);
        const billLines = [draft.clinicName, draft.doctorName].filter(Boolean);
        if (billLines.length === 0) {
          doc.text('—', pageLeft + 52, y);
          y += 20;
        } else {
          billLines.forEach((line, i) => {
            doc.text(line, pageLeft + 52, y + i * 16, { width: 300 });
          });
          y += Math.max(1, billLines.length) * 16 + 8;
        }

        const colX = [pageLeft, pageLeft + 48, pageLeft + 168, pageLeft + 368, pageLeft + 448];
        const colW = [48, 120, 200, 80, 67];

        const drawTableHeader = () => {
          doc.rect(pageLeft, y, tableWidth, headerH).fill(INVOICE_BRAND.tableHeader);
          const headers = ['Qty', 'Item #', 'Description', 'Unit Price', 'Total'];
          headers.forEach((h, i) => {
            const x = colX[i] ?? pageLeft;
            const w = colW[i] ?? 80;
            doc
              .font('Helvetica-Bold')
              .fontSize(9)
              .fillColor('#ffffff')
              .text(h, x + 4, y + 5, { width: w - 8, align: i >= 3 ? 'right' : 'left' });
          });
          y += headerH;
        };

        drawTableHeader();

        const measureRowHeight = (row: InvoiceLineItem): number => {
          doc.font('Helvetica').fontSize(8);
          const itemH = doc.heightOfString(String(row.item || ''), {
            width: (colW[1] ?? 120) - 8,
          });
          const descH = doc.heightOfString(String(row.description || ''), {
            width: (colW[2] ?? 200) - 8,
          });
          const priceH = doc.heightOfString(formatUnitPriceCell(row), {
            width: (colW[3] ?? 80) - 8,
          });
          const totalH = doc.heightOfString(formatLineTotalCell(row), {
            width: (colW[4] ?? 67) - 8,
          });
          return Math.max(minRowH, itemH, descH, priceH, totalH) + rowPadY * 2;
        };

        const drawDataRow = (row: InvoiceLineItem, index: number) => {
          const rowH = measureRowHeight(row);
          if (y + rowH > pageBottom) {
            doc.addPage();
            y = 40;
            drawTableHeader();
          }

          const bg = index % 2 === 0 ? '#ffffff' : INVOICE_BRAND.tableStripe;
          doc.rect(pageLeft, y, tableWidth, rowH).fill(bg);
          doc
            .strokeColor(INVOICE_BRAND.tableBorder)
            .lineWidth(0.5)
            .rect(pageLeft, y, tableWidth, rowH)
            .stroke();

          const vals = [
            fmtQty(Number(row.qty)),
            row.item,
            row.description || '',
            formatUnitPriceCell(row),
            formatLineTotalCell(row),
          ];
          vals.forEach((v, ci) => {
            const x = colX[ci] ?? pageLeft;
            const w = colW[ci] ?? 80;
            doc
              .font('Helvetica')
              .fontSize(ci >= 3 && v === PRICE_TBD_AT_DELIVERY ? 7 : 8)
              .fillColor(INVOICE_BRAND.text)
              .text(String(v), x + 4, y + rowPadY, {
                width: w - 8,
                align: ci >= 3 ? 'right' : 'left',
              });
          });
          y += rowH;
        };

        items.forEach((row, index) => drawDataRow(row, index));

        // Pad empty rows for challan look (short fixed height)
        const emptyNeeded = Math.max(0, MIN_TABLE_ROWS - items.length);
        for (let i = 0; i < emptyNeeded; i++) {
          if (y + minRowH > pageBottom) break;
          const bg = (items.length + i) % 2 === 0 ? '#ffffff' : INVOICE_BRAND.tableStripe;
          doc.rect(pageLeft, y, tableWidth, minRowH).fill(bg);
          doc
            .strokeColor(INVOICE_BRAND.tableBorder)
            .lineWidth(0.5)
            .rect(pageLeft, y, tableWidth, minRowH)
            .stroke();
          y += minRowH;
        }

        if (y + 28 > pageBottom) {
          doc.addPage();
          y = 40;
        }
        y = drawGrandTotalRow(doc, y, pageLeft, tableWidth, colX, colW, grandDisplay);
        y += 24;

        if (draft.customFooter?.trim()) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(INVOICE_BRAND.text)
            .text(draft.customFooter.trim(), pageLeft, y, { width: tableWidth, align: 'center' });
          y += 20;
        }

        doc
          .font('Helvetica-Oblique')
          .fontSize(8)
          .fillColor(INVOICE_BRAND.muted)
          .text(
            'Payable to AESTHETICRXNETWORK (PRIVATE LIMITED) · Thank you for your connection with us!',
            pageLeft,
            Math.min(y + 8, pageBottom - 20),
            { width: tableWidth, align: 'center' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async saveInvoice(draft: InvoiceDraft, invoiceNumber?: string): Promise<Invoice> {
    const number = invoiceNumber || (await this.allocateInvoiceNumber());
    const repo = AppDataSource.getRepository(Invoice);
    const grand = computeGrandTotal(draft.lineItems);
    const entity = repo.create({
      invoice_number: number,
      order_id: draft.orderId || null,
      doctor_id: draft.doctorId || null,
      clinic_name: draft.clinicName || null,
      doctor_name: draft.doctorName || null,
      invoice_date: draft.invoiceDate,
      custom_footer: draft.customFooter || null,
      line_items: draft.lineItems,
      grand_total: grand,
      source: draft.source || 'manual',
      created_by: draft.createdBy || null,
    });
    return repo.save(entity);
  }

  async createFromOrder(order: Order, createdBy?: string): Promise<Invoice> {
    const draft = this.draftFromOrder(order);
    draft.createdBy = createdBy || null;
    return this.saveInvoice(draft);
  }

  invoicePdfBuffer(invoice: Invoice): Promise<Buffer> {
    return this.generatePdfBuffer({
      clinicName: invoice.clinic_name || '',
      doctorName: invoice.doctor_name || '',
      invoiceDate:
        typeof invoice.invoice_date === 'string'
          ? invoice.invoice_date
          : new Date(invoice.invoice_date).toISOString().slice(0, 10),
      invoiceNumber: invoice.invoice_number,
      customFooter: invoice.custom_footer || undefined,
      lineItems: invoice.line_items,
    });
  }

  async ensureInvoiceForOrder(order: Order, createdBy?: string): Promise<Invoice | null> {
    if (!order.doctor?.email) {
      console.warn('Invoice skipped: no doctor email on order', order.order_number);
      return null;
    }

    const repo = AppDataSource.getRepository(Invoice);
    const existing = await repo.findOne({ where: { order_id: order.id } });
    if (existing) {
      return existing;
    }

    return this.createFromOrder(order, createdBy);
  }

  /**
   * Single challan for checkout: one invoice row + one PDF for 1 or many orders in the cart.
   */
  async ensureInvoiceForCheckout(orders: Order[], createdBy?: string): Promise<Invoice | null> {
    if (!orders.length) return null;
    if (!orders[0]?.doctor?.email) {
      console.warn('Invoice skipped: no doctor email');
      return null;
    }

    if (orders.length === 1) {
      return this.ensureInvoiceForOrder(orders[0]!, createdBy);
    }

    const repo = AppDataSource.getRepository(Invoice);
    const anchorOrderId = orders[0]!.id;
    const existing = await repo.findOne({ where: { order_id: anchorOrderId } });
    const draft = this.draftFromOrders(orders);
    draft.createdBy = createdBy || null;

    if (existing) {
      existing.line_items = draft.lineItems;
      existing.grand_total = computeGrandTotal(draft.lineItems);
      existing.clinic_name = draft.clinicName;
      existing.doctor_name = draft.doctorName;
      return repo.save(existing);
    }

    return this.saveInvoice(draft);
  }

  async sendInvoiceEmail(invoice: Invoice, recipientEmail: string): Promise<void> {
    const pdf = await this.invoicePdfBuffer(invoice);

    const fileName = 'Invoices.pdf';
    const subject = `Invoice ${invoice.invoice_number} — AestheticRxNetwork`;
    const html = `
      <p>Dear ${invoice.doctor_name || 'Customer'},</p>
      <p>Thank you for your order with <strong>AestheticRxNetwork</strong>.</p>
      <p>Please find your invoice <strong>${invoice.invoice_number}</strong> attached (Grand Total: ${
        invoiceHasAnyTbd(invoice.line_items || [])
          ? PRICE_TBD_AT_DELIVERY
          : `PKR ${fmtNum(Number(invoice.grand_total))}`
      }).</p>
      <p>Payable to AESTHETICRXNETWORK (PRIVATE LIMITED).</p>
      <p>Thank you for your connection with us!</p>
    `;

    await gmailService.sendEmailWithAttachments(
      recipientEmail,
      subject,
      html,
      [{ filename: fileName, content: pdf, contentType: 'application/pdf' }],
      {
        isMarketing: false,
        orderId: invoice.order_id || undefined,
      }
    );

    invoice.emailed_at = new Date();
    await AppDataSource.getRepository(Invoice).save(invoice);
  }

  /**
   * One customer email per checkout with a single Invoices.pdf attachment (no separate invoice emails).
   */
  async sendOrderConfirmationWithInvoices(orders: Order[]): Promise<void> {
    if (!orders.length) return;

    const customerEmail = orders[0]?.doctor?.email;
    if (!customerEmail) {
      console.warn('Order confirmation skipped: no customer email');
      return;
    }

    const invoice = await this.ensureInvoiceForCheckout(orders);
    if (!invoice) {
      console.warn('Order confirmation skipped: no invoice generated');
      return;
    }

    const pdf = await this.invoicePdfBuffer(invoice);
    const attachments = [
      {
        filename: 'Invoices.pdf',
        content: pdf,
        contentType: 'application/pdf',
      },
    ];

    if (!invoice.emailed_at) {
      invoice.emailed_at = new Date();
      await AppDataSource.getRepository(Invoice).save(invoice);
    }

    await gmailService.sendCustomerOrderPlacedConfirmation(orders, attachments);
    console.log(`✅ Order confirmation + Invoices.pdf sent to ${customerEmail}`);
  }

  /** @deprecated Use sendOrderConfirmationWithInvoices — kept for admin resend */
  async createAndEmailForOrder(order: Order): Promise<Invoice | null> {
    await this.sendOrderConfirmationWithInvoices([order]);
    return AppDataSource.getRepository(Invoice).findOne({ where: { order_id: order.id } });
  }
}

export default new InvoiceService();
