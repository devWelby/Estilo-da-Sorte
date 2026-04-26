import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import { colors } from '../../../constants/colors';
import { saveLottery } from '../../../data/repositories/lotteryRepository';

export default function AdminEditLotteryScreen({ route, navigation }) {
  const lottery = route?.params?.lottery;
  const [data, setData] = useState(lottery?.dataSorteioText || '18/04/2026');
  const [premioDinheiro, setPremioDinheiro] = useState(String(lottery?.premioDinheiro || '0'));
  const [premioPrincipal, setPremioPrincipal] = useState(lottery?.premioPrincipal || '');
  const [valorBilhete, setValorBilhete] = useState(String(lottery?.valorBilhete || '2'));
  const [chances, setChances] = useState(String(lottery?.chances || '20'));
  const [loading, setLoading] = useState(false);

  function parseBrazilianDate(value) {
    const [day, month, year] = value.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  async function handleSave() {
    try {
      setLoading(true);
      await saveLottery({
        dataSorteio: parseBrazilianDate(data),
        dataSorteioText: data,
        premioDinheiro: Number(String(premioDinheiro).replace(/\./g, '').replace(',', '.')),
        premioPrincipal,
        valorBilhete: Number(String(valorBilhete).replace(',', '.')),
        chances: Number(chances),
        status: lottery?.status || 'ativo'
      }, lottery?.id);
      Alert.alert('Salvo', 'Sorteio salvo com sucesso.');
      navigation?.goBack?.();
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.top}>Editar sorteio {data}</Text>
      <AppButton title="Informar ganhador" variant="outline" onPress={() => Alert.alert('Ganhador', 'Use o sorteio oficial ou preencha manualmente no painel.')} />
      <FieldInput label="Data" value={data} onChangeText={setData} placeholder="dd/mm/aaaa" />
      <FieldInput label="Quantidade de ganhadores" value="1" onChangeText={() => {}} keyboardType="number-pad" />
      <FieldInput label="Prêmio em dinheiro" value={premioDinheiro} onChangeText={setPremioDinheiro} keyboardType="numeric" />
      <FieldInput label="Prêmio principal (Opcional)" value={premioPrincipal} onChangeText={setPremioPrincipal} />
      <FieldInput label="Valor do bilhete" value={valorBilhete} onChangeText={setValorBilhete} keyboardType="numeric" />
      <FieldInput label="Número de chances" value={chances} onChangeText={setChances} keyboardType="number-pad" />
      <AppButton title="Salvar sorteio" onPress={handleSave} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    backgroundColor: colors.surfaceWarm,
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
    padding: 18,
    borderRadius: 12,
    textAlign: 'center',
    marginVertical: 16
  }
});
