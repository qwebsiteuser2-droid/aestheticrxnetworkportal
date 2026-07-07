'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/providers';
import api, { productsApi } from '@/lib/api';
import { ProductCatalogImage } from '@/components/ProductCatalogImage';
import { ProductDetailsModal, type OrderProduct } from '@/components/ProductDetailsModal';
import { BRAND } from '@/lib/brandColors';
import { buildOrderLoginUrl } from '@/lib/authRedirect';

const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
};

const CART_KEY = 'order_cart';

export default function PublicOrderCatalog() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const redirectToLogin = (productId: string, action: 'cart' | 'buy') => {
    router.push(buildOrderLoginUrl({ productId, action }));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CART_KEY);
        if (saved) setCart(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  const fetchProducts = async () => {
    try {
      let list: OrderProduct[] = [];
      try {
        const res = await productsApi.getAll({ limit: 100 });
        if (res.success) list = res.data.products || [];
      } catch {
        /* fallback */
      }
      if (list.length === 0) {
        const fb = await api.get('/public/products', { params: { limit: 100 } });
        if (fb.data?.success) list = fb.data.data || [];
      }
      setProducts(list);
    } catch (e) {
      console.error(e);
      toast.error('Could not load products');
    } finally {
      setLoading(false);
    }
  };

  const catalogProducts = useMemo(
    () => products.filter((p) => p.is_visible !== false && String(p.name || '').trim().length > 0),
    [products]
  );

  const displayed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [catalogProducts, searchQuery]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const addToCart = (productId: string, qty = 1) => {
    if (!isAuthenticated) {
      redirectToLogin(productId, 'cart');
      return;
    }
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const stock = product.stock_quantity || 0;
    const inCart = cart[productId] || 0;
    if (stock === 0) {
      toast.error('Out of stock');
      return;
    }
    if (inCart + qty > stock) {
      toast.error(`Only ${stock} available`);
      return;
    }
    setCart((prev) => ({ ...prev, [productId]: inCart + qty }));
    toast.success('Added to cart');
  };

  const buyNow = (productId: string, qty = 1) => {
    if (!isAuthenticated) {
      redirectToLogin(productId, 'buy');
      return;
    }
    addToCart(productId, qty);
    router.push('/order?openCart=1');
  };

  const openProduct = (product: OrderProduct) => {
    setSelectedProduct(product);
    setShowDetails(true);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            <span style={{ color: BRAND.blue }}>Order</span>{' '}
            <span style={{ color: BRAND.gold }}>Products</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Browse and order medical supplies — no sign-in required to browse
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/order')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium shadow-md hover:opacity-95 transition-opacity"
          style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)` }}
        >
          <ShoppingCartIcon className="w-5 h-5" />
          Cart ({cartCount})
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search products by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No products found</div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-4">
          {displayed.map((product) => {
            const stock = product.stock_quantity || 0;
            const inCart = cart[product.id] || 0;
            const inStock = stock > 0 && inCart < stock;
            return (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col min-h-0"
                onClick={() => openProduct(product)}
              >
                <div className="aspect-square mb-2 bg-gray-100 rounded-lg overflow-hidden">
                  <ProductCatalogImage productId={product.id} alt={product.name} view="front" />
                </div>
                <h4 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 flex-1">{product.name}</h4>
                <p className="text-sm font-semibold mt-1" style={{ color: BRAND.blue }}>
                  ₨{formatPrice(product.price)}
                </p>
                <span
                  className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full w-fit ${
                    inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {inStock ? 'In Stock' : 'Out of Stock'}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={!inStock}
                    onClick={() => addToCart(product.id)}
                    className="flex-1 min-h-[44px] py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    disabled={stock < 1}
                    onClick={() => buyNow(product.id)}
                    className="flex-1 min-h-[44px] py-2.5 text-xs sm:text-sm font-medium rounded-lg text-white disabled:opacity-50"
                    style={{ backgroundColor: BRAND.blue }}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={showDetails}
          onClose={() => {
            setShowDetails(false);
            setSelectedProduct(null);
          }}
          formatPrice={formatPrice}
          onAddToCart={(id, qty) => addToCart(id, qty)}
          onBuyNow={(id, qty) => buyNow(id, qty)}
          cartQuantity={cart[selectedProduct.id] || 0}
        />
      )}

    </div>
  );
}
