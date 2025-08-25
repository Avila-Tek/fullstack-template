'use client';

import React from 'react';

/**
 * Context methods for interacting with feature flags.
 */
export type TFeatureFlagContext = {
  /**
   * Checks if a feature flag is enabled.
   * @param {string} name - Name of the feature flag.
   * @returns {boolean} Whether the flag is enabled.
   */
  useFeatureFlagValue: (name: string) => boolean;

  /**
   * Retrieves payload data associated with a feature flag.
   * @param {string} name - Name of the feature flag.
   * @returns {unknown} Payload data of the feature flag.
   */
  useFeatureFlagPayload: (name: string) => unknown;

  /**
   * Associates user-specific attributes for targeted flags.
   * @param {any} user - User attributes for targeting.
   */
  useIdUser: (user: any) => void;
};

/**
 * Internal context for managing feature flag state.
 */
export type TInternalFeatureFlagContext = {
  context: TFeatureFlagContext;
  setContext: React.Dispatch<React.SetStateAction<TFeatureFlagContext>>;
};

/** React context for managing feature flag configuration. */
export const FeatureFlagContext =
  React.createContext<TInternalFeatureFlagContext | null>(null);
