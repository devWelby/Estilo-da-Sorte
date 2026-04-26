import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { useSellerSales } from '../../../hooks/useSellerSales';
import { markSaleAsPaid, releaseSale } from '../../../domain/services/saleService';
import { colors } from '../../../constants/colors';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { friendlyFirebaseError } from '../../../utils/errors';

export default function SellerPendingSalesScreen() {
  const { user } = useAuth();
  const { sales } = useSellerSales(user?.uid);
  const pending = sales.filter((sale) => sale.statusPagamento === 'pendente');

  async function runAction(fn, success) {
    try {
      await fn();
      Alert.alert('Pronto', success);
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    }
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Pendências</Text>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Sem vendas pendentes." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.number}>Número {item.numero}</Text>
            <Text style={styles.value}>{formatCurrency(item.valor)}</Text>
            <Text style={styles.meta}>Criada em {formatDate(item.createdAt)}</Text>
            <AppButton title="Confirmar PIX" onPress={() => runAction(() => markSaleAsPaid(item.id), 'Pagamento confirmado.')} />
            <AppButton title="Cancelar venda" variant="outline" onPress={() => runAction(() => releaseSale(item.id), 'Venda cancelada e número liberado.')} />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8
  },
  number: {
    fontSize: 24,
    fontWeight: '900'
  },
  value: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '900',
    marginTop: 4
  },
  meta: {
    color: colors.muted,
    marginTop: 4
  }
});
