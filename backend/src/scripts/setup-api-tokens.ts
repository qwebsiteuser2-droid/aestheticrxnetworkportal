import { AppDataSource } from '../db/data-source';
import { APIToken } from '../entities/APIToken';
import crypto from 'crypto';

// Simple encryption/decryption functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'; // 32 characters
const ALGORITHM = 'aes-256-cbc';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = textParts.join(':');
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const defaultTokens = [
  {
    name: 'huggingface-main',
    display_name: 'Hugging Face Main Token',
    description: 'Primary Hugging Face API token for AI model access',
    provider: 'huggingface',
    token_value: process.env.HF_TOKEN || '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',
    is_active: true,
    is_default: true,
    metadata: {
      base_url: 'https://router.huggingface.co/v1/chat/completions',
      models: ['meta-llama/Meta-Llama-3-8B-Instruct:novita', 'meta-llama/Llama-3.1-8B-Instruct:fireworks-ai'],
      rate_limit: '20 requests per minute',
      features: ['chat', 'text-generation', 'streaming']
    }
  }
];

export async function setupAPITokens() {
  try {
    console.log('Setting up API tokens...');
    
    const apiTokenRepository = AppDataSource.getRepository(APIToken);
    
    // Clear existing tokens
    await apiTokenRepository.clear();
    console.log('Cleared existing API tokens');
    
    // Insert default tokens
    for (const tokenData of defaultTokens) {
      const token = apiTokenRepository.create({
        ...tokenData,
        token_value: encrypt(tokenData.token_value), // Encrypt the token
        is_valid: true // Assume valid initially
      });
      await apiTokenRepository.save(token);
      console.log(`Created API token: ${token.display_name}`);
    }
    
    console.log('API tokens setup completed successfully!');
  } catch (error: unknown) {
    console.error('Error setting up API tokens:', error);
    throw error;
  }
}

// Export encryption/decryption functions for use in other modules
export { encrypt, decrypt };

// Run if called directly
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await setupAPITokens();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
