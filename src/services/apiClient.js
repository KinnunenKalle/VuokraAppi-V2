import { API_BASE_URL, ERROR_MESSAGES } from '../constants';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

/**
 * API Client - käsittelee kaikki HTTP-pyynnöt
 */
class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Hakee access tokenin storagesta
   */
async getAccessToken() {
  try {
    // Käytä ACCESS tokenia
    const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    console.log('🔑 Using ACCESS token (first 50):', accessToken?.substring(0, 50));
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

  /**
   * Luo headerit requestille
   */
  async createHeaders(includeAuth = true, customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': 'TÄHÄN_API_GATEWAY_KEY', // ← LISÄÄ TÄMÄ!
    ...customHeaders,
  };

  if (includeAuth) {
    const token = await this.getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

  /**
   * Käsittelee API-vastauksen
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    // Parse response body
    let data;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      const error = new Error(data?.message || ERROR_MESSAGES.SERVER_ERROR);
      error.status = response.status;
      error.data = data;
      
      // Lisää käyttäjäystävälliset virhevies tit
      switch (response.status) {
        case 400:
          error.userMessage = data?.message || ERROR_MESSAGES.VALIDATION_ERROR;
          break;
        case 401:
          error.userMessage = ERROR_MESSAGES.UNAUTHORIZED;
          break;
        case 403:
          error.userMessage = ERROR_MESSAGES.FORBIDDEN;
          break;
        case 404:
          error.userMessage = ERROR_MESSAGES.NOT_FOUND;
          break;
        case 409:
          error.userMessage = data?.message || ERROR_MESSAGES.CONFLICT;
          break;
        case 502:
        case 503:
        case 504:
          error.userMessage = ERROR_MESSAGES.SERVER_ERROR;
          break;
        default:
          error.userMessage = data?.message || ERROR_MESSAGES.SERVER_ERROR;
      }

      throw error;
    }

    return data;
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    try {
      const headers = await this.createHeaders(options.includeAuth !== false);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers,
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error.message === 'Network request failed') {
        error.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }
      throw error;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    try {
      const headers = await this.createHeaders(options.includeAuth !== false);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error.message === 'Network request failed') {
        error.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch(endpoint, body, options = {}) {
    try {
      const headers = await this.createHeaders(options.includeAuth !== false);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error.message === 'Network request failed') {
        error.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    try {
      const headers = await this.createHeaders(options.includeAuth !== false);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers,
        ...options,
      });

      // DELETE palauttaa usein 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await this.handleResponse(response);
    } catch (error) {
      if (error.message === 'Network request failed') {
        error.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }
      throw error;
    }
  }
}

// Luo singleton instance
const apiClient = new APIClient();

export default apiClient;
