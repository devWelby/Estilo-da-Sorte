import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function Screen({ children, scroll = true, style }) {
  const content = <View style={[styles.content, style]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topGlowPrimary} />
      <View style={styles.topGlowWarm} />
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  topGlowPrimary: {
    position: 'absolute',
    top: -140,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FFE8EA'
  },
  topGlowWarm: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FDF7E6'
  },
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 34
  }
});