'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  XMarkIcon, 
  SparklesIcon, 
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface AIModel {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  model_id: string;
  is_active: boolean;
  is_default: boolean;
  max_tokens: number;
  temperature: number;
  max_requests_per_minute: number;
  provider?: string;
}

interface SideBySideAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertContent: (content: string) => void;
}

const SideBySideAIAssistant: React.FC<SideBySideAIAssistantProps> = ({
  isOpen,
  onClose,
  onInsertContent
}) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<{
    requestsUsed: number;
    requestsRemaining: number;
    resetTime: number;
    canMakeRequest: boolean;
  } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  
  const answerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch available AI models when component opens
  useEffect(() => {
    if (isOpen) {
      fetchModels();
    }
  }, [isOpen]);

  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      // Use centralized API instance
      const response = await api.get('/ai-models/active');
      
      if (response.data.success) {
        const activeModels = response.data.data?.models || response.data.models || [];
        setModels(activeModels);
        
        // Set default model if none selected
        if (!selectedModelId && activeModels.length > 0) {
          const defaultModel = activeModels.find((model: AIModel) => model.is_default);
          setSelectedModelId(defaultModel ? defaultModel.id : activeModels[0].id);
        } else if (activeModels.length === 0) {
          console.warn('No active AI models found. Please configure models in admin panel.');
          toast.error('No active AI models found. Please contact administrator.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch AI models' }));
        console.error('Failed to fetch AI models:', response.status, response.statusText, errorData);
        toast.error(errorData.message || 'Failed to fetch AI models');
      }
    } catch (error: unknown) {
      console.error('Error fetching AI models:', error);
      toast.error('Failed to load AI models. Please try again.');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isGenerating) return;

    setIsGenerating(true);
    setError('');
    setQuotaExceeded(false);
    setAnswer(''); // Clear previous answer
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      if (!token) {
        throw new Error('Authentication required - Please login first');
      }

      // Optimize request payload
      const requestPayload = {
        researchType: 'general',
        contentType: 'text',
        userQuery: question.trim(),
        modelId: selectedModelId || null
      };

      // Try streaming first, fallback to regular generation if it fails
      // Note: Streaming requires fetch, but we use centralized URL resolution
      let response;
      try {
        response = await fetch(`${apiUrl}/ai-research/generate-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestPayload),
          signal: abortControllerRef.current.signal
        });
      } catch (error: unknown) {
        console.log('Streaming failed, trying regular generation...');
        // Fallback to regular generation
        response = await fetch(`${apiUrl}/ai-research/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestPayload),
          signal: abortControllerRef.current.signal
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get answer');
      }

      // Check if this is a streaming response or regular response
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('text/plain')) {
        // Handle streaming response efficiently
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        // Show initial streaming indicator
        setAnswer('🤖 AI is starting to generate your response...\n\n');

        const decoder = new TextDecoder();
        let fullAnswer = '';
        let lastUpdateTime = 0;
        const UPDATE_INTERVAL = 50; // Update UI every 50ms for smoother streaming
        let isFirstChunk = true;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullAnswer += chunk;
          
          // Update UI more frequently for real-time streaming effect
          const now = Date.now();
          if (now - lastUpdateTime > UPDATE_INTERVAL) {
            // Replace initial message with actual content on first chunk
            if (isFirstChunk && fullAnswer.trim()) {
              setAnswer(fullAnswer); // Replace initial message with actual content
              isFirstChunk = false;
            } else if (!isFirstChunk) {
              setAnswer(fullAnswer); // Continue streaming
            }
            lastUpdateTime = now;
            
            // Auto-scroll to bottom
            if (answerRef.current) {
              answerRef.current.scrollTop = answerRef.current.scrollHeight;
            }
          }
        }

        // Final update
        setAnswer(fullAnswer);
      } else {
        // Handle regular JSON response
        const data = await response.json();
        if (data.success && data.content) {
          setAnswer(data.content);
        } else {
          throw new Error(data.error || 'Failed to get answer');
        }
      }
      
      // Fetch updated quota status (debounced)
      setTimeout(() => fetchQuotaStatus(), 500);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      
      console.error('Error getting answer:', error);
      // Provide more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to AI service. Please try again later.';
      setError(errorMessage);
      
      // Show toast with more details
      if (errorMessage.includes('No active') || errorMessage.includes('API token')) {
        toast.error('AI service configuration issue. Please contact administrator to configure API tokens and models.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('time')) {
        toast.error('Request timeout. The AI service is taking too long to respond.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const startCountdown = (seconds: number) => {
    setRetryAfter(seconds);
    const interval = setInterval(() => {
      setRetryAfter(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setQuotaExceeded(false);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchQuotaStatus = async () => {
    try {
      // Use centralized API instance
      const response = await api.get('/ai-research/quota-status');

      if (response.data.success) {
        setQuotaStatus(response.data.quotaStatus);
      }
    } catch (error: unknown) {
      console.error('Error fetching quota status:', error);
    }
  };

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(answer);
  };

  const handleInsertAnswer = () => {
    onInsertContent(answer);
    onClose();
  };

  const handleClose = () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  // Fetch quota status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchQuotaStatus();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-25"
        onClick={handleClose}
      />
      
      {/* Main Content */}
      <div className={`relative bg-white shadow-xl transition-all duration-300 ${
        isExpanded ? 'w-full' : 'w-1/2'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              AI Research Assistant
            </h3>
            <p className="text-sm text-gray-500">
              Your intelligent research companion - Ask questions, get insights, and enhance your research papers
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? 'Show side-by-side' : 'Expand to full width'}
            >
              {isExpanded ? (
                <ArrowsPointingInIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quota Status */}
        {quotaStatus && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-blue-700">
                Requests: {quotaStatus.requestsUsed}/{quotaStatus.requestsUsed + quotaStatus.requestsRemaining}
              </span>
              <span className="text-blue-600">
                {quotaStatus.requestsRemaining} remaining
              </span>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex h-[calc(100vh-140px)]">
          {/* Left Panel: Question Input */}
          <div className="w-1/2 border-r border-gray-200 p-4 flex flex-col">
            <div className="flex-1">
              {/* Model Selection */}
              <div className="mb-4">
                <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  id="model-select"
                  value={selectedModelId || ''}
                  onChange={(e) => setSelectedModelId(parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={isGenerating || modelsLoading}
                >
                  {modelsLoading ? (
                    <option value="">Loading models...</option>
                  ) : models.length === 0 ? (
                    <option value="">No models available</option>
                  ) : (
                    models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.display_name} {model.is_default && '(Default)'}
                    </option>
                    ))
                  )}
                </select>
                {selectedModelId && (
                  <p className="mt-1 text-xs text-gray-500">
                    {models.find(m => m.id === selectedModelId)?.description}
                  </p>
                )}
              </div>
              
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Ask a question
              </label>
              <div className="relative">
                <textarea
                  id="question"
                  rows={12}
                  className="w-full rounded-lg border-2 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 sm:text-sm resize-y p-4 font-sans leading-relaxed transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white"
                  placeholder="Ask me anything about your research! I can help with literature reviews, methodology, data analysis, writing assistance, and more...

Example questions:
• How can I improve the methodology section of my research?
• What are the latest findings in cardiovascular disease prevention?
• Help me write a literature review on diabetes management..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={isGenerating || quotaExceeded}
                  style={{ minHeight: '300px', maxHeight: '600px' }}
                />
                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  {question && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {question.length} characters
                    </span>
                  )}
                  {question.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuestion('')}
                      className="text-xs text-gray-400 hover:text-gray-600 bg-white px-2 py-1 rounded"
                      title="Clear input"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim() || isGenerating || quotaExceeded}
                className={`w-full py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                  quotaExceeded 
                    ? 'bg-orange-500 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating AI Response...</span>
                  </>
                ) : quotaExceeded ? (
                  <>
                    <div className="animate-pulse h-4 w-4 bg-white rounded-full"></div>
                    <span>AI Busy ({retryAfter}s)</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    <span>Ask AI Assistant</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel: Answer Display */}
          <div className="w-1/2 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                AI Answer
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyAnswer}
                  disabled={!answer}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  <ClipboardDocumentIcon className="h-3 w-3" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleInsertAnswer}
                  disabled={!answer}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  <SparklesIcon className="h-3 w-3" />
                  <span>Insert</span>
                </button>
              </div>
            </div>
            
            <div 
              ref={answerRef}
              className="flex-1 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-y-auto text-sm text-gray-800"
            >
              {answer ? (
                <div className="whitespace-pre-wrap font-sans">
                  {answer}
                  {isGenerating && (
                    <div className="inline-flex items-center ml-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="ml-2 text-blue-600 text-xs">AI is thinking...</span>
                    </div>
                  )}
                </div>
              ) : isGenerating ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="relative">
                    <SparklesIcon className="h-12 w-12 mb-2 animate-pulse text-blue-500" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  </div>
                  <p className="text-center">
                    <span className="text-blue-600 font-medium">AI is generating your response...</span>
                    <br />
                    <span className="text-sm">This may take a few moments</span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <SparklesIcon className="h-12 w-12 mb-2" />
                  <p>AI answers will appear here as they're generated...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBySideAIAssistant;
