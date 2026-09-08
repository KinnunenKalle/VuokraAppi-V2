import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { jwtDecode } from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import userService from '../../services/userService';
import { STORAGE_KEYS } from '../../constants';
import { Colors, Typography, Spacing, CommonStyles } from '../../theme';

/**
 * Welcome Screen - Ensimmäinen näyttö
 * Käyttäjä voi kirjautua tai rekisteröityä
 */
const WelcomeScreen = ({ navigation }) => {
  const { signIn, setUserRole } = useAuth();
  const [loading, setLoading] = useState(false);

  /**
   * Käsittele kirjautuminen Entra ID:hen
   */
  const handleSignIn = async () => {
    setLoading(true);
    console.log('🚀 Starting sign in...');

    try {
      const result = await signIn();
      console.log('📱 Sign in result:', result);

      if (result.success) {
        console.log('✅ Sign in successful!');
        console.log('👤 Result userId:', result.userId);

        if (!result.tokens?.idToken) {
          console.error('⚠️ No idToken in sign in result');
          Alert.alert('Virhe', 'Kirjautuminen epäonnistui: tokenia ei saatu.');
          return;
        }

        // Hae rooli tokenista
        const decoded = jwtDecode(result.tokens.idToken);
        console.log('🎫 Decoded token:', decoded);

        // Tarkista rooli kahdesta paikasta
        let role = null;
        if (decoded.roles && decoded.roles.length > 0) {
          role = decoded.roles[0].toLowerCase();
        } else if (decoded.user_role) {
          role = decoded.user_role.toLowerCase();
        }

        if (role && !['tenant', 'landlord'].includes(role)) {
          console.error('⚠️ Unknown role from Entra:', role);
          Alert.alert('Virhe', `Tuntematon rooli "${role}". Ota yhteyttä ylläpitoon.`);
          return;
        }

        if (role) {
          console.log('✅ User role from Entra:', role);

          // Tarkista onko profiili jo täytetty
          const existingProfile = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
          console.log('🔍 Checking existing profile...');
          console.log('Profile exists:', !!existingProfile);

          // CompleteProfileScreen kysyy vuokralaisen matching-tietoja (ikä, sukupuoli,
          // lemmikki) — ei relevanttia vuokranantajalle, joten ohitetaan se sille.
          if (existingProfile || role === 'landlord') {
            console.log('📋 Skipping CompleteProfile (profile exists or role=landlord)');

            // Varmista että käyttäjä on rekisteröity backendiin (409 = jo olemassa = ok)
            try {
              await userService.register(result.userId, role);
              console.log('✅ User registered in backend');
            } catch (e) {
              if (e.status === 409) {
                console.log('ℹ️ User already exists in backend');
              } else {
                console.error('❌ Backend registration failed:', e.userMessage ?? e.message);
                Alert.alert(
                  'Huomio',
                  'Yhteys palvelimeen epäonnistui rekisteröinnissä. Osa toiminnoista ei ehkä toimi ennen kuin yrität kirjautua uudelleen.'
                );
              }
            }

            const roleResult = await setUserRole(result.userId, role);
            if (!roleResult.success) {
              console.error('❌ Failed to set user role:', roleResult.error);
              Alert.alert('Virhe', 'Roolin tallennus epäonnistui. Yritä uudelleen.');
              return;
            }
            console.log('✅ User role set successfully, navigation should happen automatically');
            // AppNavigator hoitaa navigoinnin automaattisesti kun user.role päivittyy
          } else {
            console.log('📝 No profile found, navigating to CompleteProfile');
            // Tallenna rooli
            await authService.saveUserInfo(result.userId, role);
            // Mene profiilin täyttöön (vain vuokralaiselle)
            navigation.navigate('CompleteProfile', { role });
          }
        } else {
          console.error('⚠️ No role found in token');
          Alert.alert('Virhe', 'Roolia ei löydy tokenista. Aseta rooli Entrassa.');
        }
      } else {
        console.error('❌ Sign in failed:', result.error);
        Alert.alert('Kirjautuminen epäonnistui', result.error || 'Yritä uudelleen');
      }
    } catch (error) {
      console.error('❌ Sign in CATCH error:', error);
      Alert.alert('Virhe', 'Kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[CommonStyles.container, styles.container]}>
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Feather name="home" size={64} color={Colors.primary.main} />
          </View>
        </View>

        {/* Otsikko */}
        <View style={styles.header}>
          <Text style={styles.title}>VuokraAppi</Text>
          <Text style={styles.subtitle}>
            Löydä unelmiesi koti tai vuokraa asuntosi helposti
          </Text>
        </View>

        {/* Ominaisuudet */}
        <View style={styles.features}>
          <FeatureItem
            icon="search"
            title="Etsi asuntoa"
            description="Selaa satoja vuokra-asuntoja"
          />
          <FeatureItem
            icon="heart"
            title="Tallenna suosikit"
            description="Pidä kiinnostavimmat asunnot tallessa"
          />
          <FeatureItem
            icon="message-circle"
            title="Ota yhteyttä"
            description="Keskustele vuokranantajan kanssa"
          />
        </View>
      </View>

      {/* Painikkeet */}
      <View style={styles.buttons}>
        <Button
          fullWidth
          onPress={handleSignIn}
          loading={loading}
          icon="log-in"
          size="lg"
        >
          Kirjaudu sisään / Rekisteröidy
        </Button>

        <Text style={styles.disclaimer}>
          Jatkamalla hyväksyt käyttöehdot ja tietosuojakäytännön
        </Text>
      </View>
    </SafeAreaView>
  );
};

/**
 * Ominaisuus-komponentti
 */
const FeatureItem = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Feather name={icon} size={24} color={Colors.primary.main} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  
  title: {
    fontSize: Typography.size['4xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  
  subtitle: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  features: {
    marginBottom: Spacing.xl,
  },
  
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary.main + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  
  featureContent: {
    flex: 1,
  },
  
  featureTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  
  featureDescription: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
  
  buttons: {
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing['2xl'],
  },
  
  disclaimer: {
    fontSize: Typography.size.xs,
    color: Colors.text.light,
    textAlign: 'center',
    marginTop: Spacing.base,
    lineHeight: 16,
  },
});

export default WelcomeScreen;