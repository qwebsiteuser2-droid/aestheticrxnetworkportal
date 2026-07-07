/** Safe internal redirect paths only (no open redirects). */

export function getSafeRedirectPath(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  return trimmed;
}

export function buildLoginUrl(returnPath: string): string {
  const safe = getSafeRedirectPath(returnPath) || '/';
  return `/login?redirect=${encodeURIComponent(safe)}`;
}

export type OrderResumeAction = 'cart' | 'buy' | 'location' | 'view';

export function buildOrderReturnPath(options: {
  productId?: string;
  action?: OrderResumeAction;
}): string {
  const params = new URLSearchParams();
  if (options.productId) params.set('productId', options.productId);
  if (options.action) params.set('action', options.action);
  const query = params.toString();
  return query ? `/order?${query}` : '/order';
}

export function buildOrderLoginUrl(options: {
  productId?: string;
  action?: OrderResumeAction;
}): string {
  return buildLoginUrl(buildOrderReturnPath(options));
}

export function getPostLoginRedirect(
  user: { is_approved?: boolean; is_admin?: boolean; user_type?: string },
  redirectParam: string | null
): string {
  const userType = user.user_type || '';
  const isRegularUser = userType === 'regular' || userType === 'regular_user';

  if (!user.is_approved && !user.is_admin && !isRegularUser) {
    return '/waiting-approval';
  }

  const safe = getSafeRedirectPath(redirectParam);
  if (safe) return safe;

  if (user.is_admin) return '/admin';
  return '/';
}

export function parseOrderResumeParams(search: string): {
  productId: string | null;
  action: OrderResumeAction | null;
} {
  const params = new URLSearchParams(search);
  const action = params.get('action');
  const validActions: OrderResumeAction[] = ['cart', 'buy', 'location', 'view'];
  return {
    productId: params.get('productId'),
    action: validActions.includes(action as OrderResumeAction)
      ? (action as OrderResumeAction)
      : null,
  };
}
