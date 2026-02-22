export type UserRole = 'admin' | 'staff';

/**
 * Maps route paths to the roles allowed to access them.
 * If a route is NOT listed here, it's accessible by all roles.
 * To change access: add/remove routes or edit the role array.
 */
export const featurePermissions: Record<string, UserRole[]> = {
  '/manufacturer-order':    ['admin'],
  '/manufacturer-orders':   ['admin'],
  '/sell-back':             ['admin'],
  '/edit-orders':           ['admin'],
  '/financial-management':  ['admin'],
  '/swap-products':         ['admin'],
  '/users':                 ['admin'],
};

export function isFeatureAllowed(route: string, role: string | null | undefined): boolean {
  const allowedRoles = featurePermissions[route];
  if (!allowedRoles) return true;
  return !!role && allowedRoles.includes(role as UserRole);
}
