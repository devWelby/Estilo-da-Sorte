import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function LoadingView({ message = 'Carregando...' }) {
  return (
    <View style={styles.container}>
      <View style={styles.loaderRing}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#FAD0D5'
  },
  text: {
    marginTop: 12,
    color: colors.primary,
    fontWeight: '800'
  }
});