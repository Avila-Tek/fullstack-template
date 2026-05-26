import { baseEmailLayout, htmlTemplateTag as html } from '@zoom/utils';
import { env } from '../../../env';

const layout = (params: Parameters<typeof baseEmailLayout>[0]) =>
	baseEmailLayout({ ...params, logoUrl: env.EMAIL_LOGO_URL });

export const EmailTemplates = {
	invitationEmail: (invitationUrl: string): string =>
		layout({
			title: 'Tienes una invitación',
			bodyHtml: html`<p>Has sido invitado a unirte a una organización en Mi ZOOM.</p>
<p>Para aceptar la invitación, selecciona la siguiente opción.</p>`,
			primaryCta: { text: 'Aceptar invitación', url: invitationUrl },
		}),

	collaboratorSuspendedEmail: (): string =>
		layout({
			title: 'Tu cuenta ha sido suspendida',
			bodyHtml: html`<p>Tu cuenta de colaborador ha sido suspendida por el administrador de la cuenta.</p>
<p>No podrás acceder a la plataforma hasta que sea reactivada. Si crees que esto es un error, contáctanos.</p>`,
		}),

	collaboratorReactivatedEmail: (): string =>
		layout({
			title: 'Tu cuenta ha sido reactivada',
			bodyHtml: html`<p>Tu cuenta de colaborador ha sido reactivada por el administrador de la cuenta.</p>
<p>Ya puedes acceder a la plataforma nuevamente.</p>`,
		}),

	collaboratorRemovedEmail: (): string =>
		layout({
			title: 'Fuiste removido de la organización',
			bodyHtml: html`<p>Tu cuenta de colaborador ha sido eliminada de la organización.</p>
<p>Ya no tienes acceso a la plataforma. Si crees que esto es un error, contáctanos.</p>`,
		}),
} as const;
