const userManagement = {
  title: 'Gestión de usuarios',
  table: {
    name: 'Nombre',
    email: 'Correo',
    status: 'Estado',
    actions: 'Acciones',
  },
  actions: {
    create: 'Crear usuario',
    edit: 'Editar',
    delete: 'Eliminar',
  },
} as const;

export default userManagement;
