import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../constants/colors';
import { routes } from '../constants/routes';
import { useAuth } from '../hooks/useAuth';
import { usePendingSalesBadge } from '../hooks/usePendingSalesBadge';
import SellerHomeScreen from '../presentation/screens/seller/SellerHomeScreen';
import SellerPendingSalesScreen from '../presentation/screens/seller/SellerPendingSalesScreen';
import SellerNewSaleScreen from '../presentation/screens/seller/SellerNewSaleScreen';
import SellerCustomersScreen from '../presentation/screens/seller/SellerCustomersScreen';
import SellerCreateCustomerScreen from '../presentation/screens/seller/SellerCreateCustomerScreen';
import SellerSalesScreen from '../presentation/screens/seller/SellerSalesScreen';

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

function SellerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.SELLER_HOME} component={SellerHomeScreen} />
      <Stack.Screen name={routes.SELLER_SALES} component={SellerSalesScreen} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.SELLER_CUSTOMERS} component={SellerCustomersScreen} />
      <Stack.Screen name={routes.SELLER_CREATE_CUSTOMER} component={SellerCreateCustomerScreen} />
    </Stack.Navigator>
  );
}

export default function SellerTabs() {
  const { user } = useAuth();
  const pendingCount = usePendingSalesBadge(user?.uid);

  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
      <Tab.Screen name="SellerHomeTab" component={SellerStack} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="⌂" label="Home" focused={focused} />, tabBarLabel: 'Home' }} />
      <Tab.Screen name={routes.SELLER_NEW_SALE} component={SellerNewSaleScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="＋" label="Venda" focused={focused} />, tabBarLabel: 'Venda' }} />
      <Tab.Screen name="ClientesTab" component={CustomerStack} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="👤" label="Clientes" focused={focused} />, tabBarLabel: 'Clientes' }} />
      <Tab.Screen name={routes.SELLER_PENDING} component={SellerPendingSalesScreen} options={{ tabBarIcon: ({ focused }) => <IconLabel icon="🔔" label="Pendências" focused={focused} />, tabBarBadge: pendingCount || undefined, tabBarLabel: 'Pendências' }} />
    </Tab.Navigator>
  );
}
