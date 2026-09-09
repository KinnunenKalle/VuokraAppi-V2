import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, CommonStyles } from '../theme';

// Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import TenantHomeScreen from '../screens/tenant/TenantHomeScreen';
import LandlordHomeScreen from '../screens/landlord/LandlordHomeScreen';
import MyApartmentsScreen from '../screens/landlord/MyApartmentsScreen';
import AddApartmentScreen from '../screens/landlord/AddApartmentScreen';
import BrowseTenantsScreen from '../screens/landlord/BrowseTenantsScreen';
import LandlordProfileScreen from '../screens/landlord/LandlordProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const LandlordTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.primary.main,
      tabBarInactiveTintColor: Colors.text.muted,
      tabBarStyle: { borderTopColor: Colors.border ?? '#E5E7EB' },
      tabBarIcon: ({ color, size }) => {
        const icons = { Koti: 'home', Kohteet: 'list', Vuokralaiset: 'users', Profiili: 'user' };
        return <Feather name={icons[route.name]} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Koti" component={LandlordHomeScreen} />
    <Tab.Screen name="Kohteet" component={MyApartmentsStack} />
    <Tab.Screen name="Vuokralaiset" component={BrowseTenantsScreen} />
    <Tab.Screen name="Profiili" component={LandlordProfileScreen} />
  </Tab.Navigator>
);

const MyApartmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyApartments" component={MyApartmentsScreen} />
    <Stack.Screen name="AddApartment" component={AddApartmentScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isLoading, isAuthenticated, user } = useAuth();

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
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          </>
        ) : user.role === 'tenant' ? (
          <Stack.Screen name="TenantHome" component={TenantHomeScreen} />
        ) : (
          <Stack.Screen name="LandlordHome" component={LandlordTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;