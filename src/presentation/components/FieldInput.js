import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  multiline = false,
  autoCapitalize = 'none'
}) {
  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.multiline]}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 7,
    marginLeft: 8
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.6,
    borderColor: '#D5D1C8',
    borderRadius: 18,
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 18,
    color: colors.text
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: 14
  }
});