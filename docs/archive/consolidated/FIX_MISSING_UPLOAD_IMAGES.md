# Fix Missing Upload Images

## Problem
Products with images in `/uploads/` directory are failing to load because:
- The images were uploaded through admin interface
- Railway containers are ephemeral - files are lost on redeploy
- Volume is set up but images weren't re-uploaded

## Solution: Admin Endpoint

After Railway rebuilds with the latest code, you can fix this by calling the admin endpoint:

### Option 1: Using Browser/Postman

1. Log in to your admin account
2. Open browser developer tools (F12)
3. Go to Console tab
4. Run this JavaScript:

```javascript
fetch('https://bioaestheticaxdepolying-production.up.railway.app/api/admin/images/fix-missing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + document.cookie.match(/accessToken=([^;]+)/)?.[1]
  }
})
.then(r => r.json())
.then(data => console.log('Fix result:', data))
.catch(err => console.error('Error:', err));
```

### Option 2: Using curl (if you have admin token)

```bash
curl -X POST "https://bioaestheticaxdepolying-production.up.railway.app/api/admin/images/fix-missing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## What It Does

The endpoint will:
1. Find all products with `/uploads/` images
2. Assign them images from `/products_pics/` directory
3. Update the database
4. Return a summary of fixed products

## After Fixing

- Products will use `products_pics` images (which are working)
- All images should load correctly
- You can re-upload original images through admin interface later (they'll persist in the volume)

## Permanent Solution

For future uploads:
- Railway Volume is already set up at `/app/uploads`
- New images uploaded through admin will persist in the volume
- No need to re-upload after redeploys
