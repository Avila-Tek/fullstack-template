import { htmlTemplateTag as html } from '../html/html-template-tag';

const SUPPORT_MAILTO = 'mailto:soporte@zoom.com.ve';
const DEFAULT_LOGO_URL =
  'https://storage.googleapis.com/zoom-public-files/zoom-logo.png';

function safeUrl(url: string): string {
  try {
    const { protocol } = new URL(url);
    if (!['https:', 'http:', 'mailto:'].includes(protocol)) return '#';
    return url.replace(
      /[<>"]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
  } catch {
    return '#';
  }
}

interface BaseEmailLayoutParams {
  title: string;
  bodyHtml: string;
  primaryCta?: { text: string; url: string };
  ignoreNotice?: string;
  logoUrl?: string;
}

export function baseEmailLayout(params: BaseEmailLayoutParams): string {
  const logoUrl = params.logoUrl ?? DEFAULT_LOGO_URL;
  const ctaBlock = params.primaryCta
    ? html`<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
        <tr><td>
          <a href="$${safeUrl(params.primaryCta.url)}" style="display:inline-block;background-color:#007ee8;color:#ffffff;border-radius:8px;padding:8px 12px;font-size:14px;line-height:20px;font-weight:600;text-decoration:none;">${params.primaryCta.text}</a>
        </td></tr>
        <tr><td style="padding-top:8px;">
          <a href="$${safeUrl(params.primaryCta.url)}" style="color:#007ee8;font-size:14px;line-height:20px;font-weight:600;text-decoration:underline;">Si el botón no funciona, usa este enlace</a>
        </td></tr>
      </table>`
    : '';

  const ignoreBlock = params.ignoreNotice
    ? html`<p style="font-size:14px;line-height:20px;color:#475467;margin:32px 0 0 0;">${params.ignoreNotice}</p>`
    : '';

  return html`<div style="background-color:#e6f3ff;width:100%;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding-top:32px;">
  <div style="padding:0 56px 24px;"><img src="$${logoUrl}" alt="ZOOM" width="104" height="34" style="display:block;"></div>
  <div style="padding:0 56px;">
    <div style="background-color:#ffffff;border-radius:6px;padding:24px 20px;">
      <h1 style="font-size:20px;line-height:30px;font-weight:600;color:#344054;margin:0 0 20px 0;">${params.title}</h1>
      <div style="font-size:14px;line-height:20px;color:#475467;">$${params.bodyHtml}</div>
      $${ctaBlock}
      $${ignoreBlock}
      <p style="font-size:14px;line-height:20px;color:#475467;margin:32px 0 0 0;">Este es un correo automático de Mi ZOOM. No respondas a este mensaje.<br><span style="font-weight:600;">El equipo de Zoom</span></p>
    </div>
  </div>
  <div style="padding:24px 64px 32px;">
    <p style="font-size:14px;line-height:20px;color:#344054;margin:0;">¿Necesitas ayuda? <a href="$${SUPPORT_MAILTO}" style="color:#3483fa;text-decoration:none;">Contáctanos</a></p>
  </div>
  </div>
</div>`;
}
