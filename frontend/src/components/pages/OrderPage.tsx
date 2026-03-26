'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { ProductGrid } from '@/components/ProductGrid';
import { OrderModal } from '@/components/OrderModal';
import { Product } from '@/types';
import { productsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Bars3Icon } from '@heroicons/react/24/outline';

export function OrderPage() {
  const { user, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Redirect if not authenticated or not approved
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/';
      return;
    }
    
    if (user && !user.is_approved && !user.is_admin) {
      window.location.href = '/waiting-approval';
      return;
    }
  }, [isAuthenticated, user]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productsApi.getAll({ limit: 100 });
        if (response.success) {
          setProducts(response.data.products);
        }
      } catch (error: unknown) {
        toast.error('Failed to load products');
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsOrderModalOpen(true);
  };

  const handleOrderSuccess = () => {
    setIsOrderModalOpen(false);
    setSelectedProduct(null);
    toast.success('Order placed successfully!');
  };

  if (!isAuthenticated || (user && !user.is_approved && !user.is_admin)) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Order Products</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        />

        {/* Main content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order Products
              </h1>
              <p className="text-gray-600">
                Browse our catalog of medical supplies and equipment. Click on any product to place an order.
              </p>
            </div>

            {/* Products Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner w-8 h-8"></div>
                <span className="ml-3 text-gray-600">Loading products...</span>
              </div>
            ) : (
              <ProductGrid 
                products={products}
                onProductClick={handleProductClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {isOrderModalOpen && selectedProduct && (
        <OrderModal
          product={selectedProduct}
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}

