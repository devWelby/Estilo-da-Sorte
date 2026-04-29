import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppCard from './AppCard';
import { colors } from '../../constants/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function LotteryCard({ lottery, onPress, active = false }) {
  const prize = lottery.premioPrincipal
    ? `${lottery.premioPrincipal} ou ${formatCurrency(lottery.premioDinheiro)}`
    : formatCurrency(lottery.premioDinheiro);

  const statusMap = {
    aberto: 'Sorteio Ativo',
    ativo: 'Sorteio Ativo',
    pausado: 'Sorteio Pausado',
    emSorteio: 'Em Sorteio',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    rascunho: 'Rascunho'
  };
  const status = statusMap[lottery.status] || 'Encerrado';

  return (
    <Pressable onPress={onPress}>
      <AppCard warm={active} outline={!active} style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.status}>{status}</Text>
          <Text style={styles.date}>{formatDate(lottery.dataSorteio)}</Text>
        </View>

        <Text style={styles.title}>Sorteio: {formatDate(lottery.dataSorteio)}</Text>
        <Text numberOfLines={2} style={styles.prize}>{prize}</Text>

        <View style={styles.chancePill}>
          <Text style={styles.chances}>{lottery.chances || 20} chances</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: 14
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  status: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  date: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13
  },
  title: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900'
  },
  prize: {
    marginTop: 8,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700'
  },
  chancePill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FDEAEC'
  },
  chances: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  }
});
