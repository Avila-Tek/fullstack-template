/**
 * User domain model - frontend-friendly shape
 * This represents the user entity as used in the UI layer
 */

export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  timezone: string;
  status: UserStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UserListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface PageInfo {
  currentPage: number;
  perPage: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedUsers {
  count: number;
  items: User[];
  pageInfo: PageInfo;
}
