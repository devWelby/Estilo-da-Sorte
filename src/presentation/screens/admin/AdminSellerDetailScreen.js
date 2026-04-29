import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import MetricCard from '../../components/MetricCard';
import SectionHeader from '../../components/SectionHeader';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { friendlyFirebaseError } from '../../../utils/errors';
import { observeUserProfile, setSellerStatus } from '../../../data/repositories/userRepository';
import { observeSellerSales } from '../../../data/repositories/salesRepository';

function asDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dayKey(value) {
  const date = asDate(value);
  if (!date) return 'Sem data';
  return date.toLocaleDateString('pt-BR');
}

function dayLabel(value) {
  const date = asDate(value);
  if (!date) return 'Sem data';

  const now = new Date();
  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === todayKey) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR');
}

export default function AdminSellerDetailScreen({ route }) {
  const initialSeller = route?.params?.seller || {};
  const sellerId = initialSeller.id;

  const [profile, setProfile] = useState(initialSeller);
  const [sales, setSales] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState({ dispositivos: false, hoje: true, vendas: true });

  useEffect(() => {
    if (!sellerId) return undefined;
    return observeUserProfile(sellerId, (data) => setProfile((prev) => ({ ...prev, ...(data || {}) })), console.warn);
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return undefined;
    return observeSellerSales(sellerId, setSales, console.warn);
  }, [sellerId]);

  const metrics = useMemo(() => {
    const totalSales = sales.length;
    const soldTickets = sales.reduce((sum, item) => sum + Number(item.quantidade || item.numeros?.length || 1), 0);
    const paidValue = sales
      .filter((item) => ['pago', 'confirmada'].includes(item.status || item.statusPagamento || item.statusVenda))
      .reduce((sum, item) => sum + Number(item.valorTotal || item.valor || 0), 0);
    const pendingCount = sales.filter((item) => ['pendente'].includes(item.status || item.statusPagamento || item.statusVenda)).length;

    return {
      totalSales,
      soldTickets,
      paidValue,
      pendingCount
    };
  }, [sales]);

  const groupedHistory = useMemo(() => {
    const map = new Map();
    sales.forEach((item) => {
      const key = dayKey(item.criadoEm);
      const current = map.get(key) || { count: 0, sample: item };
      map.set(key, { count: current.count + 1, sample: current.sample });
    });

    return Array.from(map.entries()).map(([key, value]) => ({
      key,
      label: dayLabel(value.sample.criadoEm),
      count: value.count
    }));
  }, [sales]);

  const todaysSales = useMemo(() => {
    return sales.filter((item) => dayLabel(item.criadoEm) === 'Hoje');
  }, [sales]);

  const latestSale = sales[0] || null;

  async function handleToggleStatus() {
    if (!profile?.id) return;
    const nextStatus = profile.status === 'inativo' ? 'ativo' : 'inativo';

    try {
      setProcessing(true);
      await setSellerStatus(profile.id, nextStatus);
      Alert.alert('Pronto', `Vendedor ${nextStatus === 'ativo' ? 'reativado' : 'inativado'}.`);
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Screen>
      <AnimatedEntrance>
        <View style={styles.profileBox}>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.nome || 'Vendedor'}</Text>
            <Text style={styles.email}>{profile?.email || '-'}</Text>
            <Text style={styles.status}>Status: {profile?.status || 'ativo'}</Text>
          </View>
          <Text style={styles.edit}>Detalhes</Text>
        </View>
      </AnimatedEntrance>

      <AppButton title="Distribuir bilhetes" onPress={() => Alert.alert('Distribuicao', 'Fluxo de distribuicao sera integrado nesta tela na proxima fase.')} />
      <AppButton title="Prestou contas" variant="secondary" onPress={() => Alert.alert('Prestacao', 'Use esta acao para marcar acerto financeiro do vendedor.')} />
      <AppButton
        title={profile?.status === 'inativo' ? 'Reativar vendedor' : 'Inativar vendedor'}
        variant="outline"
        loading={processing}
        onPress={handleToggleStatus}
      />

      <SectionHeader
        title="Dispositivos conectados"
        expanded={expanded.dispositivos}
        onPress={() => setExpanded((s) => ({ ...s, dispositivos: !s.dispositivos }))}
      />
      {!!expanded.dispositivos && <Text style={styles.inlineHint}>Monitoramento de dispositivos sera mostrado aqui quando os tokens push forem listados por vendedor.</Text>}

      <View style={styles.metricRow}>
        <MetricCard active label="Recebeu" value={`${profile?.totalRecebido || 0} bilhetes`} />
        <MetricCard label="Vendeu" value={`${metrics.soldTickets} bilhetes`} />
      </View>

      <View style={styles.metricRow}>
        <MetricCard active label="Vendas" value={String(metrics.totalSales)} />
        <MetricCard label="Pendentes" value={String(metrics.pendingCount)} />
      </View>

      <View style={styles.distributionBox}>
        {latestSale ? (
          <>
            <Text style={styles.distTitle}>Ultima venda: {formatDate(latestSale.criadoEm)}</Text>
            <Text style={styles.distText}>Cliente: {latestSale.clienteNome || latestSale.clienteId || '-'}</Text>
            <Text style={styles.distText}>Numero(s): {(latestSale.numeros || [latestSale.numero]).filter(Boolean).join(', ')}</Text>
            <Text style={styles.distText}>Valor: {formatCurrency(latestSale.valorTotal || latestSale.valor || 0)}</Text>
          </>
        ) : (
          <EmptyState title="Sem vendas registradas para este vendedor." />
        )}
      </View>

      <SectionHeader
        title="Vendas de hoje"
        expanded={expanded.hoje}
        onPress={() => setExpanded((s) => ({ ...s, hoje: !s.hoje }))}
        right={<Text style={styles.counter}>{todaysSales.length}</Text>}
      />
      {!!expanded.hoje && (
        todaysSales.length ? todaysSales.slice(0, 6).map((sale) => (
          <View key={sale.id} style={styles.saleRow}>
            <Text style={styles.saleMain}>#{sale.id.slice(-6).toUpperCase()} - {sale.numero || sale.numeros?.[0] || '-'}</Text>
            <Text style={styles.saleSub}>{sale.clienteNome || sale.clienteId || '-'} - {formatCurrency(sale.valorTotal || sale.valor || 0)}</Text>
          </View>
        )) : <Text style={styles.inlineHint}>Nenhuma venda hoje.</Text>
      )}

      <SectionHeader
        title="Vendas"
        expanded={expanded.vendas}
        onPress={() => setExpanded((s) => ({ ...s, vendas: !s.vendas }))}
      />

      {!!expanded.vendas && (
        groupedHistory.length ? groupedHistory.map((item) => (
          <View key={item.key} style={styles.saleDateRow}>
            <Text style={styles.badge}>{item.count}</Text>
            <Text style={styles.saleDate}>{item.label}</Text>
            <Text style={styles.arrow}>{'>'}</Text>
          </View>
        )) : <Text style={styles.inlineHint}>Sem historico de vendas.</Text>
      )}

      <View style={styles.footerTotal}>
        <Text style={styles.footerTotalLabel}>Total recebido (pagos)</Text>
        <Text style={styles.footerTotalValue}>{formatCurrency(metrics.paidValue)}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 18,
    marginVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  profileInfo: {
    flex: 1
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  email: {
    fontSize: 16,
    marginTop: 4,
    color: colors.muted
  },
  status: {
    marginTop: 6,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  edit: {
    color: colors.warning,
    backgroundColor: colors.surfaceWarm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontWeight: '900',
    fontSize: 16
  },
  inlineHint: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14
  },
  counter: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16
  },
  metricRow: {
    flexDirection: 'row',
    marginTop: 10
  },
  distributionBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16
  },
  distTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text
  },
  distText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 8
  },
  saleRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  saleMain: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  saleSub: {
    color: colors.muted,
    marginTop: 4
  },
  saleDateRow: {
    backgroundColor: colors.surface,
    minHeight: 74,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  badge: {
    backgroundColor: colors.primary,
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    minWidth: 52,
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 24,
    overflow: 'hidden'
  },
  saleDate: {
    marginLeft: 16,
    fontSize: 23,
    flex: 1,
    color: colors.text
  },
  arrow: {
    fontSize: 24,
    color: colors.muted,
    fontWeight: '800'
  },
  footerTotal: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFF8E8'
  },
  footerTotalLabel: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 13
  },
  footerTotalValue: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 24,
    marginTop: 4
  }
});
