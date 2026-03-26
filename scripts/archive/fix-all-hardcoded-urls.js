#!/usr/bin/env node

/**
 * Comprehensive Script to Fix All Hardcoded URLs
 * 
 * This script automatically finds and replaces all hardcoded URLs with
 * centralized configuration functions.
 * 
 * Usage: node scripts/fix-all-hardcoded-urls.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BACKEND_DIR = path.join(__dirname, '../backend/src');
const FRONTEND_DIR = path.join(__dirname, '../frontend/src');

// Patterns to find and their replacements
const BACKEND_PATTERNS = [
  // Pattern: process.env.FRONTEND_URL || 'http://localhost:3000'
  {
    pattern: /process\.env\.FRONTEND_URL\s*\|\|\s*['"](http:\/\/localhost:3000|https?:\/\/[^'"]+)['"]/g,
    replacement: (match, url) => {
      if (url.includes('/')) {
        const pathMatch = url.match(/\/[^'"]+/);
        if (pathMatch) {
          return `getFrontendUrlWithPath('${pathMatch[0]}')`;
        }
      }
      return 'getFrontendUrl()';
    },
    import: "import { getFrontendUrl, getFrontendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
  // Pattern: 'http://localhost:3000' or "http://localhost:3000"
  {
    pattern: /['"]http:\/\/localhost:3000(\/[^'"]*)?['"]/g,
    replacement: (match, pathPart) => {
      if (pathPart) {
        return `getFrontendUrlWithPath('${pathPart}')`;
      }
      return 'getFrontendUrl()';
    },
    import: "import { getFrontendUrl, getFrontendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
  // Pattern: process.env.BACKEND_URL || 'http://localhost:4000'
  {
    pattern: /process\.env\.BACKEND_URL\s*\|\|\s*['"]http:\/\/localhost:4000(\/[^'"]*)?['"]/g,
    replacement: (match, pathPart) => {
      if (pathPart) {
        return `getBackendUrlWithPath('${pathPart}')`;
      }
      return 'getBackendUrl()';
    },
    import: "import { getBackendUrl, getBackendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
  // Pattern: 'http://localhost:4000' or "http://localhost:4000"
  {
    pattern: /['"]http:\/\/localhost:4000(\/[^'"]*)?['"]/g,
    replacement: (match, pathPart) => {
      if (pathPart) {
        return `getBackendUrlWithPath('${pathPart}')`;
      }
      return 'getBackendUrl()';
    },
    import: "import { getBackendUrl, getBackendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
  // Pattern: Template strings with localhost:3000
  {
    pattern: /\$\{([^}]*)\}\/\/localhost:3000(\/[^}]*)?/g,
    replacement: (match, prefix, pathPart) => {
      if (pathPart) {
        return `getFrontendUrlWithPath('${pathPart}')`;
      }
      return 'getFrontendUrl()';
    },
    import: "import { getFrontendUrl, getFrontendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
  // Pattern: Template strings with localhost:4000
  {
    pattern: /\$\{([^}]*)\}\/\/localhost:4000(\/[^}]*)?/g,
    replacement: (match, prefix, pathPart) => {
      if (pathPart) {
        return `getBackendUrlWithPath('${pathPart}')`;
      }
      return 'getBackendUrl()';
    },
    import: "import { getBackendUrl, getBackendUrlWithPath } from '../config/urlConfig';",
    context: 'backend'
  },
];

const FRONTEND_PATTERNS = [
  // Pattern: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
  {
    pattern: /process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*['"]http:\/\/localhost:4000\/api['"]/g,
    replacement: 'getApiUrl()',
    import: "import { getApiUrl } from '@/lib/apiConfig';",
    context: 'frontend'
  },
  // Pattern: 'http://localhost:4000/api'
  {
    pattern: /['"]http:\/\/localhost:4000\/api(\/[^'"]*)?['"]/g,
    replacement: (match, pathPart) => {
      if (pathPart) {
        return `getApiEndpoint('${pathPart}')`;
      }
      return 'getApiUrl()';
    },
    import: "import { getApiUrl, getApiEndpoint } from '@/lib/apiConfig';",
    context: 'frontend'
  },
  // Pattern: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
  {
    pattern: /process\.env\.NEXT_PUBLIC_FRONTEND_URL\s*\|\|\s*['"]http:\/\/localhost:3000['"]/g,
    replacement: "typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'",
    import: null, // No import needed
    context: 'frontend'
  },
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /urlConfig\.ts$/,  // Config file itself
  /apiConfig\.ts$/,  // Config file itself
  /getBackendUrl\.ts$/,  // Helper file itself
  /getApiUrl\.ts$/,  // Helper file itself
];

// Statistics
let stats = {
  filesProcessed: 0,
  filesModified: 0,
  replacements: 0,
  importsAdded: 0,
  errors: []
};

/**
 * Check if file should be excluded
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Get all TypeScript/JavaScript files recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file) && !shouldExclude(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Check if import already exists
 */
function hasImport(content, importStatement) {
  if (!importStatement) return false;
  const importName = importStatement.match(/import\s+\{([^}]+)\}/);
  if (!importName) return false;
  
  const names = importName[1].split(',').map(n => n.trim());
  const importRegex = new RegExp(`import\\s+.*\\{.*(${names.join('|')}).*\\}.*from`, 's');
  return importRegex.test(content);
}

/**
 * Add import if needed
 */
function addImport(content, importStatement, filePath) {
  if (!importStatement || hasImport(content, importStatement)) {
    return content;
  }
  
  // Find the last import statement
  const importRegex = /^import\s+.*$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    // Check if next line is empty or has content
    const afterImport = content.substring(insertIndex);
    const needsNewline = !afterImport.startsWith('\n\n');
    
    const newImport = needsNewline ? `\n${importStatement}` : `\n${importStatement}`;
    content = content.slice(0, insertIndex) + newImport + content.slice(insertIndex);
    stats.importsAdded++;
  } else {
    // No imports found, add at the top after any comments
    const commentRegex = /^(\/\/.*|\/\*[\s\S]*?\*\/)\n*/m;
    const commentMatch = content.match(commentRegex);
    const insertIndex = commentMatch ? commentMatch[0].length : 0;
    content = content.slice(0, insertIndex) + importStatement + '\n' + content.slice(insertIndex);
    stats.importsAdded++;
  }
  
  return content;
}

/**
 * Process a single file
 */
function processFile(filePath, patterns) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const neededImports = new Set();
    
    // Apply all patterns
    patterns.forEach(({ pattern, replacement, import: importStatement, context }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Check if this is the right context
        const isBackend = filePath.includes('backend');
        const isFrontend = filePath.includes('frontend');
        
        if ((context === 'backend' && isBackend) || (context === 'frontend' && isFrontend)) {
          // Replace matches
          if (typeof replacement === 'function') {
            content = content.replace(pattern, replacement);
          } else {
            content = content.replace(pattern, replacement);
          }
          
          modified = true;
          stats.replacements += matches.length;
          
          if (importStatement) {
            neededImports.add(importStatement);
          }
        }
      }
    });
    
    // Add imports
    neededImports.forEach(importStatement => {
      content = addImport(content, importStatement, filePath);
    });
    
    // Write file if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
    stats.filesProcessed++;
    return modified;
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Searching for hardcoded URLs...\n');
  
  // Get all files
  const backendFiles = getAllFiles(BACKEND_DIR);
  const frontendFiles = getAllFiles(FRONTEND_DIR);
  
  console.log(`Found ${backendFiles.length} backend files`);
  console.log(`Found ${frontendFiles.length} frontend files\n`);
  
  // Process backend files
  console.log('📝 Processing backend files...');
  backendFiles.forEach(file => {
    processFile(file, BACKEND_PATTERNS);
  });
  
  // Process frontend files
  console.log('\n📝 Processing frontend files...');
  frontendFiles.forEach(file => {
    processFile(file, FRONTEND_PATTERNS);
  });
  
  // Print statistics
  console.log('\n' + '='.repeat(50));
  console.log('📊 Statistics:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Replacements made: ${stats.replacements}`);
  console.log(`   Imports added: ${stats.importsAdded}`);
  console.log(`   Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }
  
  console.log('\n✅ Done!');
  console.log('\n⚠️  Please review the changes and test your application.');
  console.log('   Some manual fixes may be needed for complex cases.');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, getAllFiles };

