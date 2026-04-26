import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/colors';

export default function SectionHeader({ title, expanded, onPress, right }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {right}
        <Text style={styles.arrow}>{expanded ? '⌄' : '›'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  arrow: {
    fontSize: 36,
    color: colors.text
  }
});
