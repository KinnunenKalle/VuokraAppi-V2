import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import userService from '../../services/userService';
import identityService from '../../services/identityService';

/**
 * Landlord Profile Screen - Vuokranantajan profiili
 */
const LandlordProfileScreen = () => {
  const { user, profile, signOut } = useAuth();
  const [identityVerified, setIdentityVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const refreshVerificationStatus = useCallback(async () => {
    if (!user?.id) return;
    setCheckingStatus(true);
    try {
      const backendProfile = await userService.getProfile(user.id);
      setIdentityVerified(!!backendProfile?.identityVerified);
    } catch (error) {
      console.error('Error checking identity verification status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshVerificationStatus();
    }, [refreshVerificationStatus])
  );

  const handleVerifyIdentity = async () => {
    if (!user?.id) return;
    setVerifying(true);
    try {
      const { redirectUrl } = await identityService.startVerification(user.id);
      // openAuthSessionAsync (ASWebAuthenticationSession) osaa palata custom-skeema-
      // redirectillä appiin — openBrowserAsync (SFSafariViewController) ei pysty siihen.
      await WebBrowser.openAuthSessionAsync(redirectUrl, 'vuokraappi://identity-verified');
      await refreshVerificationStatus();
    } catch (error) {
      Alert.alert('Virhe', error.userMessage ?? 'Tunnistautumisen käynnistys epäonnistui.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Kirjaudu ulos', 'Haluatko varmasti kirjautua ulos?', [
      { text: 'Peruuta', style: 'cancel' },
      { text: 'Kirjaudu ulos', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Feather name="key" size={24} color={Colors.primary.main} />
          <Text style={styles.headerTitle}>Profiili</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={48} color={Colors.primary.main} />
          </View>
          <Text style={styles.name}>
            {profile?.firstName ?? profile?.companyName ?? 'Vuokranantaja'}
            {profile?.lastName ? ` ${profile.lastName}` : ''}
          </Text>
          {profile?.email && <Text style={styles.email}>{profile.email}</Text>}
        </View>

        {/* Vahva tunnistautuminen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tunnistautuminen</Text>
          <View style={styles.verifyCard}>
            {checkingStatus ? (
              <ActivityIndicator size="small" color={Colors.primary.main} />
            ) : identityVerified ? (
              <View style={styles.verifyRow}>
                <Feather name="check-circle" size={22} color={Colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifyTitle}>Henkilöllisyys vahvistettu</Text>
                  <Text style={styles.verifySubtitle}>
                    Vahvistettu vuokranantaja näkyy vuokralaisille luotettavampana.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.verifyRow}>
                  <Feather name="alert-circle" size={22} color={Colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.verifyTitle}>Henkilöllisyyttä ei ole vahvistettu</Text>
                    <Text style={styles.verifySubtitle}>
                      Vahvista pankkitunnuksilla tai mobiilivarmenteella lisätäksesi luottamusta kohteisiisi.
                    </Text>
                  </View>
                </View>
                <Button
                  onPress={handleVerifyIdentity}
                  loading={verifying}
                  icon="shield"
                  style={styles.verifyBtn}
                >
                  Vahvista henkilöllisyys
                </Button>
              </>
            )}
          </View>
        </View>

        {/* Tili */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tili</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Käyttäjätunnus</Text>
            <Text style={styles.infoValueSmall}>{user?.id ?? '-'}</Text>
          </View>
        </View>

        <Button variant="outline" onPress={handleSignOut} icon="log-out" style={styles.signOutButton}>
          Kirjaudu ulos
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  email: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },

  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },

  verifyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  verifyTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  verifySubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  verifyBtn: { marginTop: Spacing.xs },

  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  infoValueSmall: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },

  signOutButton: { marginTop: Spacing.md },
});

export default LandlordProfileScreen;
