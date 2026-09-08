import { API_BASE_URL, ERROR_MESSAGES } from '../constants';
import authService from './authService';

/**
 * API Client - käsittelee kaikki HTTP-pyynnöt
 */
class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Hakee voimassa olevan access tokenin — uusii sen automaattisesti
   * refresh tokenilla jos se on vanhentunut.
   */
  async getAccessToken() {
    try {
      return await authService.getValidAccessToken();
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
    ...customHeaders,
  };

  const subscriptionKey = process.env.EXPO_PUBLIC_API_SUBSCRIPTION_KEY;
  if (subscriptionKey) {
    headers['Ocp-Apim-Subscription-Key'] = subscriptionKey;
  }

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

    // Luetaan vastaus aina tekstinä ja parsitaan itse, jotta epäkelpo/tyhjä JSON-runko
    // ei kaadu hiljaisesti response.json()-kutsuun eikä jää lokittamatta.
    const rawText = await response.text();
    let data;
    if (isJson) {
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch (parseError) {
        console.error(
          `❌ JSON parse error ${response.status} [${response.url}]:`,
          parseError.message,
          '— raw body:',
          rawText?.slice(0, 500)
        );
        const error = new Error('Palvelin palautti virheellisen vastauksen.');
        error.status = response.status;
        error.userMessage = ERROR_MESSAGES.SERVER_ERROR;
        error.rawBody = rawText;
        throw error;
      }
    } else {
      data = rawText;
    }

    // Handle errors
    if (!response.ok) {
      console.error(`❌ API Error ${response.status} [${response.url}]:`, JSON.stringify(data));
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
      if (error.status === undefined) {
        // Ei tullut handleResponse:sta (joka lokittaa jo itse) — eli fetch/verkkotason poikkeus.
        console.error(`❌ Request failed [${endpoint}]:`, error.message);
      }
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
      console.log(`➡️ POST ${endpoint}`, { hasAuth: !!headers.Authorization, hasSubKey: !!headers['Ocp-Apim-Subscription-Key'] });

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        ...options,
      });

      return await this.handleResponse(response);
    } catch (error) {
      if (error.status === undefined) {
        // Ei tullut handleResponse:sta (joka lokittaa jo itse) — eli fetch/verkkotason poikkeus.
        console.error(`❌ Request failed [${endpoint}]:`, error.message);
      }
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
      if (error.status === undefined) {
        // Ei tullut handleResponse:sta (joka lokittaa jo itse) — eli fetch/verkkotason poikkeus.
        console.error(`❌ Request failed [${endpoint}]:`, error.message);
      }
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
      if (error.status === undefined) {
        // Ei tullut handleResponse:sta (joka lokittaa jo itse) — eli fetch/verkkotason poikkeus.
        console.error(`❌ Request failed [${endpoint}]:`, error.message);
      }
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
