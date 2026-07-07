'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { BRAND } from '@/lib/brandColors';

export interface InvoiceLineItem {
  qty: number | string;
  item: string;
  description: string;
  unitPrice: number | string;
}

const emptyRow = (): InvoiceLineItem => ({
  qty: 1,
  item: '',
  description: '',
  unitPrice: '',
});

function parseAmt(v: number | string): number {
  const n = Number(String(v).replace(/,/g, '').trim());
  return isFinite(n) ? n : 0;
}

function lineTotal(r: InvoiceLineItem): number {
  return parseAmt(r.qty) * parseAmt(r.unitPrice);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function InvoiceGenerator() {
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customFooter, setCustomFooter] = useState('');
  const [rows, setRows] = useState<InvoiceLineItem[]>([emptyRow()]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);

  const loadNextNumber = useCallback(async () => {
    try {
      const res = await api.get('/admin/invoices/next-number');
      if (res.data?.success) setInvoiceNo(res.data.data.invoiceNumber);
    } catch {
      /* ignore */
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const res = await api.get('/admin/invoices?limit=20');
      if (res.data?.success) setRecent(res.data.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNextNumber();
    loadRecent();
  }, [loadNextNumber, loadRecent]);

  const buildPayload = () => ({
    clinicName,
    doctorName,
    invoiceDate,
    invoiceNumber: invoiceNo,
    customFooter,
    lineItems: rows.map((r) => ({
      qty: parseAmt(r.qty),
      item: r.item,
      description: r.description,
      unitPrice: parseAmt(r.unitPrice),
    })),
    orderId: orderId || undefined,
    sendEmail: !!recipientEmail,
    recipientEmail: recipientEmail || undefined,
  });

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewPdf = async () => {
    try {
      const res = await api.post('/admin/invoices/preview', buildPayload(), {
        responseType: 'blob',
      });
      downloadBlob(res.data, 'invoice-preview.pdf');
      toast.success('PDF preview downloaded');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Preview failed');
    }
  };

  const handleSave = async (andEmail: boolean) => {
    if (!clinicName.trim() && !doctorName.trim()) {
      toast.error('Enter clinic or doctor name');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...buildPayload(),
        sendEmail: andEmail && !!recipientEmail,
      };
      const res = await api.post('/admin/invoices', payload);
      if (res.data?.success) {
        toast.success(andEmail ? 'Invoice saved and emailed' : 'Invoice saved');
        await loadNextNumber();
        await loadRecent();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleFromOrder = async () => {
    if (!orderId.trim()) {
      toast.error('Enter order ID');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/admin/invoices/from-order/${orderId.trim()}`, {
        sendEmail: !!recipientEmail,
      });
      if (res.data?.success) {
        toast.success('Invoice created from order');
        await loadRecent();
        await loadNextNumber();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create from order');
    } finally {
      setSaving(false);
    }
  };

  const downloadSaved = async (id: string, number: string) => {
    try {
      const res = await api.get(`/admin/invoices/${id}/pdf`, { responseType: 'blob' });
      downloadBlob(res.data, `invoice_${number.replace(/\s+/g, '_')}.pdf`);
    } catch {
      toast.error('Download failed');
    }
  };

  const resendSaved = async (id: string, email: string) => {
    try {
      await api.post(`/admin/invoices/${id}/send-email`, { email: email || undefined });
      toast.success('Invoice emailed');
      loadRecent();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Send failed');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-4" style={{ color: BRAND.blue }}>
            Client & invoice
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">Clinic name</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Doctor name</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Date</label>
              <input
                type="date"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Invoice number</label>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-blue-50 font-mono"
                value={invoiceNo}
                readOnly
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-600">Custom footer (optional)</label>
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={customFooter}
              onChange={(e) => setCustomFooter(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-semibold text-gray-600">Email invoice to (optional)</label>
            <input
              type="email"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="doctor@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: BRAND.blue }}>
              Line items
            </h3>
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={() => setRows((r) => [...r, emptyRow()])}
            >
              + Add row
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {rows.map((row, i) => (
              <div key={i} className="border rounded-lg p-3 bg-gray-50 text-sm">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    placeholder="Qty"
                    className="border rounded px-2 py-1"
                    value={row.qty}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, qty: e.target.value };
                      setRows(next);
                    }}
                  />
                  <input
                    placeholder="Item #"
                    className="border rounded px-2 py-1 col-span-2"
                    value={row.item}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, item: e.target.value };
                      setRows(next);
                    }}
                  />
                </div>
                <input
                  placeholder="Description"
                  className="border rounded px-2 py-1 w-full mb-2"
                  value={row.description}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, description: e.target.value };
                    setRows(next);
                  }}
                />
                <div className="flex justify-between items-center gap-2">
                  <input
                    placeholder="Unit price"
                    className="border rounded px-2 py-1 flex-1"
                    value={row.unitPrice}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, unitPrice: e.target.value };
                      setRows(next);
                    }}
                  />
                  <span className="text-xs font-mono font-semibold text-blue-800 whitespace-nowrap">
                    Line: {fmtNum(lineTotal(row))}
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="text-red-600 text-xs"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right font-bold text-lg" style={{ color: BRAND.blue }}>
            Grand total: PKR {fmtNum(grandTotal)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
          >
            Preview PDF
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: BRAND.blue }}
          >
            Save invoice
          </button>
          <button
            type="button"
            disabled={saving || !recipientEmail}
            onClick={() => handleSave(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: BRAND.blueDark }}
          >
            Save & email
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: BRAND.blue }}>
            From existing order
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Paste order UUID from Order Management — creates invoice and emails the doctor.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="Order ID (UUID)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleFromOrder}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div
          className="bg-white rounded-xl border-2 p-4 shadow-sm overflow-hidden"
          style={{ borderColor: BRAND.blue }}
        >
          <p className="text-xs text-gray-500 mb-3 text-center">Live preview (simplified)</p>
          <div className="text-sm border border-gray-200 rounded-lg p-4 bg-white max-w-lg mx-auto">
            <div className="flex gap-3 mb-4">
              <img src="/logo.png" alt="" className="w-16 h-16 object-contain" />
              <div>
                <p className="text-xl font-bold" style={{ color: BRAND.blue }}>
                  AestheticRXNetwork
                </p>
                <p className="text-xs font-bold" style={{ color: BRAND.gold }}>
                  Connected Aesthetic Care
                </p>
                <p className="text-xs text-blue-700">aestheticrxnetwork@gmail.com</p>
              </div>
              <div className="ml-auto text-right text-xs">
                <div>
                  <b>Date:</b> {fmtDate(invoiceDate)}
                </div>
                <div>
                  <b>Invoice No:</b> {invoiceNo}
                </div>
              </div>
            </div>
            <p className="mb-2">
              <b>Bill To:</b> {[clinicName, doctorName].filter(Boolean).join(' — ') || '—'}
            </p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: BRAND.blue }}>
                  <th className="border p-1 text-left">Qty</th>
                  <th className="border p-1 text-left">Item</th>
                  <th className="border p-1 text-left">Description</th>
                  <th className="border p-1 text-right">Unit</th>
                  <th className="border p-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 ? 'bg-blue-50/30' : ''}>
                    <td className="border p-1">{r.qty}</td>
                    <td className="border p-1">{r.item}</td>
                    <td className="border p-1">{r.description}</td>
                    <td className="border p-1 text-right">{fmtNum(parseAmt(r.unitPrice))}</td>
                    <td className="border p-1 text-right">{fmtNum(lineTotal(r))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-gray-100">
                  <td colSpan={4} className="border p-1 text-right">
                    Grand Total
                  </td>
                  <td className="border p-1 text-right">{fmtNum(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
            {customFooter && (
              <p className="text-center text-xs mt-3 font-semibold text-blue-900">{customFooter}</p>
            )}
            <p className="text-center text-xs text-gray-500 mt-2 italic">
              Payable to AestheticRXNetwork · Thank you for your connection with us!
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-3" style={{ color: BRAND.blue }}>
            Recent invoices
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
              {recent.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                >
                  <div>
                    <span className="font-mono font-semibold">{inv.invoice_number}</span>
                    <span className="text-gray-500 ml-2">
                      PKR {fmtNum(Number(inv.grand_total))}
                    </span>
                    {inv.emailed_at && (
                      <span className="ml-2 text-xs text-green-700">✓ emailed</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-blue-600 text-xs underline"
                      onClick={() => downloadSaved(inv.id, inv.invoice_number)}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="text-blue-600 text-xs underline"
                      onClick={() => resendSaved(inv.id, recipientEmail)}
                    >
                      Resend
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
