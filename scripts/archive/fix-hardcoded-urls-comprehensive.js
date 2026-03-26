#!/usr/bin/env node

/**
 * Comprehensive Script to Fix All Hardcoded URLs
 * Searches for and fixes hardcoded URLs in template strings, HTML, and code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND_DIR = path.join(__dirname, '../backend/src');
const FRONTEND_DIR = path.join(__dirname, '../frontend/src');

// Statistics
let stats = {
  filesFound: [],
  filesModified: 0,
  replacements: 0,
  errors: []
};

// Exclude patterns
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
  return EXCLUDE.some(pattern => pattern.test(filePath));
}

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (shouldExclude(filePath)) return;
    
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      filePath.includes('backend') && stats.filesFound.push({ path: filePath, type: 'backend' });
      filePath.includes('frontend') && stats.filesFound.push({ path: filePath, type: 'frontend' });
      fileList.push(filePath);
    }
  });
  return fileList;
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const isBackend = filePath.includes('backend');
    const isFrontend = filePath.includes('frontend');
    
    // Pattern 1: Template strings with localhost:3000
    const template3000Pattern = /`([^`]*?)http:\/\/localhost:3000(\/[^`]*)?([^`]*?)`/g;
    if (template3000Pattern.test(content)) {
      content = content.replace(template3000Pattern, (match, before, pathPart, after) => {
        modified = true;
        stats.replacements++;
        if (isBackend) {
          if (pathPart) {
            return `\`${before}\${getFrontendUrlWithPath('${pathPart}')}${after}\``;
          }
          return `\`${before}\${getFrontendUrl()}${after}\``;
        } else {
          return `\`${before}\${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${after}\``;
        }
      });
    }
    
    // Pattern 2: Template strings with localhost:4000
    const template4000Pattern = /`([^`]*?)http:\/\/localhost:4000(\/[^`]*)?([^`]*?)`/g;
    if (template4000Pattern.test(content)) {
      content = content.replace(template4000Pattern, (match, before, pathPart, after) => {
        modified = true;
        stats.replacements++;
        if (isBackend) {
          if (pathPart) {
            return `\`${before}\${getBackendUrlWithPath('${pathPart}')}${after}\``;
          }
          return `\`${before}\${getBackendUrl()}${after}\``;
        } else {
          if (pathPart && pathPart.startsWith('/api')) {
            return `\`${before}\${getApiEndpoint('${pathPart.replace('/api', '')}')}${after}\``;
          }
          return `\`${before}\${getApiUrl()}${after}\``;
        }
      });
    }
    
    // Pattern 3: String literals with localhost:3000 (backend)
    if (isBackend) {
      const string3000Pattern = /(['"])([^'"]*?)http:\/\/localhost:3000(\/[^'"]*)?([^'"]*?)\1/g;
      if (string3000Pattern.test(content)) {
        content = content.replace(string3000Pattern, (match, quote, before, pathPart, after) => {
          modified = true;
          stats.replacements++;
          if (pathPart) {
            return `${quote}${before}\${getFrontendUrlWithPath('${pathPart}')}${after}${quote}`;
          }
          return `${quote}${before}\${getFrontendUrl()}${after}${quote}`;
        });
      }
    }
    
    // Pattern 4: String literals with localhost:4000
    const string4000Pattern = /(['"])([^'"]*?)http:\/\/localhost:4000(\/[^'"]*)?([^'"]*?)\1/g;
    if (string4000Pattern.test(content)) {
      content = content.replace(string4000Pattern, (match, quote, before, pathPart, after) => {
        modified = true;
        stats.replacements++;
        if (isBackend) {
          if (pathPart) {
            return `${quote}${before}\${getBackendUrlWithPath('${pathPart}')}${after}${quote}`;
          }
          return `${quote}${before}\${getBackendUrl()}${after}${quote}`;
        } else {
          if (pathPart && pathPart.startsWith('/api')) {
            return `${quote}${before}\${getApiEndpoint('${pathPart.replace('/api', '')}')}${after}${quote}`;
          }
          return `${quote}${before}\${getApiUrl()}${after}${quote}`;
        }
      });
    }
    
    // Pattern 5: href="http://localhost:3000/..."
    const hrefPattern = /href=["']http:\/\/localhost:3000(\/[^"']*)["']/g;
    if (hrefPattern.test(content)) {
      content = content.replace(hrefPattern, (match, pathPart) => {
        modified = true;
        stats.replacements++;
        if (isBackend) {
          return `href="\${getFrontendUrlWithPath('${pathPart}')}"`;
        } else {
          return `href="\${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}${pathPart}"`;
        }
      });
    }
    
    // Pattern 6: href="http://localhost:4000/..."
    const href4000Pattern = /href=["']http:\/\/localhost:4000(\/[^"']*)["']/g;
    if (href4000Pattern.test(content)) {
      content = content.replace(href4000Pattern, (match, pathPart) => {
        modified = true;
        stats.replacements++;
        if (isBackend) {
          return `href="\${getBackendUrlWithPath('${pathPart}')}"`;
        } else {
          if (pathPart.startsWith('/api')) {
            return `href="\${getApiEndpoint('${pathPart.replace('/api', '')}')}"`;
          }
          return `href="\${getApiUrl()}${pathPart}"`;
        }
      });
    }
    
    // Add imports if needed
    if (modified) {
      const needsBackendImport = isBackend && (
        content.includes('getFrontendUrl') || 
        content.includes('getBackendUrl') ||
        content.includes('getFrontendUrlWithPath') ||
        content.includes('getBackendUrlWithPath')
      );
      
      const needsFrontendImport = isFrontend && (
        content.includes('getApiUrl') ||
        content.includes('getApiEndpoint')
      );
      
      if (needsBackendImport && !content.includes("from '../config/urlConfig'") && !content.includes("from '@/config/urlConfig'")) {
        const importLine = "import { getFrontendUrl, getBackendUrl, getFrontendUrlWithPath, getBackendUrlWithPath } from '../config/urlConfig';";
        const lastImport = content.match(/^import\s+.*$/gm);
        if (lastImport) {
          const insertIndex = content.lastIndexOf(lastImport[lastImport.length - 1]) + lastImport[lastImport.length - 1].length;
          content = content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
        } else {
          content = importLine + '\n' + content;
        }
      }
      
      if (needsFrontendImport && !content.includes("from '@/lib/apiConfig'") && !content.includes("from '../lib/apiConfig'")) {
        const importLine = "import { getApiUrl, getApiEndpoint } from '@/lib/apiConfig';";
        const lastImport = content.match(/^import\s+.*$/gm);
        if (lastImport) {
          const insertIndex = content.lastIndexOf(lastImport[lastImport.length - 1]) + lastImport[lastImport.length - 1].length;
          content = content.slice(0, insertIndex) + '\n' + importLine + content.slice(insertIndex);
        } else {
          content = importLine + '\n' + content;
        }
      }
      
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error: ${filePath} - ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🔍 Comprehensive Hardcoded URL Fixer\n');
  console.log('Searching for hardcoded URLs in template strings, HTML, and code...\n');
  
  const backendFiles = getAllFiles(BACKEND_DIR);
  const frontendFiles = getAllFiles(FRONTEND_DIR);
  
  console.log(`Found ${backendFiles.length} backend files`);
  console.log(`Found ${frontendFiles.length} frontend files\n`);
  
  console.log('📝 Processing files...\n');
  
  [...backendFiles, ...frontendFiles].forEach(file => {
    processFile(file);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Results:');
  console.log(`   Files found: ${stats.filesFound.length}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Replacements: ${stats.replacements}`);
  console.log(`   Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }
  
  console.log('\n✅ Done!');
  console.log('\n⚠️  Please review changes and test your application.');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, getAllFiles };

