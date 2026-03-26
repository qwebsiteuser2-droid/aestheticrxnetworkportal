'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { FaEye, FaThumbsUp, FaDownload } from 'react-icons/fa';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getAccessToken } from '@/lib/auth';
import { getApiUrl } from '@/lib/getApiUrl';
import api, { researchApi } from '@/lib/api';

interface ResearchPaper {
  id: string | number;
  title: string;
  abstract: string;
  content?: string;
  view_count: number;
  upvote_count: number;
  created_at: string;
  tags: string[];
  status?: 'pending' | 'approved' | 'rejected';
  doctor?: {
    id: string;
    doctor_name: string;
    clinic_name: string;
  };
}

export default function UserResearchPage() {
  const router = useRouter();
  const { user: currentUser, isAuthenticated } = useAuth();
  
  const [researchPapers, setResearchPapers] = useState<ResearchPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPapers, setLikedPapers] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Only doctors and admins can access user research page
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (currentUser?.user_type !== 'doctor' && !currentUser?.is_admin) {
      toast.error('Access denied. This page is only available to doctors and admins.');
      router.push('/');
      return;
    }
    
    const fetchUserResearch = async () => {
      try {
        setLoading(true);
        
        if (!currentUser) {
          setResearchPapers([]);
          return;
        }
        
        // Fetch research papers using authenticated endpoint
        const token = getAccessToken();
        
        // Use centralized API instance
        // Use the user-specific research endpoint
        const response = await api.get('/research/my');
        
        if (response.data.success) {
          const result = response.data;
          
          if (result.success) {
            // Use papers from the user-specific endpoint
            const userPapers = result.data?.papers || result.data || [];
            setResearchPapers(userPapers);
            console.log('User research papers fetched:', userPapers.length);
          } else {
            // Fallback: fetch all and filter
            const allResponse = await api.get('/research');
            
            if (allResponse.data.success) {
              const allResult = allResponse.data;
              if (allResult.success && allResult.data.papers) {
                const userSpecificPapers = allResult.data.papers.filter((paper: any) => {
                  return paper.doctor?.id === currentUser.id || 
                         paper.doctor_id === currentUser.id ||
                         (paper.doctor && paper.doctor.id === currentUser.id);
                });
                setResearchPapers(userSpecificPapers);
                console.log('Filtered user papers:', userSpecificPapers.length);
              } else {
                setResearchPapers([]);
              }
            } else {
              setResearchPapers([]);
            }
          }
        } else {
          // Fallback: fetch all and filter
          // Use centralized API instance
          const allResponse = await researchApi.getAll();
          
          if (allResponse.success) {
            const allResult = allResponse;
            if (allResult.success && allResult.data.papers) {
              const userSpecificPapers = allResult.data.papers.filter((paper: any) => {
                return paper.doctor?.id === currentUser.id || 
                       paper.doctor_id === currentUser.id ||
                       (paper.doctor && paper.doctor.id === currentUser.id);
              });
              setResearchPapers(userSpecificPapers);
            } else {
              setResearchPapers([]);
            }
          } else {
            setResearchPapers([]);
          }
        }
      } catch (error) {
        console.error('Error fetching user research:', error);
        setResearchPapers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserResearch();
  }, [currentUser, isAuthenticated, router]);

  const handleLike = (paperId: string | number) => {
    setLikedPapers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
        toast.success('Removed from liked papers');
      } else {
        newSet.add(paperId);
        toast.success('Added to liked papers');
      }
      return newSet;
    });
  };

  const handleDownload = async (paperId: string | number) => {
    try {
      // Use centralized API URL helper
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      // Use authenticated endpoint to allow viewing own papers even if pending
      // This endpoint allows users to view their own papers regardless of approval status
      // Use centralized API instance
      const response = await api.get(`/research/my/${paperId}`);

      if (!response.data.success) {
        const errorData = response.data;
        console.error('Failed to fetch research paper:', errorData);
        throw new Error(errorData.message || 'Failed to fetch research paper');
      }

      const result = response.data;
      const paper = result.data.paper;

      // Generate and download PDF
      await generateAndDownloadPDF(paper);

      toast.success('Research paper downloaded successfully!');
    } catch (error) {
      console.error('Error downloading research paper:', error);
      toast.error('Failed to download research paper. Please try again.');
    }
  };

  const generateAndDownloadPDF = async (paper: any) => {
    // Create a new window with the research paper content
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups.');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${paper.title}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { 
            font-family: 'Times New Roman', serif; 
            margin: 40px; 
            line-height: 1.6; 
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 { 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px; 
            text-align: center;
            font-size: 24px;
            margin-bottom: 30px;
          }
          h2 { 
            color: #34495e; 
            margin-top: 30px; 
            font-size: 18px;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .metadata { 
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
            font-size: 14px;
            border-left: 4px solid #3498db;
          }
          .abstract { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-left: 4px solid #3498db; 
            margin: 20px 0; 
            font-style: italic;
          }
          .content { 
            margin: 20px 0; 
            text-align: justify;
          }
          .tags { 
            margin: 20px 0; 
          }
          .tag { 
            background-color: #e74c3c; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            margin-right: 8px; 
            font-size: 12px; 
            display: inline-block;
            margin-bottom: 5px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #bdc3c7;
            padding-top: 20px;
          }
          .download-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3498db;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            z-index: 1000;
          }
          .download-btn:hover {
            background-color: #2980b9;
          }
        </style>
      </head>
      <body>
        <button class="download-btn no-print" onclick="window.print()">📄 Print/Download PDF</button>
        
        <h1>${paper.title}</h1>
        
        <div class="metadata">
          <p><strong>Author:</strong> ${paper.doctor?.doctor_name || 'Unknown'}</p>
          <p><strong>Clinic:</strong> ${paper.doctor?.clinic_name || 'Unknown'}</p>
          <p><strong>Published:</strong> ${new Date(paper.created_at).toLocaleDateString()}</p>
          <p><strong>Views:</strong> ${paper.view_count}</p>
          <p><strong>Approvals:</strong> ${paper.upvote_count}</p>
        </div>

        <div class="abstract">
          <h2>Abstract</h2>
          <p>${paper.abstract}</p>
        </div>

        <div class="content">
          <h2>Content</h2>
          <div>${paper.content.replace(/\n/g, '<br>')}</div>
        </div>

        ${paper.tags && paper.tags.length > 0 ? `
        <div class="tags">
          <h2>Tags</h2>
          ${paper.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} from BioAestheticAx Network Research Platform</p>
          <p>This document was automatically generated from the research paper content.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close the window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your research papers.</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your research papers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Research Papers</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            {researchPapers.length > 0 
              ? `You have published ${researchPapers.length} research paper${researchPapers.length !== 1 ? 's' : ''}`
              : 'You haven\'t published any research papers yet'
            }
          </p>
        </div>

        {/* Research Papers List */}
        {researchPapers.length > 0 ? (
          <div className="space-y-4 sm:space-y-6">
            {researchPapers.map((paper) => {
              // Get content snippet for display (prefer content, fallback to abstract)
              const contentSnippet = paper.content 
                ? paper.content.substring(0, 200).replace(/#{1,6}\s/g, '').trim() 
                : paper.abstract || '';
              
              return (
              <div key={paper.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 w-full overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 break-words">
                      {paper.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-3 sm:mb-4 line-clamp-3 break-words text-sm sm:text-base">
                      {contentSnippet}
                      {contentSnippet.length >= 200 && '...'}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                      <span>By: {paper.doctor?.doctor_name || 'You'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Research Paper</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Published: {new Date(paper.created_at).toLocaleDateString()}</span>
                      {paper.status === 'pending' && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="text-amber-600 font-medium">Pending Approval</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3 sm:mb-0">
                      <div className="flex items-center text-gray-600 flex-shrink-0">
                        <FaEye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span>{paper.view_count} views</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 flex-shrink-0">
                        <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span>{paper.upvote_count} approvals</span>
                      </div>
                      
                      <button className="text-red-600 hover:text-red-800 flex items-center flex-shrink-0 whitespace-nowrap">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>A Report</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 sm:mt-4 lg:mt-0 lg:ml-6 flex-shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleDownload(paper.id)}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap text-sm sm:text-base"
                    >
                      <FaDownload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Read Full Paper
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No research papers yet</h3>
            <p className="text-gray-600 mb-6">You haven't published any research papers yet. Start sharing your research with the medical community.</p>
            <button
              onClick={() => router.push('/research-lab')}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Research
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
