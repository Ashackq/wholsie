"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getInvoice } from "@/lib/api";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  billingAddress: Address;
  shippingAddress: Address;
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paymentStatus: string;
  storeName: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  gstNumber?: string;
  notes?: string;
}

export default function InvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const data = await getInvoice(invoiceId);
        if ("invoice" in data && data.invoice) {
          setInvoice(data.invoice as InvoiceData);
        } else if ("data" in data && data.data) {
          setInvoice(data.data as InvoiceData);
        } else {
          throw new Error("Invoice not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }

    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  // Auto-trigger print dialog for PDF download
  useEffect(() => {
    if (invoice && !loading) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [invoice, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error || "Invoice not found"}</p>
        </div>
      </div>
    );
  }

  const formatAddress = (addr: Address) => {
    const parts = [
      addr.street,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country,
    ];
    return parts.filter(Boolean).join(", ");
  };

  const formatPaymentMethod = (method?: string) => {
    if (!method) return "N/A";
    if (method === "1" || method.toLowerCase?.() === "razorpay") {
      return "Online Payment";
    }
    if (method.toLowerCase?.() === "cod") return "Cash on Delivery";
    return method;
  };

  return (
    <div className="invoice-page invisible print:visible">
      <div className="invoice-sheet">
        {/* Header */}
        <div className="mb-8 border-b-2 border-gray-300 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/assets/images/logo/wholesi.png"
                alt="Wholesii"
                loading="eager"
                className="block h-8 w-auto max-w-[120px] object-contain"
              />
              <div className="text-sm print:hidden">
                <p className="font-medium text-gray-800">{invoice.storeName}</p>
                {invoice.storeAddress && (
                  <p className="text-gray-600">{invoice.storeAddress}</p>
                )}
                {invoice.storeEmail && (
                  <p className="text-gray-600">Email: {invoice.storeEmail}</p>
                )}
                {invoice.storePhone && (
                  <p className="text-gray-600">Phone: {invoice.storePhone}</p>
                )}
                {invoice.gstNumber && (
                  <p className="text-gray-600">GST: {invoice.gstNumber}</p>
                )}
              </div>
            </div>
            <div className="text-right invoice-header-right">
              <h2 className="text-2xl font-bold text-blue-600">INVOICE</h2>
              <p className="mt-2 text-sm text-gray-600">
                Invoice #:{" "}
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-sm text-gray-600">
                Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Order #:{" "}
                <span className="font-semibold">{invoice.orderNumber}</span>
              </p>
              <span
                className={`mt-2 inline-block rounded px-3 py-1 text-xs font-semibold ${invoice.paymentStatus === "paid"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
                  }`}
              >
                {invoice.paymentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Bill To:</h3>
            <p className="font-semibold">{invoice.customerName}</p>
            <p className="text-sm text-gray-600">{invoice.customerEmail}</p>
            {invoice.customerPhone && (
              <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
            )}
            <p className="mt-2 text-sm text-gray-600">
              {formatAddress(invoice.billingAddress)}
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Ship To:</h3>
            <p className="font-semibold">{invoice.customerName}</p>
            <p className="mt-2 text-sm text-gray-600">
              {formatAddress(invoice.shippingAddress)}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Item
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-800">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-800">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">
                    ₹{item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mb-8 flex justify-end">
          <div className="w-64 summary-section">
            <div className="flex justify-between border-b border-gray-200 py-2">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="text-sm font-semibold">
                ₹{invoice.subtotal.toFixed(2)}
              </span>
            </div>
            {invoice.shippingCost > 0 && (
              <div className="flex justify-between border-b border-gray-200 py-2">
                <span className="text-sm text-gray-600">Shipping Charges:</span>
                <span className="text-sm font-semibold">
                  ₹{invoice.shippingCost.toFixed(2)}
                </span>
              </div>
            )}

            {invoice.discount > 0 && (
              <div className="flex justify-between border-b border-gray-200 py-2">
                <span className="text-sm text-gray-600">Discount:</span>
                <span className="text-sm font-semibold text-green-600">
                  -₹{invoice.discount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-gray-300 py-3">
              <span className="text-lg font-bold text-gray-800">Total:</span>
              <span className="text-lg font-bold text-blue-600">
                ₹{invoice.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Payment Method:{" "}
            <span className="font-semibold">
              {formatPaymentMethod(invoice.paymentMethod)}
            </span>
          </p>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-700">Notes:</h3>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-6 text-center">
          <p className="text-sm text-gray-500">
            Thank you for your business! If you have any questions, please
            contact us.
          </p>
        </div>

        {/* Print sizing */}
        <style jsx global>{`
          @page {
            size: A4;
            margin: 15mm;
          }
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .invoice-page {
              display: block !important;
              visibility: visible !important;
              background: #fff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .invoice-sheet {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 20px !important;
              box-shadow: none !important;
            }
            .invoice-sheet .mb-8:last-of-type {
              margin-bottom: 20px !important;
            }
            .invoice-sheet table {
              border-collapse: collapse !important;
              border: 1px solid #000 !important;
              margin-top: 20px !important;
            }
            .invoice-sheet table th,
            .invoice-sheet table td {
              border: 1px solid #000 !important;
              padding: 8px !important;
            }
            .invoice-sheet table thead {
              background-color: #f5f5f5 !important;
            }
            .summary-section {
              width: 200px !important;
              margin-left: auto !important;
              margin-right: 0 !important;
            }
            .invoice-header-right {
              text-align: right !important;
              width: auto !important;
              max-width: 250px !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
