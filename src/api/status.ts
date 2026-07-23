export const BINARY_STATUS = {
  DISABLED: 0,
  ENABLED: 1
} as const;

export type StatusCode = (typeof BINARY_STATUS)[keyof typeof BINARY_STATUS];
