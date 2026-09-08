import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { ENTRA_CONFIG, STORAGE_KEYS } from '../constants';

// Sulkee mahdollisen avoinna olevan auth-session
WebBrowser.maybeCompleteAuthSession();

/**
 * Auth Service - käsittelee Entra ID autentikoinnin
 */
export const authService = {
  /**
   * Tallenna tokenit SecureStoreen
   */
  async saveTokens({ accessToken, idToken, refreshToken }) {
    try {
      if (accessToken) {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      }
      if (idToken) {
        await SecureStore.setItemAsync(STORAGE_KEYS.ID_TOKEN, idToken);
      }
      if (refreshToken) {
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw new Error('Tokenien tallentaminen epäonnistui');
    }
  },

  /**
   * Hae tokenit SecureStoresta
   */
  async getTokens() {
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const idToken = await SecureStore.getItemAsync(STORAGE_KEYS.ID_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      
      return { accessToken, idToken, refreshToken };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { accessToken: null, idToken: null, refreshToken: null };
    }
  },

  /**
   * Tallenna käyttäjän ID ja rooli
   */
  async saveUserInfo(userId, role) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_ROLE, role);
    } catch (error) {
      console.error('Error saving user info:', error);
    }
  },

  /**
   * Hae käyttäjän ID ja rooli
   */
  async getUserInfo() {
    try {
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
      const role = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ROLE);
      return { userId, role };
    } catch (error) {
      console.error('Error getting user info:', error);
      return { userId: null, role: null };
    }
  },

  /**
   * Pura user ID tokenista (Entra ID:n Object ID / oid claim)
   */
  getUserIdFromToken(token) {
    try {
      const decoded = jwtDecode(token);
      return decoded.oid || decoded.sub || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  /**
   * Kirjautuminen Entra ID:hen
   * Palauttaa auth response joka sisältää authorization coden
   */
  async signIn() {
    try {
      // HARD-CODED redirect URI (kuten Azuressa määritelty)
      const redirectUri = 'vuokraappi://redirect';

      console.log('🔗 Redirect URI:', redirectUri);

      // Luo auth request
      const authRequestConfig = {
        clientId: ENTRA_CONFIG.CLIENT_ID,
        redirectUri,
        responseType: AuthSession.ResponseType.Code,
        scopes: ENTRA_CONFIG.SCOPES,
        usePKCE: true, // Proof Key for Code Exchange (turvallisuus)
        extraParams: {
          prompt: 'select_account', // Pakota tilinvalinta, älä käytä SSO-istuntoa automaattisesti
        },
      };

      const request = new AuthSession.AuthRequest(authRequestConfig);

      // Avaa auth session
      const result = await request.promptAsync(
        {
          authorizationEndpoint: ENTRA_CONFIG.AUTHORIZATION_ENDPOINT,
        },
        {
          preferEphemeralSession: false, // Muista session (älä kysy joka kerta)
        }
      );

      console.log('📱 Auth result:', result.type);

      if (result.type === 'success') {
        // HARD-CODED redirect URI (sama kuin yllä)
        const redirectUri = 'vuokraappi://redirect';

        // Vaihda authorization code tokeneihin
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: ENTRA_CONFIG.CLIENT_ID,
            redirectUri,
            code: result.params.code,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          {
            tokenEndpoint: ENTRA_CONFIG.TOKEN_ENDPOINT,
          }
        );

        // Tallenna tokenit
        await this.saveTokens({
          accessToken: tokenResult.accessToken,
          idToken: tokenResult.idToken,
          refreshToken: tokenResult.refreshToken,
        });

        // Pura user ID tokenista
        const userId = this.getUserIdFromToken(tokenResult.accessToken || tokenResult.idToken);
        console.log('👤 User ID from token:', userId);
        
        if (!userId) {
          console.error('❌ Failed to extract user ID from token');
          return {
            success: false,
            error: 'Käyttäjätunnuksen haku epäonnistui',
          };
        }

        return {
          success: true,
          userId,
          tokens: tokenResult,
        };
      }

      return {
        success: false,
        error: 'Kirjautuminen peruutettu',
      };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Kirjautuminen epäonnistui',
      };
    }
  },

  /**
   * Kirjaudu ulos
   */
  async signOut() {
    try {
      // Poista tokenit ja user_id (mutta SÄILYTÄ profiili!)
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ID_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ROLE); // Poista rooli (se asetetaan uudelleen kirjautumisessa)
      // SÄILYTETÄÄN: USER_PROFILE (jotta profiilia ei tarvitse täyttää uudelleen)
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },

  /**
   * Tarkista onko käyttäjä kirjautunut
   */
  async isAuthenticated() {
    const { accessToken } = await this.getTokens();
    return !!accessToken;
  },
};

export default authService;