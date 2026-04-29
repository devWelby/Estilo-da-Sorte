import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function EmptyState({ title = 'Nenhum registro encontrado.' }) {
  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 28,
    alignItems: 'center'
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    marginBottom: 10
  },
  text: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});