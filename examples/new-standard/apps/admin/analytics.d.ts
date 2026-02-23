declare module '@analytics/google-analytics' {
  import type { AnalyticsPlugin } from 'analytics';
  function GoogleAnalytics(options: any): AnalyticsPlugin;
  export default GoogleAnalytics;
}

declare module '@analytics/google-tag-manager' {
  import type { AnalyticsPlugin } from 'analytics';
  function googleTagManager(config: any): AnalyticsPlugin;
  export default googleTagManager;
}
