import { z } from 'zod';

const emailValidation = z
  .string()
  .min(1, 'El correo es obligatorio')
  .email('Por favor ingresa un correo válido');

export const loginFormDefinition = z.object({
  email: emailValidation,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type TLoginForm = z.infer<typeof loginFormDefinition>;

export function createLoginDefaultValues(
  partial?: Partial<TLoginForm>
): TLoginForm {
  return {
    email: partial?.email ?? '',
    password: partial?.password ?? '',
  };
}
