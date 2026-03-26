'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/app/providers';
import { getAccessToken } from '@/lib/auth';
import DOMPurify from 'dompurify';
import Image from 'next/image';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import DebtRestrictionModal from '@/components/DebtRestrictionModal';
import { getApiBaseUrl as getApiBaseUrlFromLib } from '@/lib/getApiUrl';
import api, { productsApi, ordersApi, authApi } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';

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

  useEffect(() => {
    // Check authentication
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      // Regular users are auto-approved, so they bypass this check
      if (!user?.is_approved && user?.user_type !== 'regular' && (user as any)?.user_type !== 'regular_user') {
        router.push('/waiting-approval');
        return;
      }
      fetchProducts();
      
      // Load saved location from database
      loadSavedLocation();
    }
  }, [authLoading, isAuthenticated, user, router]);

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
        toast.error('Please login to save location');
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
  const [debtStatus, setDebtStatus] = useState<{
    currentDebt: number;
    debtLimit: number;
    tierName: string;
    remainingLimit: number;
  } | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'payfast' | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

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

  // Helper for image URLs - use full URL from backend if available, otherwise construct
  // Get product image URL using the new database-backed endpoint (more reliable on Railway)
  const getProductImageById = (productId: string): string => {
    const baseUrl = getApiBaseUrlFromLib();
    return `${baseUrl}/api/product-images/${productId}`;
  };

  const getImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) {
      return '';
    }
    
    // If image_url already starts with http:// or https://, use it directly (backend now returns full URLs)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Fallback: Construct URL if backend didn't provide full URL (for backward compatibility)
    const baseUrl = getApiBaseUrlFromLib(); // Returns URL without /api suffix
    const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}/api/images${normalizedUrl}`;
  };

  const fetchProducts = async () => {
    try {
      // Use centralized API instance (same as leaderboard page)
      const response = await productsApi.getAll();
      
      if (response.success) {
        console.log('Products loaded:', response.data.products);
        const productsData = response.data.products || [];
        setProducts(productsData);
        setFilteredProducts(productsData);
        
        // Create 100-slot array (1-100)
        const slots: (Product | null)[] = new Array(100).fill(null);
        productsData.forEach((product: Product) => {
          if (product.slot_index >= 1 && product.slot_index <= 100) {
            slots[product.slot_index - 1] = product; // Convert to 0-based index
          }
        });
        setAllSlots(slots);
        
        // Remove out-of-stock items from cart
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
      } else {
        toast.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (productId: string) => {
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

  const handleOrder = async () => {
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

    // Show payment options modal
    setShowPaymentOptions(true);
  };

  // Initialize PayFast payment - CREATE ORDERS FIRST, THEN INITIALIZE PAYMENT
  const initializePayFastPayment = async () => {
    try {
      setIsPlacingOrder(true);
      
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      // STEP 1: Create all orders first (one order per product in cart)
      console.log('🛒 Step 1: Creating orders for PayFast payment...');
      const orderIds: string[] = [];
      let totalAmount = 0;
      
      for (const [productId, quantity] of Object.entries(cart)) {
        const product = products.find(p => p.id === productId);
        if (!product) {
          console.warn(`⚠️ Product ${productId} not found, skipping...`);
          continue;
        }

        try {
          // Use centralized API instance
          const orderResponse = await ordersApi.create({
            product_id: productId,
            qty: quantity,
            order_location: savedLocation || {
              lat: 0,
              lng: 0,
              address: 'Location not set'
            },
            notes: `Order placed via PayFast online payment. Delivery to: ${savedLocation?.address || 'Location not set'}`,
            payment_method: 'payfast_online', // Mark as PayFast order to skip cash on delivery notifications
            skip_notification: true // Skip immediate notifications
          });

          if (!orderResponse.success) {
            console.error(`❌ Failed to create order for product ${productId}:`, orderResponse);
            throw new Error(orderResponse.message || `Failed to create order for ${product.name}`);
          }

          const orderData = orderResponse;
          if (orderData.success && orderData.data?.order?.id) {
            orderIds.push(orderData.data.order.id);
            const price = typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0);
            totalAmount += price * quantity;
            console.log(`✅ Order created: ${orderData.data.order.order_number} (${orderData.data.order.id})`);
          } else {
            throw new Error(`Invalid response when creating order for ${product.name}`);
          }
        } catch (error) {
          console.error(`❌ Error creating order for product ${productId}:`, error);
          throw error;
        }
      }

      if (orderIds.length === 0) {
        throw new Error('No orders were created. Please try again.');
      }

      console.log(`✅ Created ${orderIds.length} order(s) with total amount: PKR ${totalAmount}`);
      console.log('   Order IDs:', orderIds);

      // STEP 2: Initialize PayFast payment with REAL order IDs
      console.log('🚀 Step 2: Initializing PayFast payment with real order IDs...');
      
      // Use centralized API instance
      const response = await api.post('/payments/payfast/initialize', {
        orderIds: orderIds
      });

      console.log('📡 PayFast Response Status:', response.status);
      
      if (!response.data.success) {
        console.error('❌ PayFast Initialization Error:', response.data);
        throw new Error(response.data.message || 'Failed to initialize PayFast payment');
      }

      const paymentData = response.data;
      console.log('✅ PayFast Payment Data:', paymentData);

      if (paymentData.success && paymentData.data?.paymentForm) {
        // Create a temporary div to hold the form HTML
        // SECURITY: Sanitize HTML before injecting to prevent XSS attacks
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = typeof window !== 'undefined'
          ? DOMPurify.sanitize(paymentData.data.paymentForm, {
              ALLOWED_TAGS: ['form', 'input', 'button'],
              ALLOWED_ATTR: ['name', 'value', 'type', 'action', 'method', 'id', 'class']
            })
          : paymentData.data.paymentForm;
        
        // Get the form element
        const form = tempDiv.querySelector('form');
        if (form) {
          // Set form to open in new tab
          form.target = '_blank';
      form.style.display = 'none';

      // Add form to document and submit
      document.body.appendChild(form);
      form.submit();
      
      // Clean up
          setTimeout(() => {
            if (document.body.contains(form)) {
      document.body.removeChild(form);
            }
          }, 1000);
        } else {
          throw new Error('PayFast form not found in response');
        }
      } else {
        throw new Error('Invalid PayFast response format');
      }

      // Show success message
      toast.success(`Created ${orderIds.length} order(s). Redirecting to PayFast...`);

    } catch (error) {
      console.error('❌ Error initializing PayFast payment:', error);
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // More specific error messages
      let errorMessage = 'Failed to initialize payment. Please try Cash on Delivery instead.';
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error. Please contact support.';
        } else if (error.message.includes('form not found')) {
          errorMessage = 'Payment form error. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsPlacingOrder(false);
      setShowPaymentOptions(false);
    }
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
    
    try {
      const token = getAccessToken();
      if (!token) {
        toast.error('No authentication token found. Please login again.');
        router.push('/login');
        return;
      }

      // Validate cart is not empty
      if (Object.keys(cart).length === 0) {
        toast.error('Your cart is empty. Please add products before placing an order.');
        return;
      }

      // Validate location is selected
      if (!selectedLocation) {
        toast.error('Please select your delivery location first.');
        setShowLocationModal(true);
        return;
      }
      
      console.log('Starting order placement process...');
      console.log('Cart contents:', cart);
      console.log('Selected location:', selectedLocation);
      
      // Create orders for each product in cart (backend expects individual orders)
      const orderPromises = Object.entries(cart).map(async ([productId, quantity], index) => {
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
          payment_method: selectedPaymentMethod === 'cash' ? 'cash_on_delivery' : undefined, // Explicitly set payment method for Cash on Delivery
          skip_notification: selectedPaymentMethod === 'cash' // Skip individual notifications for Cash on Delivery, will send batch notification
        };

        console.log(`🛒 Creating order for product ${productId}, quantity: ${quantity}`);
        console.log(`   Selected Payment Method: ${selectedPaymentMethod}`);
        console.log(`   Payment Method in Order Data: ${orderData.payment_method || 'not set'}`);

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
          console.error(`Network error for product ${productId}:`, fetchError);
          if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error(`Order timeout for product ${productId}. Please try again.`);
          } else {
            throw new Error(`Network error for product ${productId}: ${fetchError.message}`);
            }
          } else {
            throw new Error(`Network error for product ${productId}: Unknown error`);
          }
        }
      });

      console.log(`Processing ${orderPromises.length} orders...`);
      
      // Process orders in batches for large orders (10+)
      const BATCH_SIZE = 5; // Process 5 orders at a time
      const results = [];
      const successful = [];
      const failed = [];
      
      // Show initial progress
      toast.loading(`Starting to process ${orderPromises.length} orders...`, {
        id: 'batch-progress',
        duration: 2000
      });
      
      for (let batchStart = 0; batchStart < orderPromises.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, orderPromises.length);
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(orderPromises.length / BATCH_SIZE);
        
        console.log(`Processing batch ${batchNumber} of ${totalBatches} (orders ${batchStart + 1}-${batchEnd})`);
        
        // Update batch progress
        toast.loading(`Processing batch ${batchNumber} of ${totalBatches} (${batchEnd - batchStart} orders)...`, {
          id: 'batch-progress',
          duration: 2000
        });
        
        for (let i = batchStart; i < batchEnd; i++) {
        try {
          // Show progress to user
          toast.loading(`Processing order ${i + 1} of ${orderPromises.length}...`, {
            id: `order-progress-${i}`,
            duration: 1000
          });
          
          const result = await orderPromises[i];
          results.push({ status: 'fulfilled', value: result });
          successful.push(result);
          console.log(`Order ${i + 1} completed successfully`);
          
          // Update progress
          toast.success(`Order ${i + 1} completed!`, {
            id: `order-progress-${i}`,
            duration: 1000
          });
        } catch (error: unknown) {
          results.push({ status: 'rejected', reason: error });
          failed.push(error);
          console.error(`Order ${i + 1} failed:`, error);
          
          // Check if this is a debt limit error (with structured data)
          const errorWithDebt = error as Error & { debtStatus?: any };
          if (errorWithDebt.debtStatus) {
            console.log('Debt limit error with structured data:', errorWithDebt.debtStatus);
            setDebtStatus({
              currentDebt: errorWithDebt.debtStatus.currentDebt,
              debtLimit: errorWithDebt.debtStatus.debtLimit,
              tierName: errorWithDebt.debtStatus.tierName,
              remainingLimit: errorWithDebt.debtStatus.remainingLimit
            });
            setShowDebtModal(true);
            return; // Don't show toast for debt limit errors
          }
          
          // Check if this is a debt limit error (from message parsing)
          if (error instanceof Error && error.message && error.message.includes('debt limit')) {
            console.log('Debt limit error detected:', error.message);
            
            // Extract debt information from error message - more flexible regex
            const debtMatch = error.message.match(/debt limit of ([\d,]+) for your (\w+(?:\s+\w+)*) tier\. Your current debt is ([\d,]+\.?\d*)/);
            if (debtMatch) {
              console.log('Debt match found:', debtMatch);
              const debtLimit = parseFloat(debtMatch[1].replace(/,/g, ''));
              const tierName = debtMatch[2].trim();
              const currentDebt = parseFloat(debtMatch[3].replace(/,/g, ''));
              
              console.log('Debt data extracted:', { debtLimit, tierName, currentDebt });
              
              setDebtStatus({
                currentDebt,
                debtLimit,
                tierName,
                remainingLimit: Math.max(0, debtLimit - currentDebt)
              });
              setShowDebtModal(true);
              return; // Don't show toast for debt limit errors
            } else {
              console.log('Debt regex did not match, trying alternative pattern');
              // Try alternative pattern for different error formats
              const altMatch = error.message.match(/debt limit.*?(\d+(?:,\d+)*).*?(\w+(?:\s+\w+)*).*?debt is ([\d,]+\.?\d*)/);
              if (altMatch) {
                console.log('Alternative debt match found:', altMatch);
                const debtLimit = parseFloat(altMatch[1].replace(/,/g, ''));
                const tierName = altMatch[2].trim();
                const currentDebt = parseFloat(altMatch[3].replace(/,/g, ''));
                
                setDebtStatus({
                  currentDebt,
                  debtLimit,
                  tierName,
                  remainingLimit: Math.max(0, debtLimit - currentDebt)
                });
                setShowDebtModal(true);
                return;
              }
            }
            
            // Fallback: If we detect debt limit but can't parse details, show modal with generic info
            console.log('Showing debt modal with fallback data');
            setDebtStatus({
              currentDebt: 0,
              debtLimit: 0,
              tierName: 'Unknown',
              remainingLimit: 0
            });
            setShowDebtModal(true);
            return;
          }
          
          // Show error for this order (non-debt limit errors)
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast.error(`Order ${i + 1} failed: ${errorMessage}`, {
            id: `order-progress-${i}`,
            duration: 3000
          });
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
      
      if (failed.length > 0) {
        console.error('Some orders failed:', failed);
        toast.error(`${failed.length} order(s) failed. ${successful.length} order(s) succeeded.`);
      }
      
      if (successful.length > 0) {
        toast.success(`Order placed successfully! ${successful.length} item(s) ordered.`);
        
        // Send batch notification for Cash on Delivery orders
        if (selectedPaymentMethod === 'cash' && successful.length > 0) {
          try {
            // Use centralized API instance (no need for apiUrl or token variables)
            const orderIds = successful
              .map(result => result.data?.order?.id)
              .filter((id): id is string => Boolean(id));
            
            if (orderIds.length > 0) {
              console.log(`📧 Sending batch notification for ${orderIds.length} order(s)`);
              // Use centralized API instance
              const batchResponse = await api.post('/orders/batch-notify', {
                order_ids: orderIds,
                payment_method: 'cash_on_delivery'
              });
              
              if (batchResponse.data.success) {
                console.log('✅ Batch notification sent successfully');
              } else {
                console.error('❌ Failed to send batch notification:', batchResponse.data);
              }
            }
          } catch (error) {
            console.error('❌ Error sending batch notification:', error);
            // Don't show error to user, just log it
          }
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
        if (refreshResponse.success) {
          setProducts(refreshResponse.data.products);
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
      // Add a small delay to prevent rapid clicking
      setTimeout(() => {
      setIsPlacingOrder(false);
      }, 1000);
    }
  };


  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{authLoading ? 'Checking authentication...' : 'Loading products...'}</p>
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
              Browse and order from our product catalog. Click "Add to Cart" to select products for your order.
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
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
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
                      <img
                        src={getProductImageById(product.id)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('❌ Image failed to load:', product.name, product.id);
                          e.currentTarget.style.display = 'none';
                          const nextSibling = e.currentTarget.nextElementSibling;
                          if (nextSibling) {
                            (nextSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center text-gray-400 ${product.id ? 'hidden' : ''}`}>
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.description}</p>
                    
                    {/* Price and Stock */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-semibold text-blue-600">
                        ₨{formatPrice(product.price)}
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

                    {/* Add to Cart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering card click
                        addToCart(product.id);
                      }}
                      disabled={(() => {
                        const originalStock = product.stock_quantity || 0;
                        const cartQuantity = cart[product.id] || 0;
                        return originalStock === 0 || cartQuantity >= originalStock;
                      })()}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        (() => {
                          const originalStock = product.stock_quantity || 0;
                          const cartQuantity = cart[product.id] || 0;
                          return originalStock > 0 && cartQuantity < originalStock;
                        })()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {(() => {
                        const originalStock = product.stock_quantity || 0;
                        const cartQuantity = cart[product.id] || 0;
                        return originalStock > 0 && cartQuantity < originalStock ? 'Add to Cart' : 'Out of Stock';
                      })()}
                    </button>
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
        ) : (
          // Show all 100 slots when not searching
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
            {allSlots.map((product, index) => {
              const slotNumber = index + 1;
              return (
                <div 
                  key={slotNumber} 
                  className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (product) {
                      setSelectedProduct(product);
                      setShowProductDetailsModal(true);
                    }
                  }}
                >
                  {product ? (
                    // Product exists in this slot
                    <>
                      {/* Product Image */}
                      <div className="aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden">
                        {product.id ? (
                          <>
                            <img
                              src={getProductImageById(product.id)}
                              alt={product.name}
                              width={200}
                              height={128}
                              className="w-full h-full object-cover"
                              style={{ 
                                minWidth: '100%', 
                                minHeight: '100%',
                                backgroundColor: '#f0f0f0'
                              }}
                              onLoad={() => {
                                console.log('✅ Image loaded successfully:', product.name, product.image_url);
                              }}
                              onError={(e) => {
                                console.log('❌ Image failed to load:', product.name, product.id);
                                e.currentTarget.style.backgroundColor = '#ffcccc';
                                e.currentTarget.alt = 'FAILED TO LOAD';
                              }}
                            />
                            {/* Fallback image when main image fails to load */}
                            <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: 'none' }}>
                              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            ₨{formatPrice(product.price)}
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

                        {/* Add to Cart Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering card click
                            addToCart(product.id);
                          }}
                          disabled={(() => {
                            const originalStock = product.stock_quantity || 0;
                            const cartQuantity = cart[product.id] || 0;
                            return originalStock === 0 || cartQuantity >= originalStock;
                          })()}
                          className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            (() => {
                              const originalStock = product.stock_quantity || 0;
                              const cartQuantity = cart[product.id] || 0;
                              return originalStock > 0 && cartQuantity < originalStock;
                            })()
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {(() => {
                            const originalStock = product.stock_quantity || 0;
                            const cartQuantity = cart[product.id] || 0;
                            return originalStock > 0 && cartQuantity < originalStock ? 'Add to Cart' : 'Out of Stock';
                          })()}
                        </button>
                      </div>
                    </>
                  ) : (
                    // Empty slot
                    <div className="aspect-square mb-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-xs font-medium">Slot {slotNumber}</span>
                      <span className="text-xs">Empty</span>
                    </div>
                  )}
                </div>
              );
            })}
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
                          <div className="text-sm text-gray-600">Rs {product.price.toLocaleString()} each</div>
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

      {/* Payment Options Modal */}
      {showPaymentOptions && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Payment Method</h2>
            
            {/* Order Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Order Summary:</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Total: <span className="font-semibold">PKR {getCartTotal().toLocaleString()}</span></div>
                <div>Delivery to: <span className="font-semibold">{selectedLocation?.address}</span></div>
                <div>Items: <span className="font-semibold">{Object.keys(cart).length} product(s)</span></div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="mb-6 space-y-3">
              <div className="text-sm font-medium text-gray-700 mb-3">Select your preferred payment method:</div>
              
              {/* Cash on Delivery */}
              <button
                onClick={() => {
                  setSelectedPaymentMethod('cash');
                  setShowPaymentOptions(false);
                  setShowOrderConfirmation(true);
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">💰</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Cash on Delivery</div>
                    <div className="text-sm text-gray-600">Pay when your order arrives</div>
                  </div>
                </div>
              </button>

              {/* PayFast Online Payment */}
              <button
                onClick={() => {
                  setSelectedPaymentMethod('payfast');
                  initializePayFastPayment();
                }}
                disabled={isPlacingOrder}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">💳</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">PayFast Online Payment</div>
                    <div className="text-sm text-gray-600">Pay securely with credit/debit card</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowPaymentOptions(false)}
                disabled={isPlacingOrder}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
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
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Please review your order carefully.</strong> Once confirmed, this order cannot be cancelled.
              </p>
            </div>
            
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
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isPlacingOrder 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                style={{ 
                  pointerEvents: isPlacingOrder ? 'none' : 'auto',
                  userSelect: 'none'
                }}
              >
                {isPlacingOrder ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debt Restriction Modal */}
      {showDebtModal && debtStatus && (
        <DebtRestrictionModal
          isOpen={showDebtModal}
          onClose={() => setShowDebtModal(false)}
          debtStatus={debtStatus}
        />
      )}

      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProduct && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowProductDetailsModal(false);
            setSelectedProduct(null);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all"
            onClick={(e) => e.stopPropagation()}
            style={{ marginTop: '-10vh' }}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
              <button
                onClick={() => {
                  setShowProductDetailsModal(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image - uses database-backed endpoint */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.id ? (
                    <img
                      src={getProductImageById(selectedProduct.id)}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextSibling = e.currentTarget.nextElementSibling;
                        if (nextSibling) {
                          (nextSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ display: selectedProduct.image_url ? 'none' : 'flex' }}>
                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded">
                        Slot {selectedProduct.slot_index}
                      </span>
                      {selectedProduct.is_featured && (
                        <span className="text-sm font-medium text-yellow-600 bg-yellow-100 px-3 py-1 rounded">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h3>
                    {selectedProduct.category && (
                      <p className="text-sm text-gray-500 mb-3">Category: {selectedProduct.category}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedProduct.description || 'No description available.'}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Price:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₨{formatPrice(selectedProduct.price)}
                      </span>
                    </div>
                    {selectedProduct.unit && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Unit:</span>
                        <span className="text-sm text-gray-600">per {selectedProduct.unit}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Stock Status:</span>
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        selectedProduct.stock_quantity && selectedProduct.stock_quantity > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedProduct.stock_quantity && selectedProduct.stock_quantity > 0 
                          ? `In Stock (${selectedProduct.stock_quantity} available)` 
                          : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(selectedProduct.id);
                        toast.success(`${selectedProduct.name} added to cart!`);
                        setShowProductDetailsModal(false);
                        setSelectedProduct(null);
                      }}
                      disabled={!selectedProduct.stock_quantity || selectedProduct.stock_quantity === 0}
                      className={`w-full py-3 px-4 rounded-lg text-base font-medium transition-colors ${
                        selectedProduct.stock_quantity && selectedProduct.stock_quantity > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {selectedProduct.stock_quantity && selectedProduct.stock_quantity > 0 
                        ? 'Add to Cart' 
                        : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </MainLayout>
  );
}