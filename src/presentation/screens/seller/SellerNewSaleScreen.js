import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AppCard from '../../components/AppCard';
import { colors } from '../../../constants/colors';
import { useActiveLotteries } from '../../../hooks/useLotteries';
import { sellTicket } from '../../../domain/services/saleService';
import { friendlyFirebaseError } from '../../../utils/errors';

function buildQuickNumbers(initial) {
  const first = Number(initial || 1);
  return Array.from({ length: 6 }, (_, idx) => String(first + idx).padStart(6, '0'));
}

export default function SellerNewSaleScreen() {
  const { items } = useActiveLotteries();
  const current = items[0];
  const [numero, setNumero] = useState('000001');
  const [clienteId, setClienteId] = useState('');
  const [valor, setValor] = useState('2');
  const [loading, setLoading] = useState(false);

  const quickNumbers = useMemo(() => buildQuickNumbers(numero), [numero]);

  async function handleCreateSale() {
    try {
      setLoading(true);
      const result = await sellTicket({ sorteioId: current?.id, numero, clienteId, valor });
      Alert.alert('Venda criada', `Venda ${result.vendaId} criada como pendente.`);
      setClienteId('');
    } catch (error) {
      Alert.alert('Erro na venda', friendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  }

  if (!current) {
    return (
      <Screen>
        <Text style={styles.title}>Nova venda</Text>
        <EmptyState title="Nao existe sorteio aberto para venda agora." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AnimatedEntrance>
        <AppCard warm style={styles.hero}>
          <Text style={styles.heroTag}>Balcao de vendas</Text>
          <Text style={styles.title}>Nova venda</Text>
          <Text style={styles.current}>Sorteio: {current?.dataSorteioText || current?.id || '-'}</Text>
        </AppCard>
      </AnimatedEntrance>

      <View style={styles.legendRow}>
        <Text style={[styles.legendPill, styles.legendOk]}>Disponivel</Text>
        <Text style={[styles.legendPill, styles.legendPending]}>Reservado</Text>
        <Text style={[styles.legendPill, styles.legendSold]}>Vendido</Text>
      </View>

      <FieldInput label="Numero" value={numero} onChangeText={setNumero} keyboardType="number-pad" />
      <View style={styles.quickRow}>
        {quickNumbers.map((item) => (
          <Text key={item} style={[styles.quickChip, numero === item && styles.quickChipActive]} onPress={() => setNumero(item)}>
            {item.slice(-3)}
          </Text>
        ))}
      </View>

      <FieldInput label="ID do cliente" value={clienteId} onChangeText={setClienteId} autoCapitalize="none" />
      <FieldInput label="Valor" value={valor} onChangeText={setValor} keyboardType="numeric" />

      <AppButton title="Reservar numero" onPress={handleCreateSale} loading={loading} />

      <View style={styles.tipBox}>
        <Text style={styles.tip}>Dica: use a aba Clientes para copiar o ID de quem vai comprar.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 8
  },
  heroTag: {
    color: colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6
  },
  title: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4
  },
  current: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    color: colors.text
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10
  },
  legendPill: {
    flex: 1,
    borderRadius: 999,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '800',
    fontSize: 12,
    overflow: 'hidden'
  },
  legendOk: {
    backgroundColor: '#EAF8EF',
    color: colors.success
  },
  legendPending: {
    backgroundColor: '#FFF4E7',
    color: colors.warning
  },
  legendSold: {
    backgroundColor: '#EFEFF4',
    color: colors.muted
  },
  quickRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    marginTop: -2
  },
  quickChip: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.muted,
    fontWeight: '700',
    overflow: 'hidden'
  },
  quickChipActive: {
    backgroundColor: '#FFEDEF',
    borderColor: '#F5B4BB',
    color: colors.primary
  },
  tipBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: '#EFE6D3'
  },
  tip: {
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '700'
  }
});