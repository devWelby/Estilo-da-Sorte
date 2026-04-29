import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { routes } from '../constants/routes';
import ClientHomeScreen from '../presentation/screens/client/ClientHomeScreen';
import ClientTicketsScreen from '../presentation/screens/client/ClientTicketsScreen';
import ClientResultsScreen from '../presentation/screens/client/ClientResultsScreen';

const Tab = createBottomTabNavigator();

function IconLabel({ icon, label, color, focused }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 70 }}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: 11, marginTop: 1, fontWeight: focused ? '700' : '500' }}>{label}</Text>
    </View>
  );
}

export default function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 70,
          borderTopWidth: 1,
          borderTopColor: '#E6E0D8',
          backgroundColor: '#FFFEFC'
        }
      }}
    >
      <Tab.Screen
        name={routes.CLIENT_HOME}
        component={ClientHomeScreen}
        options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="home-outline" label="Home" color={color} focused={focused} /> }}
      />
      <Tab.Screen
        name={routes.CLIENT_TICKETS}
        component={ClientTicketsScreen}
        options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="ticket-confirmation-outline" label="Bilhetes" color={color} focused={focused} /> }}
      />
      <Tab.Screen
        name={routes.CLIENT_RESULTS}
        component={ClientResultsScreen}
        options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="trophy-outline" label="Resultados" color={color} focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}