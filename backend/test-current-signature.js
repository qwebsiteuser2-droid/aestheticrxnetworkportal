#!/usr/bin/env node

/**
 * Test current signature generation with the exact data from the logs
 */

const crypto = require('crypto');

// Exact data from the logs
const currentData = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  return_url: 'http://localhost:3000/order?payment=success',
  cancel_url: 'http://localhost:3000/order?payment=cancelled',
  notify_url: 'http://localhost:4000/api/payments/payfast/notify',
  name_first: 'Test',
  name_last: 'Customer',
  email_address: 'test@example.com',
  m_payment_id: 'ORD-1760854755426',
  amount: '100.00',
  item_name: 'Order #TEST-1760854755419',
  item_description: 'Test Product (Qty: 1) - Rs 100.00'
};

const passphrase = 'jt7NOE43FZPn';

/**
 * PHP urlencode() function - EXACT behavior
 */
function phpUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/%20/g, '+')
    .replace(/%([a-f0-9]{2})/g, (match, hex) => `%${hex.toUpperCase()}`);
}

/**
 * Generate signature using our current method
 */
function generateCurrentSignature(data) {
  // Define the EXACT order as per PayFast documentation
  const orderedFields = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description'
  ];
  
  let pfOutput = '';
  
  // Build parameter string in the EXACT order specified by PayFast
  for (const key of orderedFields) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      pfOutput += `${key}=${phpUrlEncode(String(value).trim())}&`;
    }
  }
  
  // Remove last ampersand
  const getString = pfOutput.slice(0, -1);
  
  // Add passphrase
  const stringToSign = `${getString}&passphrase=${phpUrlEncode(passphrase.trim())}`;
  
  // Generate MD5 hash
  const signature = crypto.createHash('md5').update(stringToSign).digest('hex');
  
  console.log('🔐 Current Signature Generation:');
  console.log('   Raw Output:', pfOutput);
  console.log('   Get String:', getString);
  console.log('   String to Sign:', stringToSign);
  console.log('   Passphrase (raw):', passphrase);
  console.log('   Passphrase (encoded):', phpUrlEncode(passphrase.trim()));
  console.log('   Generated Signature:', signature);
  
  return signature;
}

/**
 * Generate signature using EXACT PHP method from PayFast documentation
 */
function generatePHPSignature(data, passPhrase) {
  // Create parameter string
  let pfOutput = '';
  for (const key in data) {
    if (data[key] !== '') {
      pfOutput += key + '=' + phpUrlEncode(data[key].trim()) + '&';
    }
  }
  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);
  if (passPhrase !== null) {
    getString += '&passphrase=' + phpUrlEncode(passPhrase.trim());
  }
  return crypto.createHash('md5').update(getString).digest('hex');
}

// Test both methods
console.log('🧪 Testing Current Signature Generation');
console.log('=' .repeat(60));

const currentSignature = generateCurrentSignature(currentData);
console.log(`\nCurrent Method Signature: ${currentSignature}`);

const phpSignature = generatePHPSignature(currentData, passphrase);
console.log(`PHP Method Signature: ${phpSignature}`);

console.log(`\nMatch: ${currentSignature === phpSignature ? '✅ YES' : '❌ NO'}`);

// Test with minimal data
console.log('\n🧪 Testing with Minimal Data');
console.log('=' .repeat(60));

const minimalData = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '100.00',
  item_name: 'Test Product'
};

const minimalCurrentSignature = generateCurrentSignature(minimalData);
const minimalPHPSignature = generatePHPSignature(minimalData, passphrase);

console.log(`Minimal Current Signature: ${minimalCurrentSignature}`);
console.log(`Minimal PHP Signature: ${minimalPHPSignature}`);
console.log(`Minimal Match: ${minimalCurrentSignature === minimalPHPSignature ? '✅ YES' : '❌ NO'}`);

console.log('\n✅ Signature generation test completed!');
