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
    minHeight: 90,
    backgroundColor: colors.surfaceWarm,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    margin: 8
  },
  active: {
    backgroundColor: colors.primary
  },
  label: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center'
  },
  value: {
    marginTop: 6,
    fontSize: 20,
    color: colors.primary,
    fontWeight: '900',
    textAlign: 'center'
  },
  activeText: {
    color: '#FFF'
  }
});
