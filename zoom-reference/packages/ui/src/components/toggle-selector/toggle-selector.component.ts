import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

@Component({
  selector: 'app-toggle-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: '<ng-content />',
  host: { role: 'group' },
})
export class ToggleSelectorComponent {
  private readonly _value = signal<string | null>(null);
  readonly currentValue = this._value.asReadonly();

  @Input()
  set value(v: string | null) {
    this._value.set(v);
  }

  @Output() readonly valueChange = new EventEmitter<string>();

  select(v: string): void {
    this._value.set(v);
    this.valueChange.emit(v);
  }
}
