'use client';

import React from 'react';
import { redirect } from 'next/navigation';
import { useFeatureFlagValue } from '../hooks/useFeatureFlags';

interface FeatureFlagWrapperProps {
  flagName: string;
  redirectTo?: string;
  replaceWith?: React.ReactNode;
  children: React.ReactNode;
  loaderType?: 'page' | 'section' | 'component';
}

/**
 * A wrapper component that conditionally renders its children based on the value of a feature flag.
 * It handles loading states, redirects, and replacements when the flag is disabled.
 *
 * @param flagName - The name of the feature flag to check.
 * @param redirectTo - Optional URL to redirect to if the flag is disabled and the loaderType is 'page'.
 * @param replaceWith - Optional React node to render instead of children if the flag is disabled and the loaderType is not 'page'.
 * @param children - The children to render if the flag is enabled.
 * @param loaderType - Type of loader to show during flag loading. Defaults to 'page'.
 * @returns The rendered component based on the flag state.
 */
export function FeatureFlagWrapper({
  flagName,
  redirectTo,
  replaceWith,
  children,
  loaderType = 'page',
}: FeatureFlagWrapperProps) {
  // State to hold the current flag value, null indicates loading
  const [flag, setFlag] = React.useState<boolean | null>(null);
  // Get the flag value from the custom hook
  const ph_flag = useFeatureFlagValue(flagName);

  // Update local state when the hook provides a value
  React.useEffect(() => {
    if (typeof ph_flag !== 'undefined') {
      setFlag(ph_flag);
    }
  });

  // Handle loading state
  if (flag === null) {
    if (loaderType === 'component') return <></>; // No loader for component type
    // NOTE: Import Loader component from @repo/ui or any other preferred component
    // return <Loader />;
    return <div className="h-full text-2xl font-semibold">Cargando...</div>;
  }

  // Handle disabled flag
  if (!flag) {
    if (redirectTo) return redirect(redirectTo); // Redirect if specified
    return replaceWith; // Otherwise, render replacement content
  }

  // Render children if flag is enabled
  return <>{children}</>;
}
