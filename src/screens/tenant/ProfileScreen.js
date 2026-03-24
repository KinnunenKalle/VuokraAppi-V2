import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../constants';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
 
/**
 * Profile Screen - Profiili ja asetukset
 */
const ProfileScreen = ({ navigation }) => {
  const { user, profile, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
 
  useEffect(() => {
    loadProfile();
  }, [profile]);
 
  const loadProfile = async () => {
    try {
      // Lataa profiili SecureStoresta
      const profileJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        const profileData = JSON.parse(profileJson);
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };
 
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
 
  const handleEditProfile = () => {
    Alert.alert('Tulossa', 'Profiilin muokkaus tulossa pian!');
  };
 
  const handleEditEmail = () => {
    Alert.prompt(
      'Muokkaa sähköpostia',
      'Anna uusi sähköpostiosoite',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Tallenna',
          onPress: async (newEmail) => {
            if (newEmail && newEmail.includes('@')) {
              try {
                // Päivitä profiili
                const updatedProfile = { ...userProfile, email: newEmail };
                await SecureStore.setItemAsync(
                  STORAGE_KEYS.USER_PROFILE,
                  JSON.stringify(updatedProfile)
                );
                setUserProfile(updatedProfile);
                Alert.alert('Onnistui', 'Sähköposti päivitetty!');
              } catch (error) {
                Alert.alert('Virhe', 'Sähköpostin päivitys epäonnistui');
              }
            } else {
              Alert.alert('Virhe', 'Anna kelvollinen sähköpostiosoite');
            }
          },
        },
      ],
      'plain-text',
      userProfile?.email
    );
  };
 
  const handleSearchSettings = () => {
    Alert.alert('Tulossa', 'Hakuasetukset tulossa pian!');
  };
 
  const handleSignOut = async () => {
    Alert.alert(
      'Kirjaudu ulos',
      'Haluatko varmasti kirjautua ulos?',
      [
        { text: 'Peruuta', style: 'cancel' },
        {
          text: 'Kirjaudu ulos',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };
 
  const age = userProfile?.dateOfBirth ? calculateAge(userProfile.dateOfBirth) : null;
 
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Feather name="user" size={24} color={Colors.primary.main} />
          <Text style={styles.headerTitle}>Profiili</Text>
          <View style={{ width: 24 }} />
        </View>
 
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={48} color={Colors.primary.main} />
          </View>
 
          <Text style={styles.name}>
            {userProfile?.firstName || 'Käyttäjä'}
            {age && `, ${age}`}
          </Text>
 
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeIcon}>
                {userProfile?.gender === 'male' ? '👨' : userProfile?.gender === 'female' ? '👩' : '🧑'}
              </Text>
            </View>
 
            {userProfile?.hasPet && (
              <View style={styles.badge}>
                <Text style={styles.badgeIcon}>🐕</Text>
                <Text style={styles.badgeText}>Lemmikki</Text>
              </View>
            )}
          </View>
 
          {userProfile?.bio && (
            <Text style={styles.bio}>"{userProfile.bio}"</Text>
          )}
        </View>
 
        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Asetukset</Text>
 
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <View style={styles.menuIconContainer}>
              <Feather name="edit-3" size={20} color={Colors.primary.main} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Muokkaa profiilia</Text>
              <Text style={styles.menuSubtitle}>
                Päivitä tietojasi ja kuvaamaasi
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.text.light} />
          </TouchableOpacity>
 
          <TouchableOpacity style={styles.menuItem} onPress={handleSearchSettings}>
            <View style={styles.menuIconContainer}>
              <Feather name="search" size={20} color={Colors.primary.main} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Hakuasetukset</Text>
              <Text style={styles.menuSubtitle}>
                Hakualueet, hintahaarukka, huoneet
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={Colors.text.light} />
          </TouchableOpacity>
        </View>
 
        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tili</Text>
 
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Text style={styles.infoLabel}>Sähköposti</Text>
              <TouchableOpacity onPress={handleEditEmail}>
                <Feather name="edit-2" size={16} color={Colors.primary.main} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoValue}>{userProfile?.email || '-'}</Text>
          </View>
 
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Käyttäjätunnus</Text>
            <Text style={styles.infoValueSmall}>{user?.id || '-'}</Text>
          </View>
        </View>
 
        {/* Sign out */}
        <Button
          variant="outline"
          onPress={handleSignOut}
          icon="log-out"
          style={styles.signOutButton}
        >
          Kirjaudu ulos
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};
 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
 
  content: {
    padding: Spacing.lg,
  },
 
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
    marginBottom: Spacing.sm,
  },
 
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
 
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
 
  badgeIcon: {
    fontSize: 18,
  },
 
  badgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
  },
 
  bio: {
    fontSize: Typography.size.base,
    color: Colors.text.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
 
  section: {
    marginBottom: Spacing.xl,
  },
 
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
 
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
 
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
 
  menuContent: {
    flex: 1,
  },
 
  menuTitle: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
 
  menuSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
  },
 
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
 
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
 
  infoLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
 
  infoValue: {
    fontSize: Typography.size.base,
    color: Colors.text.primary,
  },
 
  infoValueSmall: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontFamily: 'monospace',
  },
 
  signOutButton: {
    marginTop: Spacing.md,
  },
});
 
export default ProfileScreen;