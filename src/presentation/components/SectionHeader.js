import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';

export default function SectionHeader({ title, expanded, onPress, right }) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {right}
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-right'}
          size={28}
          color={colors.text}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  }
});