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
    return await apiClient.post(
      API_ENDPOINTS.USERS,
      {
        id: userId,
        role: role.toLowerCase(), // API odottaa lowercase
      },
      { includeAuth: true } // Rekisteröinnissä ei vielä tokenia
    );
  },

  /**
   * Päivitä käyttäjän tiedot
   * @param {string} userId - Käyttäjän ID
   * @param {Object} userData - Päivitettävät tiedot
   * @returns {Promise<Object>} Päivitetty käyttäjä
   */
  async updateProfile(userId, userData) {
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
    return await apiClient.get(API_ENDPOINTS.USER_BY_ID(userId));
  },

  /**
   * Hae käyttäjän asunnot (landlord)
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<Array>} Lista asunnoista
   */
  async getUserApartments(userId) {
    return await apiClient.get(API_ENDPOINTS.USER_APARTMENTS(userId));
  },

  /**
   * Poista käyttäjä
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    return await apiClient.delete(API_ENDPOINTS.USER_BY_ID(userId));
  },
};

export default userService;
