import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

function IconLabel({ icon, label, color, focused }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 70 }}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={{ color, fontSize: 11, marginTop: 1, fontWeight: focused ? '700' : '500' }}>{label}</Text>
    </View>
  );
}

function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={routes.ADMIN_HOME} component={AdminHomeScreen} />
      <Stack.Screen name={routes.ADMIN_EDIT_LOTTERY} component={AdminEditLotteryScreen} />
      <Stack.Screen name={routes.ADMIN_PENDING_USERS} component={AdminPendingUsersScreen} />
      <Stack.Screen name={routes.ADMIN_RESULTS} component={AdminResultsScreen} />
    </Stack.Navigator>
  );
}

function SellersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name={routes.ADMIN_SELLERS} component={AdminSellersScreen} />
      <Stack.Screen name={routes.ADMIN_SELLER_DETAIL} component={AdminSellerDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AdminTabs() {
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
      <Tab.Screen name="HomeTab" component={AdminHomeStack} options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="home-outline" label="Home" color={color} focused={focused} /> }} />
      <Tab.Screen name="NovoSorteioTab" component={AdminEditLotteryScreen} options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="plus-circle-outline" label="Novo" color={color} focused={focused} /> }} />
      <Tab.Screen name="VendedoresTab" component={SellersStack} options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="account-tie-outline" label="Vendedores" color={color} focused={focused} /> }} />
      <Tab.Screen name="ResultadosTab" component={AdminResultsScreen} options={{ tabBarLabel: '', tabBarIcon: ({ focused, color }) => <IconLabel icon="trophy-outline" label="Resultados" color={color} focused={focused} /> }} />
    </Tab.Navigator>
  );
}