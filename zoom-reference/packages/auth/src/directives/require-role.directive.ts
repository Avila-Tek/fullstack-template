import {
  Directive,
  Input,
  inject,
  OnChanges,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

/**
 * Structural directive that conditionally renders content based on a boolean
 * predicate. Pass the evaluated role/permission check from the component.
 * Full role-based predicate wiring is E-002 scope.
 *
 * Usage:
 *   <div *appRequireRole="isAdmin()">Admin content</div>
 */
@Directive({ selector: '[appRequireRole]', standalone: true })
export class AppRequireRoleDirective implements OnChanges {
  @Input({ required: true }) appRequireRole!: boolean;

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  ngOnChanges(): void {
    this.viewContainer.clear();
    if (this.appRequireRole) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
