import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { useCustomers } from '../../../hooks/useCustomers';
import { routes } from '../../../constants/routes';
import { colors } from '../../../constants/colors';

export default function SellerCustomersScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { customers } = useCustomers(search);

  return (
    <Screen scroll={false}>
      <FieldInput value={search} onChangeText={setSearch} placeholder="Buscar cliente" />
      <AppButton title="Novo cliente" onPress={() => navigation.navigate(routes.SELLER_CREATE_CUSTOMER)} />
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Nenhum cliente encontrado." />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.nome}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  name: {
    fontSize: 20,
    fontWeight: '900'
  },
  email: {
    marginTop: 4,
    fontSize: 15,
    color: colors.muted
  }
});
