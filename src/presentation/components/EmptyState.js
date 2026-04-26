import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function EmptyState({ title = 'Nenhum registro encontrado.' }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center'
  },
  text: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center'
  }
});
