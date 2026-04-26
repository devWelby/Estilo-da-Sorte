import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import { colors } from '../../../constants/colors';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../hooks/useAuth';
import { friendlyFirebaseError } from '../../../utils/errors';

export default function LoginScreen() {
  const { signIn, devLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Erro no login', friendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDevLogin(role) {
    try {
      setLoading(true);
      await devLogin(role);
    } catch (error) {
      Alert.alert('Login dev', friendlyFirebaseError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>ESTILO</Text>
        <Text style={styles.logoSub}>DA SORTE</Text>
      </View>
      <Text style={styles.title}>Entrar</Text>
      <FieldInput label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <FieldInput label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <AppButton title="Entrar" onPress={handleLogin} loading={loading} />

      {__DEV__ && ENV.devLoginEnabled && (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Login Dev</Text>
          <AppButton title="Entrar como Admin" variant="outline" onPress={() => handleDevLogin('admin')} />
          <AppButton title="Entrar como Vendedor" variant="outline" onPress={() => handleDevLogin('vendedor')} />
          <AppButton title="Entrar como Cliente" variant="outline" onPress={() => handleDevLogin('cliente')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center'
  },
  logoBox: {
    alignSelf: 'center',
    width: 120,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  logoSub: {
    fontSize: 10,
    color: colors.text
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
    color: colors.primary
  },
  devBox: {
    marginTop: 24
  },
  devTitle: {
    textAlign: 'center',
    fontWeight: '900',
    color: colors.muted,
    marginBottom: 8
  }
});
