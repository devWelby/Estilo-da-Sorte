import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import MetricCard from '../../components/MetricCard';
import SectionHeader from '../../components/SectionHeader';
import { colors } from '../../../constants/colors';

export default function AdminSellerDetailScreen({ route }) {
  const seller = route?.params?.seller || {};
  const [expanded, setExpanded] = useState({ dispositivos: false, hoje: false, vendas: true });

  return (
    <Screen>
      <View style={styles.profileBox}>
        <View>
          <Text style={styles.name}>{seller.nome || 'Vendedor'}</Text>
          <Text style={styles.email}>{seller.email}</Text>
        </View>
        <Text style={styles.edit}>✎ Editar</Text>
      </View>
      <AppButton title="Distribuir bilhetes" />
      <AppButton title="Prestou contas" variant="warning" />
      <SectionHeader title="Dispositivos conectados" expanded={expanded.dispositivos} onPress={() => setExpanded((s) => ({ ...s, dispositivos: !s.dispositivos }))} />
      <View style={styles.metricRow}>
        <MetricCard active label="RECEBEU" value={`${seller.totalRecebido || 300} Bilhetes`} />
        <MetricCard label="VENDEU" value={`${seller.totalVendido || 0} Bilhetes`} />
      </View>
      <View style={styles.distributionBox}>
        <Text style={styles.distTitle}>Sorteio 2342 - 18/04/2026</Text>
        <Text style={styles.distText}>Lote: 005  Início: 005.001-6  Fim: 005.300-7</Text>
      </View>
      <SectionHeader title="Vendas de Hoje" expanded={expanded.hoje} onPress={() => setExpanded((s) => ({ ...s, hoje: !s.hoje }))} />
      <SectionHeader title="Vendas" expanded={expanded.vendas} onPress={() => setExpanded((s) => ({ ...s, vendas: !s.vendas }))} />
      {expanded.vendas && ['Ontem', '14/04/2026', '11/04/2026', '07/04/2026', '31/03/2026'].map((date, index) => (
        <View key={date} style={styles.saleDateRow}>
          <Text style={styles.badge}>{[3, 5, 38, 39, 25][index]}</Text>
          <Text style={styles.saleDate}>{date}</Text>
          <Text style={styles.arrow}>⌄</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileBox: {
    backgroundColor: colors.surface,
    padding: 20,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  name: {
    fontSize: 24,
    fontWeight: '900'
  },
  email: {
    fontSize: 16,
    marginTop: 4
  },
  edit: {
    color: colors.warning,
    backgroundColor: colors.surfaceWarm,
    padding: 12,
    borderRadius: 10,
    fontWeight: '900',
    fontSize: 18
  },
  metricRow: {
    flexDirection: 'row',
    marginTop: 16
  },
  distributionBox: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  distTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center'
  },
  distText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12
  },
  saleDateRow: {
    backgroundColor: colors.surface,
    minHeight: 74,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center'
  },
  badge: {
    backgroundColor: colors.primary,
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    overflow: 'hidden'
  },
  saleDate: {
    marginLeft: 20,
    fontSize: 24,
    flex: 1
  },
  arrow: {
    fontSize: 32
  }
});
