# GitHub Actions CI/CD Pipeline - BioAestheticAx Network

**Date:** December 17, 2025  
**Status:** ✅ **CONFIGURED**

---

## 📋 Overview

GitHub Actions workflows have been set up to automatically run:
- **ESLint** - Code linting for both backend and frontend
- **TypeScript Type Checking** - Type safety verification
- **Code Formatting** - Prettier (frontend) and ESLint (backend)

---

## 🔧 Workflows

### 1. Main CI Pipeline (`ci.yml`)

**Location:** `.github/workflows/ci.yml`

**Jobs:**
1. **Backend ESLint** - Lints backend TypeScript code
2. **Backend Type Check** - TypeScript type checking for backend
3. **Backend Format Check** - ESLint auto-fix check
4. **Frontend ESLint** - Lints frontend TypeScript/React code
5. **Frontend Type Check** - TypeScript type checking for frontend
6. **Frontend Prettier Format Check** - Prettier formatting check
7. **All Checks Summary** - Summary of all checks

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

**Features:**
- Parallel execution for faster CI
- Node.js 20 with npm caching
- Separate jobs for each check type

---

### 2. Format Check (`format-check.yml`)

**Location:** `.github/workflows/format-check.yml`

**Purpose:** Dedicated formatting check using Prettier

**Checks:**
- Frontend code formatting (Prettier)
- Root files formatting (JSON, Markdown, YAML)

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches

---

### 3. Quick Lint & Type Check (`lint-and-type-check.yml`)

**Location:** `.github/workflows/lint-and-type-check.yml`

**Purpose:** Fast lint and type check using matrix strategy

**Features:**
- Matrix strategy for backend and frontend
- Runs ESLint and TypeScript type check
- Manual trigger available (`workflow_dispatch`)

**Triggers:**
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches
- Manual trigger (Actions tab → Run workflow)

---

## 🛠️ Tools Used

### Backend
- **ESLint** - Code linting and formatting
- **TypeScript** - Type checking
- **@typescript-eslint** - TypeScript ESLint rules

### Frontend
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **@typescript-eslint** - TypeScript ESLint rules
- **prettier-plugin-tailwindcss** - Tailwind CSS formatting

---

## 📝 Local Commands

### Backend
```bash
cd backend

# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# TypeScript type check
npm run type-check
```

### Frontend
```bash
cd frontend

# Run ESLint
npm run lint

# Auto-fix ESLint issues
npm run lint:fix

# TypeScript type check
npm run type-check

# Format code with Prettier
npm run format

# Check formatting (CI mode)
npm run format:check
```

---

## 🚀 Usage

### Automatic
Workflows run automatically on:
- Push to protected branches
- Pull requests

### Manual
1. Go to GitHub repository
2. Click "Actions" tab
3. Select workflow (e.g., "Lint & Type Check")
4. Click "Run workflow"
5. Select branch and click "Run workflow"

---

## ✅ Workflow Status

After pushing code, check the Actions tab in GitHub:
- ✅ Green checkmark = All checks passed
- ❌ Red X = One or more checks failed
- 🟡 Yellow circle = Workflow in progress

---

## 🔍 Viewing Results

1. **GitHub Actions Tab:**
   - Go to repository → Actions tab
   - Click on workflow run
   - View individual job results

2. **Pull Request:**
   - Checks appear at bottom of PR
   - Click "Details" to see full logs

3. **Commit Status:**
   - Green checkmark = Passed
   - Red X = Failed
   - Click to see details

---

## 📊 Workflow Performance

- **Parallel Execution:** All jobs run in parallel
- **Caching:** npm dependencies are cached
- **Average Runtime:** ~3-5 minutes for all checks

---

## 🐛 Troubleshooting

### Workflow Fails

1. **ESLint Errors:**
   ```bash
   cd backend  # or frontend
   npm run lint:fix
   ```

2. **TypeScript Errors:**
   ```bash
   cd backend  # or frontend
   npm run type-check
   ```

3. **Formatting Errors:**
   ```bash
   cd frontend
   npm run format
   ```

### Common Issues

- **Dependencies not found:** Run `npm ci` locally
- **Type errors:** Fix TypeScript errors in code
- **Formatting issues:** Run `npm run format` (frontend) or `npm run lint:fix` (backend)

---

## 📝 Notes

- Backend uses **ESLint** for both linting and formatting
- Frontend uses **Prettier** for formatting and **ESLint** for linting
- All workflows use Node.js 20
- npm dependencies are cached for faster runs

---

**Last Updated**: December 17, 2025

