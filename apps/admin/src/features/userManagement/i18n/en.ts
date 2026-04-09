import type { default as es } from './es';

const userManagement = {
  title: 'User management',
  table: {
    name: 'Name',
    email: 'Email',
    status: 'Status',
    actions: 'Actions',
  },
  actions: {
    create: 'Create user',
    edit: 'Edit',
    delete: 'Delete',
  },
} as const satisfies DeepString<typeof es>;

export default userManagement;
