import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import posthog from 'posthog-js';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface PostHogConfig {
  token: string;
  /** Environment prefix applied to all flag names (e.g. "prod-my-flag") */
  env?: string;
  options?: Parameters<typeof posthog.init>[1];
}

/**
 * Angular service wrapping PostHog.
 *
 * Provide at the root level or in an app config:
 *   providers: [PostHogService]
 *
 * Then call init() once during app bootstrap (e.g. in APP_INITIALIZER).
 */
@Injectable({ providedIn: 'root' })
export class PostHogService implements OnDestroy {
  private envPrefix = '';
  private routerSub?: Subscription;

  constructor(private readonly router: Router) {}

  init(config: PostHogConfig): void {
    if (typeof window === 'undefined') return;

    this.envPrefix = config.env ? `${config.env}-` : '';

    posthog.init(config.token, {
      person_profiles: 'identified_only',
      capture_pageview: false,
      ...config.options,
    });

    this.trackPageViews();
  }

  isEnabled(flagName: string): boolean {
    return Boolean(posthog.isFeatureEnabled(`${this.envPrefix}${flagName}`));
  }

  getPayload(flagName: string): unknown {
    return posthog.getFeatureFlagPayload(`${this.envPrefix}${flagName}`);
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    posthog.capture(eventName, properties ?? {});
  }

  identifyUser(user: { id: string } & Record<string, unknown>): void {
    posthog.identify(user.id, user);
  }

  private trackPageViews(): void {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        posthog.capture('$pageview', { $current_url: e.urlAfterRedirects });
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
