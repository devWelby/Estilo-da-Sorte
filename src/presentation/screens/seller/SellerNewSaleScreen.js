import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import { colors } from '../../../constants/colors';
import { useActiveLotteries } from '../../../hooks/useLotteries';
import { sellTicket } from '../../../domain/services/saleService';
import { friendlyFirebaseError } from '../../../utils/errors';

export default function SellerNewSaleScreen() {
  const { items } = useActiveLotteries();
  const current = items[0];
  const [numero, setNumero] = useState('000001');
  const [clienteId, setClienteId] = useState('');
  const [valor, setValor] = useState('2');
  const [loading, setLoading] = useState(false);

  async function handleCreateSale() {
    try {
      setLoading(true);
      const result = await sellTicket({ sorteioId: current?.id, numero, clienteId, valor });
      Alert.alert('Venda criada', `Venda ${result.vendaId} criada como pendente.`);
    } catch (error) {
      Alert.alert('Erro na venda', friendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Nova venda</Text>
      <Text style={styles.current}>Sorteio: {current?.dataSorteioText || current?.id || '-'}</Text>
      <FieldInput label="Número" value={numero} onChangeText={setNumero} />
      <FieldInput label="ID do cliente" value={clienteId} onChangeText={setClienteId} />
      <FieldInput label="Valor" value={valor} onChangeText={setValor} keyboardType="numeric" />
      <AppButton title="Reservar número" onPress={handleCreateSale} loading={loading} />
      <Text style={styles.tip}>Dica: na versão final, substitua o ID do cliente por um seletor pesquisável.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 16
  },
  current: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16
  },
  tip: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 16
  }
});
