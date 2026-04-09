const auth = {
  validation: {
    emailRequired: 'El correo es obligatorio',
    emailInvalid: 'Por favor ingresa un correo válido',
    passwordRequired: 'La contraseña es obligatoria',
  },
} as const;

export default auth;
