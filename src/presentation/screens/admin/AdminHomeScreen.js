import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import LotteryCard from '../../components/LotteryCard';
import SectionHeader from '../../components/SectionHeader';
import MetricCard from '../../components/MetricCard';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { routes } from '../../../constants/routes';
import { colors } from '../../../constants/colors';
import { useLotteries } from '../../../hooks/useLotteries';
import { formatCurrency } from '../../../utils/formatters';
import { reactivateAllSales, runOfficialDraw } from '../../../data/repositories/lotteryRepository';
import { useAuth } from '../../../hooks/useAuth';

export default function AdminHomeScreen({ navigation }) {
  const { signOut } = useAuth();
  const { items } = useLotteries();
  const [expanded, setExpanded] = useState({ vendas: false, resultados: false });

  const active = useMemo(() => items.filter((item) => item.status === 'ativo'), [items]);
  const inactive = useMemo(() => items.filter((item) => item.status !== 'ativo'), [items]);
  const current = active[0];

  async function handleReactivate() {
    if (!current?.id) return;
    try {
      await reactivateAllSales(current.id);
      Alert.alert('Pronto', 'Vendas reativadas para o sorteio atual.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível reativar.');
    }
  }

  async function handleDraw() {
    if (!current?.id) return;
    try {
      const result = await runOfficialDraw(current.id);
      Alert.alert('Sorteio realizado', `Número ganhador: ${result.numero}`);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível realizar o sorteio.');
    }
  }

  return (
    <Screen>
      <Text style={styles.header}>Sorteios Ativos</Text>
      {active.length ? active.map((lottery) => (
        <LotteryCard key={lottery.id} lottery={lottery} active onPress={() => navigation.navigate(routes.ADMIN_EDIT_LOTTERY, { lottery })} />
      )) : <EmptyState title="Nenhum sorteio ativo." />}

      <Text style={styles.header}>Sorteios Inativos</Text>
      {inactive.map((lottery) => (
        <LotteryCard key={lottery.id} lottery={lottery} onPress={() => navigation.navigate(routes.ADMIN_EDIT_LOTTERY, { lottery })} />
      ))}

      {current && (
        <View style={styles.currentBox}>
          <Text style={styles.currentTitle}>Sorteio atual</Text>
          <Text style={styles.currentPrize}>Prêmio {formatCurrency(current.premioDinheiro)}</Text>
          <AppButton title="Reativar todas as vendas" variant="outline" onPress={handleReactivate} />
          <AppButton title="Realizar sorteio oficial" onPress={handleDraw} />
        </View>
      )}

      <SectionHeader title="Vendas do Sorteio Atual" expanded={expanded.vendas} onPress={() => setExpanded((s) => ({ ...s, vendas: !s.vendas }))} />
      {expanded.vendas && current && (
        <View style={styles.metricsBox}>
          <Text style={styles.reportTitle}>Relatório completo</Text>
          <View style={styles.metricRow}>
            <MetricCard active label="DISTRIBUÍDOS" value={`${current.metricas?.distribuidos || 0} Bilhetes`} />
            <MetricCard label="VENDIDOS" value={`${current.metricas?.vendidos || 0} Bilhetes`} />
          </View>
          <View style={styles.metricRow}>
            <MetricCard active label="PAGOS" value={`${current.metricas?.pagos || 0} Bilhetes`} />
            <MetricCard label="AGUARDANDO" value={`${current.metricas?.pendentes || 0} Bilhetes`} />
          </View>
          <View style={styles.metricRow}>
            <MetricCard active label="PAGOS" value={formatCurrency(current.metricas?.valorPago || 0)} />
            <MetricCard label="AGUARDANDO" value={formatCurrency(current.metricas?.valorPendente || 0)} />
          </View>
        </View>
      )}

      <SectionHeader title="Últimos Resultados" expanded={expanded.resultados} onPress={() => setExpanded((s) => ({ ...s, resultados: !s.resultados }))} />
      {expanded.resultados && inactive.filter((item) => item.resultado).map((lottery) => (
        <View key={lottery.id} style={styles.resultCard}>
          <Text style={styles.resultTop}>{formatCurrency(lottery.premioDinheiro)}</Text>
          <Text style={styles.resultNumber}>{lottery.resultado?.numero}</Text>
          <Text style={styles.resultPerson}>Ganhador: {lottery.resultado?.ganhadorNome || '-'}</Text>
          <Text style={styles.resultPerson}>Vendedor: {lottery.resultado?.vendedorNome || '-'}</Text>
        </View>
      ))}

      <AppButton title="Sair" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12
  },
  currentBox: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 24
  },
  currentTitle: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center'
  },
  currentPrize: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 28,
    textAlign: 'center',
    marginVertical: 12
  },
  metricsBox: {
    backgroundColor: colors.surface,
    marginTop: 12,
    padding: 10
  },
  reportTitle: {
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 8
  },
  metricRow: {
    flexDirection: 'row'
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 12
  },
  resultTop: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900'
  },
  resultNumber: {
    marginTop: 16,
    backgroundColor: colors.primary,
    color: '#FFF',
    fontSize: 52,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 12,
    borderRadius: 12,
    paddingVertical: 22
  },
  resultPerson: {
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 20,
    marginTop: 12
  }
});
