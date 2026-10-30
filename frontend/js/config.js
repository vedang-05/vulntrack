/**
 * VulnTrack Frontend Configuration
 * Central configuration settings for API communication and mock fallback.
 */

const CONFIG = {
  // Base URL for the Express backend REST API
  API_BASE_URL: '/api',

  // Mock Adapter Mode:
  // - false: Always makes real fetch calls to the Node.js/Express backend on :3000
  // - true: Uses local in-memory mock repository for pre-backend frontend testing
  // - 'auto': Attempts real API first; if connection fails (e.g. backend server not booted yet), falls back to mock
  MOCK_MODE: 'auto',

  // Client-side pagination default page size
  DEFAULT_PAGE_SIZE: 10,

  // App version
  APP_VERSION: 'v1.0.0-dev'
};

// Freeze configuration to prevent accidental modification at runtime
Object.freeze(CONFIG);
