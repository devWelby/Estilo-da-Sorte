import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import LotteryCard from '../../components/LotteryCard';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { useAuth } from '../../../hooks/useAuth';
import { useActiveLotteries } from '../../../hooks/useLotteries';
import { colors } from '../../../constants/colors';
import { routes } from '../../../constants/routes';

export default function ClientHomeScreen({ navigation }) {
  const { signOut, profile } = useAuth();
  const { items } = useActiveLotteries();

  return (
    <Screen>
      <AnimatedEntrance>
        <View style={styles.hero}>
          <Text style={styles.heroTop}>Bem-vindo</Text>
          <Text style={styles.heroName}>{profile?.nome || 'Cliente'}</Text>
          <Text style={styles.heroHint}>Acompanhe sorteios e seus numeros em tempo real.</Text>
        </View>
      </AnimatedEntrance>

      <Text style={styles.subtitle}>Sorteios ativos</Text>
      {items.length ? items.map((lottery) => <LotteryCard key={lottery.id} lottery={lottery} active />) : <EmptyState title="Nenhum sorteio aberto no momento." />}
      <AppButton title="Ver meus numeros" onPress={() => navigation.navigate(routes.CLIENT_TICKETS)} />
      <AppButton title="Ultimos resultados" variant="outline" onPress={() => navigation.navigate(routes.CLIENT_RESULTS)} />
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
  heroHint: {
    marginTop: 4,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600'
  },
  subtitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
    marginBottom: 8
  }
});