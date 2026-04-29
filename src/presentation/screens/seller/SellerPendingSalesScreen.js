import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AppCard from '../../components/AppCard';
import { useAuth } from '../../../hooks/useAuth';
import { useSellerSales } from '../../../hooks/useSellerSales';
import { markSaleAsPaid, releaseSale } from '../../../domain/services/saleService';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { friendlyFirebaseError } from '../../../utils/errors';

export default function SellerPendingSalesScreen() {
  const { user } = useAuth();
  const { sales, loading } = useSellerSales(user?.uid);
  const pending = sales.filter((sale) => (sale.status || sale.statusPagamento) === 'pendente');

  async function runAction(fn, success) {
    try {
      await fn();
      Alert.alert('Pronto', success);
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    }
  }

  if (loading) {
    return <LoadingView message="Carregando pendencias..." />;
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Pendencias</Text>
      <Text style={styles.subtitle}>{pending.length} venda(s) aguardando confirmacao</Text>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Sem vendas pendentes." />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 35}>
            <AppCard style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.number}>Numero {item.numero}</Text>
                <Text style={styles.status}>PENDENTE</Text>
              </View>
              <Text style={styles.value}>{formatCurrency(item.valor)}</Text>
              <Text style={styles.client}>{item.clienteNome || item.clienteId || 'Cliente sem nome'}</Text>
              <Text style={styles.meta}>Criada em {formatDate(item.criadoEm || item.createdAt)}</Text>
              <AppButton title="Confirmar PIX" variant="secondary" onPress={() => runAction(() => markSaleAsPaid(item.id), 'Pagamento confirmado.')} />
              <AppButton title="Cancelar venda" variant="outline" onPress={() => runAction(() => releaseSale(item.id), 'Venda cancelada e numero liberado.')} />
            </AppCard>
          </AnimatedEntrance>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    marginTop: 6
  },
  subtitle: {
    color: colors.muted,
    fontWeight: '700',
    marginBottom: 8
  },
  card: {
    marginVertical: 8
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  number: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  status: {
    backgroundColor: '#FFF2D9',
    color: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '900'
  },
  value: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: '900',
    marginTop: 6
  },
  client: {
    marginTop: 4,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  },
  meta: {
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8,
    fontWeight: '600'
  }
});
