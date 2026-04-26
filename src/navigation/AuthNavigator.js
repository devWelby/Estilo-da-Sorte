import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../presentation/screens/auth/LoginScreen';
import { routes } from '../constants/routes';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.LOGIN} component={LoginScreen} />
    </Stack.Navigator>
  );
}
