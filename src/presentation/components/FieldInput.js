import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function FieldInput({ label, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false, multiline = false }) {
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
    marginLeft: 8
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: '#AAAAAA',
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    fontSize: 18,
    color: colors.text
  },
  multiline: {
    minHeight: 92,
    textAlignVertical: 'top',
    paddingTop: 14
  }
});
