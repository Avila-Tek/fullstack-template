import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppRequireRoleDirective } from '../../src/directives/require-role.directive';

@Component({
  standalone: true,
  imports: [AppRequireRoleDirective],
  template: `
    <ng-container *appRequireRole="show">
      <span class="content">visible</span>
    </ng-container>
  `,
})
class TestHostComponent {
  @Input() show = true;
}

describe('AppRequireRoleDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
  });

  it('renders content when condition is true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.show = true;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.content')).not.toBeNull();
  });

  it('hides content when condition is false', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentInstance.show = false;
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.content')).toBeNull();
  });

  it('renders content when toggled from false to true', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.componentRef.setInput('show', false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.content')).toBeNull();

    fixture.componentRef.setInput('show', true);
    fixture.detectChanges();
    expect(el.querySelector('.content')).not.toBeNull();
  });
});
