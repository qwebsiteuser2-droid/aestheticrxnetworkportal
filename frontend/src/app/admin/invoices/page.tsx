'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { Header } from '@/components/layout/Header';
import InvoiceGenerator from '@/components/invoices/InvoiceGenerator';

export default function AdminInvoicesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { loading: permLoading, canAccessFeature, isParentAdmin, isFullAdmin } =
    useAdminPermission();

  const hasAccess =
    isParentAdmin ||
    isFullAdmin ||
    user?.is_admin ||
    canAccessFeature('orders');

  useEffect(() => {
    if (!authLoading && !permLoading && (!isAuthenticated || !hasAccess)) {
      router.push('/login');
    }
  }, [authLoading, permLoading, isAuthenticated, hasAccess, router]);

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm text-blue-600 hover:underline">
              ← Admin dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Invoice Generator</h1>
            <p className="text-sm text-gray-600 mt-1">
              Create invoices manually or from orders. Customers receive a PDF by email when they
              complete checkout (Cash on Delivery). Uses Gmail API.
            </p>
          </div>
        </div>
        <InvoiceGenerator />
      </main>
    </div>
  );
}
