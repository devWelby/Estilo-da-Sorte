import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function AppCard({ children, style, warm = false, outline = false }) {
  return <View style={[styles.card, warm && styles.warm, outline && styles.outline, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ECE7DF',
    shadowColor: '#1A1A1A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3
  },
  warm: {
    backgroundColor: colors.surfaceWarm
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary
  }
});