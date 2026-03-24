import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors, CommonStyles } from '../theme';

// Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import TenantHomeScreen from '../screens/tenant/TenantHomeScreen';
import LandlordHomeScreen from '../screens/landlord/LandlordHomeScreen';

const Stack = createStackNavigator();

/**
 * App Navigator
 * Käsittelee koko sovelluksen navigoinnin
 */
const AppNavigator = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

  // Näytä latausruutu kun tarkistetaan auth-tila
  if (isLoading) {
    return (
      <View style={[CommonStyles.container, CommonStyles.center]}>
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: Colors.background },
        }}
      >
        {!isAuthenticated || !user?.role ? (
          // Auth Flow - ei kirjautunut tai ei roolia
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : (
          // Main App - kirjautunut ja rooli valittu
          <>
            {user.role === 'tenant' ? (
              <Stack.Screen name="TenantHome" component={TenantHomeScreen} />
            ) : (
              <Stack.Screen name="LandlordHome" component={LandlordHomeScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;