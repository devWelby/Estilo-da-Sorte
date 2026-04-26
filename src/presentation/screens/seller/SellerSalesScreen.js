import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { useSellerSales } from '../../../hooks/useSellerSales';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';

export default function SellerSalesScreen() {
  const { user } = useAuth();
  const { sales } = useSellerSales(user?.uid);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Minhas vendas</Text>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.number}>Nº {item.numero}</Text>
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.value}>{formatCurrency(item.valor)}</Text>
              <Text style={styles.status}>{item.statusPagamento}</Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    marginVertical: 16
  },
  row: {
    backgroundColor: colors.surface,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  number: {
    fontSize: 20,
    fontWeight: '900'
  },
  date: {
    color: colors.muted,
    marginTop: 4
  },
  right: {
    alignItems: 'flex-end'
  },
  value: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900'
  },
  status: {
    marginTop: 4,
    color: colors.muted
  }
});
