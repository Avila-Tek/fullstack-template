import { Injectable, OnDestroy } from '@angular/core';
import type { Context } from '@growthbook/growthbook';
import { GrowthBook } from '@growthbook/growthbook';

/**
 * Angular service wrapping GrowthBook.
 *
 * Call init() once during app bootstrap (e.g. in APP_INITIALIZER).
 */
@Injectable({ providedIn: 'root' })
export class GrowthBookService implements OnDestroy {
  private gb: GrowthBook | null = null;

  async init(context: Context): Promise<void> {
    if (typeof window === 'undefined') return;

    this.gb = new GrowthBook({
      enableDevMode: true,
      trackingCallback: (experiment, result) => {
        console.log('Experiment Viewed', {
          experimentId: experiment.key,
          variationId: result.key,
        });
      },
      ...context,
    });

    await this.gb.init({ streaming: true });
  }

  isEnabled(flagName: string): boolean {
    return Boolean(this.gb?.isOn(flagName));
  }

  getPayload<T = unknown>(flagName: string, fallback: T): T {
    return (this.gb?.getFeatureValue(flagName, fallback) ?? fallback) as T;
  }

  setAttributes(attributes: Record<string, unknown>): void {
    this.gb?.setAttributes(attributes);
  }

  ngOnDestroy(): void {
    this.gb?.destroy();
  }
}
