import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LotteryCard from '../../components/LotteryCard';
import { useAuth } from '../../../hooks/useAuth';
import { useActiveLotteries } from '../../../hooks/useLotteries';
import { colors } from '../../../constants/colors';
import { routes } from '../../../constants/routes';

export default function ClientHomeScreen({ navigation }) {
  const { signOut, profile } = useAuth();
  const { items } = useActiveLotteries();

  return (
    <Screen>
      <Text style={styles.title}>Olá, {profile?.nome || 'Cliente'}</Text>
      <Text style={styles.subtitle}>Sorteios ativos</Text>
      {items.map((lottery) => <LotteryCard key={lottery.id} lottery={lottery} active />)}
      <AppButton title="Ver meus números" onPress={() => navigation.navigate(routes.CLIENT_TICKETS)} />
      <AppButton title="Últimos resultados" variant="outline" onPress={() => navigation.navigate(routes.CLIENT_RESULTS)} />
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
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 8
  }
});
