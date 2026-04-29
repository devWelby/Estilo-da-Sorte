import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import { colors } from '../../../constants/colors';
import { Config } from '../../../config/env';
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
      <AnimatedEntrance>
        <View style={styles.brandPill}>
          <Text style={styles.brandTop}>ESTILO DA</Text>
          <Text style={styles.brandBottom}>SORTE</Text>
        </View>
      </AnimatedEntrance>

      <AnimatedEntrance delay={60}>
        <Text style={styles.title}>Acesse sua conta</Text>
        <Text style={styles.subtitle}>Vendas seguras para clientes, vendedores e administradores.</Text>
      </AnimatedEntrance>

      <AnimatedEntrance delay={120}>
        <FieldInput label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <FieldInput label="Senha" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton title="Entrar" onPress={handleLogin} loading={loading} />
      </AnimatedEntrance>

      {__DEV__ && Config.ENABLE_DEV_LOGIN && (
        <AnimatedEntrance delay={180}>
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>Login Dev</Text>
            <AppButton title="Entrar como Admin" variant="outline" onPress={() => handleDevLogin('admin')} />
            <AppButton title="Entrar como Vendedor" variant="outline" onPress={() => handleDevLogin('vendedor')} />
            <AppButton title="Entrar como Cliente" variant="outline" onPress={() => handleDevLogin('cliente')} />
          </View>
        </AnimatedEntrance>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center'
  },
  brandPill: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceWarm,
    borderWidth: 1,
    borderColor: '#ECD89A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginBottom: 20
  },
  brandTop: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.primary,
    textAlign: 'center'
  },
  brandBottom: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center'
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    color: colors.text
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 12
  },
  devBox: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 14
  },
  devTitle: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8
  }
});
