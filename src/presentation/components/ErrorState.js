import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { colors } from '../../constants/colors';

export default function ErrorState({
  title = 'Nao foi possivel carregar agora.',
  actionLabel = 'Tentar novamente',
  onRetry
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>!</Text>
      <Text style={styles.text}>{title}</Text>
      {!!onRetry && <AppButton title={actionLabel} variant="outline" onPress={onRetry} style={styles.button} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 28,
    alignItems: 'center'
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#FFE7E6',
    color: colors.danger,
    fontWeight: '900',
    overflow: 'hidden',
    marginBottom: 10
  },
  text: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  button: {
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 20
  }
});