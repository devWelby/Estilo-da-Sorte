import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../constants/colors';
import { routes } from '../constants/routes';
import ClientHomeScreen from '../presentation/screens/client/ClientHomeScreen';
import ClientTicketsScreen from '../presentation/screens/client/ClientTicketsScreen';
import ClientResultsScreen from '../presentation/screens/client/ClientResultsScreen';

const Tab = createBottomTabNavigator();

function IconLabel({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 24 }}>{icon}</Text>
      {focused && <Text style={{ color: colors.primary, fontSize: 12 }}>{label}</Text>}
    </View>
  );
}

export default function ClientTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name={routes.CLIENT_HOME} component={ClientHomeScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="⌂" label="Home" focused={focused} />, tabBarLabel: 'Home' }} />
      <Tab.Screen name={routes.CLIENT_TICKETS} component={ClientTicketsScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="🎫" label="Bilhetes" focused={focused} />, tabBarLabel: 'Bilhetes' }} />
      <Tab.Screen name={routes.CLIENT_RESULTS} component={ClientResultsScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="▣" label="Resultados" focused={focused} />, tabBarLabel: 'Resultados' }} />
    </Tab.Navigator>
  );
}
