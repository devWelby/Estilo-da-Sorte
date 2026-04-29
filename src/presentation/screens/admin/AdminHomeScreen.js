import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import LotteryCard from '../../components/LotteryCard';
import SectionHeader from '../../components/SectionHeader';
import MetricCard from '../../components/MetricCard';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { routes } from '../../../constants/routes';
import { colors } from '../../../constants/colors';
import { useLotteries } from '../../../hooks/useLotteries';
import { formatCurrency } from '../../../utils/formatters';
import { reactivateAllSales, runOfficialDraw } from '../../../data/repositories/lotteryRepository';
import { sendTestNotification } from '../../../data/repositories/notificationRepository';
import { useAuth } from '../../../hooks/useAuth';

function isOpenLottery(item) {
  return ['aberto', 'ativo', 'pausado', 'emSorteio'].includes(item.status);
}

export default function AdminHomeScreen({ navigation }) {
  const { signOut, user } = useAuth();
  const { items } = useLotteries();
  const [expanded, setExpanded] = useState({ vendas: false, resultados: false });

  const active = useMemo(() => items.filter((item) => isOpenLottery(item)), [items]);
  const inactive = useMemo(() => items.filter((item) => !isOpenLottery(item)), [items]);
  const current = active[0];

  async function handleReactivate() {
    if (!current?.id) return;
    try {
      await reactivateAllSales(current.id);
      Alert.alert('Pronto', 'Vendas reativadas para o sorteio atual.');
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel reativar.');
    }
  }

  async function handleDraw() {
    if (!current?.id) return;
    try {
      const result = await runOfficialDraw(current.id);
      Alert.alert('Sorteio realizado', `Numero ganhador: ${result.numero}`);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel realizar o sorteio.');
    }
  }

  async function handleTestPush() {
    if (!user?.uid) return;
    try {
      const response = await sendTestNotification(
        user.uid,
        'Push de teste',
        'Cloud Messaging conectado com sucesso.',
        { scope: 'admin-home' }
      );
      Alert.alert('Push', `Notificacoes enviadas: ${response?.sent || 0}`);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Falha ao enviar push de teste.');
    }
  }

  return (
    <Screen>
      <AnimatedEntrance>
        <Text style={styles.header}>Sorteios ativos</Text>
      </AnimatedEntrance>

      {active.length ? active.map((lottery, index) => (
        <AnimatedEntrance key={lottery.id} delay={index * 45}>
          <LotteryCard lottery={lottery} active onPress={() => navigation.navigate(routes.ADMIN_EDIT_LOTTERY, { lottery })} />
        </AnimatedEntrance>
      )) : <EmptyState title="Nenhum sorteio ativo." />}

      <Text style={[styles.header, styles.headerGap]}>Sorteios inativos</Text>
      {inactive.map((lottery) => (
        <LotteryCard key={lottery.id} lottery={lottery} onPress={() => navigation.navigate(routes.ADMIN_EDIT_LOTTERY, { lottery })} />
      ))}

      {current && (
        <View style={styles.currentBox}>
          <Text style={styles.currentTitle}>Sorteio em destaque</Text>
          <Text style={styles.currentPrize}>{formatCurrency(current.premioDinheiro || 0)}</Text>
          <AppButton title="Reativar todas as vendas" variant="outline" onPress={handleReactivate} />
          <AppButton title="Realizar sorteio oficial" onPress={handleDraw} />
        </View>
      )}

      <SectionHeader
        title="Usuarios aguardando liberacao"
        expanded={false}
        onPress={() => navigation.navigate(routes.ADMIN_PENDING_USERS)}
      />
      <SectionHeader
        title="Vendedores"
        expanded={false}
        onPress={() => navigation.navigate(routes.ADMIN_SELLERS)}
      />

      <SectionHeader title="Vendas do sorteio atual" expanded={expanded.vendas} onPress={() => setExpanded((s) => ({ ...s, vendas: !s.vendas }))} />
      {expanded.vendas && current && (
        <View style={styles.metricsBox}>
          <Text style={styles.reportTitle}>Relatorio completo</Text>
          <View style={styles.metricRow}>
            <MetricCard active label="Distribuidos" value={`${current.metricas?.distribuidos || 0} bilhetes`} />
            <MetricCard label="Vendidos" value={`${current.metricas?.vendidos || 0} bilhetes`} />
          </View>
          <View style={styles.metricRow}>
            <MetricCard active label="Pagos" value={`${current.metricas?.pagos || 0} bilhetes`} />
            <MetricCard label="Aguardando" value={`${current.metricas?.pendentes || 0} bilhetes`} />
          </View>
          <View style={styles.metricRow}>
            <MetricCard active label="Pagos" value={formatCurrency(current.metricas?.valorPago || 0)} />
            <MetricCard label="Aguardando" value={formatCurrency(current.metricas?.valorPendente || 0)} />
          </View>
        </View>
      )}

      <SectionHeader title="Ultimos resultados" expanded={expanded.resultados} onPress={() => setExpanded((s) => ({ ...s, resultados: !s.resultados }))} />
      {expanded.resultados && inactive.filter((item) => item.resultado).map((lottery) => (
        <View key={lottery.id} style={styles.resultCard}>
          <Text style={styles.resultTop}>{formatCurrency(lottery.premioDinheiro)}</Text>
          <Text style={styles.resultNumber}>{lottery.resultado?.numero}</Text>
          <Text style={styles.resultPerson}>Ganhador: {lottery.resultado?.ganhadorNome || '-'}</Text>
          <Text style={styles.resultPerson}>Vendedor: {lottery.resultado?.vendedorNome || '-'}</Text>
        </View>
      ))}

      <AppButton title="Enviar push de teste" variant="outline" onPress={handleTestPush} />
      <AppButton title="Sair" variant="outline" onPress={signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginTop: 6,
    marginBottom: 8
  },
  headerGap: {
    marginTop: 18
  },
  currentBox: {
    borderWidth: 1.4,
    borderColor: '#F2B9BF',
    backgroundColor: '#FFF9FA',
    borderRadius: 20,
    padding: 16,
    marginTop: 22
  },
  currentTitle: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center'
  },
  currentPrize: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 34,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10
  },
  metricsBox: {
    backgroundColor: colors.surface,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16
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
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
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
    fontSize: 50,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 10,
    borderRadius: 14,
    paddingVertical: 22
  },
  resultPerson: {
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center',
    fontSize: 20,
    marginTop: 10
  }
});
