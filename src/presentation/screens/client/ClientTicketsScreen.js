import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { useClientTickets } from '../../../hooks/useClientTickets';
import { colors } from '../../../constants/colors';
import { formatDate } from '../../../utils/formatters';

export default function ClientTicketsScreen() {
  const { user } = useAuth();
  const { tickets } = useClientTickets(user?.uid);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Meus números da sorte</Text>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.path}
        ListEmptyComponent={<EmptyState title="Você ainda não tem bilhetes." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.number}>{item.id}</Text>
            <Text style={styles.status}>{item.status}</Text>
            <Text style={styles.date}>{formatDate(item.updatedAt)}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 16
  },
  card: {
    backgroundColor: colors.surface,
    padding: 18,
    marginVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  number: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900'
  },
  status: {
    fontWeight: '900'
  },
  date: {
    color: colors.muted
  }
});
