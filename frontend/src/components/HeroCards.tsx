'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCartIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useAuth } from '@/app/providers';
import { getProductImageSrc } from '@/lib/productImageUrl';

interface Product {
  id: string;
  name: string;
  price: string | number;
  image_url: string | null;
}

const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0' : Math.round(numPrice).toLocaleString();
};

export default function HeroCards() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await api.get('/public/featured/products');
      if (response.data?.success && response.data?.data?.products?.length > 0) {
        setProducts(response.data.data.products);
        setLoadingProducts(false);
        return;
      }
      const fallbackResponse = await api.get('/public/products?limit=4');
      if (fallbackResponse.data?.success) {
        setProducts(fallbackResponse.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching featured products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOrderClick = () => {
    router.push('/order');
  };

  if (user?.user_type === 'employee') {
    return null;
  }

  return (
    <div className="mb-12">
      <div
        onClick={handleOrderClick}
        className="group relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-[2rem] p-10 md:p-12 text-left hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 overflow-hidden cursor-pointer min-h-[420px] md:min-h-[480px]"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-72 h-72 border-4 border-white rounded-full" />
          <div className="absolute bottom-4 left-4 w-48 h-48 border-4 border-white rounded-full" />
        </div>

        <div className="relative z-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <ShoppingCartIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h3 className="text-4xl md:text-5xl font-bold text-white">🛒 Order Products</h3>
                <p className="text-blue-100 text-lg md:text-xl mt-2">
                  Browse and order medical supplies — no sign-in required to view
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center text-white/80 text-lg">
              <span className="mr-2">Shop Now</span>
              <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 flex-1">
            {loadingProducts
              ? Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="bg-white/20 rounded-2xl h-36 md:h-44 lg:h-52 animate-pulse" />
                  ))
              : products.length > 0
                ? products.slice(0, 4).map((product) => {
                    const imageUrl =
                      product.image_url?.startsWith('http') || product.image_url?.startsWith('/')
                        ? product.image_url
                        : product.id
                          ? getProductImageSrc(product.id, 'front')
                          : null;

                    return (
                      <div
                        key={product.id}
                        className="bg-white rounded-2xl h-36 md:h-44 lg:h-52 overflow-hidden relative group/item hover:scale-105 transition-transform shadow-xl"
                      >
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 45vw, 200px"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <ShoppingCartIcon className="w-14 h-14 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:p-4">
                          <span className="text-white text-lg md:text-xl font-bold">
                            ₨{formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                : (
                  <div className="col-span-2 md:col-span-4 text-white/70 text-center py-10 text-2xl">
                    Browse our product catalog
                  </div>
                )}
          </div>

          <button
            type="button"
            className="w-full bg-white text-blue-600 font-bold py-5 px-10 rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-4 shadow-xl text-xl"
          >
            <ShoppingCartIcon className="w-7 h-7" />
            <span>Order Now</span>
            <ArrowRightIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
