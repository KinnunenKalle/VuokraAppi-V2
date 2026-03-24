// API Base URL
export const API_BASE_URL = 'https://vuokraappi-api-gw-dev.azure-api.net';

// API Endpoints
export const API_ENDPOINTS = {
  // Users
  USERS: '/v1/users',
  USER_BY_ID: (userId) => `/v1/users/${userId}`,
  USER_APARTMENTS: (userId) => `/v1/users/${userId}/apartments`,
  
  // Apartments
  APARTMENTS: '/v1/apartments', // ← Lisää /v1/ tähänkin
  APARTMENT_BY_ID: (id) => `/v1/apartments/${id}`,
  
  // Listings (AI)
  GENERATE_LISTING: (apartmentId) => `/v1/listings/apartments/${apartmentId}/generate`,
};

// Azure Entra ID (CIAM) Configuration
export const ENTRA_CONFIG = {
  TENANT_ID: '95e94f96-fda6-4111-953a-439ab54fce6e',
  CLIENT_ID: 'ea427158-f1f3-47af-b515-8da8a2744379',
  
  AUTHORIZATION_ENDPOINT: 'https://vuokraappi.ciamlogin.com/95e94f96-fda6-4111-953a-439ab54fce6e/oauth2/v2.0/authorize',
  TOKEN_ENDPOINT: 'https://vuokraappi.ciamlogin.com/95e94f96-fda6-4111-953a-439ab54fce6e/oauth2/v2.0/token',
  
  // MUUTA SCOPET - pyydä token omalle backendille!
  SCOPES: [
    'openid',
    'profile', 
    'email',
    'offline_access',
    'api://ea427158-f1f3-47af-b515-8da8a2744379/user_impersonation', // ← LISÄÄ TÄMÄ!
  ],
  
  REDIRECT_URI_SCHEME: 'vuokraappi',
};

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  ID_TOKEN: 'id_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  USER_ROLE: 'user_role',
  USER_PROFILE: 'user_profile',
};

// User Roles
export const USER_ROLES = {
  TENANT: 'tenant',
  LANDLORD: 'landlord',
};

// API Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Verkkovirhe. Tarkista internet-yhteytesi.',
  SERVER_ERROR: 'Palvelinvirhe. Yritä hetken kuluttua uudelleen.',
  VALIDATION_ERROR: 'Tarkista kentät ja yritä uudelleen.',
  UNAUTHORIZED: 'Istuntosi on vanhentunut. Kirjaudu uudelleen.',
  FORBIDDEN: 'Sinulla ei ole oikeuksia tähän toimintoon.',
  NOT_FOUND: 'Resurssia ei löytynyt.',
  CONFLICT: 'Käyttäjä on jo rekisteröity.',
};
