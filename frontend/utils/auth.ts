// Authentication and route protection utilities

const ADMIN_PASSWORD_KEY = 'eventgrapher_admin_authenticated';
const ALLOWED_NAVIGATION_KEY = 'eventgrapher_allowed_navigation';

// Default admin password (should be set via environment variable in production)
const DEFAULT_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

/**
 * Check if admin is authenticated
 */
export const isAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  const authStatus = localStorage.getItem(ADMIN_PASSWORD_KEY);
  return authStatus === 'true';
};

/**
 * Authenticate admin with password
 */
export const authenticateAdmin = (password: string): boolean => {
  if (password === DEFAULT_ADMIN_PASSWORD) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
    }
    return true;
  }
  return false;
};

/**
 * Logout admin
 */
export const logoutAdmin = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  }
};

/**
 * Set navigation as allowed (user came from index or admin page)
 */
export const setAllowedNavigation = (fromPage: 'index' | 'admin'): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(ALLOWED_NAVIGATION_KEY, fromPage);
  }
};

/**
 * Check if navigation is allowed
 */
export const isNavigationAllowed = (): boolean => {
  if (typeof window === 'undefined') return false;
  const allowed = sessionStorage.getItem(ALLOWED_NAVIGATION_KEY);
  return allowed === 'index' || allowed === 'admin';
};

/**
 * Clear navigation flag (after page is loaded)
 */
export const clearNavigationFlag = (): void => {
  if (typeof window !== 'undefined') {
    // Don't clear immediately - let it persist for the session
    // It will be cleared when user navigates away or closes tab
  }
};

