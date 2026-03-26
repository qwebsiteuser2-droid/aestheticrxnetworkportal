// User and Authentication Types
export interface User {
  id: string;
  doctor_id: number;
  email: string;
  clinic_name: string;
  doctor_name: string;
  user_type?: 'doctor' | 'employee' | 'admin' | 'regular';
  whatsapp?: string;
  google_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  is_approved: boolean;
  is_admin: boolean;
  is_deactivated?: boolean;
  profile_photo_url?: string;
  consent_flag: boolean;
  consent_at?: string;
  approved_at?: string;
  tier?: string;
  tier_color?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    refreshToken?: string;
  };
  error?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  clinic_name: string;
  doctor_name: string;
  signup_id: string;
  whatsapp?: string;
  google_location?: {
    lat: number;
    lng: number;
    address: string;
  };
  consent: boolean;
}

// Product Types
export interface Product {
  id: string;
  slot_index: number;
  image_url?: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  unit?: string;
  stock_quantity: number;
  is_featured: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Order Types
export interface Order {
  id: string;
  order_number: string;
  doctor_id: string;
  product_id: string;
  qty: number;
  order_location: {
    lat: number;
    lng: number;
    address: string;
  };
  order_total: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  delivery_status?: 'pending' | 'assigned' | 'accepted' | 'in_transit' | 'delivered' | 'completed';
  delivery_assigned_at?: string;
  delivery_started_at?: string;
  delivery_completed_at?: string;
  notes?: string;
  accepted_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  doctor?: User;
}

export interface CreateOrderRequest {
  product_id: string;
  qty: number;
  order_location: {
    lat: number;
    lng: number;
    address: string;
  };
  notes?: string;
}

export interface OrderResponse {
  success: boolean;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Research Paper Types
export interface Citation {
  id: string;
  type: 'journal' | 'book' | 'website' | 'conference' | 'other';
  title: string;
  authors: string[];
  journal?: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  publisher?: string;
  isbn?: string;
}

export interface ResearchPaper {
  id: string;
  doctor_id: string;
  title: string;
  abstract: string;
  content: string;
  citations: Citation[];
  image_urls: string[];
  tags: string[];
  is_approved: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  view_count: number;
  upvote_count: number;
  pdf_file_url?: string;
  pdf_file_name?: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  doctor?: User;
}

export interface CreateResearchPaperRequest {
  title: string;
  abstract: string;
  content: string;
  citations: Citation[];
  image_urls: string[];
  tags: string[];
}

// Leaderboard Types
export interface LeaderboardEntry {
  id: string;
  doctor_id: number;
  clinic_name: string;
  doctor_name: string;
  profile_photo_url?: string;
  current_sales?: number;
  tier: string;
  tier_progress?: number;
  next_tier?: string | null;
  remaining_amount?: number;
  rank: number;
  total_doctors: number;
  is_team?: boolean;
  team_name?: string;
  is_leader?: boolean;
  team_members?: any[];
}

export interface LeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: LeaderboardEntry[];
    tiers: {
      name: string;
      threshold: number;
      color: string;
    }[];
  };
}

// Hall of Pride Types
export interface HallOfPrideEntry {
  id: string;
  doctor_id: string;
  title: string;
  description: string;
  image_url?: string;
  achievement_type: string;
  category?: string;
  reason?: string;
  display_order: number;
  created_at: string;
  doctor?: User;
}

// Notification Types
export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  payload: {
    title: string;
    message: string;
    data?: any;
  };
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchParams extends PaginationParams {
  q?: string;
  category?: string;
  status?: string;
}

// Form Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

// UI Component Types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}

// Error Types
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

// File Upload Types
export interface FileUpload {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

// Location Types
export interface Location {
  lat: number;
  lng: number;
  address: string;
}

// Tier Types
export interface Tier {
  id?: string;
  name: string;
  threshold: number;
  color: string;
  description: string;
  benefits: string;
  icon: string;
  display_order?: number;
  is_active?: boolean;
  debt_limit?: number;
  // Motivational message fields
  achievement_message?: string;
  progress_message_25?: string;
  progress_message_50?: string;
  progress_message_75?: string;
  progress_message_90?: string;
  max_tier_message?: string;
  created_at?: string;
  updated_at?: string;
}

export const TIERS: Tier[] = [
  {
    name: 'Lead Starter',
    threshold: 0,
    color: 'gray',
    description: 'New to the platform',
    benefits: 'Listed in system only.',
    icon: '⚪'
  },
  {
    name: 'Lead Contributor',
    threshold: 1,
    color: 'green',
    description: 'Active community member',
    benefits: 'Name on leaderboard, basic badge.',
    icon: '🟢'
  },
  {
    name: 'Lead Expert',
    threshold: 2,
    color: 'blue',
    description: 'Expert level contributor',
    benefits: '5% discount + small gift pack.',
    icon: '🔵'
  },
  {
    name: 'Grand Lead',
    threshold: 3,
    color: 'purple',
    description: 'Master level contributor',
    benefits: '10% discount + priority support + VIP badge.',
    icon: '🟣'
  },
  {
    name: 'Elite Lead',
    threshold: 4,
    color: 'red',
    description: 'Highest tier contributor',
    benefits: '15% discount + free marketing ads (admin chooses), premium badge, homepage feature.',
    icon: '🔴'
  }
];
