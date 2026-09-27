export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  entra: {
    clientId: '',
    tenantId: '',
    redirectUri: 'http://localhost:4200',
    scopes: ['openid', 'profile', 'email'],
  },
} as const;
