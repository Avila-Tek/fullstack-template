import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  SecurityContext,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-rich-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `<div class="rich-text" [innerHTML]="safeHtml()"></div>`,
  styles: [
    `
    .rich-text h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; }
    .rich-text h2 { font-size: 1.125rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
    .rich-text h3 { font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.375rem; }
    .rich-text p  { margin-bottom: 0.75rem; line-height: 1.6; }
    .rich-text ul, .rich-text ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
    .rich-text li { margin-bottom: 0.25rem; }
    .rich-text a  { color: var(--color-brand-600); text-decoration: underline; }
    `,
  ],
})
export class AppRichTextComponent {
  /** RAW HTML — bind only to admin-controlled content; never to end-user input. */
  readonly content = input('');

  private readonly sanitizer = inject(DomSanitizer);

  safeHtml(): string {
    return this.sanitizer.sanitize(SecurityContext.HTML, this.content()) ?? '';
  }
}
