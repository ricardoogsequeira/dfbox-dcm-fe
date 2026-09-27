export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  entra: {
    clientId: '',
    tenantId: '',
    redirectUri: '/',
    scopes: ['openid', 'profile', 'email'],
  },
} as const;
