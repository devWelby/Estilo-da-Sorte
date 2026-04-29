import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AppCard from '../../components/AppCard';
import AppButton from '../../components/AppButton';
import { useAuth } from '../../../hooks/useAuth';
import { useSellerSalesPagination } from '../../../hooks/useSellerSalesPagination';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';

function statusColor(status) {
  if (status === 'pago') return colors.success;
  if (status === 'pendente') return colors.warning;
  return colors.muted;
}

export default function SellerSalesScreen() {
  const { user } = useAuth();
  const { sales, loadingMore, hasMore, loadMore } = useSellerSalesPagination(user?.uid);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Minhas vendas</Text>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Nenhuma venda encontrada." />}
        ListFooterComponent={hasMore ? (
          <View style={styles.footer}>
            <AppButton title="Carregar mais" onPress={loadMore} loading={loadingMore} />
          </View>
        ) : null}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 20}>
            <AppCard style={styles.row}>
              <View>
                <Text style={styles.number}>Numero {item.numero}</Text>
                <Text style={styles.date}>{formatDate(item.criadoEm || item.createdAt)}</Text>
              </View>
              <View style={styles.right}>
                <Text style={styles.value}>{formatCurrency(item.valor)}</Text>
                <Text style={[styles.status, { color: statusColor(item.status || item.statusPagamento) }]}>
                  {String(item.status || item.statusPagamento || '').toUpperCase()}
                </Text>
              </View>
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
    marginTop: 6,
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6
  },
  number: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text
  },
  date: {
    color: colors.muted,
    marginTop: 2
  },
  right: {
    alignItems: 'flex-end'
  },
  value: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900'
  },
  status: {
    marginTop: 4,
    fontWeight: '900',
    fontSize: 12
  },
  footer: {
    paddingVertical: 12
  }
});
