declare module 'analytics' {
  export interface AnalyticsInstance {
    page?: (data?: any) => void;
    track: (event: string, data?: any) => void;
    identify: (id: string, traits?: any) => void;
    reset?: () => void;
  }

  export interface AnalyticsPlugin {
    name: string;
    initialize?: (args: any) => void;
    page?: (args: any) => void;
    track?: (args: any) => void;
    identify?: (args: any) => void;
    loaded?: () => boolean;
  }

  interface AnalyticsConfig {
    app: string;
    plugins: AnalyticsPlugin[];
    debug?: boolean;
  }

  interface AnalyticsConstructor {
    (config: AnalyticsConfig): AnalyticsInstance;
  }

  const Analytics: AnalyticsConstructor;
  export default Analytics;
}

declare module '@analytics/google-analytics' {
  import type { AnalyticsPlugin } from 'analytics';
  function GoogleAnalytics(options: any): AnalyticsPlugin;
  export default GoogleAnalytics;
}

declare module '@analytics/google-tag-manager' {
  import type { AnalyticsPlugin } from 'analytics';
  function GoogleTagManager(options: any): AnalyticsPlugin;
  export default GoogleTagManager;
}
