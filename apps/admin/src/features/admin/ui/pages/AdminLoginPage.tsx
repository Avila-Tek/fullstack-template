'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { isAdmin } from '@repo/auth';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useSignInMutation } from '@/src/features/auth/application/mutations/useLogin.mutation';
import {
  createLoginDefaultValues,
  loginFormDefinition,
  type TLoginForm,
} from '@/src/features/auth/infrastructure/auth.form';
import { useUser } from '@/src/shared/hooks/useUser';

export function AdminLoginPage() {
  const router = useRouter();
  const { user, setSession, clearSession, refetchUser } = useUser();
  const signInMutation = useSignInMutation();
  const [error, setError] = React.useState<string | null>(null);
  const [isValidatingRole, setIsValidatingRole] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TLoginForm>({
    defaultValues: createLoginDefaultValues(),
    resolver: zodResolver(loginFormDefinition),
  });

  // Verificar rol después de que el usuario se actualice
  React.useEffect(() => {
    if (isValidatingRole && user) {
      if (isAdmin(user)) {
        router.push('/admin/dashboard');
      } else {
        clearSession();
        setError('Acceso denegado. Solo los administradores pueden acceder.');
        setIsValidatingRole(false);
      }
    }
  }, [user, isValidatingRole, router, clearSession]);

  async function onSubmit(data: TLoginForm) {
    setError(null);
    try {
      const session = await signInMutation.mutateAsync(data);

      // Guardar la sesión primero
      setSession({
        user: {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          timezone: session.user.timezone ?? '',
          status: session.user.status,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
        },
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });

      // Obtener el usuario completo con el rol
      setIsValidatingRole(true);
      await refetchUser();
      // La validación del rol se hace en el useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  }

  const isLoading =
    isSubmitting || signInMutation.isPending || isValidatingRole;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">
            Panel de Administración
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Acceso exclusivo para administradores
          </p>
        </div>

        <div className="bg-white rounded-lg p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo electrónico
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-400"
                placeholder="admin@ejemplo.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-gray-900 bg-white placeholder-gray-400"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            ¿No eres administrador?{' '}
            <a
              href={
                process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3002'
              }
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ir al sitio principal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
