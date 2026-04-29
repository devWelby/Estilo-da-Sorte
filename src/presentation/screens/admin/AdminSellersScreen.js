import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createSeller,
  observeUsersByType,
  setSellerStatus,
  updateSeller
} from '../../../data/repositories/userRepository';
import Screen from '../../components/Screen';
import FieldInput from '../../components/FieldInput';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import AnimatedEntrance from '../../components/AnimatedEntrance';
import AppCard from '../../components/AppCard';
import { colors } from '../../../constants/colors';
import { normalizeSearch } from '../../../utils/formatters';
import { routes } from '../../../constants/routes';
import { friendlyFirebaseError } from '../../../utils/errors';

function defaultForm() {
  return {
    vendedorId: '',
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    comissao: ''
  };
}

export default function AdminSellersScreen({ navigation }) {
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState(defaultForm());

  useEffect(() => observeUsersByType('vendedor', setSellers, console.warn), []);

  const visible = useMemo(() => (
    sellers.filter((seller) => showInactive ? seller.status === 'inativo' : seller.status !== 'inativo')
  ), [sellers, showInactive]);

  const filtered = useMemo(() => {
    const value = normalizeSearch(search);
    if (!value) return visible;
    return visible.filter((seller) => normalizeSearch(`${seller.nome} ${seller.email}`).includes(value));
  }, [visible, search]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openCreate() {
    setForm(defaultForm());
    setFormMode('create');
  }

  function openEdit(seller) {
    setForm({
      vendedorId: seller.id,
      nome: seller.nome || '',
      email: seller.email || '',
      telefone: seller.telefone || '',
      cpf: '',
      comissao: String(seller.comissao ?? '')
    });
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode(null);
    setForm(defaultForm());
  }

  async function handleSubmit() {
    if (!form.nome.trim() || !form.email.trim()) {
      Alert.alert('Campos obrigatorios', 'Informe nome e email.');
      return;
    }

    try {
      setProcessing(true);

      if (formMode === 'edit') {
        await updateSeller({
          vendedorId: form.vendedorId,
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          cpf: form.cpf.trim(),
          comissao: Number(form.comissao || 0)
        });
        Alert.alert('Pronto', 'Vendedor atualizado com sucesso.');
      } else {
        const data = await createSeller({
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
          cpf: form.cpf.trim(),
          comissao: Number(form.comissao || 0)
        });
        Alert.alert('Vendedor criado', `Senha inicial: ${data?.senhaInicial || '123456'}`);
      }

      closeForm();
    } catch (error) {
      Alert.alert('Erro', friendlyFirebaseError(error));
    } finally {
      setProcessing(false);
    }
  }

  async function handleToggleStatus(seller) {
    const nextStatus = seller.status === 'inativo' ? 'ativo' : 'inativo';
    const action = nextStatus === 'inativo' ? 'Inativar' : 'Reativar';

    Alert.alert(
      `${action} vendedor`,
      `${action} ${seller.nome}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action,
          style: nextStatus === 'inativo' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setProcessing(true);
              await setSellerStatus(seller.id, nextStatus);
              Alert.alert('Pronto', `Vendedor ${nextStatus === 'inativo' ? 'inativado' : 'reativado'}.`);
            } catch (error) {
              Alert.alert('Erro', friendlyFirebaseError(error));
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View>
            <FieldInput value={search} onChangeText={setSearch} placeholder="Buscar por nome" />

            <View style={styles.rowInfo}>
              <Text style={styles.info}>{filtered.length} vendedores encontrados</Text>
              <Pressable onPress={() => setShowInactive((prev) => !prev)}>
                <Text style={styles.link}>{showInactive ? 'Ver ativos' : 'Ver inativos'}</Text>
              </Pressable>
            </View>

            <AppButton
              title={formMode ? 'Cancelar' : 'Novo vendedor'}
              onPress={() => (formMode ? closeForm() : openCreate())}
              variant={formMode ? 'outline' : 'primary'}
            />

            {!!formMode && (
              <AppCard warm style={styles.createBox}>
                <Text style={styles.createTitle}>{formMode === 'edit' ? 'Editar vendedor' : 'Cadastrar vendedor'}</Text>
                <FieldInput label="Nome" value={form.nome} onChangeText={(value) => updateField('nome', value)} placeholder="Nome completo" autoCapitalize="words" />
                <FieldInput label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="vendedor@email.com" keyboardType="email-address" />
                <FieldInput label="Telefone" value={form.telefone} onChangeText={(value) => updateField('telefone', value)} placeholder="(00) 90000-0000" keyboardType="phone-pad" />
                <FieldInput label={formMode === 'edit' ? 'CPF (opcional para atualizar)' : 'CPF (opcional)'} value={form.cpf} onChangeText={(value) => updateField('cpf', value)} placeholder="000.000.000-00" keyboardType="number-pad" />
                <FieldInput label="Comissao % (opcional)" value={form.comissao} onChangeText={(value) => updateField('comissao', value)} placeholder="Ex: 5" keyboardType="decimal-pad" />
                <AppButton title={formMode === 'edit' ? 'Salvar alteracoes' : 'Criar vendedor'} loading={processing} onPress={handleSubmit} />
              </AppCard>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState title={showInactive ? 'Sem vendedores inativos.' : 'Sem vendedores ativos.'} />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance delay={index * 20}>
            <AppCard style={styles.sellerCard}>
              <Pressable onPress={() => navigation.navigate(routes.ADMIN_SELLER_DETAIL, { seller: item })} style={styles.sellerRow}>
                <View style={styles.left}>
                  <Text style={styles.name}>{item.nome}</Text>
                  <Text style={styles.code}>{item.codigo || item.email}</Text>
                </View>
                <View style={styles.stats}>
                  <Text style={styles.total}>{item.totalRecebido || 0}</Text>
                  <Text style={styles.sold}>{item.totalVendido || 0}</Text>
                </View>
              </Pressable>
              <View style={styles.actionsRow}>
                <Pressable style={styles.actionBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.actionText}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, item.status === 'inativo' ? styles.activateBtn : styles.deactivateBtn]}
                  onPress={() => handleToggleStatus(item)}
                >
                  <Text style={styles.actionText}>{item.status === 'inativo' ? 'Reativar' : 'Inativar'}</Text>
                </Pressable>
              </View>
            </AppCard>
          </AnimatedEntrance>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowInfo: {
    backgroundColor: colors.surfaceWarm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECE4CF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4
  },
  listContent: {
    paddingBottom: 24
  },
  info: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16
  },
  link: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 16
  },
  createBox: {
    marginVertical: 8
  },
  createTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6
  },
  sellerCard: {
    marginVertical: 6,
    padding: 0
  },
  sellerRow: {
    minHeight: 98,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12
  },
  left: {
    flex: 1,
    paddingRight: 10
  },
  name: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text
  },
  code: {
    color: colors.muted,
    fontSize: 16,
    marginTop: 3
  },
  stats: {
    alignItems: 'flex-end'
  },
  total: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '900'
  },
  sold: {
    color: colors.muted,
    fontSize: 17,
    marginTop: 2
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 8
  },
  actionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E5D9BE',
    backgroundColor: '#FFF9EC',
    justifyContent: 'center',
    alignItems: 'center'
  },
  activateBtn: {
    borderColor: '#9CCAAE',
    backgroundColor: '#EBFAF1'
  },
  deactivateBtn: {
    borderColor: '#EAB2B8',
    backgroundColor: '#FFF2F4'
  },
  actionText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14
  }
});
