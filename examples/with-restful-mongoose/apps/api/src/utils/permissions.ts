import type { TUser } from '@repo/schemas';

/**
 * Middleware to validate a user's permissions to access a resource
 *
 * @param user User making the request
 * @param section Section the user wants to access
 * @param access Action the user wants to perform
 * @returns Throws an error if the user does not have permission to access the resource
 */
export const validatePermission = async (
  user: TUser,
  section: any, // TODO: Fix this thing @lstanislao
  access: any // TODO: Fix this thing @lstanislao
) => {
  let hasPermission = false;
  const permissions: any[] = []; // user.permissions TODO: Fix this thing @lstanislao

  // Iterate over each user permission
  for (const permission of permissions) {
    // Check if the permission exists and matches the section and access
    if (
      permission &&
      permission.value === section &&
      permission.access.includes(access)
    ) {
      hasPermission = true;
      break;
    }
  }

  if (!hasPermission) {
    throw new Error('403-permission');
  }
};
