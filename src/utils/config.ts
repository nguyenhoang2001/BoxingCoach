// Runtime configuration utilities

// Get the base path from the runtime configuration
export function getBasePath(): string {
  // @ts-ignore - This is injected at runtime
  return window.__BASE_PATH__ || '/';
}

// Get the full app configuration
export function getAppConfig() {
  // @ts-ignore - This is injected at runtime
  return window.__APP_CONFIG__ || {
    basePath: '/',
    apiUrl: '/api'
  };
}

// Helper to construct URLs relative to the base path
export function buildUrl(path: string): string {
  const basePath = getBasePath();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (basePath === '/') {
    return cleanPath;
  }
  
  return `${basePath}${cleanPath}`;
}

// Helper to get asset URLs
export function getAssetUrl(assetPath: string): string {
  const basePath = getBasePath();
  const cleanPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
  
  if (basePath === '/') {
    return `/${cleanPath}`;
  }
  
  return `${basePath}/${cleanPath}`;
}