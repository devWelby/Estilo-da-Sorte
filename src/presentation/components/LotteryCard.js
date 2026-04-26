import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import AppCard from './AppCard';
import { colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function LotteryCard({ lottery, onPress, active = false }) {
  const prize = lottery.premioPrincipal
    ? `${lottery.premioPrincipal} ou ${formatCurrency(lottery.premioDinheiro)}`
    : formatCurrency(lottery.premioDinheiro);

  return (
    <Pressable onPress={onPress}>
      <AppCard outline={!active} style={active ? styles.activeCard : styles.card}>
        <Text style={styles.date}>Sorteio: {formatDate(lottery.dataSorteio)}</Text>
        <Text numberOfLines={1} style={styles.prize}>{prize}</Text>
        <Text style={styles.chances}>{lottery.chances || 20} Chances</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center'
  },
  activeCard: {
    alignItems: 'center'
  },
  date: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  prize: {
    marginTop: 10,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center'
  },
  chances: {
    marginTop: 12,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900'
  }
});
