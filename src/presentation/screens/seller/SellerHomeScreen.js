import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LotteryCard from '../../components/LotteryCard';
import { useActiveLotteries } from '../../../hooks/useLotteries';
import { useAuth } from '../../../hooks/useAuth';
import { routes } from '../../../constants/routes';
import { colors } from '../../../constants/colors';

export default function SellerHomeScreen({ navigation }) {
  const { signOut, profile } = useAuth();
  const { items } = useActiveLotteries();
  const current = items[0];

  return (
    <Screen>
      <Text style={styles.title}>Olá, {profile?.nome || 'Vendedor'}</Text>
      <Text style={styles.subtitle}>Sorteio atual</Text>
      {current && <LotteryCard lottery={current} active />}
      <AppButton title="Nova venda" onPress={() => navigation.navigate(routes.SELLER_NEW_SALE)} />
      <AppButton title="Pendências" variant="outline" onPress={() => navigation.navigate(routes.SELLER_PENDING)} />
      <AppButton title="Clientes" variant="outline" onPress={() => navigation.navigate('ClientesTab')} />
      <AppButton title="Sair" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginTop: 12
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 8
  }
});
