import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { useFinishedLotteries } from '../../../hooks/useLotteries';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';

export default function AdminResultsScreen() {
  const { items } = useFinishedLotteries();

  return (
    <Screen>
      <Text style={styles.title}>Últimos Resultados</Text>
      {items.filter((item) => item.resultado).map((lottery) => (
        <View key={lottery.id} style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.date}>{formatDate(lottery.dataSorteio)}</Text>
            <Text style={styles.type}>Principal</Text>
          </View>
          <Text style={styles.prize}>{formatCurrency(lottery.premioDinheiro)}</Text>
          <Text style={styles.number}>{lottery.resultado?.numero}</Text>
          <View style={styles.winnerBox}>
            <Text style={styles.winner}>Ganhador: {lottery.resultado?.ganhadorNome || '-'}</Text>
            <Text style={styles.winner}>Vendedor: {lottery.resultado?.vendedorNome || '-'}</Text>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 16
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 10
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  date: {
    fontSize: 20,
    fontWeight: '800'
  },
  type: {
    fontSize: 20,
    fontWeight: '900'
  },
  prize: {
    marginTop: 10,
    textAlign: 'center',
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900'
  },
  number: {
    marginTop: 16,
    backgroundColor: colors.primary,
    color: '#FFF',
    fontSize: 50,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 10,
    borderRadius: 12,
    paddingVertical: 22
  },
  winnerBox: {
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16
  },
  winner: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 2
  }
});
