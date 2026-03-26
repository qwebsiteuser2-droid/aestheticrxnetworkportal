'use client';

import { Product } from '@/types';
import { formatCurrency } from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/apiConfig';

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

// Helper function to get product image URL - uses database-backed endpoint
const getProductImageUrl = (product: Product): string | null => {
  if (!product.id) return null;
  return `${getApiBaseUrl()}/api/product-images/${product.id}`;
};

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  // Create array of 100 slots, filling with products where they exist
  const slots = Array.from({ length: 100 }, (_, index) => {
    const slotNumber = index + 1;
    const product = products.find(p => p.slot_index === slotNumber);
    
    return {
      slotNumber,
      product,
      isEmpty: !product
    };
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {slots.map(({ slotNumber, product, isEmpty }) => (
        <div
          key={slotNumber}
          className={`
            card cursor-pointer transition-all duration-200 hover:shadow-medium hover:-translate-y-1
            ${isEmpty ? 'border-dashed border-2 border-gray-300' : ''}
          `}
          onClick={() => product && onProductClick(product)}
        >
          {isEmpty ? (
            <div className="card-body text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl text-gray-400">+</span>
              </div>
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Slot {slotNumber}
              </h3>
              <p className="text-sm text-gray-400">
                Product coming soon
              </p>
            </div>
          ) : (
            <div className="card-body">
              {/* Product Image */}
              <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                {product ? (
                  <img
                    src={getProductImageUrl(product) || undefined}
                    alt={product?.name || 'Product'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center ${product ? 'hidden' : ''}`}>
                  <span className="text-2xl text-primary-600">📦</span>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded">
                    Slot {product?.slot_index}
                  </span>
                  {product?.is_featured && (
                    <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {product?.name}
                </h3>

                {product?.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product?.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-1">
                    {product?.price && (
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(product?.price)}
                      </p>
                    )}
                    {product?.unit && (
                      <p className="text-xs text-gray-500">
                        per {product?.unit}
                      </p>
                    )}
                  </div>

                  <button className="btn-primary btn-sm">
                    Order Now
                  </button>
                </div>

                {product?.stock_quantity !== null && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Stock: {product?.stock_quantity} available
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

