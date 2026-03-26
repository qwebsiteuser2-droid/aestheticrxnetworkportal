'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/getApiUrl';
import api from '@/lib/api';
import { 
  DocumentTextIcon, 
  CheckIcon, 
  EyeIcon, 
  ShareIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  PhotoIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import SideBySideAIAssistant from '@/components/SideBySideAIAssistant';
import MermaidDiagram from '@/components/MermaidDiagram';
import { extractMermaidDiagrams } from '@/utils/markdownUtils';
import { getAccessToken } from '@/lib/auth';
import DOMPurify from 'dompurify';
import MonthlyLimitModal from '@/components/modals/MonthlyLimitModal';

interface ResearchNotebook {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  upvoteCount: number;
  author: string;
  clinic: string;
}

export default function ResearchLabPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<ResearchNotebook[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<ResearchNotebook | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showMonthlyLimitModal, setShowMonthlyLimitModal] = useState(false);
  const [monthlyLimitMessage, setMonthlyLimitMessage] = useState('');

  useEffect(() => {
    // Only check authentication once when component mounts or auth state actually changes
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Check if user is approved
    // Regular users are auto-approved, so they bypass this check
    if (!user?.is_admin && !user?.is_approved && user?.user_type !== 'regular' && (user as any)?.user_type !== 'regular_user') {
      router.push('/waiting-approval');
      return;
    }
    
    // Only doctors and admins can access research lab
    if (user?.user_type !== 'doctor' && !user?.is_admin) {
      toast.error('Access denied. Research Lab is only available to doctors and admins.');
      router.push('/');
      return;
    }
    
    fetchNotebooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, user?.is_admin, user?.is_approved, user?.user_type]);


  const fetchNotebooks = async () => {
    try {
      setIsLoading(true);
      
      // Try to load from localStorage first
      if (user) {
        const userKey = `research_notebooks_${user.id}`;
        const savedNotebooks = localStorage.getItem(userKey);
        if (savedNotebooks) {
          const parsedNotebooks = JSON.parse(savedNotebooks);
          setNotebooks(parsedNotebooks);
          setIsLoading(false);
          return;
        }
      }
      
      // Fallback to mock data if no saved data
      const mockNotebooks: ResearchNotebook[] = [
        {
          id: '1',
          title: 'Cardiovascular Disease Prevention Strategies',
          content: `# Cardiovascular Disease Prevention Strategies

## Abstract
This research explores evidence-based strategies for preventing cardiovascular diseases in primary care settings.

## Introduction
Cardiovascular diseases (CVD) remain the leading cause of mortality worldwide...

## Methodology
We conducted a systematic review of randomized controlled trials...

## Results
Our analysis revealed significant improvements in patient outcomes...

## Conclusion
Implementing comprehensive prevention strategies can reduce CVD incidence by 30%...`,
          isPublic: true,
          createdAt: '2024-01-15',
          updatedAt: '2024-01-20',
          viewCount: 156,
          upvoteCount: 23,
          author: user?.doctor_name || 'Dr. Anonymous',
          clinic: user?.clinic_name || 'Medical Center'
        },
        {
          id: '2',
          title: 'Telemedicine Implementation in Rural Areas',
          content: `# Telemedicine Implementation in Rural Areas

## Abstract
This study examines the effectiveness of telemedicine solutions in rural healthcare settings.

## Background
Rural areas face significant healthcare access challenges...

## Methods
We implemented a telemedicine program across 15 rural clinics...

## Findings
Patient satisfaction increased by 45% and wait times decreased by 60%...

## Discussion
Telemedicine shows promising results for rural healthcare delivery...`,
          isPublic: false,
          createdAt: '2024-01-10',
          updatedAt: '2024-01-18',
          viewCount: 89,
          upvoteCount: 15,
          author: user?.doctor_name || 'Dr. Anonymous',
          clinic: user?.clinic_name || 'Medical Center'
        }
      ];
      setNotebooks(mockNotebooks);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      toast.error('Failed to load research notebooks');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewNotebook = () => {
    if (!newNotebookTitle.trim()) {
      toast.error('Please enter a title for your research');
      return;
    }

    const newNotebook: ResearchNotebook = {
      id: Date.now().toString(),
      title: newNotebookTitle,
      content: `# ${newNotebookTitle}

## Abstract
Write your research abstract here...

## Introduction
Provide background information and research objectives...

## Methodology
Describe your research methods and approach...

## Results
Present your findings and data analysis...

## Discussion
Discuss the implications of your results...

## Conclusion
Summarize your key findings and recommendations...

## References
- Add your references here
- Use proper citation format`,
      isPublic: false,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      viewCount: 0,
      upvoteCount: 0,
      author: user?.doctor_name || 'Dr. Anonymous',
      clinic: user?.clinic_name || 'Medical Center'
    };

    const updatedNotebooks = [newNotebook, ...notebooks];
    setNotebooks(updatedNotebooks);
    setCurrentNotebook(newNotebook);
    setIsEditing(true);
    
    // Save to localStorage for persistence
    if (user) {
      const userKey = `research_notebooks_${user.id}`;
      localStorage.setItem(userKey, JSON.stringify(updatedNotebooks));
    }
    
    setShowCreateModal(false);
    setNewNotebookTitle('');
    toast.success('New research notebook created and saved to your profile!');
  };

  const saveNotebook = async () => {
    if (!currentNotebook || !user) return;

    try {
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      // Only redirect if we're truly not authenticated (no user and no token)
      if (!token && !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }
      
      // If token is missing but user is still authenticated, try to continue
      // The API will handle the authentication error
      if (!token) {
        toast.error('Session expired. Please refresh the page and try again.');
        return;
      }

      // Prepare research paper data - Save locally, don't change public status
      const researchData = {
        id: currentNotebook.id, // Include existing paper ID if available
        title: currentNotebook.title || 'Untitled Research',
        abstract: currentNotebook.content ? currentNotebook.content.substring(0, 500) + '...' : 'No abstract provided',
        content: currentNotebook.content || 'No content provided',
        tags: 'research,medical,study', // Default tags
        citations: JSON.stringify([]),
        makePublic: 'off' // Save locally, don't make public
      };

      // Use centralized API instance
      const response = await api.post('/research', researchData);

      if (!response.data.success) {
        // Handle 401 Unauthorized - don't redirect immediately, token might still be valid
        if (response.status === 401) {
          const errorResult = response.data;
          const errorMessage = errorResult.message || errorResult.error || 'Authentication error';
          
          // Only redirect if token is actually missing
          const currentToken = getAccessToken();
          if (!currentToken) {
            toast.error('Session expired. Please login again.');
            router.push('/login');
            return;
          }
          
          // Token exists but API rejected it - show error without redirecting
          toast.error('Authentication error. Please try again.');
          return;
        }
        
        const errorResult = response.data;
        const errorMessage = errorResult.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Check if it's a monthly limit error (now applies to saving too - 100 per month)
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = response.data;

      if (result.success) {
        const updatedNotebook = { 
          ...currentNotebook, 
          updatedAt: new Date().toISOString().split('T')[0] 
        };
        
        setNotebooks(prev => prev.map(notebook => 
          notebook.id === currentNotebook.id ? updatedNotebook : notebook
        ));
        
        // Save to localStorage for persistence
        const userKey = `research_notebooks_${user.id}`;
        const updatedNotebooks = notebooks.map(notebook => 
          notebook.id === currentNotebook.id ? updatedNotebook : notebook
        );
        localStorage.setItem(userKey, JSON.stringify(updatedNotebooks));
        
        setCurrentNotebook(updatedNotebook);
        setIsEditing(false);
        
        toast.success('Research paper saved successfully!');
      } else {
        const errorMessage = result.message || 'Failed to save research paper';
        
        // Check if it's a monthly limit error (now applies to saving too - 100 per month)
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error saving research paper:', error);
      const errorMessage = error.message || 'Failed to save research paper. Please try again.';
      
      // Check if it's a monthly limit error (now applies to saving too - 100 per month)
      if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
        setMonthlyLimitMessage(errorMessage);
        setShowMonthlyLimitModal(true);
        return;
      }
      
      toast.error(errorMessage);
    }
  };

  const publishResearch = async () => {
    if (!currentNotebook || !user) return;

    try {
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      // Only redirect if we're truly not authenticated (no user and no token)
      if (!token && !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }
      
      // If token is missing but user is still authenticated, try to continue
      // The API will handle the authentication error
      if (!token) {
        toast.error('Session expired. Please refresh the page and try again.');
        return;
      }

      // Prepare research paper data - ALWAYS make it public when publishing
      const researchData = {
        id: currentNotebook.id, // Include existing paper ID if available
        title: currentNotebook.title || 'Untitled Research',
        abstract: currentNotebook.content ? currentNotebook.content.substring(0, 500) + '...' : 'No abstract provided',
        content: currentNotebook.content || 'No content provided',
        tags: 'research,medical,study',
        citations: JSON.stringify([]),
        makePublic: 'on' // Always make it public when publishing
      };

      // Use centralized API instance
      const response = await api.post('/research', researchData);

      if (!response.data.success) {
        // Handle 401 Unauthorized - don't redirect immediately, token might still be valid
        if (response.status === 401) {
          const errorResult = response.data;
          const errorMessage = errorResult.message || errorResult.error || 'Authentication error';
          
          // Only redirect if token is actually missing
          const currentToken = getAccessToken();
          if (!currentToken) {
            toast.error('Session expired. Please login again.');
            router.push('/login');
            return;
          }
          
          // Token exists but API rejected it - show error without redirecting
          toast.error('Authentication error. Please try again.');
          return;
        }
        
        const errorResult = await response.json();
        const errorMessage = errorResult.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Check if it's a monthly limit error
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        const updatedNotebook = { 
          ...currentNotebook, 
          isPublic: true, // Set to public
          updatedAt: new Date().toISOString().split('T')[0] 
        };
        
        setNotebooks(prev => prev.map(notebook => 
          notebook.id === currentNotebook.id ? updatedNotebook : notebook
        ));
        
        // Save to localStorage for persistence
        const userKey = `research_notebooks_${user.id}`;
        const updatedNotebooks = notebooks.map(notebook => 
          notebook.id === currentNotebook.id ? updatedNotebook : notebook
        );
        localStorage.setItem(userKey, JSON.stringify(updatedNotebooks));
        
        setCurrentNotebook(updatedNotebook);
        setIsEditing(false);
        
        toast.success('Research paper published successfully!');
      } else {
        const errorMessage = result.message || 'Failed to publish research paper';
        
        // Check if it's a monthly limit error
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error publishing research paper:', error);
      const errorMessage = error.message || 'Failed to publish research paper. Please try again.';
      
      // Check if it's a monthly limit error
      if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
        setMonthlyLimitMessage(errorMessage);
        setShowMonthlyLimitModal(true);
        return;
      }
      
      toast.error(errorMessage);
    }
  };

  const togglePublic = async () => {
    if (!currentNotebook) return;

    try {
      const apiUrl = getApiUrl();
      const token = getAccessToken();
      
      // Only redirect if we're truly not authenticated (no user and no token)
      if (!token && !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        router.push('/login');
        return;
      }
      
      // If token is missing but user is still authenticated, try to continue
      // The API will handle the authentication error
      if (!token) {
        toast.error('Session expired. Please refresh the page and try again.');
        return;
      }

      // Prepare research paper data
      const researchData = {
        id: currentNotebook.id, // Include existing paper ID if available
        title: currentNotebook.title || 'Untitled Research',
        abstract: currentNotebook.content ? currentNotebook.content.substring(0, 500) + '...' : 'No abstract provided',
        content: currentNotebook.content || 'No content provided',
        tags: 'research,medical,study',
        citations: JSON.stringify([]),
        makePublic: !currentNotebook.isPublic ? 'on' : 'off' // Toggle the public status
      };

      // Use centralized API instance
      const response = await api.post('/research', researchData);

      if (!response.data.success) {
        // Handle 401 Unauthorized - don't redirect immediately, token might still be valid
        if (response.status === 401) {
          const errorResult = response.data;
          const errorMessage = errorResult.message || errorResult.error || 'Authentication error';
          
          // Only redirect if token is actually missing
          const currentToken = getAccessToken();
          if (!currentToken) {
            toast.error('Session expired. Please login again.');
            router.push('/login');
            return;
          }
          
          // Token exists but API rejected it - show error without redirecting
          toast.error('Authentication error. Please try again.');
          return;
        }
        
        const errorResult = await response.json();
        const errorMessage = errorResult.message || `HTTP ${response.status}: ${response.statusText}`;
        
        // Check if it's a monthly limit error (shouldn't happen for updates, but handle it just in case)
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        setCurrentNotebook(prev => prev ? { ...prev, isPublic: !prev.isPublic } : null);
        toast.success(`Research ${currentNotebook.isPublic ? 'unpublished' : 'published to the website'}!`);
      } else {
        const errorMessage = result.message || 'Failed to update research paper';
        
        // Check if it's a monthly limit error (shouldn't happen for updates, but handle it just in case)
        if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
          setMonthlyLimitMessage(errorMessage);
          setShowMonthlyLimitModal(true);
          return;
        }
        
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error updating research paper:', error);
      const errorMessage = error.message || 'Failed to update research paper. Please try again.';
      
      // Check if it's a monthly limit error (shouldn't happen for updates, but handle it just in case)
      if (errorMessage.includes('monthly limit') || errorMessage.includes('monthly limit of')) {
        setMonthlyLimitMessage(errorMessage);
        setShowMonthlyLimitModal(true);
        return;
      }
      
      toast.error(errorMessage);
    }
  };

  const confirmDeleteNotebook = (id: string) => {
    setNotebookToDelete(id);
    setShowDeleteModal(true);
  };

  const deleteNotebook = () => {
    if (!notebookToDelete || !user) return;

    const updatedNotebooks = notebooks.filter(notebook => notebook.id !== notebookToDelete);
    setNotebooks(updatedNotebooks);
    
    // Save to localStorage
    const userKey = `research_notebooks_${user.id}`;
    localStorage.setItem(userKey, JSON.stringify(updatedNotebooks));
    
    if (currentNotebook?.id === notebookToDelete) {
      setCurrentNotebook(null);
      setIsEditing(false);
    }
    setShowDeleteModal(false);
    setNotebookToDelete(null);
    toast.success('Research notebook deleted permanently!');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setNotebookToDelete(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      event.target.value = ''; // Reset input
      return;
    }

    // File size limit: 5MB for images
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (5MB). Please compress your image or choose a smaller one.`);
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const imageMarkdown = `![${file.name}](${imageUrl})\n\n`;
      
      if (currentNotebook && isEditing) {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const newContent = currentNotebook.content.slice(0, cursorPos) + imageMarkdown + currentNotebook.content.slice(cursorPos);
          setCurrentNotebook(prev => prev ? { ...prev, content: newContent } : null);
          
          // Set cursor position after the inserted image
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorPos + imageMarkdown.length, cursorPos + imageMarkdown.length);
          }, 0);
        }
      }
      
      setShowImageUpload(false);
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        const imageMarkdown = `![${file.name}](${imageUrl})\n\n`;
        
        if (currentNotebook && isEditing) {
          const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            const cursorPos = textarea.selectionStart;
            const newContent = currentNotebook.content.slice(0, cursorPos) + imageMarkdown + currentNotebook.content.slice(cursorPos);
            setCurrentNotebook(prev => prev ? { ...prev, content: newContent } : null);
            
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(cursorPos + imageMarkdown.length, cursorPos + imageMarkdown.length);
            }, 0);
          }
        }
        
        toast.success('Image uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } else if (pdfFiles.length > 0) {
      const file = pdfFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('PDF size should be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const pdfUrl = e.target?.result as string;
        const pdfMarkdown = `\n## Research Paper: ${file.name}\n\n[📄 View PDF Document](${pdfUrl})\n\n*Uploaded research paper - ${file.name}*\n\n`;
        
        if (currentNotebook && isEditing) {
          const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            const cursorPos = textarea.selectionStart;
            const newContent = currentNotebook.content.slice(0, cursorPos) + pdfMarkdown + currentNotebook.content.slice(cursorPos);
            setCurrentNotebook(prev => prev ? { ...prev, content: newContent } : null);
            
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(cursorPos + pdfMarkdown.length, cursorPos + pdfMarkdown.length);
            }, 0);
          }
        }
        
        toast.success('Research paper uploaded successfully!');
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please drop an image or PDF file');
    }
  };

  const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      event.target.value = ''; // Reset input
      return;
    }

    // File size limit: 10MB for PDFs
    const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_PDF_SIZE) {
      toast.error(`PDF size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed size (10MB). Please compress your PDF or choose a smaller one.`);
      event.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const pdfUrl = e.target?.result as string;
      const pdfMarkdown = `\n## Research Paper: ${file.name}\n\n[📄 View PDF Document](${pdfUrl})\n\n*Uploaded research paper - ${file.name}*\n\n`;
      
      if (currentNotebook && isEditing) {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          const cursorPos = textarea.selectionStart;
          const newContent = currentNotebook.content.slice(0, cursorPos) + pdfMarkdown + currentNotebook.content.slice(cursorPos);
          setCurrentNotebook(prev => prev ? { ...prev, content: newContent } : null);
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(cursorPos + pdfMarkdown.length, cursorPos + pdfMarkdown.length);
          }, 0);
        }
      }
      
      setShowPdfUpload(false);
      toast.success('Research paper uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  const upvoteNotebook = (id: string) => {
    setNotebooks(prev => prev.map(notebook => 
      notebook.id === id 
        ? { ...notebook, upvoteCount: notebook.upvoteCount + 1 }
        : notebook
    ));
    toast.success('Upvoted!');
  };

  const handleAIContentInsert = (content: string) => {
    if (!currentNotebook || !isEditing) {
      toast.error('Please select a notebook and enter edit mode first');
      return;
    }

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const newContent = currentNotebook.content.slice(0, cursorPos) + '\n\n' + content + '\n\n' + currentNotebook.content.slice(cursorPos);
      setCurrentNotebook(prev => prev ? { ...prev, content: newContent } : null);
      
      // Set cursor position after the inserted content
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos + content.length + 4, cursorPos + content.length + 4);
      }, 0);
      
      toast.success(`AI-generated content inserted successfully!`);
    }
  };


  // Research Preview Component with Mermaid support
  const ResearchPreview = ({ content }: { content: string }) => {
    const diagrams = extractMermaidDiagrams(content);
    let processedContent = content;

    // Replace Mermaid code blocks with placeholders
    diagrams.forEach((diagram, index) => {
      const mermaidBlock = `\`\`\`mermaid\n${diagram.code}\n\`\`\``;
      const placeholder = `<!-- MERMAID_PLACEHOLDER_${index} -->`;
      processedContent = processedContent.replace(mermaidBlock, placeholder);
    });

    // Process the content for HTML rendering
    const htmlContent = processedContent
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-4 cursor-pointer hover:shadow-md transition-shadow" style="max-width: 100%; height: auto;" onclick="window.open(this.src, \'_blank\')" />')
      .replace(/\[📄 View PDF Document\]\(([^)]+)\)/g, '<a href="$1" target="_blank" class="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors my-2"><DocumentTextIcon class="w-4 h-4 mr-2" />📄 View PDF Document</a>')
      .replace(/\n/g, '<br>');

    return (
      <div className="text-gray-700 leading-relaxed">
        {htmlContent.split('<!-- MERMAID_PLACEHOLDER_').map((part, index) => {
          if (index === 0) {
            // Sanitize HTML to prevent XSS attacks
            const sanitizedPart = typeof window !== 'undefined' 
              ? DOMPurify.sanitize(part)
              : part;
            return <div key={index} dangerouslySetInnerHTML={{ __html: sanitizedPart }} />;
          }
          
          const [placeholderPart, ...restParts] = part.split(' -->');
          const diagramIndex = parseInt(placeholderPart);
          const remainingContent = restParts.join(' -->');
          
          return (
            <div key={index}>
              {diagrams[diagramIndex] && (
                <div className="my-6 p-4 bg-gray-50 rounded-lg border">
                  <MermaidDiagram 
                    chart={diagrams[diagramIndex].code} 
                    className="w-full"
                  />
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Show diagram code
                    </summary>
                    <pre className="mt-2 p-2 bg-white text-xs overflow-auto border rounded">
                      {diagrams[diagramIndex].code}
                    </pre>
                  </details>
                </div>
              )}
              {/* Sanitize HTML to prevent XSS attacks */}
              <div dangerouslySetInnerHTML={{ 
                __html: typeof window !== 'undefined' 
                  ? DOMPurify.sanitize(remainingContent)
                  : remainingContent
              }} />
            </div>
          );
        })}
      </div>
    );
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Go Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Research Lab</h1>
                <p className="text-gray-600 mt-2">Create, edit, and share your research notebooks</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Research
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Notebooks List */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Research Notebooks</h3>
                
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="loading-spinner w-6 h-6 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading notebooks...</p>
                  </div>
                ) : notebooks.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No research notebooks yet</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Create your first research
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notebooks.map((notebook) => (
                      <div
                        key={notebook.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          currentNotebook?.id === notebook.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setCurrentNotebook(notebook);
                          setIsEditing(false);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {notebook.title}
                            </h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center">
                                <EyeIcon className="w-4 h-4 mr-1" />
                                {notebook.viewCount}
                              </span>
                              <span className="flex items-center">
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                {notebook.upvoteCount}
                              </span>
                              {notebook.isPublic && (
                                <span className="text-green-600 font-medium">Public</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteNotebook(notebook.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="lg:col-span-2">
            {currentNotebook ? (
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentNotebook.title}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="inline-flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4 mr-1" />
                        {isEditing ? 'Preview' : 'Edit'}
                      </button>
                      <button
                        onClick={() => publishResearch()}
                        className={`inline-flex items-center px-3 py-1 text-sm rounded-lg transition-colors ${
                          currentNotebook.isPublic
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        <ShareIcon className="w-4 h-4 mr-1" />
                        {currentNotebook.isPublic ? 'Published' : 'Publish Research'}
                      </button>
                      <button
                        onClick={saveNotebook}
                        className="inline-flex items-center px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4 mr-1" />
                        Save
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div>
                      <div className="mb-4 flex items-center space-x-2">
                        <button
                          onClick={() => setShowAIAssistant(true)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-md"
                        >
                          <SparklesIcon className="w-4 h-4 mr-2" />
                          AI Assistant
                        </button>
                        <button
                          onClick={() => setShowImageUpload(true)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <PhotoIcon className="w-4 h-4 mr-2" />
                          Upload Image
                        </button>
                        <button
                          onClick={() => setShowPdfUpload(true)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          Upload PDF
                        </button>
                        <span className="text-sm text-gray-500">Get AI assistance for research questions, content generation, and paper enhancement</span>
                      </div>

                      <div 
                        className={`relative w-full h-96 border-2 border-dashed rounded-lg transition-colors ${
                          isDragOver 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-gray-300'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        {isDragOver && (
                          <div className="absolute inset-0 bg-primary-100 bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
                            <div className="text-center">
                              <PhotoIcon className="w-12 h-12 text-primary-600 mx-auto mb-2" />
                              <p className="text-primary-700 font-medium">Drop image or PDF here</p>
                            </div>
                          </div>
                        )}
                        <textarea
                          value={currentNotebook.content}
                          onChange={(e) => setCurrentNotebook(prev => prev ? { ...prev, content: e.target.value } : null)}
                          className="w-full h-full p-4 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono resize-none"
                          placeholder="Write your research content here using Markdown... You can also drag and drop images or PDFs here!"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-lg max-w-none">
                      <ResearchPreview content={currentNotebook.content} />
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Created: {currentNotebook.createdAt}</span>
                        <span>Updated: {currentNotebook.updatedAt}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center">
                          <EyeIcon className="w-4 h-4 mr-1" />
                          {currentNotebook.viewCount} views
                        </span>
                        <button
                          onClick={() => upvoteNotebook(currentNotebook.id)}
                          className="flex items-center text-gray-500 hover:text-green-500 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          {currentNotebook.upvoteCount} approvals
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body text-center py-12">
                  <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Research Selected</h3>
                  <p className="text-gray-600 mb-6">
                    Select a research notebook from the list or create a new one to get started.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create New Research
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Research</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Title
                </label>
                <input
                  type="text"
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your research title..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewNotebookTitle('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewNotebook}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Upload Modal */}
        {showPdfUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Research Paper
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Upload your research paper in PDF format. Supported format: PDF (max 10MB)
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowPdfUpload(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        {showImageUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <PhotoIcon className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload Image
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Upload diagrams, charts, or photos to enhance your research. Supported formats: JPG, PNG, GIF (max 5MB)
                  </p>
                </div>

                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowImageUpload(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Limit Modal */}
        <MonthlyLimitModal
          isOpen={showMonthlyLimitModal}
          onClose={() => {
            setShowMonthlyLimitModal(false);
            setMonthlyLimitMessage('');
          }}
          message={monthlyLimitMessage || 'You have reached the monthly submission limit of research papers. You can continue editing and improving your existing research papers. Please wait until next month to submit new papers.'}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <TrashIcon className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Delete Research Notebook
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    ⚠️ <strong>WARNING:</strong> This action cannot be undone!
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete this research notebook? It will be permanently removed from your account, though we will keep a record of your research for our records.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={cancelDelete}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteNotebook}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Research Assistant */}
        <SideBySideAIAssistant
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          onInsertContent={handleAIContentInsert}
        />
      </div>
    </div>
  );
}
