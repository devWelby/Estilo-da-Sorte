import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../constants/colors';

export default function AppButton({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isOutline = variant === 'outline';
  const isWarning = variant === 'warning';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isOutline && styles.outline,
        isWarning && styles.warning,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={isOutline ? colors.primary : '#FFF'} /> : (
        <Text style={[styles.text, isOutline && styles.outlineText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginVertical: 8
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  warning: {
    backgroundColor: colors.warning
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  text: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800'
  },
  outlineText: {
    color: colors.primary
  }
});
