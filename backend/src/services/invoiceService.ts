import PDFDocument from 'pdfkit';
import { AppDataSource } from '../db/data-source';
import { Invoice, InvoiceCounter, InvoiceLineItem } from '../models/Invoice';
import { Order } from '../models/Order';
import gmailService from './gmailService';
import { INVOICE_BRAND } from './invoiceBrand';
import { resolveInvoiceLogoPath } from '../utils/resolveInvoiceLogoPath';

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

function lineTotal(item: InvoiceLineItem): number {
  return Number(item.qty) * Number(item.unitPrice);
}

export function computeGrandTotal(items: InvoiceLineItem[]): number {
  return items.reduce((s, r) => s + lineTotal(r), 0);
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
  grand: number
): number {
  const grandH = 20;
  doc.strokeColor(INVOICE_BRAND.tableHeader).lineWidth(1.5);
  doc.moveTo(pageLeft, y).lineTo(pageLeft + tableWidth, y).stroke();
  y += 4;
  doc.rect(pageLeft, y, tableWidth, grandH).fill('#ffffff');
  doc.strokeColor(INVOICE_BRAND.tableHeader).lineWidth(1.5);
  doc.moveTo(pageLeft, y + grandH).lineTo(pageLeft + tableWidth, y + grandH).stroke();

  const labelWidth = colX[4] - pageLeft - 12;
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(INVOICE_BRAND.blue)
    .text('Grand Total', pageLeft + 4, y + 5, { width: labelWidth, align: 'right' });

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(INVOICE_BRAND.blue)
    .text(fmtNum(grand), colX[4] + 2, y + 5, { width: colW[4] - 6, align: 'right' });

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
    const unitPrice = product?.price ? Number(product.price) : Number(order.order_total) / (order.qty || 1);
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
        const bodyRows = Math.max(MIN_TABLE_ROWS, items.length);
        const pageLeft = 40;
        const tableWidth = 515;
        const rowH = 16;
        const headerH = 20;

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
            doc.text(line, pageLeft + 52, y + i * 16);
          });
          y += billLines.length * 16 + 8;
        }

        const colX = [pageLeft, pageLeft + 48, pageLeft + 168, pageLeft + 368, pageLeft + 448];
        const colW = [48, 120, 200, 80, 67];

        doc.rect(pageLeft, y, tableWidth, headerH).fill(INVOICE_BRAND.tableHeader);
        const headers = ['Qty', 'Item #', 'Description', 'Unit Price', 'Total'];
        headers.forEach((h, i) => {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#ffffff')
            .text(h, colX[i] + 4, y + 5, { width: colW[i] - 8, align: i >= 3 ? 'right' : 'left' });
        });
        y += headerH;

        for (let i = 0; i < bodyRows; i++) {
          const row = items[i];
          const bg = i % 2 === 0 ? '#ffffff' : INVOICE_BRAND.tableStripe;
          doc.rect(pageLeft, y, tableWidth, rowH).fill(bg);
          doc
            .strokeColor(INVOICE_BRAND.tableBorder)
            .lineWidth(0.5)
            .rect(pageLeft, y, tableWidth, rowH)
            .stroke();

          if (row) {
            const vals = [
              fmtQty(Number(row.qty)),
              row.item,
              row.description || '',
              fmtNum(Number(row.unitPrice)),
              fmtNum(lineTotal(row)),
            ];
            vals.forEach((v, ci) => {
              doc
                .font('Helvetica')
                .fontSize(8)
                .fillColor(INVOICE_BRAND.text)
                .text(v, colX[ci] + 4, y + 4, {
                  width: colW[ci] - 8,
                  align: ci >= 3 ? 'right' : 'left',
                  ellipsis: true,
                });
            });
          }
          y += rowH;
        }

        y = drawGrandTotalRow(doc, y, pageLeft, tableWidth, colX, colW, grand);
        y += 24;

        if (draft.customFooter?.trim()) {
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor(INVOICE_BRAND.blue)
            .text(draft.customFooter.trim(), pageLeft, y, { width: tableWidth, align: 'center' });
          y += 18;
        }

        doc
          .font('Helvetica-Oblique')
          .fontSize(9)
          .fillColor(INVOICE_BRAND.muted)
          .text('Payable to AestheticRXNetwork', pageLeft, y, { width: tableWidth, align: 'center' });
        doc.text('Thank you for your connection with us!', pageLeft, y + 14, {
          width: tableWidth,
          align: 'center',
        });

        doc.end();
      } catch (e) {
        reject(e);
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
    const subject = `Invoice ${invoice.invoice_number} — AestheticRx Network`;
    const html = `
      <p>Dear ${invoice.doctor_name || 'Customer'},</p>
      <p>Thank you for your order with <strong>AestheticRx Network</strong>.</p>
      <p>Please find your invoice <strong>${invoice.invoice_number}</strong> attached (Grand Total: PKR ${fmtNum(Number(invoice.grand_total))}).</p>
      <p>Payable to AestheticRx Network.</p>
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
