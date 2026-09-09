import apiClient from './apiClient';

/**
 * Identity Service - vahva tunnistautuminen (Signicat)
 */
const identityService = {
  /**
   * Käynnistä vahva tunnistautuminen
   * @param {string} userId - Käyttäjän ID
   * @returns {Promise<{redirectUrl: string}>}
   */
  async startVerification(userId) {
    if (!userId) throw new Error('userId on pakollinen');
    return await apiClient.post('/v1/identity/verify/start', { userId });
  },
};

export default identityService;
