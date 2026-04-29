import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppCard from '../../components/AppCard';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { useAuth } from '../../../hooks/useAuth';
import { useClientTickets } from '../../../hooks/useClientTickets';
import { colors } from '../../../constants/colors';
import { formatDate } from '../../../utils/formatters';

function statusMeta(status) {
  if (status === 'vendido') return { label: 'Confirmado', color: colors.success, bg: '#EAF7EF' };
  if (status === 'reservado') return { label: 'Reservado', color: colors.warning, bg: '#FFF3E5' };
  return { label: 'Indefinido', color: colors.muted, bg: '#F4F4F8' };
}

function CounterChip({ label, value, tone = 'default' }) {
  const isAccent = tone === 'accent';
  return (
    <View style={[styles.counterChip, isAccent && styles.counterChipAccent]}>
      <Text style={[styles.counterLabel, isAccent && styles.counterLabelAccent]}>{label}</Text>
      <Text style={[styles.counterValue, isAccent && styles.counterValueAccent]}>{value}</Text>
    </View>
  );
}

export default function ClientTicketsScreen() {
  const { user } = useAuth();
  const { tickets, loading } = useClientTickets(user?.uid);

  const summary = useMemo(() => {
    const sold = tickets.filter((item) => item.status === 'vendido').length;
    const reserved = tickets.filter((item) => item.status === 'reservado').length;
    return {
      total: tickets.length,
      sold,
      reserved
    };
  }, [tickets]);

  if (loading) {
    return <LoadingView message="Buscando seus bilhetes..." />;
  }

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Meus numeros da sorte</Text>
      <Text style={styles.subtitle}>Acompanhe seus bilhetes em tempo real</Text>

      <AppCard warm style={styles.summaryCard}>
        <View style={styles.counterRow}>
          <CounterChip label="Total" value={summary.total} tone="accent" />
          <CounterChip label="Confirmados" value={summary.sold} />
          <CounterChip label="Reservados" value={summary.reserved} />
        </View>
      </AppCard>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.path}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="Voce ainda nao tem bilhetes." />}
        renderItem={({ item, index }) => {
          const meta = statusMeta(item.status);
          return (
            <AnimatedEntrance delay={index * 24}>
              <AppCard style={styles.ticketRow}>
                <View style={styles.leftCol}>
                  <Text style={styles.number}>{item.id}</Text>
                  <Text style={styles.date}>{formatDate(item.atualizadoEm || item.updatedAt)}</Text>
                </View>

                <View style={[styles.badge, { borderColor: meta.color, backgroundColor: meta.bg }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </AppCard>
            </AnimatedEntrance>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 4
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 8
  },
  summaryCard: {
    marginTop: 2,
    marginBottom: 10
  },
  counterRow: {
    flexDirection: 'row',
    gap: 8
  },
  counterChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEDFC3',
    borderRadius: 14,
    backgroundColor: '#FFFDF7',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  counterChipAccent: {
    borderColor: '#F0B8BE',
    backgroundColor: '#FFF6F7'
  },
  counterLabel: {
    color: '#8F6D26',
    fontSize: 11,
    fontWeight: '800'
  },
  counterLabelAccent: {
    color: colors.primary
  },
  counterValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  counterValueAccent: {
    color: colors.primary
  },
  listContent: {
    paddingBottom: 24
  },
  ticketRow: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14
  },
  leftCol: {
    gap: 4
  },
  number: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.3
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  badge: {
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 104,
    alignItems: 'center'
  },
  badgeText: {
    fontWeight: '900',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  }
});
