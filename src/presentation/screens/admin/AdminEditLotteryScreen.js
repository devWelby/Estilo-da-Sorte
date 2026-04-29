import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { colors } from '../../../constants/colors';
import { saveLottery, runOfficialDraw } from '../../../data/repositories/lotteryRepository';
import { formatCurrency } from '../../../utils/formatters';

function normalizeMoney(value) {
  const clean = String(value || '').replace(/\./g, '').replace(',', '.').trim();
  const parsed = Number(clean || 0);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function buildDefaultForm(lottery) {
  return {
    titulo: lottery?.titulo || 'Sorteio Especial',
    descricao: lottery?.descricao || '',
    dataSorteioText: lottery?.dataSorteioText || '18/04/2026',
    premioDinheiro: String(lottery?.premioDinheiro ?? 0),
    premioPrincipal: lottery?.premioPrincipal || '',
    valorBilhete: String(lottery?.valorBilhete ?? 2),
    chances: String(lottery?.chances ?? 20),
    quantidadeGanhadores: String(lottery?.quantidadeGanhadores ?? 1),
    numeroInicial: String(lottery?.numeroInicial ?? 1),
    quantidadeNumeros: String(lottery?.quantidadeNumeros ?? 1000),
    status: lottery?.status || 'aberto',
    codigoSorteio: lottery?.codigoSorteio || '',
    imagemUrl: lottery?.imagemUrl || '',
    especial: String(Boolean(lottery?.especial || false))
  };
}

function nextField(prev, key, value) {
  return { ...prev, [key]: value };
}

export default function AdminEditLotteryScreen({ route, navigation }) {
  const lottery = route?.params?.lottery;
  const [form, setForm] = useState(buildDefaultForm(lottery));
  const [loading, setLoading] = useState(false);
  const [drawLoading, setDrawLoading] = useState(false);

  const projectedPrize = useMemo(() => {
    const prize = normalizeMoney(form.premioDinheiro);
    if (form.premioPrincipal?.trim()) {
      return `${form.premioPrincipal.trim()} ou ${formatCurrency(prize)}`;
    }
    return formatCurrency(prize);
  }, [form.premioDinheiro, form.premioPrincipal]);

  function update(key, value) {
    setForm((prev) => nextField(prev, key, value));
  }

  function validateForm() {
    if (!form.titulo.trim()) return 'Informe o titulo do sorteio.';
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dataSorteioText.trim())) {
      return 'Data invalida. Use o formato dd/mm/aaaa.';
    }

    const quantidadeNumeros = Number(form.quantidadeNumeros);
    const numeroInicial = Number(form.numeroInicial);
    const quantidadeGanhadores = Number(form.quantidadeGanhadores);

    if (!Number.isFinite(numeroInicial) || numeroInicial < 1) {
      return 'Numero inicial deve ser maior que zero.';
    }
    if (!Number.isFinite(quantidadeNumeros) || quantidadeNumeros < 1) {
      return 'Quantidade de numeros deve ser maior que zero.';
    }
    if (quantidadeNumeros > 60000) {
      return 'Quantidade maxima permitida: 60000 numeros por sorteio.';
    }
    if (!Number.isFinite(quantidadeGanhadores) || quantidadeGanhadores < 1) {
      return 'Quantidade de ganhadores deve ser maior que zero.';
    }
    if (quantidadeGanhadores > quantidadeNumeros) {
      return 'Quantidade de ganhadores nao pode ser maior que a quantidade de numeros.';
    }

    return '';
  }

  async function handleSave() {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validacao', validationError);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        dataSorteioText: form.dataSorteioText.trim(),
        premioDinheiro: normalizeMoney(form.premioDinheiro),
        premioPrincipal: form.premioPrincipal.trim(),
        valorBilhete: normalizeMoney(form.valorBilhete),
        chances: Number(form.chances || 20),
        quantidadeGanhadores: Number(form.quantidadeGanhadores || 1),
        numeroInicial: Number(form.numeroInicial || 1),
        quantidadeNumeros: Number(form.quantidadeNumeros || 1000),
        status: form.status.trim() || 'aberto',
        codigoSorteio: form.codigoSorteio.trim(),
        imagemUrl: form.imagemUrl.trim(),
        especial: form.especial === 'true'
      };

      const sorteioId = await saveLottery(payload, lottery?.id);
      Alert.alert('Salvo', `Sorteio salvo com sucesso.\nID: ${sorteioId}`);
      navigation?.goBack?.();
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel salvar o sorteio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleInformWinner() {
    if (!lottery?.id) {
      Alert.alert('Salve antes', 'Salve o sorteio antes de realizar o sorteio oficial.');
      return;
    }

    try {
      setDrawLoading(true);
      const result = await runOfficialDraw(lottery.id);
      Alert.alert('Sorteio realizado', `Numero ganhador: ${result?.numero || '-'}`);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Nao foi possivel realizar o sorteio.');
    } finally {
      setDrawLoading(false);
    }
  }

  return (
    <Screen>
      <AnimatedEntrance>
        <View style={styles.top}>
          <Text style={styles.topTag}>ESTILO DA SORTE</Text>
          <Text style={styles.topTitle}>{lottery?.id ? `Editar sorteio ${form.dataSorteioText}` : 'Novo sorteio'}</Text>
          <Text style={styles.topHint}>{projectedPrize}</Text>
        </View>
      </AnimatedEntrance>

      <AppButton
        title="Informar ganhador"
        variant="outline"
        onPress={handleInformWinner}
        loading={drawLoading}
      />

      <FieldInput label="Titulo" value={form.titulo} onChangeText={(value) => update('titulo', value)} placeholder="Ex: Sorteio Especial Maio" autoCapitalize="words" />
      <FieldInput label="Data" value={form.dataSorteioText} onChangeText={(value) => update('dataSorteioText', value)} placeholder="dd/mm/aaaa" keyboardType="number-pad" />
      <FieldInput label="Quantidade de ganhadores" value={form.quantidadeGanhadores} onChangeText={(value) => update('quantidadeGanhadores', value)} keyboardType="number-pad" />
      <FieldInput label="Premio em dinheiro" value={form.premioDinheiro} onChangeText={(value) => update('premioDinheiro', value)} keyboardType="numeric" />
      <FieldInput label="Premio principal (Opcional)" value={form.premioPrincipal} onChangeText={(value) => update('premioPrincipal', value)} autoCapitalize="words" />
      <FieldInput label="Valor do bilhete" value={form.valorBilhete} onChangeText={(value) => update('valorBilhete', value)} keyboardType="numeric" />
      <FieldInput label="Numero de chances" value={form.chances} onChangeText={(value) => update('chances', value)} keyboardType="number-pad" />
      <FieldInput label="Numero inicial" value={form.numeroInicial} onChangeText={(value) => update('numeroInicial', value)} keyboardType="number-pad" />
      <FieldInput label="Quantidade de numeros" value={form.quantidadeNumeros} onChangeText={(value) => update('quantidadeNumeros', value)} keyboardType="number-pad" />
      <FieldInput label="Status" value={form.status} onChangeText={(value) => update('status', value)} placeholder="aberto, pausado, finalizado" />
      <FieldInput label="Codigo do sorteio (Opcional)" value={form.codigoSorteio} onChangeText={(value) => update('codigoSorteio', value)} placeholder="SS-2026-001" autoCapitalize="characters" />
      <FieldInput label="Imagem URL (Opcional)" value={form.imagemUrl} onChangeText={(value) => update('imagemUrl', value)} placeholder="https://..." keyboardType="url" />
      <FieldInput label="Descricao (Opcional)" value={form.descricao} onChangeText={(value) => update('descricao', value)} multiline autoCapitalize="sentences" />
      <FieldInput label="E especial?" value={form.especial} onChangeText={(value) => update('especial', value)} placeholder="true ou false" />

      <AppButton title="Salvar sorteio" onPress={handleSave} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: '#EFE5CC',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12
  },
  topTag: {
    color: colors.secondary,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.7
  },
  topTitle: {
    color: colors.primary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 4
  },
  topHint: {
    marginTop: 6,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16
  }
});
