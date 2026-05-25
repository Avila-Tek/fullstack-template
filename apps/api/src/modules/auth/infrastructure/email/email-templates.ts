import { baseEmailLayout, htmlTemplateTag as html } from '@zoom/utils';
import type { SendFailedLoginAlertEmailParams } from '../../application/ports/out/email-service.port';
import { env } from '../../env';

const layout = (params: Parameters<typeof baseEmailLayout>[0]) =>
	baseEmailLayout({ ...params, logoUrl: env.EMAIL_LOGO_URL });

export const EmailTemplates = {
	verificationEmail: (url: string): string =>
		layout({
			title: 'Activa tu cuenta',
			bodyHtml: html`<p>¡Bienvenido a Mi ZOOM!</p>
<p>Ya casi todo está listo. Para activar tu cuenta y comenzar a gestionar tus envíos, confirma tu correo electrónico desde el siguiente botón.</p>`,
			primaryCta: { text: 'Activar cuenta', url },
			ignoreNotice: 'Si no creaste esta cuenta, puedes ignorar este mensaje.',
		}),

	welcomeEmail: (appUrl: string): string =>
		layout({
			title: '¡Bienvenido a Mi ZOOM!',
			bodyHtml: html`<p>¡Tu correo electrónico ha sido verificado exitosamente!</p>
<p>Ya puedes acceder a Mi ZOOM y comenzar a gestionar tus envíos.</p>`,
			primaryCta: { text: 'Ir a Mi ZOOM', url: appUrl },
		}),

	passwordResetEmail: (url: string, expiresIn: string): string =>
		layout({
			title: 'Restablece tu contraseña',
			bodyHtml: html`<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
<p>Para continuar, selecciona la siguiente opción. Este enlace expira en ${expiresIn}.</p>`,
			primaryCta: { text: 'Restablecer contraseña', url },
			ignoreNotice:
				'Si no solicitaste un restablecimiento de contraseña, puedes ignorar este mensaje.',
		}),

	loginAlertEmail: (
		deviceName: string,
		ip: string,
		timestamp: Date,
		recoveryUrl: string,
	): string => {
		const ts = timestamp.toUTCString();
		return layout({
			title: 'Nuevo inicio de sesión detectado',
			bodyHtml: html`<p>Detectamos un nuevo inicio de sesión en tu cuenta:</p>
<ul>
  <li><strong>Dispositivo:</strong> ${deviceName}</li>
  <li><strong>Dirección IP:</strong> ${ip}</li>
  <li><strong>Fecha:</strong> ${ts}</li>
</ul>`,
			primaryCta: { text: 'No fui yo — proteger mi cuenta', url: recoveryUrl },
			ignoreNotice: 'Si reconoces este acceso, no es necesario que hagas nada.',
		});
	},

	emailChangeVerificationEmail: (verificationUrl: string): string =>
		layout({
			title: 'Confirma tu nuevo correo',
			bodyHtml: html`<p>Recibimos una solicitud para cambiar el correo electrónico de tu cuenta.</p>
<p>Para confirmar el cambio, selecciona la siguiente opción. Este enlace expira en 24 horas.</p>`,
			primaryCta: { text: 'Confirmar cambio de correo', url: verificationUrl },
			ignoreNotice:
				'Si no solicitaste este cambio, puedes ignorar este mensaje.',
		}),

	sessionRevokedEmail: (twoFactorForced: boolean): string => {
		const twoFactorNotice = twoFactorForced
			? html`<p>La autenticación de dos factores por correo ha sido activada en tu cuenta.</p>`
			: '';
		return layout({
			title: 'Alerta de seguridad: sesiones terminadas',
			bodyHtml: html`<p>Tus sesiones fueron terminadas por un administrador de seguridad.</p>
$${twoFactorNotice}`,
		});
	},

	twoFactorOtpEmail: (otp: string): string =>
		layout({
			title: 'Tu código de verificación',
			bodyHtml: html`<p>Tu código de verificación de dos factores es:</p>
<p style="font-size:2em;font-weight:bold;letter-spacing:0.2em;">${otp}</p>
<p>Este código expira en 5 minutos. No lo compartas con nadie.</p>`,
		}),

	failedLoginAlertEmail: (params: SendFailedLoginAlertEmailParams): string => {
		const ts = params.timestamp.toUTCString();
		return layout({
			title: 'Intentos de inicio de sesión fallidos',
			bodyHtml: html`<p>Detectamos múltiples intentos de inicio de sesión fallidos en tu cuenta:</p>
<ul>
  <li><strong>Fecha:</strong> ${ts}</li>
  <li><strong>Dirección IP:</strong> ${params.ipAddress}</li>
  <li><strong>Dispositivo:</strong> ${params.userAgent}</li>
</ul>`,
			primaryCta: params.twoFactorSuggested
				? { text: 'Habilitar 2FA', url: params.twoFactorSettingsUrl }
				: undefined,
			ignoreNotice:
				'Si reconoces estos intentos, no es necesario que hagas nada.',
		});
	},
} as const;
