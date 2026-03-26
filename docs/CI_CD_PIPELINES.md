# CI/CD Pipelines

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |
| **Status** | ✅ Production Ready |

---

## Overview

GitHub Actions workflows automate code quality checks, testing, and deployment. All pipelines are configured in `.github/workflows/`.

---

## Workflow Files

| File | Purpose |
|------|---------|
| `ci.yml` | Main CI pipeline (lint, type-check) |
| `unit-tests.yml` | Unit test execution |
| `integration-tests.yml` | Integration tests |
| `e2e-tests.yml` | End-to-end tests |
| `security.yml` | Security scanning |
| `staging.yml` | Staging deployment |
| `database.yml` | Database migrations |
| `notifications.yml` | Slack/Email notifications |

---

## Main CI Pipeline

**File:** `.github/workflows/ci.yml`

### Jobs

| Job | Description |
|-----|-------------|
| Backend ESLint | Lints backend TypeScript code |
| Backend Type Check | TypeScript type verification |
| Frontend ESLint | Lints frontend React/TypeScript |
| Frontend Type Check | TypeScript type verification |
| Frontend Prettier | Code formatting check |

### Triggers

```yaml
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
```

### Features

- Parallel job execution
- Node.js 20 with npm caching
- Separate jobs per check type
- Summary job aggregates results

---

## Local Commands

### Backend

```bash
cd backend

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type check
npm run type-check
```

### Frontend

```bash
cd frontend

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type check
npm run type-check

# Format code
npm run format

# Check formatting
npm run format:check
```

---

## Pipeline Status

### GitHub Actions Tab

- ✅ Green checkmark = All checks passed
- ❌ Red X = Checks failed
- 🟡 Yellow circle = In progress

### Pull Requests

- Checks appear at bottom of PR
- Click "Details" for full logs
- Merge blocked until checks pass

---

## Workflow Configuration

### Example: CI Job

```yaml
jobs:
  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
```

---

## Manual Trigger

1. Go to repository → **Actions** tab
2. Select workflow
3. Click **Run workflow**
4. Select branch
5. Click **Run workflow**

---

## Troubleshooting

### ESLint Errors

```bash
cd backend  # or frontend
npm run lint:fix
```

### TypeScript Errors

```bash
cd backend  # or frontend
npm run type-check
```

### Formatting Issues

```bash
cd frontend
npm run format
```

### Dependencies Not Found

```bash
npm ci  # Clean install
```

---

## Performance

| Metric | Value |
|--------|-------|
| Parallel Jobs | Yes |
| npm Caching | Enabled |
| Average Runtime | 3-5 minutes |

---

## Security Scanning

**File:** `.github/workflows/security.yml`

- Dependency vulnerability scanning
- Code security analysis
- Secret detection

---

## Deployment Pipelines

### Staging

**File:** `.github/workflows/staging.yml`

- Deploys to staging environment
- Runs on push to `develop` branch
- Includes database migrations

### Production

Production deployment is manual via Railway and Vercel dashboards for safety.

---

## Best Practices

### Before Push

```bash
# Run all checks locally
npm run lint
npm run type-check
npm run format:check  # frontend only
```

### Commit Messages

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Code formatting
refactor: Code refactoring
test: Add tests
chore: Maintenance
```

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026
