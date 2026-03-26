# Security Guide

**AestheticRxNetwork B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.4.0 |
| **Last Updated** | January 31, 2026 |
| **Status** | ✅ Production Ready |

---

## Overview

This document describes the security architecture, implemented measures, and best practices for the AestheticRxNetwork platform. Security is implemented across all layers of the application.

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│  1. Network Security                                         │
│     • SSL/TLS encryption (HTTPS)                            │
│     • CORS configuration                                     │
│     • Rate limiting                                          │
├─────────────────────────────────────────────────────────────┤
│  2. Application Security                                     │
│     • Helmet security headers                                │
│     • Input validation & sanitization                       │
│     • XSS prevention (DOMPurify)                            │
│     • CSRF protection (SameSite cookies)                    │
├─────────────────────────────────────────────────────────────┤
│  3. Authentication & Authorization                          │
│     • JWT token authentication                               │
│     • Role-based access control (RBAC)                      │
│     • Two-factor authentication (OTP)                       │
│     • Password hashing (bcrypt)                              │
├─────────────────────────────────────────────────────────────┤
│  4. Data Security                                            │
│     • SQL injection prevention (TypeORM)                    │
│     • Parameterized queries                                  │
│     • Sensitive data encryption                              │
│     • Audit logging                                          │
├─────────────────────────────────────────────────────────────┤
│  5. Payment Security                                         │
│     • PayFast signature verification                        │
│     • ITN callback validation                                │
│     • Transaction ID tracking                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication System

### JWT Token Authentication

| Feature | Implementation |
|---------|----------------|
| Access Token | Short-lived (1 hour default) |
| Refresh Token | Long-lived (7 days default) |
| Token Storage | HTTP-only cookies |
| Token Refresh | Automatic refresh flow |

### Password Security

| Feature | Implementation |
|---------|----------------|
| Hashing Algorithm | bcrypt |
| Salt Rounds | 12 |
| Requirements | Min 8 chars, uppercase, lowercase, number |
| Reset Flow | OTP-based password reset |

### Two-Factor Authentication (2FA)

| Feature | Implementation |
|---------|----------------|
| OTP Delivery | Email via Gmail API |
| OTP Length | 6 digits |
| OTP Expiry | 2 minutes |
| Single Use | Each OTP can only be used once |

### Google OAuth 2.0 Authentication (v3.4.0)

| Feature | Implementation |
|---------|----------------|
| OAuth Provider | Google Identity Services |
| Client Library | `@react-oauth/google` (Frontend), `google-auth-library` (Backend) |
| Token Type | ID Token (JWT) |
| Verification | Server-side ID token verification |
| Scope | `openid`, `email`, `profile` |
| OTP Skip | Google users skip 2FA (Google provides own 2FA) |

**Google OAuth Security Flow:**

1. User clicks "Sign in with Google" button
2. Google Identity Services popup opens
3. User authenticates with Google
4. Google returns ID token to frontend
5. Frontend sends ID token to backend
6. Backend verifies ID token using `google-auth-library`
7. Backend extracts user info (email, name, picture)
8. Backend creates/links user account
9. Backend issues JWT access/refresh tokens

**Google OAuth Configuration:**

- **Authorized JavaScript Origins**: Only verified domains allowed
- **Authorized Redirect URIs**: Secure callback URLs only
- **Client ID Validation**: ID token verified against expected client ID
- **Nonce Verification**: Prevents replay attacks
- **Issuer Verification**: Ensures token from Google (`accounts.google.com`)

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 3 attempts | 15 minutes |
| General API | 100 requests | 15 minutes |
| OTP Requests | 3 attempts | 5 minutes |

---

## Role-Based Access Control

### User Roles

| Role | Permissions |
|------|-------------|
| **Admin (Parent)** | Full access, manage child admins |
| **Full Admin** | Full access except delete parent records |
| **Custom Admin** | Granular permissions per feature |
| **Viewer Admin** | View-only access, all actions disabled |
| **Doctor** | Full user features, profile, leaderboard |
| **Employee** | Order management only |
| **Regular User** | Orders and view research only |

### Permission Types

```
Full Admin      → All features enabled
Custom Admin    → Selected features enabled
Viewer Admin    → All features (view-only)
```

---

## Input Validation

### Backend Validation

- Request body validation with TypeScript
- Query parameter sanitization
- File upload validation (type, size)
- SQL injection prevention via TypeORM

### Frontend Validation

- Form validation with React Hook Form
- Input sanitization with DOMPurify
- Type checking with TypeScript

### File Upload Security

| File Type | Max Size | Validation |
|-----------|----------|------------|
| Images | 10MB | MIME type check |
| Videos | 50MB | MIME type check |
| PDFs | 10MB | MIME type check |

---

## Security Headers

Implemented via Helmet middleware:

```javascript
// Headers configured
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security
Referrer-Policy: strict-origin-when-cross-origin
```

---

## CORS Configuration

```javascript
// Production CORS settings
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

---

## Payment Security

### PayFast Integration

| Feature | Implementation |
|---------|----------------|
| Signature Verification | MD5 hash with passphrase |
| ITN Validation | Server-to-server verification |
| Amount Validation | Match expected vs received |
| Transaction Tracking | Unique transaction IDs |
| Environment Separation | Sandbox vs Production |

### Payment Flow Security

1. Generate payment with server-side signature
2. User redirected to PayFast
3. PayFast sends ITN to backend
4. Backend validates signature and amount
5. Order status updated only after validation

---

## Database Security

### SQL Injection Prevention

- TypeORM parameterized queries
- No raw SQL with user input
- Entity validation before save

### Data Protection

| Data Type | Protection |
|-----------|------------|
| Passwords | bcrypt hashed |
| Tokens | Hashed or encrypted |
| PII | Access controlled by role |

---

## Audit Logging

### Logged Actions

- User authentication (login, logout, failed attempts)
- Admin actions (user management, approvals)
- Order operations (create, update, delete)
- Payment transactions
- Permission changes

### Log Format

```
[timestamp] [level] [userId] [action] [details] [ip]
```

---

## Email Security

### Gmail API Integration (v3.4.0)

**Primary: Gmail API with OAuth 2.0**

| Feature | Implementation |
|---------|----------------|
| Authentication | OAuth 2.0 with refresh tokens |
| Scope | `https://www.googleapis.com/auth/gmail.send` |
| Token Refresh | Automatic refresh token rotation |
| Credential Storage | Environment variables (encrypted at rest) |
| Rate Limiting | Gmail API quota management |
| Retry Mechanism | Exponential backoff with jitter |

**Fallback: SMTP with App Password**

| Feature | Implementation |
|---------|----------------|
| Protocol | TLS-encrypted SMTP |
| Authentication | Gmail App Password (2FA required) |
| Port | 587 (TLS) |
| Fallback Trigger | Gmail API failure |

**Email Security Features:**

- OAuth 2.0 refresh token stored securely
- Refresh tokens never exposed to frontend
- Email quota tracking to prevent abuse
- Failed emails logged for retry
- Email tracking with unique IDs

### Email Deliverability

- List-Unsubscribe headers (RFC 2369)
- One-click unsubscribe (RFC 8058)
- Batch sending with delays
- CAN-SPAM and GDPR compliance

### Navigation Protection (v3.4.0)

| Feature | Implementation |
|---------|----------------|
| Protected Routes | Authentication required for sensitive pages |
| Redirect Behavior | Unauthenticated users redirected to login |
| Session Validation | JWT token verification on protected routes |
| Doctor-only Features | Role-based access for doctor features |

---

## Security Checklist

### Deployment

- [ ] HTTPS enabled (SSL/TLS)
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] JWT secrets are strong (64+ chars)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Error messages don't leak info

### Code

- [ ] No hardcoded credentials
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] File uploads validated

### Authentication

- [ ] Passwords properly hashed
- [ ] JWT tokens secure and short-lived
- [ ] 2FA enabled for admins
- [ ] Session management secure
- [ ] Password reset flow secure
- [ ] Google OAuth configured correctly
- [ ] Google Client ID verified
- [ ] Gmail API OAuth credentials secured

### Monitoring

- [ ] Audit logging enabled
- [ ] Failed login monitoring
- [ ] Error tracking configured
- [ ] Security alerts configured

---

## Vulnerability Management

### Dependencies

- Regular `npm audit` checks
- Dependabot alerts enabled
- Critical updates applied promptly
- Node.js LTS version used

### Testing

- Security testing in CI/CD
- Regular penetration testing (recommended)
- Code review for security issues

---

## Incident Response

### Steps

1. Identify and contain the incident
2. Assess the scope and impact
3. Preserve evidence for analysis
4. Remediate the vulnerability
5. Notify affected parties if required
6. Document and review

### Contacts

- Security issues: Report via GitHub security advisories
- Urgent issues: Contact admin immediately

---

## Best Practices

### For Developers

- Never commit secrets to git
- Use environment variables
- Validate all user input
- Follow principle of least privilege
- Keep dependencies updated

### For Administrators

- Use strong, unique passwords
- Enable 2FA for all admin accounts
- Review audit logs regularly
- Rotate credentials periodically
- Monitor for suspicious activity

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Document Version**: 3.4.0  
**Last Updated**: January 31, 2026
