#!/usr/bin/env node

/**
 * Comprehensive URL Fixer - Handles all cases including template strings
 * This script intelligently finds and fixes hardcoded URLs
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../backend/src');
const FRONTEND_DIR = path.join(__dirname, '../frontend/src');

let stats = { processed: 0, fixed: 0, errors: [] };

const EXCLUDE = [
  /node_modules/,
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /urlConfig\.ts$/,
  /apiConfig\.ts$/,
  /getBackendUrl\.ts$/,
  /getApiUrl\.ts$/,
];

function shouldExclude(filePath) {
  return EXCLUDE.some(p => p.test(filePath));
}

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fp = path.join(dir, f);
    if (shouldExclude(fp)) return;
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) getAllFiles(fp, list);
    else if (/\.(ts|tsx|js|jsx)$/.test(f)) list.push(fp);
  });
  return list;
}

function addImport(content, importStmt, filePath) {
  if (!importStmt || content.includes(importStmt.split("from")[1])) return content;
  
  const imports = content.match(/^import\s+.*$/gm);
  if (imports && imports.length > 0) {
    const lastIdx = content.lastIndexOf(imports[imports.length - 1]);
    return content.slice(0, lastIdx + imports[imports.length - 1].length) + 
           '\n' + importStmt + content.slice(lastIdx + imports[imports.length - 1].length);
  }
  return importStmt + '\n' + content;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const isBackend = filePath.includes('backend');
    const isFrontend = filePath.includes('frontend');
    
    // Fix malformed nested template strings first
    content = content.replace(/\$\{typeof window !== 'undefined' \? window\.location\.origin : '\$\{typeof window !== 'undefined' \? window\.location\.origin : 'http:\/\/localhost:3000'\}'\}/g, 
      "typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'");
    
    // Backend patterns
    if (isBackend) {
      // Pattern: process.env.FRONTEND_URL || 'http://localhost:3000'
      if (/process\.env\.FRONTEND_URL\s*\|\|\s*['"]http:\/\/localhost:3000/.test(content)) {
        content = content.replace(/process\.env\.FRONTEND_URL\s*\|\|\s*['"]http:\/\/localhost:3000['"]/g, 'getFrontendUrl()');
        modified = true;
      }
      
      // Pattern: 'http://localhost:3000' or "http://localhost:3000"
      if (/['"]http:\/\/localhost:3000['"]/.test(content) && !/getFrontendUrl|window\.location/.test(content)) {
        content = content.replace(/['"]http:\/\/localhost:3000(\/[^'"]*)?['"]/g, (m, p) => {
          return p ? `getFrontendUrlWithPath('${p}')` : 'getFrontendUrl()';
        });
        modified = true;
      }
      
      // Pattern: Template strings
      if (/`[^`]*http:\/\/localhost:3000/.test(content)) {
        content = content.replace(/`([^`]*?)http:\/\/localhost:3000(\/[^`]*)?([^`]*?)`/g, (m, before, path, after) => {
          if (path) {
            return `\`${before}\${getFrontendUrlWithPath('${path}')}${after}\``;
          }
          return `\`${before}\${getFrontendUrl()}${after}\``;
        });
        modified = true;
      }
      
      // Pattern: process.env.BACKEND_URL || 'http://localhost:4000'
      if (/process\.env\.BACKEND_URL\s*\|\|\s*['"]http:\/\/localhost:4000/.test(content)) {
        content = content.replace(/process\.env\.BACKEND_URL\s*\|\|\s*['"]http:\/\/localhost:4000['"]/g, 'getBackendUrl()');
        modified = true;
      }
      
      // Pattern: 'http://localhost:4000'
      if (/['"]http:\/\/localhost:4000['"]/.test(content) && !/getBackendUrl/.test(content)) {
        content = content.replace(/['"]http:\/\/localhost:4000(\/[^'"]*)?['"]/g, (m, p) => {
          return p ? `getBackendUrlWithPath('${p}')` : 'getBackendUrl()';
        });
        modified = true;
      }
      
      // Add import
      if (modified && (content.includes('getFrontendUrl') || content.includes('getBackendUrl'))) {
        const importStmt = "import { getFrontendUrl, getBackendUrl, getFrontendUrlWithPath, getBackendUrlWithPath } from '../config/urlConfig';";
        content = addImport(content, importStmt, filePath);
      }
    }
    
    // Frontend patterns
    if (isFrontend) {
      // Pattern: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
      if (/process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"]http:\/\/localhost:4000\/api/.test(content)) {
        content = content.replace(/process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"]http:\/\/localhost:4000\/api['"]/g, 'getApiUrl()');
        modified = true;
      }
      
      // Pattern: 'http://localhost:4000/api'
      if (/['"]http:\/\/localhost:4000\/api/.test(content) && !/getApiUrl/.test(content)) {
        content = content.replace(/['"]http:\/\/localhost:4000\/api(\/[^'"]*)?['"]/g, (m, p) => {
          return p ? `getApiEndpoint('${p}')` : 'getApiUrl()';
        });
        modified = true;
      }
      
      // Pattern: Template strings with localhost:4000/api
      if (/`[^`]*http:\/\/localhost:4000\/api/.test(content)) {
        content = content.replace(/`([^`]*?)http:\/\/localhost:4000\/api(\/[^`]*)?([^`]*?)`/g, (m, before, path, after) => {
          if (path) {
            return `\`${before}\${getApiEndpoint('${path}')}${after}\``;
          }
          return `\`${before}\${getApiUrl()}${after}\``;
        });
        modified = true;
      }
      
      // Add import
      if (modified && (content.includes('getApiUrl') || content.includes('getApiEndpoint'))) {
        const importStmt = "import { getApiUrl, getApiEndpoint } from '@/lib/apiConfig';";
        content = addImport(content, importStmt, filePath);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.fixed++;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
    stats.processed++;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error: ${filePath} - ${error.message}`);
  }
}

function main() {
  console.log('🔍 Comprehensive URL Fixer\n');
  
  const backendFiles = getAllFiles(BACKEND_DIR);
  const frontendFiles = getAllFiles(FRONTEND_DIR);
  
  console.log(`Found ${backendFiles.length} backend files`);
  console.log(`Found ${frontendFiles.length} frontend files\n`);
  console.log('Processing...\n');
  
  [...backendFiles, ...frontendFiles].forEach(processFile);
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${stats.fixed} files fixed, ${stats.processed} processed`);
  if (stats.errors.length > 0) {
    console.log(`❌ Errors: ${stats.errors.length}`);
    stats.errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
  }
  console.log('\n✅ Done!');
}

if (require.main === module) main();

