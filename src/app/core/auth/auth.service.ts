import { Injectable, signal } from '@angular/core';
import {
  AccountInfo,
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser';

import { environment } from '../../../environments/environment';

export type AuthState = 'disabled' | 'initializing' | 'signed-out' | 'signed-in' | 'error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = new PublicClientApplication({
    auth: {
      clientId: environment.entra.clientId || '00000000-0000-0000-0000-000000000000',
      authority: environment.entra.tenantId
        ? `https://login.microsoftonline.com/${environment.entra.tenantId}`
        : undefined,
      redirectUri: environment.entra.redirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  });

  readonly state = signal<AuthState>(
    environment.entra.clientId && environment.entra.tenantId ? 'initializing' : 'disabled',
  );
  readonly account = signal<AccountInfo | null>(null);

  constructor() {
    if (this.state() === 'disabled') {
      return;
    }

    void this.initialize();
  }

  async signIn(): Promise<void> {
    if (this.state() === 'disabled') {
      return;
    }

    await this.client.loginRedirect({ scopes: [...environment.entra.scopes] });
  }

  async signOut(): Promise<void> {
    const account = this.account();
    if (!account) {
      return;
    }

    await this.client.logoutRedirect({ account });
  }

  async accessToken(): Promise<string | null> {
    const account = this.account();
    if (!account) {
      return null;
    }

    try {
      const result = await this.client.acquireTokenSilent({
        account,
        scopes: [...environment.entra.scopes],
      });
      return result.accessToken;
    } catch (error: unknown) {
      if (error instanceof InteractionRequiredAuthError) {
        this.state.set('signed-out');
      } else {
        this.state.set('error');
      }
      return null;
    }
  }

  private async initialize(): Promise<void> {
    try {
      await this.client.initialize();
      await this.client.handleRedirectPromise();
      const account = this.client.getAllAccounts()[0] ?? null;
      this.account.set(account);
      this.state.set(account ? 'signed-in' : 'signed-out');
    } catch {
      this.state.set('error');
    }
  }
}
