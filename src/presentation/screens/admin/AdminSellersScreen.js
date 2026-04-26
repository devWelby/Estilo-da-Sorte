import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { observeUsersByType } from '../../../data/repositories/userRepository';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { colors } from '../../../constants/colors';
import { normalizeSearch } from '../../../utils/formatters';
import { routes } from '../../../constants/routes';

export default function AdminSellersScreen({ navigation }) {
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => observeUsersByType('vendedor', setSellers, console.warn), []);

  const filtered = useMemo(() => {
    const value = normalizeSearch(search);
    if (!value) return sellers;
    return sellers.filter((seller) => normalizeSearch(`${seller.nome} ${seller.email}`).includes(value));
  }, [sellers, search]);

  return (
    <Screen scroll={false}>
      <FieldInput value={search} onChangeText={setSearch} placeholder="Buscar por nome" />
      <View style={styles.rowInfo}>
        <Text style={styles.info}>{filtered.length} vendedores encontrados</Text>
        <Text style={styles.info}>Ver inativos</Text>
      </View>
      <AppButton title="Novo vendedor" onPress={() => {}} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <Pressable style={styles.sellerRow} onPress={() => navigation.navigate(routes.ADMIN_SELLER_DETAIL, { seller: item })}>
            <View>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.code}>{item.codigo || item.email}</Text>
            </View>
            <View style={styles.stats}>
              <Text style={styles.total}>{item.totalRecebido || 0}</Text>
              <Text style={styles.sold}>{item.totalVendido || 0}</Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowInfo: {
    backgroundColor: colors.surfaceWarm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    marginVertical: 8
  },
  info: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16
  },
  sellerRow: {
    minHeight: 92,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  code: {
    color: '#555',
    fontSize: 18,
    marginTop: 4
  },
  stats: {
    alignItems: 'center'
  },
  total: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900'
  },
  sold: {
    color: colors.muted,
    fontSize: 18,
    marginTop: 4
  }
});
