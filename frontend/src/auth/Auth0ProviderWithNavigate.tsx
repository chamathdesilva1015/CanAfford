import { Auth0Provider } from '@auth0/auth0-react';
import type { AppState } from '@auth0/auth0-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Auth0ProviderWithNavigate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const domain = 'dev-fudwoqjmaa5lp1ga.us.auth0.com';
  const clientId = '0tzKdLZ8byQXoIcgx6wN8Mdl9IyW0fjT';
  const redirectUri = window.location.origin;

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || '/dashboard');
  };

  if (!(domain && clientId)) {
    return null;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
};
