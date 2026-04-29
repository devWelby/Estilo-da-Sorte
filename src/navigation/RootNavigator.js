import React, { useEffect, useState } from 'react';
import AuthNavigator from './AuthNavigator';
import AdminTabs from './AdminTabs';
import SellerTabs from './SellerTabs';
import ClientTabs from './ClientTabs';
import LoadingView from '../presentation/components/LoadingView';
import Screen from '../presentation/components/Screen';
import ErrorState from '../presentation/components/ErrorState';
import ForceChangePasswordScreen from '../presentation/screens/auth/ForceChangePasswordScreen';
import { useAuth } from '../hooks/useAuth';

export default function RootNavigator() {
  const { user, profile, loading, signOut } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 12000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (loading && !loadingTimedOut) return <LoadingView />;
  if (loading && loadingTimedOut) {
    return (
      <Screen>
        <ErrorState
          title="A conexao demorou para responder. Tente entrar novamente."
          actionLabel="Sair e tentar de novo"
          onRetry={signOut}
        />
      </Screen>
    );
  }
  if (!user) return <AuthNavigator />;
  if (!profile) {
    return (
      <Screen>
        <ErrorState
          title="Nao foi possivel carregar seu perfil. Faca login novamente."
          actionLabel="Sair e entrar novamente"
          onRetry={signOut}
        />
      </Screen>
    );
  }
  if (profile.forcePasswordChange) return <ForceChangePasswordScreen />;

  if (profile.tipo === 'admin') return <AdminTabs />;
  if (profile.tipo === 'vendedor') return <SellerTabs />;
  return <ClientTabs />;
}
