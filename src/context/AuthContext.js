import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import authService from '../services/authService';
import userService from '../services/userService';
import { STORAGE_KEYS } from '../constants';
 
const AuthContext = createContext(null);
 
export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // { id, role }
  const [profile, setProfile] = useState(null); // Käyttäjän profiilitiedot
 
  /**
   * Lataa tallennettu sessio sovelluksen käynnistyessä
   */
  useEffect(() => {
    checkAuth();
  }, []);
 
  /**
   * Tarkista onko käyttäjä jo kirjautunut
   */
  const checkAuth = async () => {
    try {
      const isAuth = await authService.isAuthenticated();
      console.log('🔐 checkAuth - isAuthenticated:', isAuth);
      
      if (isAuth) {
        const { userId, role } = await authService.getUserInfo();
        console.log('👤 checkAuth - getUserInfo result:', { userId, role });
        
        if (userId && role) {
          setUser({ id: userId, role });
          setIsAuthenticated(true);
          console.log('✅ checkAuth - User set:', { id: userId, role });
          
          // Lataa profiili SecureStoresta (backend ei toimi API Gateway ongelman takia)
          try {
            const profileJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
            if (profileJson) {
              const profileData = JSON.parse(profileJson);
              setProfile(profileData);
              console.log('✅ Profile loaded from SecureStore');
            }
          } catch (error) {
            console.error('Error loading profile from SecureStore:', error);
          }
        } else {
          console.log('⚠️ checkAuth - Missing userId or role');
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };
 
  /**
   * Kirjautuminen
   */
  const signIn = async () => {
    try {
      const result = await authService.signIn();
      
      if (result.success && result.userId) {
        // Huom: Roolia ei vielä tässä vaiheessa, se asetetaan rekisteröinnissä
        setUser({ id: result.userId, role: null });
        setIsAuthenticated(true);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Kirjautuminen epäonnistui',
      };
    }
  };
 
  /**
   * Rekisteröinti backendiin
   */
  const register = async (role) => {
    try {
      if (!user?.id) {
        throw new Error('User ID puuttuu');
      }
 
      // Rekisteröi käyttäjä backendiin
      const response = await userService.register(user.id, role);
      
      // Tallenna rooli
      await authService.saveUserInfo(user.id, role);
      setUser({ ...user, role });
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.userMessage || error.message || 'Rekisteröinti epäonnistui',
      };
    }
  };
 
  /**
   * Aseta käyttäjän rooli (ilman backend-kutsua)
   * Käytä kun backend ei ole saatavilla
   */
  const setUserRole = async (userId, role) => {
    try {
      if (!userId) {
        throw new Error('User ID puuttuu');
      }
 
      // Tallenna rooli SecureStoreen
      await authService.saveUserInfo(userId, role);
      
      // Päivitä state (käynnistää AppNavigatorin uudelleenrenderöinnin)
      setUser({ id: userId, role });
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      console.error('Set user role error:', error);
      return {
        success: false,
        error: error.message || 'Roolin tallennus epäonnistui',
      };
    }
  };
 
  /**
   * Päivitä profiili
   */
  const updateProfile = async (profileData) => {
    try {
      if (!user?.id) {
        throw new Error('User ID puuttuu');
      }
 
      const updated = await userService.updateProfile(user.id, profileData);
      setProfile(updated);
      
      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.userMessage || error.message || 'Profiilin päivitys epäonnistui',
      };
    }
  };
 
  /**
   * Kirjaudu ulos
   */
  const signOut = async () => {
    await authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setProfile(null);
  };
 
  /**
   * Lataa profiili uudelleen
   */
  const refreshProfile = async () => {
    if (!user?.id) return;
    
    try {
      const profileData = await userService.getProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };
 
  const value = {
    isLoading,
    isAuthenticated,
    user, // { id, role }
    profile, // Käyttäjän kaikki tiedot backendistä
    signIn,
    register,
    setUserRole, // Aseta rooli ilman backend-kutsua
    updateProfile,
    signOut,
    refreshProfile,
  };
 
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
 
/**
 * Custom hook auth-contextin käyttöön
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};
 
export default AuthContext;