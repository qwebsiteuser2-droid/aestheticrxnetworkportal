'use client';

import { useState, useEffect, useMemo } from 'react';
import { MinusIcon, PlusIcon, StarIcon } from '@heroicons/react/24/outline';
import { ShareLinkButton } from '@/components/ShareLinkButton';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getProductImageSrc, type ProductImageView } from '@/lib/productImageUrl';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { buildOrderLoginUrl } from '@/lib/authRedirect';

export type ProductViewAngle = ProductImageView;

export interface OrderProduct {
  id: string;
  name: string;
  description: string;
  price: string | number;
  image_url: string | null;
  slot_index: number;
  is_visible: boolean;
  category: string | null;
  unit: string | null;
  is_featured: boolean;
  stock_quantity: number | null;
}

interface ProductReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ProductDetailsModalProps {
  product: OrderProduct;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: string | number) => string;
  onAddToCart: (productId: string, quantity: number) => void;
  onBuyNow: (productId: string, quantity: number) => void;
  cartQuantity?: number;
}

const VIEW_ANGLES: { key: ProductViewAngle; label: string }[] = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
];

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  formatPrice,
  onAddToCart,
  onBuyNow,
  cartQuantity = 0,
}: ProductDetailsModalProps) {
  const { isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<ProductViewAngle>('front');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const router = useRouter();
  const [mainImageError, setMainImageError] = useState(false);

  const unitPrice = useMemo(() => {
    const n = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
    return isNaN(n) ? 0 : n;
  }, [product.price]);

  const lineTotal = unitPrice * quantity;
  const maxQty = product.stock_quantity ?? 0;
  const inStock = maxQty > 0 && cartQuantity < maxQty;

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(1);
    setActiveView('front');
    setMainImageError(false);
  }, [isOpen, product.id]);

  useEffect(() => {
    if (!isOpen || !product.id) return;
    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await api.get(`/products/${product.id}/reviews`);
        if (res.data?.success) {
          setReviews(res.data.data.reviews || []);
          setAverageRating(res.data.data.average_rating || 0);
        }
      } catch {
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadReviews();
  }, [isOpen, product.id]);

  const submitReview = async () => {
    if (!isAuthenticated) {
      router.push(buildOrderLoginUrl({ productId: product.id, action: 'view' }));
      return;
    }
    if (!newComment.trim() || newComment.trim().length < 3) {
      toast.error('Please write at least 3 characters');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product.id}/reviews`, {
        rating: newRating,
        comment: newComment.trim(),
      });
      if (res.data?.success) {
        toast.success('Review submitted');
        setNewComment('');
        setReviews((prev) => [res.data.data.review, ...prev]);
        const newAvg =
          reviews.length > 0
            ? (reviews.reduce((s, r) => s + r.rating, 0) + newRating) / (reviews.length + 1)
            : newRating;
        setAverageRating(Math.round(newAvg * 10) / 10);
      } else {
        toast.error(res.data?.message || 'Failed to submit review');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit review';
      toast.error(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const changeQty = (delta: number) => {
    setQuantity((q) => {
      const next = q + delta;
      const available = maxQty - cartQuantity;
      if (next < 1) return 1;
      if (available > 0 && next > available) return available;
      return next;
    });
  };

  if (!isOpen) return null;

  const mainSrc = getProductImageSrc(product.id, activeView);

  const quantityControls = (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">Quantity</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeQty(-1)}
            disabled={quantity <= 1}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-semibold text-lg">{quantity}</span>
          <button
            type="button"
            onClick={() => changeQty(1)}
            disabled={!inStock || quantity >= maxQty - cartQuantity}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Line total</span>
        <span className="text-lg font-bold text-gray-900">₨{lineTotal.toFixed(2)}</span>
      </div>
    </div>
  );

  const shareControl = (
    <ShareLinkButton entityId={product.id} label="Share" variant="prominent" />
  );

  const actionButtons = (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={!inStock}
        onClick={() => {
          onAddToCart(product.id, quantity);
          onClose();
        }}
        className="flex-1 py-3 rounded-xl font-medium border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
      >
        Add to Cart
      </button>
      <button
        type="button"
        disabled={!inStock}
        onClick={() => {
          onBuyNow(product.id, quantity);
          onClose();
        }}
        className="flex-1 py-3 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
      >
        Buy Now
      </button>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl gap-3">
            <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Images */}
              <div className="flex gap-3">
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {VIEW_ANGLES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveView(key);
                        setMainImageError(false);
                      }}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden bg-gray-100 transition-all ${
                        activeView === key
                          ? 'border-blue-600 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={label}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getProductImageSrc(product.id, key)}
                        alt={`${product.name} ${label}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (!el.dataset.fallback) {
                            el.dataset.fallback = '1';
                            el.src = getProductImageSrc(product.id, 'main');
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex-1 aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                  {!mainImageError ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={mainSrc}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onError={() => setMainImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No image available
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded capitalize">
                    {activeView === 'main' ? 'Front' : activeView} view
                  </span>
                </div>
              </div>

              {/* Mobile: quantity → actions → share directly under gallery */}
              <div className="md:hidden space-y-3 mt-1">
                {quantityControls}
                {actionButtons}
                {shareControl}
              </div>

              {/* Info */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Slot {product.slot_index}
                  </span>
                  {product.is_featured && (
                    <span className="ml-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{product.name}</h3>
                  {product.category && (
                    <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                  )}
                </div>

                {averageRating > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIconSolid
                          key={star}
                          className={`w-5 h-5 ${
                            star <= Math.round(averageRating)
                              ? 'text-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {averageRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                  </div>
                )}

                <p className="text-gray-600 text-sm leading-relaxed">
                  {product.description || 'No description available.'}
                </p>

                <div className="flex items-baseline justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm text-gray-600">Unit price</span>
                  {product.price != null &&
                  product.price !== '' &&
                  !Number.isNaN(Number(product.price)) &&
                  Number(product.price) > 0 ? (
                    <span className="text-2xl font-bold text-blue-600">
                      ₨{formatPrice(product.price)}
                      {product.unit ? ` / ${product.unit}` : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">Price on request</span>
                  )}
                </div>

                <div
                  className={`text-sm font-medium px-3 py-1.5 rounded-full inline-block ${
                    inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {inStock
                    ? `In stock (${maxQty - cartQuantity} available)`
                    : 'Out of stock'}
                </div>

                {/* Quantity → actions → share — desktop (mobile shows under images) */}
                <div className="hidden md:block space-y-4">
                  {quantityControls}
                  {actionButtons}
                  {shareControl}
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="mt-10 border-t border-gray-200 pt-8">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Reviews & comments</h4>

              {isAuthenticated ? (
                <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600 mr-2">Your rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-0.5"
                      >
                        {star <= newRating ? (
                          <StarIconSolid className="w-6 h-6 text-amber-400" />
                        ) : (
                          <StarIcon className="w-6 h-6 text-gray-300" />
                        )}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={1000}
                  />
                  <button
                    type="button"
                    onClick={submitReview}
                    disabled={submittingReview}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingReview ? 'Posting...' : 'Post review'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  <button
                    type="button"
                    className="text-blue-600 font-medium hover:underline"
                    onClick={() =>
                      router.push(
                        buildOrderLoginUrl({ productId: product.id, action: 'view' })
                      )
                    }
                  >
                    Sign in
                  </button>{' '}
                  to leave a review.
                </p>
              )}

              {reviewsLoading ? (
                <div className="text-center py-6 text-gray-500 text-sm">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No reviews yet. Be the first!</p>
              ) : (
                <ul className="space-y-4 max-h-64 overflow-y-auto">
                  {reviews.map((r) => (
                    <li key={r.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 text-sm">{r.author_name}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <StarIconSolid
                              key={s}
                              className={`w-4 h-4 ${
                                s <= r.rating ? 'text-amber-400' : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{r.comment}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
