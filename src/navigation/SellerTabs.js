import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

function IconLabel({ icon, label, color, focused }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 70 }}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: 11, marginTop: 1, fontWeight: focused ? '700' : '500' }}>{label}</Text>
    </View>
  );
}

function SellerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={routes.SELLER_HOME} component={SellerHomeScreen} />
      <Stack.Screen name={routes.SELLER_SALES} component={SellerSalesScreen} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={routes.SELLER_CUSTOMERS} component={SellerCustomersScreen} />
      <Stack.Screen name={routes.SELLER_CREATE_CUSTOMER} component={SellerCreateCustomerScreen} />
    </Stack.Navigator>
  );
}

export default function SellerTabs() {
  const { user } = useAuth();
  const pendingCount = usePendingSalesBadge(user?.uid);

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
        name="SellerHomeTab"
        component={SellerStack}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused, color }) => <IconLabel icon="home-outline" label="Home" color={color} focused={focused} />
        }}
      />
      <Tab.Screen
        name={routes.SELLER_NEW_SALE}
        component={SellerNewSaleScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused, color }) => <IconLabel icon="plus-circle-outline" label="Venda" color={color} focused={focused} />
        }}
      />
      <Tab.Screen
        name="ClientesTab"
        component={CustomerStack}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused, color }) => <IconLabel icon="account-group-outline" label="Clientes" color={color} focused={focused} />
        }}
      />
      <Tab.Screen
        name={routes.SELLER_PENDING}
        component={SellerPendingSalesScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused, color }) => <IconLabel icon="bell-outline" label="Pendencias" color={color} focused={focused} />,
          tabBarBadge: pendingCount || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.secondary, color: '#3F2D00' }
        }}
      />
    </Tab.Navigator>
  );
}