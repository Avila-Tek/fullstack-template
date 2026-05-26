import { baseEmailLayout } from '@zoom/utils';
import { describe, expect, it } from 'vitest';

describe('baseEmailLayout', () => {
  it('renders the Zoom logo image with default URL', () => {
    const html = baseEmailLayout({ title: 'Test', bodyHtml: '<p>body</p>' });
    expect(html).toContain('<img');
    expect(html).toContain(
      'storage.googleapis.com/zoom-public-files/zoom-logo.png'
    );
    expect(html).toContain('alt="ZOOM"');
    expect(html).toContain('width="104"');
    expect(html).toContain('height="34"');
  });

  it('renders the Zoom logo image with a custom logoUrl', () => {
    const html = baseEmailLayout({
      title: 'Test',
      bodyHtml: '<p>body</p>',
      logoUrl: 'https://example.com/custom-logo.png',
    });
    expect(html).toContain('https://example.com/custom-logo.png');
    expect(html).not.toContain('zoom-public-files');
  });

  it('renders title in output', () => {
    const html = baseEmailLayout({
      title: 'Mi título',
      bodyHtml: '<p>body</p>',
    });
    expect(html).toContain('Mi título');
  });

  it('renders bodyHtml verbatim', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p class="x">custom body</p>',
    });
    expect(html).toContain('<p class="x">custom body</p>');
  });

  it('renders primary CTA button with correct href when primaryCta is provided', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      primaryCta: {
        text: 'Activar cuenta',
        url: 'https://example.com/activate',
      },
    });
    expect(html).toContain('href="https://example.com/activate"');
    expect(html).toContain('Activar cuenta');
  });

  it('renders fallback link with same href when primaryCta is provided', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      primaryCta: { text: 'Activar', url: 'https://example.com/activate' },
    });
    expect(html).toContain('Si el botón no funciona, usa este enlace');
    const hrefCount = (
      html.match(/href="https:\/\/example\.com\/activate"/g) ?? []
    ).length;
    expect(hrefCount).toBeGreaterThanOrEqual(2);
  });

  it('omits CTA section and fallback link when no primaryCta', () => {
    const html = baseEmailLayout({ title: 'T', bodyHtml: '<p>b</p>' });
    expect(html).not.toContain('Si el botón no funciona, usa este enlace');
    expect(html).not.toContain('bg:#007ee8');
    expect(html).not.toContain('#007ee8');
  });

  it('renders ignoreNotice when provided', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      ignoreNotice: 'Si no creaste esta cuenta, puedes ignorar este mensaje.',
    });
    expect(html).toContain(
      'Si no creaste esta cuenta, puedes ignorar este mensaje.'
    );
  });

  it('omits ignoreNotice when not provided', () => {
    const html = baseEmailLayout({ title: 'T', bodyHtml: '<p>b</p>' });
    expect(html).not.toContain('puedes ignorar este mensaje');
  });

  it('always renders the auto-email notice', () => {
    const html = baseEmailLayout({ title: 'T', bodyHtml: '<p>b</p>' });
    expect(html).toContain(
      'Este es un correo automático de Mi ZOOM. No respondas a este mensaje.'
    );
  });

  it('always renders "El equipo de Zoom"', () => {
    const html = baseEmailLayout({ title: 'T', bodyHtml: '<p>b</p>' });
    expect(html).toContain('El equipo de Zoom');
  });

  it('always renders "Contáctanos" with mailto:soporte@zoom.com.ve', () => {
    const html = baseEmailLayout({ title: 'T', bodyHtml: '<p>b</p>' });
    expect(html).toContain('Contáctanos');
    expect(html).toContain('mailto:soporte@zoom.com.ve');
  });

  it('escapes <script> XSS in title', () => {
    const html = baseEmailLayout({
      title: '<script>alert("xss")</script>',
      bodyHtml: '<p>b</p>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes <script> XSS in primaryCta.text', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      primaryCta: {
        text: '<script>alert("xss")</script>',
        url: 'https://example.com',
      },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes <script> XSS in ignoreNotice', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      ignoreNotice: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('blocks javascript: protocol in primaryCta.url and replaces with #', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      primaryCta: { text: 'Click', url: 'javascript:alert(1)' },
    });
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
  });

  it('encodes HTML-special characters in primaryCta.url', () => {
    const html = baseEmailLayout({
      title: 'T',
      bodyHtml: '<p>b</p>',
      primaryCta: {
        text: 'Click',
        url: 'https://example.com?x=<script>alert("xss")</script>',
      },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('%3Cscript%3E');
    expect(html).not.toContain('"alert(');
  });
});
