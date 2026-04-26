import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function AppCard({ children, style, warm = false, outline = false }) {
  return <View style={[styles.card, warm && styles.warm, outline && styles.outline, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  warm: {
    backgroundColor: colors.surfaceWarm
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.primary
  }
});
