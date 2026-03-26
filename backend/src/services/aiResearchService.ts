import axios from 'axios';
import { AppDataSource } from '../db/data-source';
import { AIModel } from '../entities/AIModel';
import { APITokenController } from '../controllers/apiTokenController';

interface AIResearchRequest {
  researchType: string;
  contentType: 'text' | 'diagram' | 'graph';
  userQuery: string;
  userId?: string;
  modelId?: number;
  options?: {
    improveText?: boolean;
    addReferences?: boolean;
  };
}

interface AIResearchResponse {
  success: boolean;
  content?: string;
  error?: string;
  quotaExceeded?: boolean;
  retryAfter?: number;
}

interface QuotaInfo {
  requestsThisMinute: number;
  lastResetTime: number;
  maxRequestsPerMinute: number;
}

class AIResearchService {
  private readonly API_URL = 'https://router.huggingface.co/v1/chat/completions';
  
  // In-memory quota tracking (in production, use Redis)
  private quotaTracker: Map<string, QuotaInfo> = new Map();

  private async getAIModel(modelId?: number): Promise<AIModel> {
    const aiModelRepository = AppDataSource.getRepository(AIModel);
    
    if (modelId) {
      const model = await aiModelRepository.findOne({
        where: { id: modelId, is_active: true }
      });
      if (model) return model;
    }
    
    // Fallback to default model
    const defaultModel = await aiModelRepository.findOne({
      where: { is_default: true, is_active: true }
    });
    
    if (!defaultModel) {
      throw new Error('No active AI model found');
    }
    
    return defaultModel;
  }

  private async getAPIToken(): Promise<string> {
    const token = await APITokenController.getActiveToken('huggingface');
    if (!token) {
      throw new Error('No active Hugging Face API token found');
    }
    return token;
  }

  private getQuotaInfo(userId: string = 'default', maxRequestsPerMinute: number = 20): QuotaInfo {
    const now = Date.now();
    const quota = this.quotaTracker.get(userId);
    
    // Reset quota if a minute has passed
    if (!quota || (now - quota.lastResetTime) >= 60000) {
      const newQuota: QuotaInfo = {
        requestsThisMinute: 0,
        lastResetTime: now,
        maxRequestsPerMinute: maxRequestsPerMinute
      };
      this.quotaTracker.set(userId, newQuota);
      return newQuota;
    }
    
    return quota;
  }

  // Clean up old quota entries to prevent memory leaks
  private cleanupQuotaTracker(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (const [userId, quota] of this.quotaTracker.entries()) {
      if (quota.lastResetTime < oneHourAgo) {
        this.quotaTracker.delete(userId);
      }
    }
  }

  private canMakeRequest(userId: string = 'default', maxRequestsPerMinute: number = 20): boolean {
    const quota = this.getQuotaInfo(userId, maxRequestsPerMinute);
    return quota.requestsThisMinute < quota.maxRequestsPerMinute;
  }

  private incrementRequestCount(userId: string = 'default'): void {
    const quota = this.getQuotaInfo(userId);
    quota.requestsThisMinute++;
    this.quotaTracker.set(userId, quota);
  }

  private getRetryAfterSeconds(userId: string = 'default'): number {
    const quota = this.getQuotaInfo(userId);
    const timeSinceReset = Date.now() - quota.lastResetTime;
    const timeUntilReset = 60000 - timeSinceReset;
    return Math.ceil(timeUntilReset / 1000);
  }

  private buildPrompt(request: AIResearchRequest): string {
    const { researchType, contentType, userQuery, options } = request;
    
    let systemPrompt = `You are an AI research assistant specialized in ${researchType}. `;
    
    switch (contentType) {
      case 'text':
        systemPrompt += `Generate comprehensive research content including abstract, methodology, findings, and conclusions. `;
        break;
      case 'diagram':
        systemPrompt += `Generate detailed descriptions for research diagrams and visual representations. `;
        break;
      case 'graph':
        systemPrompt += `Generate data analysis and graph interpretations for research. `;
        break;
    }
    
    // Add options-based instructions
    if (options) {
      if (options.improveText) {
        systemPrompt += `IMPORTANT: The user wants you to improve existing text. Focus on enhancing clarity, structure, grammar, and academic quality. Make the content more professional and well-organized. `;
      }
      
      if (options.addReferences) {
        systemPrompt += `IMPORTANT: Include relevant references and citations in your response. Use proper academic citation format (APA style preferred). Add credible sources that support your points. `;
      }
    }
    
    systemPrompt += `Provide well-structured, academic-quality content that follows research standards.`;
    
    return systemPrompt;
  }

  async generateResearchContent(request: AIResearchRequest): Promise<AIResearchResponse> {
    try {
      // Get the AI model and API token
      let aiModel: AIModel;
      try {
        aiModel = await this.getAIModel(request.modelId);
      } catch (error: any) {
        console.error('Error getting AI model:', error);
        return {
          success: false,
          error: 'No active AI model found. Please contact administrator to configure AI models.'
        };
      }

      let apiToken: string;
      try {
        apiToken = await this.getAPIToken();
        if (!apiToken) {
          return {
            success: false,
            error: 'No active Hugging Face API token found. Please contact administrator to configure API tokens.'
          };
        }
      } catch (error: any) {
        console.error('Error getting API token:', error);
        return {
          success: false,
          error: 'Failed to retrieve API token. Please contact administrator.'
        };
      }
      
      // Check quota before making request
      if (!this.canMakeRequest(request.userId, aiModel.max_requests_per_minute)) {
        const retryAfter = this.getRetryAfterSeconds(request.userId);
        return {
          success: false,
          quotaExceeded: true,
          retryAfter,
          error: `API quota exceeded. Please wait ${retryAfter} seconds before making another request.`
        };
      }

      // Increment request count
      this.incrementRequestCount(request.userId);

      const systemPrompt = this.buildPrompt(request);
      
      // Ensure all numeric fields are properly typed as numbers, not strings
      const maxTokens = typeof aiModel.max_tokens === 'number' 
        ? aiModel.max_tokens 
        : parseInt(String(aiModel.max_tokens || 2000), 10);
      
      const temperature = typeof aiModel.temperature === 'number'
        ? aiModel.temperature
        : parseFloat(String(aiModel.temperature || 0.7));
      
      const payload = {
        model: aiModel.model_id,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: request.userQuery
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false  // Disable streaming for regular requests
      };

      const response = await axios.post(this.API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content;
        
        return {
          success: true,
          content: this.formatResearchContent(content, request.contentType)
        };
      } else {
        throw new Error('Invalid response format from AI service');
      }

    } catch (error: any) {
      console.error('AI Research Service Error:', error);
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        // Rate limit exceeded
        const retryAfter = this.getRetryAfterSeconds(request.userId);
        return {
          success: false,
          quotaExceeded: true,
          retryAfter,
          error: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
        };
      }
      
      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Invalid API token. Please contact administrator to verify API token configuration.'
        };
      }
      
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'AI model not found. Please contact administrator to configure AI models.'
        };
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Request timeout. The AI service is taking too long to respond. Please try again.'
        };
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Cannot connect to AI service. Please check your internet connection and try again.'
        };
      }
      
      // Provide more specific error message from API if available
      const apiError = error.response?.data?.error?.message || error.response?.data?.error || error.message;
      
      return {
        success: false,
        error: apiError || 'Failed to connect to AI service. Please try again later.'
      };
    }
  }

  async generateStreamingContent(request: AIResearchRequest, res: any): Promise<void> {
    let responseStarted = false;
    
    console.log('=== Starting streaming content generation ===');
    console.log('Request:', {
      researchType: request.researchType,
      contentType: request.contentType,
      userQuery: request.userQuery?.substring(0, 50) + '...',
      modelId: request.modelId,
      userId: request.userId
    });
    
    try {
      // Clean up old quota entries periodically
      this.cleanupQuotaTracker();
      
      // Get the AI model and API token
      let aiModel: AIModel;
      try {
        console.log('Fetching AI model...');
        aiModel = await this.getAIModel(request.modelId);
        console.log('AI Model retrieved:', {
          id: aiModel.id,
          name: aiModel.name,
          model_id: aiModel.model_id,
          is_active: aiModel.is_active,
          is_default: aiModel.is_default
        });
      } catch (error: any) {
        console.error('❌ Error getting AI model:', error);
        console.error('Error stack:', error.stack);
        if (!responseStarted) {
          res.status(500).json({
            success: false,
            error: 'No active AI model found. Please contact administrator to configure AI models.'
          });
        }
        return;
      }

      let apiToken: string;
      try {
        console.log('Fetching API token...');
        apiToken = await this.getAPIToken();
        if (!apiToken) {
          console.error('❌ No API token returned from getAPIToken()');
          if (!responseStarted) {
            res.status(500).json({
              success: false,
              error: 'No active Hugging Face API token found. Please contact administrator to configure API tokens.'
            });
          }
          return;
        }
        console.log('API Token retrieved:', {
          hasToken: !!apiToken,
          tokenLength: apiToken.length,
          tokenPreview: apiToken.substring(0, 10) + '...' + apiToken.substring(apiToken.length - 4)
        });
      } catch (error: any) {
        console.error('❌ Error getting API token:', error);
        console.error('Error stack:', error.stack);
        if (!responseStarted) {
          res.status(500).json({
            success: false,
            error: 'Failed to retrieve API token. Please contact administrator.'
          });
        }
        return;
      }
      
      // Check quota before making request
      if (!this.canMakeRequest(request.userId, aiModel.max_requests_per_minute)) {
        const retryAfter = this.getRetryAfterSeconds(request.userId);
        if (!responseStarted) {
        res.status(429).json({
          success: false,
          quotaExceeded: true,
          retryAfter,
          error: `API quota exceeded. Please wait ${retryAfter} seconds before making another request.`
        });
        }
        return;
      }

      // Increment request count
      this.incrementRequestCount(request.userId);

      const systemPrompt = this.buildPrompt(request);
      
      // Ensure all numeric fields are properly typed as numbers, not strings
      const maxTokens = typeof aiModel.max_tokens === 'number' 
        ? aiModel.max_tokens 
        : parseInt(String(aiModel.max_tokens || 2000), 10);
      
      const temperature = typeof aiModel.temperature === 'number'
        ? aiModel.temperature
        : parseFloat(String(aiModel.temperature || 0.7));

      const payload = {
        model: aiModel.model_id,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: request.userQuery
          }
        ],
        max_tokens: maxTokens,
        temperature: temperature,
        stream: true
      };

      console.log('Sending payload to HuggingFace:', {
        model: payload.model,
        max_tokens: payload.max_tokens,
        temperature: payload.temperature,
        temperature_type: typeof payload.temperature,
        max_tokens_type: typeof payload.max_tokens,
        stream: payload.stream
      });

      console.log('Making streaming request to HuggingFace:', {
        url: this.API_URL,
        model: aiModel.model_id,
        hasToken: !!apiToken,
        tokenLength: apiToken?.length,
        payloadKeys: Object.keys(payload)
      });

      let streamEnded = false;
      let firstChunk = true;
      let errorBuffer = '';

      const response = await axios.post(this.API_URL, payload, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream',
        timeout: 60000, // Increased timeout for streaming
        validateStatus: () => true // Accept all status codes to handle errors in stream
      });

      console.log('HuggingFace response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      // Check response status before starting stream
      if (response.status !== 200) {
        let errorData = '';
        response.data.on('data', (chunk: Buffer) => {
          errorData += chunk.toString();
        });
        response.data.on('end', () => {
          try {
            const parsed = JSON.parse(errorData);
            console.error('HuggingFace API Error Response:', {
              status: response.status,
              error: parsed
            });
            if (!responseStarted) {
              res.status(response.status).json({
                success: false,
                error: parsed.error?.message || parsed.error || parsed.message || 'Failed to generate streaming content'
              });
            }
          } catch (e) {
            console.error('Error parsing error response:', e);
            if (!responseStarted) {
              res.status(response.status || 500).json({
                success: false,
                error: errorData || 'Failed to generate streaming content'
              });
            }
          }
        });
        response.data.on('error', (streamError: Error) => {
          console.error('Error reading error response:', streamError);
          if (!responseStarted) {
            res.status(500).json({
              success: false,
              error: 'Failed to read error response from AI service'
            });
          }
        });
        return;
      }

      responseStarted = true;

      // Stream the response
      response.data.on('data', (chunk: Buffer) => {
        if (streamEnded) return;
        
        try {
          const chunkStr = chunk.toString();
          
          // Check if first chunk is an error (non-streaming JSON response)
          if (firstChunk) {
            firstChunk = false;
            errorBuffer += chunkStr;
            
            // Try to parse as JSON to check if it's an error response
            try {
              const parsed = JSON.parse(chunkStr);
              if (parsed.error || parsed.message) {
                console.error('HuggingFace API returned error in first chunk:', parsed);
                if (!streamEnded) {
                  streamEnded = true;
                  const errorMsg = parsed.error?.message || parsed.error || parsed.message || 'Failed to generate streaming content';
                  res.write(`[Error: ${errorMsg}]`);
                  res.end();
                }
                return;
              }
            } catch (e) {
              // Not JSON, continue with streaming
              errorBuffer = '';
            }
          }
          
          const lines = chunkStr.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            
          if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
            if (data === '[DONE]') {
                if (!streamEnded) {
                  streamEnded = true;
              res.end();
                }
              return;
            }
              
            try {
              const parsed = JSON.parse(data);
                
                // Check for error in parsed data
                if (parsed.error) {
                  console.error('Error in streaming response:', parsed.error);
                  if (!streamEnded) {
                    streamEnded = true;
                    const errorMsg = parsed.error.message || parsed.error || 'Failed to generate streaming content';
                    res.write(`\n\n[Error: ${errorMsg}]`);
                    res.end();
                  }
                  return;
                }
                
                if (parsed.choices && parsed.choices[0]) {
                  // Handle delta content (streaming)
                  if (parsed.choices[0].delta && parsed.choices[0].delta.content) {
                res.write(parsed.choices[0].delta.content);
              }
                  // Handle message content (non-streaming fallback)
                  else if (parsed.choices[0].message && parsed.choices[0].message.content) {
                    res.write(parsed.choices[0].message.content);
                  }
                }
              } catch (parseError: unknown) {
              // Ignore parsing errors for incomplete chunks
                // This is normal for streaming responses
            }
            } else if (line.startsWith('error:') || line.includes('"error"')) {
              // Handle error lines
              console.error('Streaming error line detected:', line);
              if (!streamEnded) {
                streamEnded = true;
                try {
                  const errorParsed = JSON.parse(line);
                  const errorMsg = errorParsed.error?.message || errorParsed.error || line;
                  res.write(`\n\n[Error: ${errorMsg}]`);
                } catch (e) {
                  res.write(`\n\n[Error: ${line}]`);
                }
                res.end();
              }
              return;
            }
          }
        } catch (chunkError: unknown) {
          console.error('Error processing chunk:', chunkError);
          // Continue processing other chunks
        }
      });

      response.data.on('end', () => {
        if (!streamEnded) {
          streamEnded = true;
        res.end();
        }
      });

      response.data.on('error', (error: Error) => {
        console.error('Streaming data error:', error);
        if (!streamEnded) {
          streamEnded = true;
          try {
            res.write(`\n\n[Error: ${error.message}]`);
            res.end();
          } catch (e) {
            // Response may already be closed
            console.error('Error writing error to response:', e);
          }
        }
      });

      // Handle request timeout
      response.data.on('timeout', () => {
        console.error('Streaming timeout');
        if (!streamEnded) {
          streamEnded = true;
          try {
            res.write('\n\n[Error: Request timeout]');
            res.end();
          } catch (e) {
            console.error('Error handling timeout:', e);
          }
        }
      });

    } catch (error: any) {
      console.error('AI Research Streaming Service Error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        response: error.response?.status,
        responseData: error.response?.data,
        responseHeaders: error.response?.headers
      });
      
      // Check if this is an axios error with response
      if (error.response) {
        console.error('Axios response error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      if (!responseStarted) {
        // Check if response headers have been sent
        if (!res.headersSent) {
          // Handle specific error cases
          if (error.response?.status === 401) {
            res.status(401).json({
              success: false,
              error: 'Invalid API token. Please contact administrator to verify API token configuration.'
            });
          } else if (error.response?.status === 429) {
            res.status(429).json({
              success: false,
              error: 'Rate limit exceeded. Please try again later.'
            });
          } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            res.status(504).json({
              success: false,
              error: 'Request timeout. The AI service is taking too long to respond.'
            });
          } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            res.status(503).json({
              success: false,
              error: 'Cannot connect to AI service. Please check your internet connection and try again.'
            });
          } else {
            // Try to extract more detailed error information
            let apiError = 'Failed to generate streaming content. Please try again later.';
            
            if (error.response?.data) {
              if (typeof error.response.data === 'string') {
                try {
                  const parsed = JSON.parse(error.response.data);
                  apiError = parsed.error?.message || parsed.error || parsed.message || apiError;
                } catch (e) {
                  apiError = error.response.data || apiError;
                }
              } else if (error.response.data.error) {
                apiError = error.response.data.error.message || error.response.data.error || apiError;
              } else if (error.response.data.message) {
                apiError = error.response.data.message;
              }
            } else if (error.message) {
              apiError = error.message;
            }
            
            console.error('Returning error to client:', apiError);
            res.status(error.response?.status || 500).json({
              success: false,
              error: apiError
            });
          }
        } else {
          console.error('Headers already sent, cannot send JSON error response');
        }
      } else {
        // Response already started, try to write error and end
        try {
          const errorMsg = error.message || error.response?.data?.error?.message || 'Failed to generate streaming content';
          res.write(`\n\n[Error: ${errorMsg}]`);
          res.end();
        } catch (e) {
          // Response may already be closed
          console.error('Error writing error to streaming response:', e);
        }
      }
    }
  }

  private formatResearchContent(content: string, contentType: string): string {
    // Add proper formatting based on content type
    let formattedContent = content;
    
    if (contentType === 'text') {
      // Ensure proper markdown formatting for research papers
      formattedContent = this.ensureMarkdownFormatting(content);
    }
    
    return formattedContent;
  }

  private ensureMarkdownFormatting(content: string): string {
    // Add markdown headers if not present
    if (!content.includes('#')) {
      content = `# AI-Generated Research Content\n\n${content}`;
    }
    
    // Ensure proper section formatting
    const sections = ['Abstract', 'Introduction', 'Methodology', 'Findings', 'Results', 'Discussion', 'Conclusion'];
    sections.forEach(section => {
      const regex = new RegExp(`(${section}[^#\n]*)`, 'gi');
      content = content.replace(regex, `## ${section}`);
    });
    
    return content;
  }

  // Get quota status for a user
  getQuotaStatus(userId: string = 'default'): { 
    requestsUsed: number; 
    requestsRemaining: number; 
    resetTime: number;
    canMakeRequest: boolean;
  } {
    const quota = this.getQuotaInfo(userId);
    return {
      requestsUsed: quota.requestsThisMinute,
      requestsRemaining: quota.maxRequestsPerMinute - quota.requestsThisMinute,
      resetTime: quota.lastResetTime + 60000,
      canMakeRequest: this.canMakeRequest(userId)
    };
  }

  // Reset quota for testing (admin only)
  resetQuota(userId: string = 'default'): void {
    this.quotaTracker.delete(userId);
  }
}

export default new AIResearchService();
