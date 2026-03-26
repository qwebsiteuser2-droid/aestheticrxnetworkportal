# Docker Environment Variables & Credentials

Complete list of all environment variables and credentials configured in Docker Compose files.

## 📋 **From `docker-compose.yml` (Development)**

### Database Configuration
```yaml
POSTGRES_DB: aestheticrx1
POSTGRES_USER: postgres
POSTGRES_PASSWORD: password
DATABASE_URL: postgres://postgres:password@db:5432/aestheticrx1
```

### Redis Configuration
```yaml
REDIS_URL: redis://redis:6379
```

### Authentication & Security
```yaml
JWT_SECRET: your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET: your-super-secret-refresh-key-change-this-in-production
BCRYPT_SALT_ROUNDS: 12
```

### Email Configuration (Gmail)
```yaml
GMAIL_USER: asadkhanbloch4949@gmail.com
GMAIL_APP_PASSWORD: ccsb uozs vyom pddi
```

### Admin Configuration
```yaml
MAIN_ADMIN_EMAIL: asadkhanbloch4949@gmail.com
SECONDARY_ADMIN_EMAIL: asadkhanbloch4949@gmail.com
```

### WhatsApp/Twilio Configuration
```yaml
TWILIO_ACCOUNT_SID: ACbfa0042d6a724b5782a0e3082251bee2
TWILIO_AUTH_TOKEN: YOUR_ACTUAL_AUTH_TOKEN_HERE
WHATSAPP_PHONE_NUMBER: +14155238886
```

### URLs & Networking
```yaml
FRONTEND_URL: http://localhost:3000
BACKEND_URL: http://localhost:4000
NODE_ENV: development
```

### Rate Limiting
```yaml
RATE_LIMIT_WINDOW_MS: 900000
RATE_LIMIT_MAX_REQUESTS: 1000
DISABLE_RATE_LIMIT: true
```

### PayFast Payment Gateway
```yaml
PAYFAST_MERCHANT_ID: 10042666
PAYFAST_MERCHANT_KEY: aacjyg5h02c4s
PAYFAST_PASSPHRASE: qV9t7Gz2Rkx8Lm4FhS0pW1
```

### Google Drive Service Account
```yaml
GOOGLE_PRIVATE_KEY_ID: 8296bd9ebfcd842c680b87ad9e3fff7a4ce8cb15
GOOGLE_CLIENT_ID: 107284311721266654505
GOOGLE_PRIVATE_KEY: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfEUviTOB0UU7v
  4boG6Z1CYC8bArlRY6BEESak6tKh7I8FFCmNZUL4txj64xlY2lRItKtmba0gGi0w
  c/JJCTl96ZxXex/KkgpB1dbNG5pyuZcnBYFdtv56jZT8IEefkJgjqpa2PD1mh7Hl
  wH0VVAJaxGeSwkx9ZD7SLrv+CSTXxtWMZoRq4VxJdTLmexzDwtHfuURNGhLJzlL+
  Sq6VeitunY0zpc+5y5+gUEC1UpWclHJGD+yRC2D623If8725uIy68iZDD+Be78bP
  vY7fHa6jRxwY18/PWVpaIDarUFRBJP5NThAX3JHP2BqSJsjogAi0sS+PHsjNfrEd
  VbdotJvzAgMBAAECggEAMOARz+ZHQcU09gNv5qbWMZ5wg8sPfsFE8tUNMhJPj3IN
  DjBSQGxhBazcmNAclCbWU83eRkWeqsuBfj3RZuZSBgAjJNnR5+kivTUU6QD00NFQ
  SJkAtN9tF74g2DNcbh5Y72untQsy6t2tgWkxHvS2xVuGVBYle031I8lgoHMxcuNx
  zxMPt+lSYEaXMeLe03DgfMmQmkHjsjMGAIvx9nF5JT7CBZPAcpGy//9FshVMG9Jj
  r43XVk5xoh/KOvAM3QUxoRZFFy2jJkBi9JhsVjWaH1LHscCBYLLVVdnJ+oBwyWH8
  wiYXxVgYcoiWWULTNQmcHDecaBGex0MCCgEj6mgb4QKBgQD2aHPgRgA3aZoR4nsY
  kS4vaLg+Frmch+JYCHelYzP1J16CUGX4pp2jaZZRMnorf1QihDA8N67+Rv4MR8qo
  z2kRJf9R3p+tx6shO/6HSPeNUmibZS6R4OqjGHpOrJj5Ie3kvSNWu+ODpoEe3c8L
  YQzZwQaTQxB1FlLzTgEsBGPZIQKBgQDnwD9bwRiMT26+ofaSnoiw8nYeuFVkQjZI
  kqYJwEQP6urNBNLJTBDe+PTl4vlAB4KWMkmJAA5Km2EqpIjkeb51eIPLUaAxhfBT
  cblKTh3H3+LuwwsETtMD3l7/rJfnAMBYd27tGx4GdSAqGrUh6WHH3W5b32mCuI5s
  Kq1kL/sukwKBgAxdt5sEyFP/l7zYCed0ucWlUsHC8DO72g8i9aY2MVBXVnXhxQxS
  iEzAKswOZXUzYayNx8Ht5XlbZLqHC9Om/RXgO00HiCn3gE4dratqbQoJnbhWvpyR
  lhTzUIgMP20ZV9AH8fMTYNqli4taBF8E0tlGx6ayUeweX7FYM9Tar4whAoGAa2eQ
  tZBvNQ/XLmhXoynwBbnI/oHFqXp6N/YnF1vQ72ObQDsdCYfEReIxdZ1UkNUqMzvJ
  EsJA3VjXlnC8tM6rczvQMNl6mZkOgU2yZvp/GNPtE2S3ZV62sxNLCclOeRPDEP0B
  HsgziSCdMIZCLh5AX+WCsPeAqcGo1/6Lb2RBUBsCgYEAr1nC8LUTqHcZmQTDt/6O
  SeWC34v3IimJjTtpa0pVdJgsMWVB7WKAohFgCI3/ylQeOV1gEo7Oj5P/6BEMHIHU
  lsir3LumQJry3iZ/sgekww5ySWumh+n91j5L+uq0Eq40oxiDxx8FzD8cSHIKrSvN
  +H80AYd9PJxb2hLuVNxgZBc=
  -----END PRIVATE KEY-----
```

### Frontend Configuration
```yaml
NEXT_PUBLIC_API_URL: http://localhost:4000/api
HOSTNAME: 0.0.0.0
```

### MinIO (Local S3 Storage)
```yaml
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: minioadmin123
```

---

## 📋 **From `docker-compose.prod.yml` & `docker-compose.prod-http.yml` (Production)**

### Database Configuration
```yaml
POSTGRES_DB: aestheticrx1
POSTGRES_USER: postgres
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_secure_password}
DATABASE_URL: postgres://postgres:${POSTGRES_PASSWORD:-your_secure_password}@db:5432/aestheticrx1
```

### Redis Configuration
```yaml
REDIS_URL: redis://redis:6379
```

### Environment
```yaml
NODE_ENV: production
```

### Frontend Configuration
```yaml
# docker-compose.prod.yml
NEXT_PUBLIC_API_URL: https://your-domain.com/api

# docker-compose.prod-http.yml
NEXT_PUBLIC_API_URL: http://localhost/api
```

**Note:** Production files reference `production.env` file for additional variables.

---

## 🔐 **Complete Credentials List for Railway**

Based on `docker-compose.yml`, here are all the credentials you need to add to Railway:

### ✅ **Already Set in Railway:**
- `DATABASE_URL` (auto-set by Railway)
- `JWT_SECRET` (already set)
- `JWT_REFRESH_SECRET` (already set)

### ⚠️ **Need to Add to Railway:**

#### Email (URGENT - Fixes Password Reset 500 Error)
```
GMAIL_USER=asadkhanbloch4949@gmail.com
GMAIL_APP_PASSWORD=ccsb uozs vyom pddi
```

#### Admin Emails
```
MAIN_ADMIN_EMAIL=asadkhanbloch4949@gmail.com
SECONDARY_ADMIN_EMAIL=asadkhanbloch4949@gmail.com
```

#### URLs
```
FRONTEND_URL=https://aestheticrxdepolying.vercel.app
RAILWAY_PUBLIC_DOMAIN=aestheticrxdepolying-production.up.railway.app
```

#### PayFast Payment Gateway
```
PAYFAST_MERCHANT_ID=10042666
PAYFAST_MERCHANT_KEY=aacjyg5h02c4s
PAYFAST_PASSPHRASE=qV9t7Gz2Rkx8Lm4FhS0pW1
```

#### Google Drive (Optional)
```
GOOGLE_PRIVATE_KEY_ID=8296bd9ebfcd842c680b87ad9e3fff7a4ce8cb15
GOOGLE_CLIENT_ID=107284311721266654505
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfEUviTOB0UU7v\n4boG6Z1CYC8bArlRY6BEESak6tKh7I8FFCmNZUL4txj64xlY2lRItKtmba0gGi0w\nc/JJCTl96ZxXex/KkgpB1dbNG5pyuZcnBYFdtv56jZT8IEefkJgjqpa2PD1mh7Hl\nwH0VVAJaxGeSwkx9ZD7SLrv+CSTXxtWMZoRq4VxJdTLmexzDwtHfuURNGhLJzlL+\nSq6VeitunY0zpc+5y5+gUEC1UpWclHJGD+yRC2D623If8725uIy68iZDD+Be78bP\nvY7fHa6jRxwY18/PWVpaIDarUFRBJP5NThAX3JHP2BqSJsjogAi0sS+PHsjNfrEd\nVbdotJvzAgMBAAECggEAMOARz+ZHQcU09gNv5qbWMZ5wg8sPfsFE8tUNMhJPj3IN\nDjBSQGxhBazcmNAclCbWU83eRkWeqsuBfj3RZuZSBgAjJNnR5+kivTUU6QD00NFQ\nSJkAtN9tF74g2DNcbh5Y72untQsy6t2tgWkxHvS2xVuGVBYle031I8lgoHMxcuNx\nzxMPt+lSYEaXMeLe03DgfMmQmkHjsjMGAIvx9nF5JT7CBZPAcpGy//9FshVMG9Jj\nr43XVk5xoh/KOvAM3QUxoRZFFy2jJkBi9JhsVjWaH1LHscCBYLLVVdnJ+oBwyWH8\nwiYXxVgYcoiWWULTNQmcHDecaBGex0MCCgEj6mgb4QKBgQD2aHPgRgA3aZoR4nsY\nkS4vaLg+Frmch+JYCHelYzP1J16CUGX4pp2jaZZRMnorf1QihDA8N67+Rv4MR8qo\nz2kRJf9R3p+tx6shO/6HSPeNUmibZS6R4OqjGHpOrJj5Ie3kvSNWu+ODpoEe3c8L\nYQzZwQaTQxB1FlLzTgEsBGPZIQKBgQDnwD9bwRiMT26+ofaSnoiw8nYeuFVkQjZI\nkqYJwEQP6urNBNLJTBDe+PTl4vlAB4KWMkmJAA5Km2EqpIjkeb51eIPLUaAxhfBT\ncblKTh3H3+LuwwsETtMD3l7/rJfnAMBYd27tGx4GdSAqGrUh6WHH3W5b32mCuI5s\nKq1kL/sukwKBgAxdt5sEyFP/l7zYCed0ucWlUsHC8DO72g8i9aY2MVBXVnXhxQxS\niEzAKswOZXUzYayNx8Ht5XlbZLqHC9Om/RXgO00HiCn3gE4dratqbQoJnbhWvpyR\nlhTzUIgMP20ZV9AH8fMTYNqli4taBF8E0tlGx6ayUeweX7FYM9Tar4whAoGAa2eQ\ntZBvNQ/XLmhXoynwBbnI/oHFqXp6N/YnF1vQ72ObQDsdCYfEReIxdZ1UkNUqMzvJ\nEsJA3VjXlnC8tM6rczvQMNl6mZkOgU2yZvp/GNPtE2S3ZV62sxNLCclOeRPDEP0B\nHsgziSCdMIZCLh5AX+WCsPeAqcGo1/6Lb2RBUBsCgYEAr1nC8LUTqHcZmQTDt/6O\nSeWC34v3IimJjTtpa0pVdJgsMWVB7WKAohFgCI3/ylQeOV1gEo7Oj5P/6BEMHIHU\nlsir3LumQJry3iZ/sgekww5ySWumh+n91j5L+uq0Eq40oxiDxx8FzD8cSHIKrSvN\n+H80AYd9PJxb2hLuVNxgZBc=\n-----END PRIVATE KEY-----
```

#### WhatsApp/Twilio (Optional)
```
TWILIO_ACCOUNT_SID=ACbfa0042d6a724b5782a0e3082251bee2
TWILIO_AUTH_TOKEN=YOUR_ACTUAL_AUTH_TOKEN_HERE
WHATSAPP_PHONE_NUMBER=+14155238886
```

---

## ⚠️ **Security Notes**

1. **Gmail App Password**: The password `ccsb uozs vyom pddi` is exposed in docker-compose.yml. Make sure this is still valid or regenerate it.

2. **JWT Secrets**: The development secrets are weak. Make sure production uses strong secrets (32+ characters).

3. **Database Password**: Development uses `password` - this is fine for local dev but NEVER use in production.

4. **Google Private Key**: The full private key is exposed. Keep this secure.

5. **PayFast Credentials**: These appear to be real credentials. Verify they're correct for your PayFast account.

---

## 🚀 **Quick Copy-Paste for Railway**

Add these to Railway Variables (one by one):

```
GMAIL_USER=asadkhanbloch4949@gmail.com
GMAIL_APP_PASSWORD=ccsb uozs vyom pddi
MAIN_ADMIN_EMAIL=asadkhanbloch4949@gmail.com
SECONDARY_ADMIN_EMAIL=asadkhanbloch4949@gmail.com
FRONTEND_URL=https://aestheticrxdepolying.vercel.app
RAILWAY_PUBLIC_DOMAIN=aestheticrxdepolying-production.up.railway.app
PAYFAST_MERCHANT_ID=10042666
PAYFAST_MERCHANT_KEY=aacjyg5h02c4s
PAYFAST_PASSPHRASE=qV9t7Gz2Rkx8Lm4FhS0pW1
GOOGLE_PRIVATE_KEY_ID=8296bd9ebfcd842c680b87ad9e3fff7a4ce8cb15
GOOGLE_CLIENT_ID=107284311721266654505
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfEUviTOB0UU7v\n4boG6Z1CYC8bArlRY6BEESak6tKh7I8FFCmNZUL4txj64xlY2lRItKtmba0gGi0w\nc/JJCTl96ZxXex/KkgpB1dbNG5pyuZcnBYFdtv56jZT8IEefkJgjqpa2PD1mh7Hl\nwH0VVAJaxGeSwkx9ZD7SLrv+CSTXxtWMZoRq4VxJdTLmexzDwtHfuURNGhLJzlL+\nSq6VeitunY0zpc+5y5+gUEC1UpWclHJGD+yRC2D623If8725uIy68iZDD+Be78bP\nvY7fHa6jRxwY18/PWVpaIDarUFRBJP5NThAX3JHP2BqSJsjogAi0sS+PHsjNfrEd\nVbdotJvzAgMBAAECggEAMOARz+ZHQcU09gNv5qbWMZ5wg8sPfsFE8tUNMhJPj3IN\nDjBSQGxhBazcmNAclCbWU83eRkWeqsuBfj3RZuZSBgAjJNnR5+kivTUU6QD00NFQ\nSJkAtN9tF74g2DNcbh5Y72untQsy6t2tgWkxHvS2xVuGVBYle031I8lgoHMxcuNx\nzxMPt+lSYEaXMeLe03DgfMmQmkHjsjMGAIvx9nF5JT7CBZPAcpGy//9FshVMG9Jj\nr43XVk5xoh/KOvAM3QUxoRZFFy2jJkBi9JhsVjWaH1LHscCBYLLVVdnJ+oBwyWH8\nwiYXxVgYcoiWWULTNQmcHDecaBGex0MCCgEj6mgb4QKBgQD2aHPgRgA3aZoR4nsY\nkS4vaLg+Frmch+JYCHelYzP1J16CUGX4pp2jaZZRMnorf1QihDA8N67+Rv4MR8qo\nz2kRJf9R3p+tx6shO/6HSPeNUmibZS6R4OqjGHpOrJj5Ie3kvSNWu+ODpoEe3c8L\nYQzZwQaTQxB1FlLzTgEsBGPZIQKBgQDnwD9bwRiMT26+ofaSnoiw8nYeuFVkQjZI\nkqYJwEQP6urNBNLJTBDe+PTl4vlAB4KWMkmJAA5Km2EqpIjkeb51eIPLUaAxhfBT\ncblKTh3H3+LuwwsETtMD3l7/rJfnAMBYd27tGx4GdSAqGrUh6WHH3W5b32mCuI5s\nKq1kL/sukwKBgAxdt5sEyFP/l7zYCed0ucWlUsHC8DO72g8i9aY2MVBXVnXhxQxS\niEzAKswOZXUzYayNx8Ht5XlbZLqHC9Om/RXgO00HiCn3gE4dratqbQoJnbhWvpyR\nlhTzUIgMP20ZV9AH8fMTYNqli4taBF8E0tlGx6ayUeweX7FYM9Tar4whAoGAa2eQ\ntZBvNQ/XLmhXoynwBbnI/oHFqXp6N/YnF1vQ72ObQDsdCYfEReIxdZ1UkNUqMzvJ\nEsJA3VjXlnC8tM6rczvQMNl6mZkOgU2yZvp/GNPtE2S3ZV62sxNLCclOeRPDEP0B\nHsgziSCdMIZCLh5AX+WCsPeAqcGo1/6Lb2RBUBsCgYEAr1nC8LUTqHcZmQTDt/6O\nSeWC34v3IimJjTtpa0pVdJgsMWVB7WKAohFgCI3/ylQeOV1gEo7Oj5P/6BEMHIHU\nlsir3LumQJry3iZ/sgekww5ySWumh+n91j5L+uq0Eq40oxiDxx8FzD8cSHIKrSvN\n+H80AYd9PJxb2hLuVNxgZBc=\n-----END PRIVATE KEY-----
```

**Note:** For `GOOGLE_PRIVATE_KEY`, when adding to Railway, keep the `\n` characters as they are (they represent newlines in the key).

