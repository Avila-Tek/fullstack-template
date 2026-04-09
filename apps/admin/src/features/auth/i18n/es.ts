const auth = {
  validation: {
    emailRequired: 'El correo es obligatorio',
    emailInvalid: 'Por favor ingresa un correo válido',
    passwordRequired: 'La contraseña es obligatoria',
    passwordMin: 'La contraseña debe tener al menos 8 caracteres',
  },
} as const;

export default auth;
