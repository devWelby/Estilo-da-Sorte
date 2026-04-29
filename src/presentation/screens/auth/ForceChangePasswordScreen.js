import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import { colors } from '../../../constants/colors';
import { auth, db } from '../../../config/firebase';
import { paths } from '../../../data/firebase/firestorePaths';

export default function ForceChangePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    if (password.length < 6) {
      Alert.alert('Senha invalida', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Senha invalida', 'A confirmacao da senha nao confere.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      Alert.alert('Sessao expirada', 'Faca login novamente para alterar sua senha.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(currentUser, password);
      await updateDoc(doc(db, paths.user(currentUser.uid)), { forcePasswordChange: false });
      Alert.alert('Senha atualizada', 'Sua senha foi atualizada com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao atualizar senha', error?.message || 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Troque sua senha</Text>
        <Text style={styles.subtitle}>Por seguranca, defina uma nova senha antes de continuar.</Text>
        <FieldInput label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry />
        <FieldInput label="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <AppButton title="Salvar nova senha" onPress={handleChangePassword} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center'
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8
  },
  subtitle: {
    color: colors.muted,
    marginBottom: 16
  }
});
