import apiClient from './apiClient';
import { API_ENDPOINTS } from '../constants';

/**
 * User Service - käsittelee käyttäjiin liittyvät API-kutsut
 */
export const userService = {
  /**
   * Rekisteröi uusi käyttäjä
   * @param {string} userId - Entra ID:stä saatu user ID (UUID)
   * @param {string} role - 'tenant' tai 'landlord'
   * @returns {Promise<Object>} Käyttäjäobjekti
   */
  async register(userId, role) {
    if (!userId) throw new Error('userId on pakollinen');
    if (!['tenant', 'landlord'].includes(role?.toLowerCase())) {
      throw new Error("role on oltava 'tenant' tai 'landlord'");
    }

    return await apiClient.post(
      API_ENDPOINTS.USERS,
      {
        id: userId,
        role: role.toLowerCase(), // API odottaa lowercase
      },
      // OpenAPI-spec ei vaadi tälle endpointille authia, mutta APIM-gateway
      // vaatii JWT:n joka tapauksessa kaikilla reiteillä spekistä riippumatta.
      { includeAuth: true }
    );
  },

  /**
   * Päivitä käyttäjän tiedot
   * @param {string} userId - Käyttäjän ID
   * @param {Object} userData - Päivitettävät tiedot
   * @returns {Promise<Object>} Päivitetty käyttäjä
   */
  async updateProfile(userId, userData) {
    if (!userId) throw new Error('userId on pakollinen');
    return await apiClient.patch(
      API_ENDPOINTS.USER_BY_ID(userId),
      userData
    );
  },

  /**
   * Hae käyttäjän tiedot
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<Object>} Käyttäjäobjekti
   */
  async getProfile(userId) {
    if (!userId) throw new Error('userId on pakollinen');
    return await apiClient.get(API_ENDPOINTS.USER_BY_ID(userId));
  },

  /**
   * Hae käyttäjän asunnot (landlord)
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<Array>} Lista asunnoista
   */
  async getUserApartments(userId) {
    if (!userId) throw new Error('userId on pakollinen');
    return await apiClient.get(API_ENDPOINTS.USER_APARTMENTS(userId));
  },

  /**
   * Hae vuokralaisia hakuehdoilla (vuokranantajan käyttöön)
   * @param {string} userId - Hakevan vuokranantajan ID
   * @param {Object} filters - minIncome, maxIncome, occupation, hasPet, minAge, maxAge, city, identityVerified
   * @returns {Promise<Array>} Lista vuokralaisista
   */
  async searchTenants(userId, filters = {}) {
    if (!userId) throw new Error('userId on pakollinen');
    const params = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const query = params ? `?${params}` : '';
    return await apiClient.get(`/v1/users/${userId}/tenants/search${query}`);
  },

  /**
   * Poista käyttäjä
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    if (!userId) throw new Error('userId on pakollinen');
    return await apiClient.delete(API_ENDPOINTS.USER_BY_ID(userId));
  },
};

export default userService;
