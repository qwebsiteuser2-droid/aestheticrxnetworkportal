# TypeScript Guide

**BioAestheticAx Network B2B Medical Platform**

---

| Document Information | |
|---------------------|--|
| **Version** | 3.1.0 |
| **Last Updated** | January 22, 2026 |

---

This document consolidates all TypeScript error explanations and fixes.

## Table of Contents

1. [Understanding TypeScript Errors](#understanding-typescript-errors)
2. [Common Errors & Fixes](#common-errors--fixes)
3. [False Positive Errors](#false-positive-errors)
4. [Troubleshooting](#troubleshooting)

---

## Understanding TypeScript Errors

### Real vs False Positive Errors

TypeScript linter may report many errors, but **most are false positives** caused by:
- TypeScript language server not finding type definitions
- Module resolution issues
- IDE cache problems
- Separate TypeScript configs for frontend/backend

### How to Identify Real Errors

**Real Errors:**
- Syntax errors (missing brackets, parentheses)
- Type annotation errors (implicit `any` types)
- Missing type definitions in code
- Build failures

**False Positives:**
- "Cannot find module 'react'" (when module exists)
- "JSX element implicitly has type 'any'" (when React types are installed)
- Module resolution errors (when dependencies are installed)

---

## Common Errors & Fixes

### Error: Property 'includes' does not exist on type 'string[]'

**Problem:**
```typescript
const array = ['a', 'b', 'c'];
array.includes('a'); // Error: Property 'includes' does not exist
```

**Fix:**
Update `tsconfig.json` to include modern ES features:
```json
{
  "compilerOptions": {
    "lib": ["es2016", "es2017", "es2018", "es2019", "es2020", "dom"]
  }
}
```

### Error: Parameter implicitly has an 'any' type

**Problem:**
```typescript
array.map(item => item.name); // Error: Parameter 'item' implicitly has 'any' type
```

**Fix:**
Add explicit type annotation:
```typescript
array.map((item: ItemType) => item.name);
```

**Common Locations:**
- `onChange` handlers: `(e: React.ChangeEvent<HTMLInputElement>) => {}`
- `onClick` handlers: `(e: React.MouseEvent) => {}`
- `map` callbacks: `(item: ItemType) => {}`
- `filter` callbacks: `(item: ItemType) => {}`

### Error: Extra closing parenthesis

**Problem:**
```typescript
api.put(`/endpoint`, data).then(response => {
  // ...
}); // Extra closing parenthesis
```

**Fix:**
Remove extra closing parenthesis:
```typescript
api.put(`/endpoint`, data).then(response => {
  // ...
});
```

### Error: Using wrong response property

**Problem:**
```typescript
if (response.ok) { // Error: axios doesn't have 'ok' property
  // ...
}
```

**Fix:**
Use correct axios response property:
```typescript
if (response.data.success) {
  // ...
}
```

---

## False Positive Errors

### Module Resolution Errors

**Error:**
```
Cannot find module 'react' or its corresponding type declarations
Cannot find module 'next/navigation' or its corresponding type declarations
Cannot find module '@heroicons/react/24/outline' or its corresponding type declarations
```

**Cause:**
- TypeScript language server cannot find installed packages
- `node_modules` not installed
- TypeScript language server needs restart
- IDE cache is stale

**Solution:**
```bash
# Install dependencies
cd frontend
npm install

# Restart TypeScript server in IDE
# VS Code/Cursor: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### JSX Element Errors

**Error:**
```
JSX element implicitly has type 'any' because no interface 'JSX.IntrinsicElements' exists
```

**Cause:**
TypeScript cannot find React's JSX type definitions because it cannot resolve the `react` module.

**Solution:**
1. Install dependencies: `npm install`
2. Restart TypeScript server
3. Verify `@types/react` is installed

### Backend Module Errors

**Error:**
```
Cannot find module 'express'
Cannot find name 'process'
Cannot find name 'console'
```

**Cause:**
- Backend has separate TypeScript configuration
- Frontend TypeScript is checking backend files
- Backend types not loaded in frontend context

**Solution:**
- These are false positives if backend builds successfully
- Backend has its own `tsconfig.json` and `node_modules`
- Ignore these errors in frontend context

---

## Troubleshooting

### Step 1: Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

### Step 2: Restart TypeScript Server

**VS Code / Cursor:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

**Alternative:**
- Close and reopen IDE
- Reload window: `Ctrl+R` (or `Cmd+R` on Mac)

### Step 3: Verify Build

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
npm run build
```

**If build succeeds:**
- Code is correct
- Linter errors are false positives
- Restart TypeScript server to clear errors

**If build fails:**
- Fix the actual errors shown in build output
- Build errors are real, linter errors may be false positives

### Step 4: Check TypeScript Configuration

**Frontend `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "lib": ["es2016", "es2017", "es2018", "es2019", "es2020", "dom"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**Backend `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "types": ["node"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Step 5: Clear Cache

**Clear TypeScript Cache:**
```bash
# Delete TypeScript cache
rm -rf frontend/.next
rm -rf backend/dist
rm -rf node_modules/.cache
```

**Clear IDE Cache:**
- Close IDE
- Delete `.vscode` or IDE cache folder
- Reopen IDE

---

## Quick Reference

### Common Type Annotations

```typescript
// React Events
(e: React.ChangeEvent<HTMLInputElement>) => {}
(e: React.MouseEvent<HTMLButtonElement>) => {}
(e: React.FormEvent<HTMLFormElement>) => {}

// Array Methods
array.map((item: ItemType) => {})
array.filter((item: ItemType) => {})
array.reduce((acc: number, item: ItemType) => {}, 0)

// Callbacks
(callback: (value: string) => void) => {}
```

### TypeScript Configuration

**Essential Settings:**
- `"strict": true` - Enable strict type checking
- `"noImplicitAny": true` - Require explicit types
- `"skipLibCheck": true` - Skip type checking of declaration files
- `"esModuleInterop": true` - Enable ES module interop

---

## Related Documentation

- [Development Guide](./DEVELOPMENT.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [CI/CD Pipelines](./CI_CD_PIPELINES.md)

---

**Document Version**: 3.1.0  
**Last Updated**: January 22, 2026

