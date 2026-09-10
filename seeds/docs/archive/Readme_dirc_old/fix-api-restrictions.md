# 🔧 Fix Google Maps API Key Restrictions

## 🚨 **Problem**: 
Your API key is working but Google Maps shows "This page can't load Google Maps correctly" because of API key restrictions.

## ✅ **Solution**: Update API Key Restrictions

### **Step 1: Go to Google Cloud Console**
1. **Open**: https://console.cloud.google.com/
2. **Select**: Your "QWebsite" project
3. **Go to**: APIs & Services → Credentials
4. **Click**: On your API key (the one starting with `AIzaSyAb8RN6I5xP1FFoUmWTSR467Dq_QL0glZkpFlSyS9KKBmZlZiqw`)

### **Step 2: Update Application Restrictions**
1. **Under "Application restrictions"**:
   - Select **"None"** (for testing) OR
   - Select **"HTTP referrers (web sites)"** and add:
     - `http://localhost:3000/*`
     - `https://localhost:3000/*`
     - `http://127.0.0.1:3000/*`
     - `https://127.0.0.1:3000/*`

### **Step 3: Update API Restrictions**
1. **Under "API restrictions"**:
   - Select **"Restrict key"**
   - Choose these APIs:
     - ✅ Maps JavaScript API
     - ✅ Geocoding API
     - ✅ Places API (optional)

### **Step 4: Save Changes**
1. **Click**: "Save"
2. **Wait**: 1-2 minutes for changes to take effect

### **Step 5: Test Again**
1. **Refresh**: Your browser page
2. **Clear Cache**: Ctrl+F5 (or Cmd+Shift+R on Mac)
3. **Test**: Go to http://localhost:3000/order

## 🔄 **Alternative: Temporary Fix (For Testing Only)**

If you want to test immediately without restrictions:

1. **Go to**: Google Cloud Console → Credentials
2. **Click**: Your API key
3. **Application restrictions**: Select **"None"**
4. **Save**: Changes
5. **Test**: Your application

⚠️ **Important**: Remember to add restrictions back for security!

## 🧪 **Test Your Fix**

After updating restrictions, test with:
```bash
python3 test-api-key.py
```

## 🎯 **Expected Result**
- ✅ Google Maps loads without errors
- ✅ Interactive Pakistan map appears
- ✅ Click to place markers works
- ✅ Drag to adjust location works
