import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, CommonStyles } from '../../theme';

/**
 * Landlord Home Screen - Vuokranantajan kotinäyttö
 */
const LandlordHomeScreen = ({ navigation }) => {
  const { user, profile, signOut } = useAuth();

  return (
    <SafeAreaView style={CommonStyles.container}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Feather name="key" size={48} color={Colors.primary.main} />
          <Text style={styles.title}>Tervetuloa!</Text>
          <Text style={styles.subtitle}>
            {profile?.firstName} {profile?.lastName}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.content}>
          <Text style={styles.infoText}>
            Olet kirjautunut vuokranantajana ✅
          </Text>
          <Text style={styles.userIdText}>
            User ID: {user?.id}
          </Text>
        </View>

        {/* Kirjaudu ulos */}
        <Button
          variant="outline"
          onPress={signOut}
          icon="log-out"
        >
          Kirjaudu ulos
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  
  title: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  
  subtitle: {
    fontSize: Typography.size.lg,
    color: Colors.text.muted,
    marginTop: Spacing.xs,
  },
  
  content: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  
  infoText: {
    fontSize: Typography.size.base,
    color: Colors.success,
    marginBottom: Spacing.md,
  },
  
  userIdText: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default LandlordHomeScreen;
