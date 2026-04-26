import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/colors';
import { routes } from '../constants/routes';
import AdminHomeScreen from '../presentation/screens/admin/AdminHomeScreen';
import AdminEditLotteryScreen from '../presentation/screens/admin/AdminEditLotteryScreen';
import AdminSellersScreen from '../presentation/screens/admin/AdminSellersScreen';
import AdminSellerDetailScreen from '../presentation/screens/admin/AdminSellerDetailScreen';
import AdminPendingUsersScreen from '../presentation/screens/admin/AdminPendingUsersScreen';
import AdminResultsScreen from '../presentation/screens/admin/AdminResultsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function IconLabel({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 24 }}>{icon}</Text>
      {focused && <Text style={{ color: colors.primary, fontSize: 12 }}>{label}</Text>}
    </View>
  );
}

function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.ADMIN_HOME} component={AdminHomeScreen} />
      <Stack.Screen name={routes.ADMIN_EDIT_LOTTERY} component={AdminEditLotteryScreen} />
      <Stack.Screen name={routes.ADMIN_PENDING_USERS} component={AdminPendingUsersScreen} />
      <Stack.Screen name={routes.ADMIN_RESULTS} component={AdminResultsScreen} />
    </Stack.Navigator>
  );
}

function SellersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.ADMIN_SELLERS} component={AdminSellersScreen} />
      <Stack.Screen name={routes.ADMIN_SELLER_DETAIL} component={AdminSellerDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="HomeTab" component={AdminHomeStack} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="⌂" label="Home" focused={focused} />, tabBarLabel: 'Home' }} />
      <Tab.Screen name="NovoSorteioTab" component={AdminEditLotteryScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="＋" label="Novo" focused={focused} />, tabBarLabel: 'Novo' }} />
      <Tab.Screen name="VendedoresTab" component={SellersStack} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="👥" label="Vendedores" focused={focused} />, tabBarLabel: 'Vendedores' }} />
      <Tab.Screen name="ResultadosTab" component={AdminResultsScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="▣" label="Resultados" focused={focused} />, tabBarLabel: 'Resultados' }} />
    </Tab.Navigator>
  );
}
