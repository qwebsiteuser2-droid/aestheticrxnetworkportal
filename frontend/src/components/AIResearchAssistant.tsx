'use client';

import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  SparklesIcon, 
  ClipboardDocumentIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { getAccessToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';

interface AIResearchAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertContent: (content: string) => void;
}

const AIResearchAssistant: React.FC<AIResearchAssistantProps> = ({
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

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setIsGenerating(true);
    setError('');
    setQuotaExceeded(false);
    
    try {
      // Use centralized API instance
      const token = getAccessToken();
      
      if (!token) {
        throw new Error('Authentication required - Please login first');
      }

      const response = await api.post('/ai-research/generate', {
        researchType: 'general',
        contentType: 'text',
        userQuery: question
      });
      
      if (response.data.success) {
        const data = response.data;
        setAnswer(data.content);
        setQuotaStatus(data.quotaStatus);
      } else {
        if (data.quotaExceeded) {
          setQuotaExceeded(true);
          setRetryAfter(data.retryAfter || 60);
          setError(data.message || 'AI is currently processing multiple requests. Please wait a moment.');
          setQuotaStatus(data.quotaStatus);
          
          // Start countdown timer
          startCountdown(data.retryAfter || 60);
        } else {
          setError(data.error || 'Failed to get answer');
        }
      }
    } catch (error: any) {
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
      const apiUrl = getApiUrl();
      // Get token using the proper auth function
      const token = getAccessToken();
      
      if (!token) return;

      const response = await fetch(`${apiUrl}/ai-research/quota-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuotaStatus(data.quotaStatus);
        }
      }
    } catch (error) {
      console.error('Error fetching quota status:', error);
    }
  };

  // Fetch quota status when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchQuotaStatus();
    }
  }, [isOpen]);

  const handleCopyAnswer = () => {
    navigator.clipboard.writeText(answer);
  };

  const handleInsertAnswer = () => {
    onInsertContent(answer);
    onClose();
  };

  const questionSuggestions = [
    "What are the latest trends in cardiovascular disease prevention?",
    "How do I write a good research methodology?",
    "What is the importance of literature review in research?",
    "How to analyze research data effectively?",
    "What are the key components of a research paper?",
    "How to write a compelling research conclusion?"
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                      AI Research Chatbot
                    </Dialog.Title>
                    <p className="text-sm text-gray-500">
                      Ask questions and get AI-powered answers for your research
                    </p>
                  </div>
                  
                  {/* Quota Status */}
                  {quotaStatus && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
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
                  
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel - Question Input */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ask a Question
                        </label>
                        <div className="relative">
                          <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Ask me anything about your research! I can help with literature reviews, methodology, data analysis, writing assistance, and more...

Example questions:
• How can I improve the methodology section of my research?
• What are the latest findings in cardiovascular disease prevention?
• Help me write a literature review on diabetes management..."
                            className="w-full h-40 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y bg-white shadow-sm transition-all duration-200"
                            style={{ minHeight: '200px', maxHeight: '400px' }}
                          />
                          <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                            {question && (
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                                {question.length} characters
                              </span>
                            )}
                            {question.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setQuestion('')}
                                className="text-xs text-gray-400 hover:text-gray-600 bg-white px-2 py-1 rounded shadow-sm transition-colors"
                                title="Clear input"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                        {question && (
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500">{question.length} characters</span>
                            <button
                              type="button"
                              onClick={() => setQuestion('')}
                              className="text-xs text-gray-400 hover:text-gray-600"
                              title="Clear input"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Suggestions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quick Suggestions
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                          {questionSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => setQuestion(suggestion)}
                              className="text-left p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>

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
                            <span>Getting Answer...</span>
                          </>
                        ) : quotaExceeded ? (
                          <>
                            <div className="animate-pulse h-4 w-4 bg-white rounded-full"></div>
                            <span>AI Busy... ({retryAfter}s)</span>
                          </>
                        ) : (
                          <>
                            <PaperAirplaneIcon className="h-4 w-4" />
                            <span>Ask Question</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Right Panel - Answer Display */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          AI Answer
                        </label>
                        {answer && (
                          <div className="flex space-x-2">
                            <button
                              onClick={handleCopyAnswer}
                              className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <ClipboardDocumentIcon className="h-3 w-3" />
                              <span>Copy</span>
                            </button>
                            <button
                              onClick={handleInsertAnswer}
                              className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                            >
                              <SparklesIcon className="h-3 w-3" />
                              <span>Insert</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="h-64 border border-gray-300 rounded-lg p-4 bg-gray-50 overflow-y-auto">
                        {answer ? (
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                              {answer}
                            </pre>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                              <SparklesIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm">AI answer will appear here</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      <p>Powered by LLaMA 3.1 by Meta via Hugging Face • Please review and cite appropriately</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AIResearchAssistant;