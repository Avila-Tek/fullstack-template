import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  output,
  signal,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import type { ClassValue } from 'clsx';
import { mergeClasses } from '../../utils/merge-classes';
import { ZardIconComponent } from '../icon/icon.component';
import {
  selectTriggerVariants,
  type ZardSelectSizeVariants,
} from './select.variants';
import { ZardSelectItemComponent } from './select-item.component';

@Component({
  selector: 'z-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, ZardIconComponent],
  template: `
    @if (zLabel()) {
      <div class="mb-1.5 flex items-center gap-0.5">
        <label class="text-sm font-medium txt-secondary-700">{{ zLabel() }}</label>
        @if (zRequired()) {
          <span class="text-sm text-brand-600" aria-hidden="true">*</span>
        }
      </div>
    }
    <button
      type="button"
      [class]="triggerClasses()"
      [disabled]="zDisabled() || null"
      (click)="toggle()"
    >
      <span
        class="flex-1 truncate text-left"
        [class]="selectedLabel() ? 'txt-primary-900' : 'txt-placeholder'"
      >
        {{ selectedLabel() || zPlaceholder() }}
      </span>
      @if (zLoading()) {
        <z-icon
          zType="loader-circle"
          class="shrink-0 txt-quaternary-400 animate-spin"
          zSize="default"
        />
      } @else {
        <z-icon
          zType="chevron-down"
          class="shrink-0 txt-quaternary-400 transition-transform duration-200"
          [class.rotate-180]="isOpen()"
          zSize="default"
        />
      }
    </button>

    <!-- popover="manual" renders in the browser top layer, above any dialog/overflow constraint -->
    <div
      #dropdownEl
      [attr.popover]="'manual'"
      class="m-0 max-h-60 overflow-y-auto rounded-lg border border-primary bg-surface shadow-lg"
      [style.position]="'fixed'"
      [style.top.px]="dropdownRect()?.top ?? 0"
      [style.left.px]="dropdownRect()?.left ?? 0"
      [style.width.px]="dropdownRect()?.width ?? 0"
      [style.right]="'auto'"
      [style.bottom]="'auto'"
      [style.padding]="'0'"
    >
      @if (zSearchable()) {
        <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-primary bg-surface px-3 py-2">
          <z-icon
            zType="search"
            class="shrink-0 txt-quaternary-400"
            zSize="sm"
          />
          <input
            #searchInput
            type="text"
            class="w-full bg-transparent text-sm txt-primary-900 outline-none placeholder:txt-quaternary-500"
            [placeholder]="zPlaceholder()"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      }
      <div class="py-1">
        @if (zLoading()) {
          <div class="flex items-center justify-center py-6">
            <z-icon
              zType="loader-circle"
              class="txt-quaternary-400 animate-spin"
              zSize="default"
            />
          </div>
        } @else {
          @for (item of filteredItems(); track item.zValue()) {
            <button
              type="button"
              class="w-full cursor-pointer px-3.5 py-2.5 text-left text-sm txt-primary-900 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              [class.bg-secondary]="item.zValue() === zValue()"
              [disabled]="item.zDisabled() || null"
              (click)="selectItem(item.zValue())"
            >
              @if (item.customTpl(); as tpl) {
                <ng-container [ngTemplateOutlet]="tpl" />
              } @else {
                {{ item.label() }}
              }
            </button>
          } @empty {
            @if (zEmptyText()) {
              <div class="px-3.5 py-2.5 text-sm txt-quaternary-500">
                {{ zEmptyText() }}
              </div>
            }
          }
        }
      </div>
    </div>

    <ng-content />
  `,
  host: {
    '[class]': 'hostClasses()',
  },
  exportAs: 'zSelect',
})
export class ZardSelectComponent implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly dropdownRef =
    viewChild<ElementRef<HTMLElement>>('dropdownEl');
  private readonly searchInputRef =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly class = input<ClassValue>('');
  readonly zLabel = input('');
  readonly zRequired = input(false, { transform: booleanAttribute });
  readonly zValue = model<string>('');
  readonly zPlaceholder = input('');
  readonly zDisabled = input(false, { transform: booleanAttribute });
  readonly zSize = input<ZardSelectSizeVariants>('default');
  readonly zSearchable = input(false, { transform: booleanAttribute });
  readonly zServerSearch = input(false, { transform: booleanAttribute });
  readonly zLoading = input(false, { transform: booleanAttribute });
  readonly zEmptyText = input('');
  readonly zSelectionChange = output<string>();
  readonly zSearchChange = output<string>();

  readonly isOpen = signal(false);
  readonly searchTerm = signal('');
  readonly dropdownRect = signal<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  readonly items = contentChildren(ZardSelectItemComponent);

  readonly filteredItems = computed(() => {
    if (this.zServerSearch()) {
      return this.items();
    }
    const term = this.searchTerm().toLowerCase();
    if (!this.zSearchable() || !term) {
      return this.items();
    }
    return this.items().filter((i) => i.label().toLowerCase().includes(term));
  });

  readonly selectedLabel = computed(() => {
    const value = this.zValue();
    return (
      this.items()
        .find((i) => i.zValue() === value)
        ?.label() ?? ''
    );
  });

  readonly hostClasses = computed(() =>
    mergeClasses('relative block', this.class())
  );

  readonly triggerClasses = computed(() =>
    selectTriggerVariants({ zSize: this.zSize() })
  );

  private readonly clickOutsideHandler = (event: MouseEvent) => {
    if (
      event.target instanceof Node &&
      !this.el.nativeElement.contains(event.target)
    ) {
      this.closeDropdown();
    }
  };

  private readonly scrollHandler = () => {
    if (this.isOpen()) {
      this.updateDropdownPosition();
    }
  };

  constructor() {
    afterNextRender(() => {
      document.addEventListener('click', this.clickOutsideHandler);
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.clickOutsideHandler);
    this.closeDropdown();
  }

  toggle(): void {
    if (!this.zDisabled()) {
      if (this.isOpen()) {
        this.closeDropdown();
      } else {
        this.openDropdown();
      }
    }
  }

  private updateDropdownPosition(): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    this.dropdownRect.set({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }

  private openDropdown(): void {
    this.searchTerm.set('');
    this.updateDropdownPosition();
    const el = this.dropdownRef()?.nativeElement;
    if (el && 'showPopover' in el) {
      (el as HTMLElement & { showPopover(): void }).showPopover();
    }
    this.isOpen.set(true);
    window.addEventListener('scroll', this.scrollHandler, true);
    if (this.zSearchable()) {
      setTimeout(() => this.searchInputRef()?.nativeElement.focus());
    }
  }

  private closeDropdown(): void {
    window.removeEventListener('scroll', this.scrollHandler, true);
    const el = this.dropdownRef()?.nativeElement;
    if (el && 'hidePopover' in el) {
      try {
        (el as HTMLElement & { hidePopover(): void }).hidePopover();
      } catch {
        // hidePopover throws if the element is not currently showing
      }
    }
    this.isOpen.set(false);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.zSearchChange.emit(value);
  }

  selectItem(value: string): void {
    this.zValue.set(value);
    this.zSelectionChange.emit(value);
    this.searchTerm.set('');
    this.closeDropdown();
  }
}
