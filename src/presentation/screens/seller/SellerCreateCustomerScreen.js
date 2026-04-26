import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import { registerCustomer } from '../../../domain/services/customerService';
import { friendlyFirebaseError } from '../../../utils/errors';
import { colors } from '../../../constants/colors';

export default function SellerCreateCustomerScreen({ navigation }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    try {
      setLoading(true);
      const result = await registerCustomer({ nome, email, cpf, telefone });
      Alert.alert('Cliente criado', `Senha inicial: ${result.senhaInicial}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Novo cliente</Text>
      <FieldInput label="Nome" value={nome} onChangeText={setNome} />
      <FieldInput label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <FieldInput label="CPF" value={cpf} onChangeText={setCpf} keyboardType="number-pad" />
      <FieldInput label="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <AppButton title="Criar cliente" onPress={handleSave} loading={loading} />
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
  }
});
