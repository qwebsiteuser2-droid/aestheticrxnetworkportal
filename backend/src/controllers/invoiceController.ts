import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AppDataSource } from '../db/data-source';
import { Invoice } from '../models/Invoice';
import { Order } from '../models/Order';
import { Doctor } from '../models/Doctor';
import invoiceService, { computeGrandTotal, InvoiceDraft } from '../services/invoiceService';

export const listInvoices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 100);
    const repo = AppDataSource.getRepository(Invoice);
    const invoices = await repo.find({
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['order'],
    });
    res.json({ success: true, data: invoices });
  } catch (error) {
    console.error('listInvoices:', error);
    res.status(500).json({ success: false, message: 'Failed to list invoices' });
  }
};

export const getNextInvoiceNumber = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const next = await invoiceService.peekNextInvoiceNumber();
    res.json({ success: true, data: { invoiceNumber: next } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get invoice number' });
  }
};

export const createManualInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as InvoiceDraft & { sendEmail?: boolean; recipientEmail?: string };
    if (!body.lineItems?.length) {
      res.status(400).json({ success: false, message: 'At least one line item is required' });
      return;
    }
    if (!body.clinicName?.trim() && !body.doctorName?.trim()) {
      res.status(400).json({ success: false, message: 'Clinic or doctor name is required' });
      return;
    }

    const draft: InvoiceDraft = {
      clinicName: body.clinicName || '',
      doctorName: body.doctorName || '',
      invoiceDate: body.invoiceDate || new Date().toISOString().slice(0, 10),
      customFooter: body.customFooter,
      lineItems: body.lineItems,
      source: 'manual',
      createdBy: req.user?.id || null,
      doctorId: body.doctorId || null,
      orderId: body.orderId || null,
    };

    const invoice = await invoiceService.saveInvoice(draft, body.invoiceNumber);

    if (body.sendEmail && body.recipientEmail) {
      await invoiceService.sendInvoiceEmail(invoice, body.recipientEmail);
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('createManualInvoice:', error);
    res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
};

export const createInvoiceFromOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { sendEmail } = req.body as { sendEmail?: boolean };

    const order = await AppDataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: ['doctor', 'product'],
    });
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const invoice = await invoiceService.createFromOrder(order, req.user?.id);
    if (sendEmail !== false && order.doctor?.email) {
      await invoiceService.sendInvoiceEmail(invoice, order.doctor.email);
    }

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    console.error('createInvoiceFromOrder:', error);
    res.status(500).json({ success: false, message: 'Failed to create invoice from order' });
  }
};

export const previewInvoicePdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as InvoiceDraft;
    const invoiceNumber =
      body.invoiceNumber || (await invoiceService.peekNextInvoiceNumber());
    const pdf = await invoiceService.generatePdfBuffer({
      clinicName: body.clinicName || '',
      doctorName: body.doctorName || '',
      invoiceDate: body.invoiceDate || new Date().toISOString().slice(0, 10),
      invoiceNumber,
      customFooter: body.customFooter,
      lineItems: body.lineItems || [],
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="invoice-preview.pdf"');
    res.send(pdf);
  } catch (error) {
    console.error('previewInvoicePdf:', error);
    res.status(500).json({ success: false, message: 'Failed to generate preview' });
  }
};

export const downloadInvoicePdf = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const invoice = await AppDataSource.getRepository(Invoice).findOne({
      where: { id: req.params.id },
    });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const pdf = await invoiceService.generatePdfBuffer({
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

    const fileName = `invoice_${invoice.invoice_number.replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
  } catch (error) {
    console.error('downloadInvoicePdf:', error);
    res.status(500).json({ success: false, message: 'Failed to download invoice' });
  }
};

export const sendInvoiceEmail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    const invoice = await AppDataSource.getRepository(Invoice).findOne({
      where: { id: req.params.id },
      relations: ['order', 'order.doctor'],
    });
    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    let recipient = email || invoice.order?.doctor?.email;
    if (!recipient && invoice.doctor_id) {
      const doctor = await AppDataSource.getRepository(Doctor).findOne({
        where: { id: invoice.doctor_id },
      });
      recipient = doctor?.email;
    }

    if (!recipient) {
      res.status(400).json({ success: false, message: 'Recipient email is required' });
      return;
    }

    await invoiceService.sendInvoiceEmail(invoice, recipient);
    res.json({ success: true, message: `Invoice sent to ${recipient}` });
  } catch (error: unknown) {
    console.error('sendInvoiceEmail:', error);
    const msg = error instanceof Error ? error.message : 'Failed to send invoice email';
    res.status(500).json({ success: false, message: msg });
  }
};

export const getInvoiceTotals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { lineItems } = req.body as { lineItems: InvoiceDraft['lineItems'] };
    res.json({
      success: true,
      data: { grandTotal: computeGrandTotal(lineItems || []) },
    });
  } catch {
    res.status(400).json({ success: false, message: 'Invalid line items' });
  }
};
