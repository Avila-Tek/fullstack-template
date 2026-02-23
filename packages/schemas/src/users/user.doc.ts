import { z } from 'zod';
import { buildPaginationSchemaForModel } from '../pagination';
import { updateUserInput } from './user.dto';
import { userSchema } from './user.schema';

const idParam = z.object({
  id: z.string().uuid(),
});

const paginatedUsersResponse = buildPaginationSchemaForModel(userSchema);

const successResponse = z.object({
  success: z.boolean(),
});

export const userDocs = {
  findMany: {
    summary: 'List all users with pagination',
    description: `
Returns a paginated list of users.

**Query parameters:**
- \`page\` - Page number (default: 1)
- \`perPage\` - Items per page (default: 10)

**Requirements:**
- Valid Bearer token in Authorization header

**Response includes:**
- \`items\` - Array of user objects
- \`count\` - Total number of users
- \`pageInfo\` - Pagination metadata (currentPage, perPage, hasNextPage, etc.)
    `.trim(),
    tags: ['users'],
    response: {
      200: paginatedUsersResponse,
    },
  },

  findOne: {
    summary: 'Get a user by ID',
    description: `
Retrieves a single user by their UUID.

**Requirements:**
- Valid Bearer token in Authorization header

**Possible errors:**
- \`404\` - User not found
    `.trim(),
    tags: ['users'],
    params: idParam,
    response: {
      200: userSchema,
    },
  },

  updateOne: {
    summary: 'Update a user',
    description: `
Updates an existing user's information.

**Updatable fields:**
- \`email\` - User's email address
- \`name\` - User's display name
- \`timezone\` - User's timezone
- \`status\` - Account status ('Active' or 'Disabled')

**Requirements:**
- Valid Bearer token in Authorization header

**Possible errors:**
- \`404\` - User not found
- \`400\` - Invalid input data
    `.trim(),
    tags: ['users'],
    params: idParam,
    body: updateUserInput,
    response: {
      200: userSchema,
    },
  },

  deleteOne: {
    summary: 'Delete a user',
    description: `
Soft-deletes a user by their UUID.

**Note:** This performs a soft delete - the user record is marked as deleted but not physically removed from the database.

**Requirements:**
- Valid Bearer token in Authorization header

**Possible errors:**
- \`404\` - User not found
    `.trim(),
    tags: ['users'],
    params: idParam,
    response: {
      200: successResponse,
    },
  },
} as const;

export { idParam as userIdParam };
