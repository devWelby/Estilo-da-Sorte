import React from 'react';
import AuthNavigator from './AuthNavigator';
import AdminTabs from './AdminTabs';
import SellerTabs from './SellerTabs';
import ClientTabs from './ClientTabs';
import LoadingView from '../presentation/components/LoadingView';
import { useAuth } from '../hooks/useAuth';

export default function RootNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (!user) return <AuthNavigator />;
  if (!profile) return <LoadingView message="Carregando perfil..." />;

  if (profile.tipo === 'admin') return <AdminTabs />;
  if (profile.tipo === 'vendedor') return <SellerTabs />;
  return <ClientTabs />;
}
