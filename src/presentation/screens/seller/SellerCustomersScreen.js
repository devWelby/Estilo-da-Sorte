import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AppCard from '../../components/AppCard';
import { useCustomers } from '../../../hooks/useCustomers';
import { routes } from '../../../constants/routes';
import { colors } from '../../../constants/colors';

export default function SellerCustomersScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const { customers, loading } = useCustomers(search);

  if (loading) {
    return <LoadingView message="Carregando clientes..." />;
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Clientes</Text>
      <FieldInput value={search} onChangeText={setSearch} placeholder="Buscar cliente" />
      <AppButton title="Novo cliente" onPress={() => navigation.navigate(routes.SELLER_CREATE_CUSTOMER)} />

      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="Nenhum cliente encontrado." />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 20}>
            <AppCard style={styles.row}>
              <Text style={styles.name}>{item.nome}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.id}>ID: {item.id}</Text>
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
    color: colors.text,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 6
  },
  row: {
    marginVertical: 6
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text
  },
  email: {
    marginTop: 4,
    fontSize: 15,
    color: colors.muted
  },
  id: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  }
});