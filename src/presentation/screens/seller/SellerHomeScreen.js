import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LotteryCard from '../../components/LotteryCard';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
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
      <AnimatedEntrance>
        <View style={styles.hero}>
          <Text style={styles.heroTop}>Painel do vendedor</Text>
          <Text style={styles.heroName}>{profile?.nome || 'Vendedor'}</Text>
        </View>
      </AnimatedEntrance>

      <Text style={styles.subtitle}>Sorteio atual</Text>
      {current ? <LotteryCard lottery={current} active /> : <EmptyState title="Nenhum sorteio aberto no momento." />}

      <AppButton title="Nova venda" onPress={() => navigation.navigate(routes.SELLER_NEW_SALE)} disabled={!current} />
      <AppButton title="Pendencias" variant="outline" onPress={() => navigation.navigate(routes.SELLER_PENDING)} />
      <AppButton title="Clientes" variant="outline" onPress={() => navigation.navigate('ClientesTab')} />
      <AppButton title="Sair" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 14
  },
  heroTop: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase'
  },
  heroName: {
    marginTop: 2,
    color: colors.primary,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 8
  }
});