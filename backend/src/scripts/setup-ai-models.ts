import { AppDataSource } from '../db/data-source';
import { AIModel } from '../entities/AIModel';

const defaultModels = [
  {
    name: 'llama-3.1-8b-instruct',
    display_name: 'Llama 3.1 8B Instruct',
    description: 'Meta Llama 3.1 8B Instruct model - Fast and efficient for general tasks',
    model_id: 'meta-llama/Meta-Llama-3-8B-Instruct:novita',
    is_active: true,
    is_default: true,
    max_tokens: 2000,
    temperature: 0.7,
    max_requests_per_minute: 20,
    provider: 'huggingface',
    metadata: {
      context_length: 8192,
      capabilities: ['text-generation', 'chat', 'reasoning'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
    }
  },
  {
    name: 'llama-3.1-8b-fireworks',
    display_name: 'Llama 3.1 8B (Fireworks)',
    description: 'Meta Llama 3.1 8B Instruct via Fireworks AI - Optimized for speed',
    model_id: 'meta-llama/Llama-3.1-8B-Instruct:fireworks-ai',
    is_active: true,
    is_default: false,
    max_tokens: 2000,
    temperature: 0.7,
    max_requests_per_minute: 30,
    provider: 'huggingface',
    metadata: {
      context_length: 8192,
      capabilities: ['text-generation', 'chat', 'reasoning'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      optimized_for: 'speed'
    }
  },
  {
    name: 'llama-3.1-70b-instruct',
    display_name: 'Llama 3.1 70B Instruct',
    description: 'Meta Llama 3.1 70B Instruct model - More powerful for complex tasks',
    model_id: 'meta-llama/Meta-Llama-3-70B-Instruct:novita',
    is_active: true,
    is_default: false,
    max_tokens: 4000,
    temperature: 0.7,
    max_requests_per_minute: 10,
    provider: 'huggingface',
    metadata: {
      context_length: 8192,
      capabilities: ['text-generation', 'chat', 'reasoning', 'analysis'],
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      optimized_for: 'quality'
    }
  }
];

export async function setupAIModels() {
  try {
    console.log('Setting up AI models...');
    
    const aiModelRepository = AppDataSource.getRepository(AIModel);
    
    // Clear existing models
    await aiModelRepository.clear();
    console.log('Cleared existing AI models');
    
    // Insert default models
    for (const modelData of defaultModels) {
      const model = aiModelRepository.create(modelData);
      await aiModelRepository.save(model);
      console.log(`Created AI model: ${model.display_name}`);
    }
    
    console.log('AI models setup completed successfully!');
  } catch (error: unknown) {
    console.error('Error setting up AI models:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  AppDataSource.initialize()
    .then(async () => {
      await setupAIModels();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
