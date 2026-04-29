import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { colors } from '../../../constants/colors';
import { normalizeSearch } from '../../../utils/formatters';
import { friendlyFirebaseError } from '../../../utils/errors';
import { observeUsersByType, setSellerStatus } from '../../../data/repositories/userRepository';
import { routes } from '../../../constants/routes';

export default function AdminPendingUsersScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState('');

  useEffect(() => observeUsersByType('vendedor', setItems, console.warn), []);

  const pending = useMemo(() => {
    const value = normalizeSearch(search);
    const base = items.filter((item) => item.status === 'inativo');
    if (!value) return base;
    return base.filter((item) => normalizeSearch(`${item.nome} ${item.email}`).includes(value));
  }, [items, search]);

  async function approveSeller(item) {
    try {
      setLoadingId(item.id);
      await setSellerStatus(item.id, 'ativo');
      Alert.alert('Aprovado', `${item.nome} foi liberado(a) para vender.`);
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    } finally {
      setLoadingId('');
    }
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Usuarios aguardando liberacao</Text>
      <Text style={styles.subtitle}>Aprove e ative vendedores inativos</Text>
      <FieldInput value={search} onChangeText={setSearch} placeholder="Buscar por nome ou email" />

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="Nenhum vendedor aguardando liberacao." />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 22}>
            <AppCard style={styles.card}>
              <Pressable onPress={() => navigation.navigate(routes.ADMIN_SELLER_DETAIL, { seller: item })}>
                <Text style={styles.name}>{item.nome || 'Sem nome'}</Text>
                <Text style={styles.email}>{item.email || '-'}</Text>
                <Text style={styles.meta}>ID: {item.id}</Text>
              </Pressable>
              <View style={styles.actions}>
                <AppButton
                  title="Ver detalhes"
                  variant="outline"
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate(routes.ADMIN_SELLER_DETAIL, { seller: item })}
                />
                <AppButton
                  title="Aprovar"
                  loading={loadingId === item.id}
                  style={styles.actionBtn}
                  onPress={() => approveSeller(item)}
                />
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
    marginTop: 6,
    color: colors.text,
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8
  },
  listContent: {
    paddingBottom: 24
  },
  card: {
    marginVertical: 6
  },
  name: {
    fontSize: 21,
    color: colors.text,
    fontWeight: '900'
  },
  email: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 15
  },
  meta: {
    marginTop: 6,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  actionBtn: {
    flex: 1
  }
});
