#!/usr/bin/env node

/**
 * Find ALL hardcoded URLs in the codebase
 * This script searches comprehensively for any hardcoded URLs
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '../backend/src');
const FRONTEND_DIR = path.join(__dirname, '../frontend/src');

const results = {
  localhost3000: [],
  localhost4000: [],
  railway: [],
  aestheticrxnetworkdepolying: [],
  processEnv: []
};

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

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Find localhost:3000
      if (/localhost:3000/.test(line) && !/getFrontendUrl|window\.location/.test(line)) {
        results.localhost3000.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
      
      // Find localhost:4000
      if (/localhost:4000/.test(line) && !/getApiUrl|getBackendUrl/.test(line)) {
        results.localhost4000.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
      
      // Find railway URLs
      if (/railway\.app/.test(line) && !/getApiUrl|getBackendUrl|urlConfig|apiConfig/.test(line)) {
        results.railway.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
      
      // Find aestheticrxnetworkdepolying
      if (/aestheticrxnetworkdepolying/.test(line) && !/getApiUrl|getBackendUrl|urlConfig|apiConfig/.test(line)) {
        results.aestheticrxnetworkdepolying.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
      
      // Find process.env with localhost fallback
      if (/process\.env\.(FRONTEND_URL|BACKEND_URL|NEXT_PUBLIC_API_URL).*\|\|.*localhost/.test(line)) {
        results.processEnv.push({
          file: filePath,
          line: index + 1,
          content: line.trim()
        });
      }
    });
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
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
      fileList.push(filePath);
    }
  });
  return fileList;
}

function main() {
  console.log('🔍 Searching for ALL hardcoded URLs...\n');
  
  const backendFiles = getAllFiles(BACKEND_DIR);
  const frontendFiles = getAllFiles(FRONTEND_DIR);
  
  console.log(`Scanning ${backendFiles.length} backend files...`);
  console.log(`Scanning ${frontendFiles.length} frontend files...\n`);
  
  [...backendFiles, ...frontendFiles].forEach(file => {
    searchInFile(file);
  });
  
  console.log('='.repeat(70));
  console.log('📊 RESULTS:\n');
  
  console.log(`🔴 localhost:3000 found: ${results.localhost3000.length}`);
  if (results.localhost3000.length > 0) {
    console.log('\nFirst 10 occurrences:');
    results.localhost3000.slice(0, 10).forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content.substring(0, 100)}...`);
    });
  }
  
  console.log(`\n🔴 localhost:4000 found: ${results.localhost4000.length}`);
  if (results.localhost4000.length > 0) {
    console.log('\nFirst 10 occurrences:');
    results.localhost4000.slice(0, 10).forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content.substring(0, 100)}...`);
    });
  }
  
  console.log(`\n🔴 railway.app found: ${results.railway.length}`);
  if (results.railway.length > 0) {
    console.log('\nFirst 10 occurrences:');
    results.railway.slice(0, 10).forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content.substring(0, 100)}...`);
    });
  }
  
  console.log(`\n🔴 aestheticrxnetworkdepolying found: ${results.aestheticrxnetworkdepolying.length}`);
  if (results.aestheticrxnetworkdepolying.length > 0) {
    console.log('\nFirst 10 occurrences:');
    results.aestheticrxnetworkdepolying.slice(0, 10).forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content.substring(0, 100)}...`);
    });
  }
  
  console.log(`\n🔴 process.env with localhost fallback: ${results.processEnv.length}`);
  if (results.processEnv.length > 0) {
    console.log('\nFirst 10 occurrences:');
    results.processEnv.slice(0, 10).forEach(({ file, line, content }) => {
      console.log(`  ${file}:${line}`);
      console.log(`    ${content.substring(0, 100)}...`);
    });
  }
  
  const total = results.localhost3000.length + results.localhost4000.length + 
                results.railway.length + results.aestheticrxnetworkdepolying.length + 
                results.processEnv.length;
  
  console.log('\n' + '='.repeat(70));
  console.log(`📈 TOTAL HARDCODED URLS FOUND: ${total}`);
  console.log('\n💾 Saving detailed report to scripts/hardcoded-urls-report.json...');
  
  fs.writeFileSync(
    path.join(__dirname, 'hardcoded-urls-report.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('✅ Report saved!');
}

if (require.main === module) {
  main();
}

module.exports = { searchInFile, getAllFiles };

