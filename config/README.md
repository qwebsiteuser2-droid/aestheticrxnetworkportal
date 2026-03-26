# Config Directory

**Last Updated:** January 14, 2026

This directory contains configuration files and credentials.

## ⚠️ Security Notice

**IMPORTANT:** This directory may contain sensitive files:
- API keys
- Service account credentials
- OAuth client secrets

**DO NOT commit sensitive files to Git!**

Ensure `.gitignore` includes:
```
config/client_secret_*.json
config/*.key
config/*.pem
```

## 📋 Files

- `client_secret_*.json` - Google OAuth client secrets

## 📝 Notes

- Keep sensitive files out of version control
- Use environment variables when possible
- Rotate credentials regularly
- Never share credentials publicly

---

**Last Updated:** January 14, 2026

