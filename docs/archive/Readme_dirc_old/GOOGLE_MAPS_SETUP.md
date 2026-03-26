# Google Places API Setup Guide

## 🔍 Google Places Search for Location Selection

Your application now has Google Places search integration for easy location selection! This helps delivery teams find exact locations in big cities.

## 📋 Prerequisites

1. **Google Cloud Console Account**: You need a Google account
2. **Billing Account**: Google Maps API requires billing (but has free tier)

## 🔑 Step 1: Get Google Maps API Key

### 1.1 Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Sign in with your Google account

### 1.2 Create or Select Project
- Click "Select a project" → "New Project"
- Name: `BioAestheticAx Network_Maps` (or any name)
- Click "Create"

### 1.3 Enable APIs
- Go to "APIs & Services" → "Library"
- Search and enable these APIs:
  - **Maps JavaScript API** (required for interactive map)
  - **Geocoding API** (required for address lookup)
  - **Places API** (optional, for location search)

### 1.4 Create API Key
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "API Key"
- Copy the generated API key
- **Important**: Restrict the API key to your domain for security

### 1.5 Secure Your API Key
- Click on your API key to edit
- Under "Application restrictions":
  - Select "HTTP referrers (web sites)"
  - Add: `http://localhost:3000/*`
  - Add: `https://yourdomain.com/*` (for production)
- Under "API restrictions":
  - Select "Restrict key"
  - Choose: Maps JavaScript API, Geocoding API, Places API
- Click "Save"

### 1.6 Test Your API Key
- Go to: https://developers.google.com/maps/documentation/javascript/error-messages#invalid-key-map-error
- Test your API key to ensure it's working correctly

## ⚙️ Step 2: Configure Your Application

### 2.1 Update Environment File
Edit `frontend/.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### 2.2 Restart Application
```bash
docker compose restart frontend
```

## 🎯 Step 3: Test Location Search

1. **Access Order Page**: http://localhost:3000/order
2. **Add Product to Cart**: Click "Add to Cart" on any product
3. **Open Cart**: Click "Cart" button
4. **Select Location**: Click "Select Delivery Location"
5. **Pakistan Map Opens**: Interactive Google Maps restricted to Pakistan
6. **Click to Locate**: Click anywhere on the Pakistan map to place marker
7. **Drag to Adjust**: Drag the marker to fine-tune your exact location
8. **View Address**: See the exact address and coordinates
9. **Confirm**: Click "Confirm & Save as Default"
10. **Place Order**: Click "Place Order"

## 💰 Google Places API Pricing

### Free Tier (Monthly)
- **Places Text Search**: 1,000 free requests
- **Geocoding**: 40,000 free requests

### Paid Tier
- Places Text Search: $32 per 1,000 after free tier
- Geocoding: $5 per 1,000 after free tier

## 🔧 Features Included

### ✅ Pakistan-Specific Map
- Interactive Google Maps restricted to Pakistan
- Pakistan bounds enforcement
- Default center: Karachi, Pakistan
- Optimized for Pakistani cities

### ✅ Click-to-Locate Feature
- Click anywhere on Pakistan map to place marker
- Draggable marker for fine-tuning
- Real-time address lookup
- Exact coordinates for delivery

### ✅ Smart Location Management
- Locate mode: Click to place marker
- Static mode: Drag to adjust location
- Cursor changes based on mode
- Visual mode indicators

### ✅ Location Storage
- Coordinates saved (lat, lng)
- Address stored for delivery
- Google Maps place URL
- Default location memory

## 🚨 Troubleshooting

### "InvalidKey" Error
- Check API key is correct
- Verify API restrictions
- Ensure Maps JavaScript API is enabled

### "QuotaExceeded" Error
- Check billing account
- Monitor usage in Google Cloud Console
- Consider upgrading plan

### Map Not Loading
- Check browser console for errors
- Verify API key in environment file
- Restart frontend container

## 🔒 Security Best Practices

1. **Restrict API Key**: Always use HTTP referrer restrictions
2. **Monitor Usage**: Set up billing alerts
3. **Rotate Keys**: Change API keys periodically
4. **Environment Variables**: Never commit API keys to git

## 📱 Mobile Support

The Google Maps integration works on:
- ✅ Desktop browsers
- ✅ Mobile browsers
- ✅ Touch devices (tap to select location)

## 🎉 You're All Set!

Your Google Maps integration is now fully functional with:
- Interactive map with pinned target
- Address lookup and geocoding
- Location selection for delivery
- Complete order placement flow

The location selection is now a core feature as requested! 🗺️
