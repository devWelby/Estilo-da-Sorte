import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppCard from '../../components/AppCard';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { useFinishedLotteries } from '../../../hooks/useLotteries';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';

function ResultCard({ lottery, highlight = false }) {
  return (
    <AppCard style={[styles.card, highlight && styles.highlightCard]} warm={highlight}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{formatDate(lottery.dataSorteio)}</Text>
        <View style={[styles.tag, highlight && styles.tagHighlight]}>
          <Text style={[styles.tagText, highlight && styles.tagTextHighlight]}>Principal</Text>
        </View>
      </View>

      <Text style={styles.prize}>{formatCurrency(lottery.premioDinheiro)}</Text>

      <View style={styles.numberBox}>
        <Text style={styles.number}>{lottery.resultado?.numero || '-'}</Text>
      </View>

      <View style={styles.peopleBox}>
        <Text style={styles.person}>Ganhador: {lottery.resultado?.ganhadorNome || '-'}</Text>
        <Text style={styles.person}>Vendedor: {lottery.resultado?.vendedorNome || '-'}</Text>
      </View>
    </AppCard>
  );
}

export default function AdminResultsScreen() {
  const { items } = useFinishedLotteries();
  const results = items.filter((item) => item.resultado);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Ultimos resultados</Text>
      <Text style={styles.subtitle}>Resultados oficiais dos sorteios finalizados</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="Ainda nao ha resultados finalizados." />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 35}>
            <ResultCard lottery={item} highlight={index === 0} />
          </AnimatedEntrance>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8
  },
  listContent: {
    paddingBottom: 18
  },
  card: {
    padding: 18
  },
  highlightCard: {
    borderColor: '#EFD8A0'
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  date: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  tag: {
    backgroundColor: '#FFF7E6',
    borderWidth: 1,
    borderColor: '#F0DFC1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  tagHighlight: {
    backgroundColor: '#FDF1D2',
    borderColor: '#E7CA87'
  },
  tagText: {
    color: '#8F6D26',
    fontWeight: '800',
    fontSize: 12
  },
  tagTextHighlight: {
    color: '#7D5D1A'
  },
  prize: {
    marginTop: 12,
    color: colors.primary,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900'
  },
  numberBox: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    paddingVertical: 16,
    paddingHorizontal: 10,
    shadowColor: '#8F0D16',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  number: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 7,
    fontSize: 42
  },
  peopleBox: {
    marginTop: 14,
    borderWidth: 1.2,
    borderColor: '#F0D2D5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF7F8'
  },
  person: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 2
  }
});
