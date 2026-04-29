import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function MetricCard({ label, value, active = false }) {
  return (
    <View style={[styles.card, active && styles.active]}>
      <Text style={[styles.label, active && styles.activeText]}>{label}</Text>
      <Text style={[styles.value, active && styles.activeText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surfaceWarm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE6D5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 6
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  label: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  value: {
    marginTop: 7,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center'
  },
  activeText: {
    color: '#FFF'
  }
});