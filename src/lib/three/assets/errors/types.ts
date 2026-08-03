/**
 * Asset Error Types
 * 
 * Categorizes different types of errors that can occur during asset loading
 */
export enum AssetErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}
