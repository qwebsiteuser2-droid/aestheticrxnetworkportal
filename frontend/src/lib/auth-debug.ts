// Debug utility for authentication issues
export const debugAuth = () => {
  console.log('=== AUTH DEBUG ===');
  
  // Check cookies
  const cookies = document.cookie;
  console.log('All cookies:', cookies);
  
  // Check localStorage
  const userData = localStorage.getItem('user');
  console.log('User data in localStorage:', userData);
  
  // Check if user data can be parsed
  try {
    const parsedUser = userData ? JSON.parse(userData) : null;
    console.log('Parsed user data:', parsedUser);
    console.log('Is admin:', parsedUser?.is_admin);
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  
  // Check access token
  const accessToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('accessToken='))
    ?.split('=')[1];
  console.log('Access token exists:', !!accessToken);
  console.log('Access token length:', accessToken?.length || 0);
  
  console.log('=== END AUTH DEBUG ===');
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}
