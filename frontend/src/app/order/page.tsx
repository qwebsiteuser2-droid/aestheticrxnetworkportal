'use client';

import { useState, useEffect, useRef } from 'react';
import {
  buildOrderLoginUrl,
  parseOrderResumeParams,
  type OrderResumeAction,
} from '@/lib/authRedirect';
import { applyOrderResumeToCart } from '@/lib/orderCartResume';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import Image from 'next/image';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import DebtRestrictionModal from '@/components/DebtRestrictionModal';
import { ProductDetailsModal } from '@/components/ProductDetailsModal';
import { getProductImageSrc } from '@/lib/productImageUrl';
import { ProductCatalogImage } from '@/components/ProductCatalogImage';
import api, { productsApi, ordersApi, authApi } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  parseDebtLimitFromError,
  toDebtLimitError,
  type DebtStatusPayload,
} from '@/lib/debtLimitError';

interface Product {
  id: string;
  name: string;
  description: string;
  price: string | number; // API returns as string, but we'll handle both
  image_url: string | null;
  slot_index: number;
  is_visible: boolean;
  category: string | null;
  unit: string | null;
  is_featured: boolean;
  stock_quantity: number | null;
}

// Helper function to format price safely
const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
};

export default function OrderPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [allSlots, setAllSlots] = useState<(Product | null)[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load cart from localStorage on mount
  const [cart, setCart] = useState<{[key: string]: number}>(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('order_cart');
      return savedCart ? JSON.parse(savedCart) : {};
    }
    return {};
  });
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('order_cart', JSON.stringify(cart));
    }
  }, [cart]);
  const [showCart, setShowCart] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    placeUrl?: string;
  } | null>(null);
  const [savedLocation, setSavedLocation] = useState<{
    address: string;
    lat: number;
    lng: number;
    placeUrl?: string;
  } | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const orderResumeHandledRef = useRef(false);
  const productShareHandledRef = useRef(false);

  const redirectToLogin = (opts: { productId?: string; action?: OrderResumeAction }) => {
    router.push(buildOrderLoginUrl(opts));
  };

  const ensureLoggedInForCart = (productId: string, action: 'cart' | 'buy'): boolean => {
    if (isAuthenticated) return true;
    redirectToLogin({ productId, action });
    return false;
  };

  const requireAuthForCheckout = (): boolean => {
    if (!isAuthenticated) {
      redirectToLogin({ action: 'buy' });
      return false;
    }
    const userType = user?.user_type || (user as { user_type?: string })?.user_type || '';
    const isRegularUser = userType === 'regular' || userType === 'regular_user';
    if (!user?.is_approved && !user?.is_admin && !isRegularUser) {
      router.push('/waiting-approval');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProducts();
      if (isAuthenticated) {
        loadSavedLocation();
      }
    }
  }, [authLoading, isAuthenticated]);

  // Open cart when arriving from homepage Buy Now (?openCart=1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openCart') === '1') {
      setShowCart(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle payment status from URL parameters
  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      toast.success('Payment completed successfully! Your order has been placed.');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled. You can try again or use Cash on Delivery.');
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Search functionality
  useEffect(() => {
    if (!productSearchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(productSearchQuery.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchQuery, products]);

  // Load saved location from database
  const loadSavedLocation = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.get('/auth/location');

      if (response.data.success && response.data.data?.location) {
        const location = response.data.data.location;
        setSavedLocation(location);
        setSelectedLocation(location); // Set as current selected location
        console.log('✅ Loaded saved location from database:', location.address);
      } else if (response.status === 401) {
        // Token expired, redirect to login
        console.log('❌ Token expired, redirecting to login');
        router.push('/login');
      }
    } catch (error) {
      console.error('❌ Error loading saved location:', error);
    }
  };


  // Save location to database
  const saveLocation = async (location: { address: string; lat: number; lng: number; placeUrl?: string }) => {
    try {
      const token = getAccessToken();
      if (!token) {
        redirectToLogin({ action: 'location' });
        return;
      }

      // Use centralized API instance
      const response = await api.post('/auth/location', {
        google_location: location
      });

      if (response.data.success) {
        setSavedLocation(location);
        console.log('✅ Saved location to database:', location.address);
        toast.success('Location saved as default for future orders!');
      } else if (response.status === 401) {
        // Token expired, redirect to login
        toast.error('Session expired. Please login again.');
        router.push('/login');
      } else {
        const errorData = response.data;
        toast.error(errorData.message || 'Failed to save location');
      }
    } catch (error) {
      console.error('❌ Error saving location:', error);
      toast.error('Failed to save location');
    }
  };

  // Search for places using Google Places API (without full Maps API)
  const searchPlaces = async (query: string) => {
    if (!query.trim()) return [];
    
    try {
      // Use Google Places API Text Search
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Places API request failed');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        return data.results.map((place: any) => ({
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          placeUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
        }));
      } else {
        console.error('Places API error:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  };

  // Clear saved location
  const clearSavedLocation = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      // Use centralized API instance
      const response = await api.post('/auth/location', {
        google_location: null
      });

      if (response.data.success) {
        setSavedLocation(null);
        setSelectedLocation(null);
        console.log('✅ Cleared saved location from database');
        toast.success('Default location cleared');
      } else if (response.status === 401) {
        // Token expired, redirect to login
        toast.error('Session expired. Please login again.');
        router.push('/login');
      } else {
        toast.error(response.data?.message || 'Failed to clear location');
      }
    } catch (error) {
      console.error('❌ Error clearing saved location:', error);
      toast.error('Failed to clear location');
    }
  };

  // Location search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Google Maps link state
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  
  // Order confirmation state
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtStatus, setDebtStatus] = useState<DebtStatusPayload | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placementProgress, setPlacementProgress] = useState<{
    label: string;
    current: number;
    total: number;
  } | null>(null);

  const showDebtLimitModal = (status: DebtStatusPayload) => {
    toast.dismiss('batch-progress');
    setDebtStatus(status);
    setShowDebtModal(true);
    setIsPlacingOrder(false);
    setShowOrderConfirmation(false);
  };

  /** Returns true when error was a debt limit — opens modal and suppresses generic errors. */
  const handleDebtLimitError = (error: unknown): boolean => {
    const status = parseDebtLimitFromError(error);
    if (!status) return false;
    showDebtLimitModal(status);
    return true;
  };

  // Validate Google Maps link and extract location
  const validateGoogleMapsLink = (link: string) => {
    setLinkError('');
    
    console.log('Validating URL:', link);
    
    // Check if it's a valid Google Maps URL (supports all Google Maps formats)
    const googleMapsPattern = /^https:\/\/((www\.)?google\.com\/maps\/.*|maps\.app\.goo\.gl\/.*|maps\.google\.com\/.*|goo\.gl\/maps\/.*|maps\.google\.co\.uk\/.*|maps\.google\.ca\/.*)/;
    const isValid = googleMapsPattern.test(link);
    console.log('URL validation result:', isValid);
    
    if (!isValid) {
      setLinkError('Please enter a valid Google Maps URL (https://www.google.com/maps/... or https://maps.app.goo.gl/...)');
      return false;
    }

    // Extract coordinates or place info from the link
    let locationInfo = {
      address: 'Location from Google Maps',
      lat: 0,
      lng: 0,
      placeUrl: link
    };

    // Try to extract coordinates from the URL
    const coordMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      locationInfo.lat = parseFloat(coordMatch[1]);
      locationInfo.lng = parseFloat(coordMatch[2]);
    }

    // Try to extract place name from URL
    const placeMatch = link.match(/place\/([^\/]+)/);
    if (placeMatch) {
      locationInfo.address = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    setSelectedLocation(locationInfo);
    return true;
  };

  // Handle Google Maps link input
  const handleGoogleMapsLink = (link: string) => {
    setGoogleMapsLink(link);
    if (link.trim()) {
      validateGoogleMapsLink(link.trim());
    }
  };

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);


  // Open WhatsApp for location sharing (mobile only)
  const openWhatsAppLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const whatsappText = `My delivery location: https://www.google.com/maps/place//@${latitude},${longitude},21z/data=!4m6!1m5!3m4!2z${latitude}%2C${longitude}!8m2!3d${latitude}!4d${longitude}?hl=en&entry=ttu`;
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
          window.open(whatsappUrl, '_blank');
        },
        (error) => {
          toast.error('Unable to get your location for WhatsApp sharing.');
        }
      );
    }
  };

  // Open Google Maps for manual location selection
  const openGoogleMaps = () => {
    const mapsUrl = 'https://www.google.com/maps';
    window.open(mapsUrl, '_blank');
    toast.success('Google Maps opened! Please copy the link after selecting your location.');
  };

  // Handle location search
  const handleLocationSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPlaces(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a location from search results
  const selectLocation = (place: any) => {
    setSelectedLocation({
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      placeUrl: place.placeUrl
    });
    setSearchResults([]);
    setSearchQuery('');
  };


  // Confirm location and save as default
  const confirmLocation = async () => {
    if (selectedLocation) {
      // Save as default location
      await saveLocation(selectedLocation);
      setShowLocationModal(false);
    } else {
      toast.error('Please enter a Google Maps link first');
    }
  };

  const getProductImageById = (productId: string, view?: 'main' | 'front' | 'back' | 'side') =>
    getProductImageSrc(productId, (view as 'main' | 'front' | 'back' | 'side') || 'front');

  const applyLoadedProducts = (productsData: Product[]) => {
    setProducts(productsData);
    setFilteredProducts(productsData);

    const slots: (Product | null)[] = new Array(100).fill(null);
    productsData.forEach((product: Product) => {
      if (product.slot_index >= 1 && product.slot_index <= 100) {
        slots[product.slot_index - 1] = product;
      }
    });
    setAllSlots(slots);

    const outOfStockProducts = productsData.filter((p: Product) => p.stock_quantity === 0);
    if (outOfStockProducts.length > 0) {
      const outOfStockIds = outOfStockProducts.map((p: Product) => p.id);
      setCart((prev: Record<string, number>) => {
        const newCart = { ...prev };
        let removedItems = 0;
        outOfStockIds.forEach((id: string) => {
          if (newCart[id]) {
            removedItems += newCart[id];
            delete newCart[id];
          }
        });
        if (removedItems > 0) {
          toast.error(`${removedItems} out-of-stock item(s) removed from cart`);
        }
        return newCart;
      });
    }
  };

  const fetchProducts = async () => {
    try {
      let productsData: Product[] = [];

      try {
        const response = await productsApi.getAll({ limit: 100 });
        if (response.success) {
          productsData = response.data.products || [];
        }
      } catch (primaryError) {
        console.warn('Primary products API failed, trying public catalog:', primaryError);
      }

      if (productsData.length === 0) {
        const fallback = await api.get('/public/products', { params: { limit: 100 } });
        if (fallback.data?.success) {
          productsData = (fallback.data.data || []) as Product[];
        }
      }

      if (productsData.length > 0) {
        applyLoadedProducts(productsData);
      } else {
        toast.error('No products available right now. Please try again later.');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (productId: string) => {
    if (!ensureLoggedInForCart(productId, 'cart')) return;

    // Find the product to check stock
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }
    
    // Get original stock from backend (don't use modified stock)
    const originalStock = product.stock_quantity || 0;
    const currentCartQuantity = cart[productId] || 0;
    
    // Check if product is out of stock (considering both backend stock and cart)
    if (originalStock === 0) {
      toast.error('This product is out of stock');
      return;
    }
    
    // Check if adding this item would exceed available stock
    // Available stock = original stock - items already in cart
    const availableStock = originalStock - currentCartQuantity;
    
    if (availableStock <= 0) {
      toast.error(`Only ${originalStock} items available in stock`);
      return;
    }
    
    // Update cart
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
    
    toast.success('Added to cart!');
  };

  const addToCartWithQuantity = (productId: string, qty: number, skipAuthCheck = false) => {
    if (!skipAuthCheck && !ensureLoggedInForCart(productId, 'cart')) return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const originalStock = product.stock_quantity || 0;
    const current = cart[productId] || 0;
    const add = Math.min(qty, Math.max(0, originalStock - current));
    if (add < 1) {
      toast.error('Cannot add more — stock limit reached');
      return;
    }
    setCart((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + add,
    }));
    toast.success(`Added ${add} to cart`);
  };

  const buyNow = (productId: string, qty = 1) => {
    if (!ensureLoggedInForCart(productId, 'buy')) return;

    const product = products.find((p) => p.id === productId);
    if (!product || !product.stock_quantity || product.stock_quantity < 1) {
      toast.error('This product is out of stock');
      return;
    }
    addToCartWithQuantity(productId, qty);
    setShowCart(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId);
      const price = typeof product?.price === 'string' ? parseFloat(product.price) : (product?.price || 0);
      return total + (price * quantity);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  const handleBackClick = () => {
    router.back();
  };

  // Shared product link (?productId=…&action=view) — works signed in or out
  useEffect(() => {
    if (loading || products.length === 0) return;
    if (productShareHandledRef.current) return;
    if (typeof window === 'undefined') return;

    const { productId, action } = parseOrderResumeParams(window.location.search);
    if (!productId || action !== 'view') return;

    productShareHandledRef.current = true;
    orderResumeHandledRef.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);

    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error('Product not found or no longer available');
      return;
    }
    setSelectedProduct(product);
    setShowProductDetailsModal(true);
  }, [loading, products]);

  // After login: return to product, add to cart, or open location modal
  useEffect(() => {
    if (authLoading || !isAuthenticated || loading || products.length === 0) return;
    if (orderResumeHandledRef.current) return;
    if (typeof window === 'undefined') return;

    const { productId, action } = parseOrderResumeParams(window.location.search);
    if (!productId && action !== 'location') return;

    orderResumeHandledRef.current = true;
    window.history.replaceState({}, document.title, window.location.pathname);

    if (action === 'location') {
      loadSavedLocation();
      setShowLocationModal(true);
      toast.success('Sign in successful. Set your delivery location.');
      return;
    }

    if (!productId || !action || action === 'view') return;

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setSelectedProduct(product);
    setShowProductDetailsModal(true);

    setCart((prev) => {
      const { cart: next } = applyOrderResumeToCart(prev, productId, product, action, 1);
      return next;
    });

    if (action === 'buy') {
      setShowCart(true);
      toast.success('Welcome back! Your cart is ready.');
    } else {
      toast.success('Added to cart');
    }
  }, [authLoading, isAuthenticated, loading, products]);

  const handleOrder = async () => {
    if (!requireAuthForCheckout()) return;

    if (Object.keys(cart).length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // First confirmation - ask for location if not selected
    if (!selectedLocation) {
      toast.error('Please select your delivery location first');
      setShowLocationModal(true);
      return;
    }

    setShowOrderConfirmation(true);
  };

  // Function to actually place the order
  const confirmAndPlaceOrder = async () => {
    // Prevent double-clicking and multiple submissions
    if (isPlacingOrder) {
      console.log('Order already being processed, ignoring duplicate click');
      return;
    }

    // Proceed directly to order placement (browser confirm dialog removed)

    setIsPlacingOrder(true);
    const cartEntries = Object.entries(cart);
    const totalSteps = cartEntries.length + 1; // orders + one confirmation email
    setPlacementProgress({
      label: 'Creating your order…',
      current: 0,
      total: totalSteps,
    });

    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      if (cartEntries.length === 0) {
        toast.error('Your cart is empty. Please add products before placing an order.');
        return;
      }

      if (!selectedLocation) {
        toast.error('Please select your delivery location first.');
        setShowLocationModal(true);
        return;
      }
      
      console.log('Starting order placement process...');
      console.log('Cart contents:', cart);
      console.log('Selected location:', selectedLocation);
      
      // Create orders for each product in cart (backend expects individual orders)
      const orderPromises = cartEntries.map(async ([productId, quantity], index) => {
        // Add a progressive delay between requests to prevent race conditions
        if (index > 0) {
          const delay = Math.min(200 * index, 2000); // Progressive delay: 200ms, 400ms, 600ms, etc., max 2 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        const orderData = {
          product_id: productId,
          qty: quantity,
          order_location: selectedLocation ? {
            lat: selectedLocation.lat || 0,
            lng: selectedLocation.lng || 0,
            address: selectedLocation.address || 'Location from Google Maps',
            placeUrl: selectedLocation.placeUrl || ''
          } : null,
          notes: `Order placed via web interface. Delivery to: ${selectedLocation?.address || 'No address specified'}`,
          payment_method: 'cash_on_delivery',
          skip_notification: true
        };

        console.log(`🛒 Creating order for product ${productId}, quantity: ${quantity}`);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          // Use centralized API instance
          // Note: Axios doesn't support AbortController signal directly, but timeout is handled by axios default
          clearTimeout(timeoutId);
          
          const response = await ordersApi.create(orderData);

        if (!response.success) {
          const errorData = response;
          console.error(`Order creation failed for product ${productId}:`, errorData);
          
          // Handle specific error cases
          const status = (errorData as any).status || 500;
          if (status === 429) {
            throw new Error(errorData.message || 'Please wait a moment before placing another order');
          } else if (status === 400) {
            if (errorData.message === 'Insufficient stock available') {
              throw new Error(`Insufficient stock for product ${productId}: ${errorData.message}`);
            } else {
              throw new Error(errorData.message || 'Invalid order data. Please check your cart and try again');
            }
          } else if (status === 401) {
            throw new Error('Authentication expired. Please login again');
          } else if (status === 403 && (errorData as any).debtStatus) {
            // Handle debt limit error with structured data
            console.log('Debt limit error with structured data:', (errorData as any).debtStatus);
            const debtError = new Error(errorData.message) as Error & { debtStatus?: any };
            debtError.debtStatus = (errorData as any).debtStatus;
            throw debtError;
          } else {
            throw new Error(errorData.message || `Failed to create order for product ${productId}`);
          }
        }

        const result = response;
        console.log(`Order created successfully for product ${productId}:`, result.data?.order?.order_number);
        return result;
        
        } catch (fetchError: unknown) {
          console.error(`Order request failed for product ${productId}:`, fetchError);
          const debtErr = toDebtLimitError(fetchError);
          if (debtErr) throw debtErr;
          if (fetchError instanceof Error) {
            if (fetchError.name === 'AbortError') {
              throw new Error(`Order timeout for product ${productId}. Please try again.`);
            }
            throw fetchError;
          }
          throw new Error(`Order failed for product ${productId}`);
        }
      });

      console.log(`Processing ${orderPromises.length} orders...`);
      
      // Process orders in batches for large orders (10+)
      const BATCH_SIZE = 5; // Process 5 orders at a time
      const results = [];
      const successful = [];
      const failed = [];
      let blockedByDebt = false;
      
      toast.dismiss('batch-progress');

      for (let batchStart = 0; batchStart < orderPromises.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, orderPromises.length);
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(orderPromises.length / BATCH_SIZE);
        
        console.log(`Processing batch ${batchNumber} of ${totalBatches} (orders ${batchStart + 1}-${batchEnd})`);
        
        for (let i = batchStart; i < batchEnd; i++) {
        try {
          setPlacementProgress({
            label: `Saving order line ${i + 1} of ${orderPromises.length}…`,
            current: i,
            total: totalSteps,
          });

          const result = await orderPromises[i];
          results.push({ status: 'fulfilled', value: result });
          successful.push(result);
          console.log(`Order ${i + 1} completed successfully`);
        } catch (error: unknown) {
          results.push({ status: 'rejected', reason: error });
          failed.push(error);
          console.error(`Order ${i + 1} failed:`, error);

          if (handleDebtLimitError(error)) {
            blockedByDebt = true;
            return;
          }

          const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error(`Order ${i + 1} failed: ${errorMessage}`, { duration: 4000 });
        }
        }
        
        // Add a delay between batches for large orders
        if (batchEnd < orderPromises.length) {
          console.log(`Batch ${batchNumber} completed. Waiting 1 second before next batch...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
        }
      }
      
      console.log('Order results:', { successful: successful.length, failed: failed.length });
      console.log('Successful orders:', successful);
      console.log('Failed orders:', failed);
      
      if (blockedByDebt) {
        return;
      }

      if (failed.length > 0) {
        console.error('Some orders failed:', failed);
        toast.error(`${failed.length} order(s) failed. ${successful.length} order(s) succeeded.`);
      }
      
      if (successful.length > 0) {
        const orderIds = successful
          .map((result) => result.data?.order?.id)
          .filter((id): id is string => Boolean(id));

        if (orderIds.length > 0) {
          setPlacementProgress({
            label: 'Sending one confirmation email with Invoices.pdf…',
            current: orderPromises.length,
            total: totalSteps,
          });

          try {
            console.log(`📧 Sending single customer + admin notification for ${orderIds.length} order(s)`);
            const batchResponse = await api.post('/orders/batch-notify', {
              order_ids: orderIds,
              payment_method: 'cash_on_delivery',
            });

            if (batchResponse.data.success) {
              const customerSent = batchResponse.data.data?.customerEmailSent !== false;
              console.log('✅ Batch notify OK', batchResponse.data.data);
              toast.success(
                customerSent
                  ? `Order placed! One confirmation email with Invoices.pdf was sent to your inbox.`
                  : `Order placed! ${successful.length} item(s) saved.`,
                { duration: 7000 }
              );
              if (batchResponse.data.data?.emailSent === false) {
                toast.error(
                  batchResponse.data.data?.emailError ||
                    'Admin notification email could not be sent.',
                  { duration: 6000 }
                );
              }
            } else {
              const emailErr =
                batchResponse.data?.data?.emailError ||
                batchResponse.data?.message ||
                'Confirmation email could not be sent.';
              toast.error(emailErr, { duration: 8000 });
            }
          } catch (error: unknown) {
            console.error('❌ Error sending batch notification:', error);
            const err = error as { response?: { data?: { message?: string; data?: { emailError?: string } } } };
            const emailErr =
              err.response?.data?.data?.emailError ||
              err.response?.data?.message ||
              'Confirmation email failed. Your order was saved — contact support if needed.';
            toast.error(emailErr, { duration: 8000 });
          }
        } else {
          toast.success(`Order placed successfully! ${successful.length} item(s) ordered.`);
        }
      }
      
      // Clear cart and close modals only if there were successful orders
      if (successful.length > 0) {
      // Clear cart and restore stock quantities (since orders were placed, stock is already updated on backend)
      // We just need to refresh products to get updated stock from backend
      setCart({});
      // Clear cart from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('order_cart');
      }
      setShowCart(false);
      setShowOrderConfirmation(false);
      
      // Refresh products to get updated stock quantities from backend
      try {
        // Use centralized API instance
        const refreshResponse = await productsApi.getAll({ limit: 100 });
        if (refreshResponse.success && refreshResponse.data.products?.length) {
          applyLoadedProducts(refreshResponse.data.products);
        }
      } catch (error) {
        console.error('Failed to refresh products:', error);
        // Don't show error to user, just log it
      }
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        cart: cart,
        selectedLocation: selectedLocation
      });
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(`Error placing order: ${errorMessage}`);
    } finally {
      setPlacementProgress(null);
      setIsPlacingOrder(false);
    }
  };


  const catalogProducts = products.filter(
    (p) => p.is_visible !== false && String(p.name || '').trim().length > 0
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back to previous page"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="hidden sm:inline font-medium">Back</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Product Ordering</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCart(true)}
                className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cart ({getCartItemCount()})
                {getCartItemCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getCartItemCount()}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/admin')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-medium text-blue-900 mb-2">Product Catalog</h3>
            <p className="text-blue-700 text-xs sm:text-sm">
              Browse and order from our product catalog. No sign-in required to browse — sign in when you checkout.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products by name, description, or category..."
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              className="w-full px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Products Grid - 100 Slots (1-100) - Mobile: 1 per row, Desktop: 5 per row */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading products...</span>
          </div>
        ) : productSearchQuery.trim() ? (
          // Show filtered results when searching
          filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-4">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowProductDetailsModal(true);
                  }}
                >
                  {/* Product Image - uses database-backed endpoint for reliability */}
                  <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                    {product.id ? (
                      <ProductCatalogImage productId={product.id} alt={product.name} view="front" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.description}</p>
                    
                    {/* Price and Stock */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-semibold text-blue-600">
                        {product.price != null && Number(product.price) > 0
                          ? `₨${formatPrice(product.price)}`
                          : 'Price on request'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        (() => {
                          const originalStock = product.stock_quantity || 0;
                          const cartQuantity = cart[product.id] || 0;
                          return originalStock > 0 && cartQuantity < originalStock;
                        })()
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(() => {
                          const originalStock = product.stock_quantity || 0;
                          const cartQuantity = cart[product.id] || 0;
                          return originalStock > 0 && cartQuantity < originalStock ? 'In Stock' : 'Out of Stock';
                        })()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product.id);
                        }}
                        disabled={(() => {
                          const originalStock = product.stock_quantity || 0;
                          const cartQuantity = cart[product.id] || 0;
                          return originalStock === 0 || cartQuantity >= originalStock;
                        })()}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          (() => {
                            const originalStock = product.stock_quantity || 0;
                            const cartQuantity = cart[product.id] || 0;
                            return originalStock > 0 && cartQuantity < originalStock;
                          })()
                            ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          buyNow(product.id);
                        }}
                        disabled={!product.stock_quantity || product.stock_quantity < 1}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          product.stock_quantity && product.stock_quantity > 0
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 text-sm">
                No products match "{productSearchQuery}". Try a different search term.
              </p>
              <button
                onClick={() => setProductSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Clear Search
              </button>
            </div>
          )
        ) : catalogProducts.length > 0 ? (
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-4">
            {catalogProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                      setSelectedProduct(product);
                      setShowProductDetailsModal(true);
                  }}
                >
                    <>
                      {/* Product Image */}
                      <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                        {product.id ? (
                          <ProductCatalogImage productId={product.id} alt={product.name} view="front" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.description}</p>
                        
                        {/* Price and Stock */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm sm:text-base font-semibold text-blue-600">
                            {product.price != null && Number(product.price) > 0
                              ? `₨${formatPrice(product.price)}`
                              : 'Price on request'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            (() => {
                              const originalStock = product.stock_quantity || 0;
                              const cartQuantity = cart[product.id] || 0;
                              return originalStock > 0 && cartQuantity < originalStock;
                            })()
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {(() => {
                              const originalStock = product.stock_quantity || 0;
                              const cartQuantity = cart[product.id] || 0;
                              return originalStock > 0 && cartQuantity < originalStock ? 'In Stock' : 'Out of Stock';
                            })()}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product.id);
                            }}
                            disabled={(() => {
                              const originalStock = product.stock_quantity || 0;
                              const cartQuantity = cart[product.id] || 0;
                              return originalStock === 0 || cartQuantity >= originalStock;
                            })()}
                            className={`flex-1 py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                              (() => {
                                const originalStock = product.stock_quantity || 0;
                                const cartQuantity = cart[product.id] || 0;
                                return originalStock > 0 && cartQuantity < originalStock;
                              })()
                                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Add to Cart
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              buyNow(product.id);
                            }}
                            disabled={!product.stock_quantity || product.stock_quantity < 1}
                            className={`flex-1 py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors ${
                              product.stock_quantity && product.stock_quantity > 0
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </>
                </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
            <p className="text-gray-600 text-sm">Check back soon or contact support if this persists.</p>
          </div>
        )}
      </div>

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {Object.keys(cart).length === 0 ? (
              <p className="text-gray-500 text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {Object.entries(cart).map(([productId, quantity]) => {
                    const product = products.find(p => p.id === productId);
                    if (!product) return null;
                    
                    return (
                      <div key={productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            {product.price != null && Number(product.price) > 0
                              ? `Rs ${Number(product.price).toLocaleString()} each`
                              : 'Price on request'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(productId)}
                            className="w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{quantity}</span>
                          <button
                            onClick={() => addToCart(productId)}
                            disabled={product.stock_quantity === 0 || (cart[productId] || 0) >= (product.stock_quantity || 0)}
                            className={`w-6 h-6 rounded-full text-xs ${
                              product.stock_quantity === 0 || (cart[productId] || 0) >= (product.stock_quantity || 0)
                                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-green-600">PKR {getCartTotal().toLocaleString()}</span>
                  </div>
                  
                  {/* Location Selection */}
                  <div className="mb-4">
                    {!selectedLocation ? (
                      // Show location selection button
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="w-full py-3 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                      >
                        ⚠️ Select Delivery Location (Required)
                      </button>
                    ) : (
                      // Show current location or selection button
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowLocationModal(true)}
                          className="w-full py-2 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium"
                        >
                          ✅ Change Location
                        </button>
                        <div className="text-sm text-green-700 bg-green-100 p-2 rounded border border-green-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">📍 Delivery Address:</p>
                              <p className="text-xs text-green-600 mt-1">{selectedLocation.address}</p>
                            </div>
                            {savedLocation && selectedLocation.address === savedLocation.address && (
                              <span className="text-xs bg-green-200 px-2 py-1 rounded">Default</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleOrder}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Place Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Google Maps Link Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Set Delivery Location</h2>
            

            {/* Location Options */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-3">
                <strong>📍 Choose Your Location Method:</strong>
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* WhatsApp Location (Mobile Only) */}
                {isMobile && (
                  <button
                    onClick={openWhatsAppLocation}
                    className="flex items-center justify-center space-x-2 p-3 bg-green-100 hover:bg-green-200 rounded-lg border border-green-300 transition-colors"
                  >
                    <span className="text-green-600">💬</span>
                    <span className="text-sm font-medium text-green-800">Share via WhatsApp</span>
                  </button>
                )}

                {/* Manual Google Maps */}
                <button
                  onClick={openGoogleMaps}
                  className="flex items-center justify-center space-x-2 p-3 bg-blue-100 hover:bg-blue-200 rounded-lg border border-blue-300 transition-colors"
                >
                  <span className="text-blue-600">🗺️</span>
                  <span className="text-sm font-medium text-blue-800">Open Google Maps</span>
                </button>

                {/* Manual Link Input */}
                <button
                  onClick={() => setShowLocationOptions(!showLocationOptions)}
                  className="flex items-center justify-center space-x-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
                >
                  <span className="text-gray-600">✏️</span>
                  <span className="text-sm font-medium text-gray-800">Paste Link Manually</span>
                </button>
              </div>

              {/* Device-specific instructions */}
              <div className="mt-3 p-2 bg-white rounded border">
                <p className="text-xs text-gray-600">
                  {isMobile ? (
                    <>
                      <strong>Mobile:</strong> Location will open in Google Maps app or WhatsApp
                    </>
                  ) : (
                    <>
                      <strong>Desktop:</strong> Location link will be copied to clipboard
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Google Maps Link Input - Only show when manual option is selected */}
            {showLocationOptions && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Maps Link
                </label>
                <input
                  type="url"
                  value={googleMapsLink}
                  onChange={(e) => handleGoogleMapsLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/Your+Location"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {linkError && (
                  <p className="text-red-600 text-sm mt-1">{linkError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Paste the Google Maps link you copied from the previous step
                </p>
              </div>
            )}

            {/* Selected Location Display */}
            {selectedLocation && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-green-600">✅</span>
                      <span className="font-medium text-green-800">Location Set:</span>
                    </div>
                    <p className="text-sm text-green-700 mb-2">{selectedLocation.address}</p>
                    {selectedLocation.lat !== 0 && selectedLocation.lng !== 0 && (
                      <div className="text-xs text-green-600">
                        Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                      </div>
                    )}
                    {selectedLocation.placeUrl && (
                      <a
                        href={selectedLocation.placeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>🎯 Perfect for Delivery:</strong>
              </p>
              <ul className="text-sm text-green-700 mt-1 space-y-1">
                <li>• Exact location for delivery team</li>
                <li>• Direct Google Maps navigation</li>
                <li>• No API keys or billing required</li>
                <li>• Works anywhere in Pakistan</li>
              </ul>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setGoogleMapsLink('');
                  setLinkError('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLocation}
                disabled={!selectedLocation}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  selectedLocation 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Confirm & Save as Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showOrderConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Your Order</h2>

            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Payment:</strong> Cash on Delivery — pay when your order arrives.
              </p>
            </div>
            
            {/* Order Summary */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Order Summary:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Total: <span className="font-semibold">PKR {getCartTotal().toLocaleString()}</span></div>
                <div>Delivery to: <span className="font-semibold">{selectedLocation?.address}</span></div>
                <div>Items: <span className="font-semibold">{Object.keys(cart).length} product(s)</span></div>
              </div>
            </div>

            {/* Warning */}
            {!isPlacingOrder && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Please review your order carefully.</strong> Once confirmed, this order cannot be cancelled.
                </p>
              </div>
            )}

            {isPlacingOrder && (
              <div
                className="mb-4 flex flex-col items-center gap-3 py-6 px-4 rounded-lg border border-blue-200 bg-blue-50/80"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div
                  className="h-11 w-11 rounded-full border-[3px] border-[#1E6BFF] border-t-transparent animate-spin"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-gray-900 text-center">
                  {placementProgress?.label ?? 'Placing your order…'}
                </p>
                {placementProgress && placementProgress.total > 0 && (
                  <>
                    <div className="w-full max-w-xs h-2 bg-white rounded-full overflow-hidden border border-blue-100">
                      <div
                        className="h-full bg-[#1E6BFF] rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((placementProgress.current / placementProgress.total) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      Step {Math.min(placementProgress.current + 1, placementProgress.total)} of{' '}
                      {placementProgress.total}
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  You will receive <strong>one email</strong> with your order summary and{' '}
                  <strong>Invoices.pdf</strong>. Please keep this window open.
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowOrderConfirmation(false)}
                disabled={isPlacingOrder}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmAndPlaceOrder();
                }}
                disabled={isPlacingOrder}
                className={`inline-flex items-center justify-center gap-2 min-w-[9.5rem] px-6 py-2 rounded-lg transition-colors ${
                  isPlacingOrder
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isPlacingOrder && (
                  <span
                    className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0"
                    aria-hidden
                  />
                )}
                {isPlacingOrder ? 'Processing…' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDebtModal && debtStatus && (
        <DebtRestrictionModal
          isOpen={showDebtModal}
          onClose={() => setShowDebtModal(false)}
          debtStatus={debtStatus}
        />
      )}

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          isOpen={showProductDetailsModal}
          onClose={() => {
            setShowProductDetailsModal(false);
            setSelectedProduct(null);
          }}
          formatPrice={formatPrice}
          cartQuantity={cart[selectedProduct.id] || 0}
          onAddToCart={(productId, quantity) => addToCartWithQuantity(productId, quantity)}
          onBuyNow={(productId, quantity) => buyNow(productId, quantity)}
        />
      )}
    </div>
    </MainLayout>
  );
}