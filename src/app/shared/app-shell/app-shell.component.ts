import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChatWidgetComponent } from '../chat/chat-widget.component';

@Component({
  selector: 'dcm-app-shell',
  standalone: true,
  imports: [
    ChatWidgetComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly language = inject(LanguageService);

  signIn(): void {
    void this.auth.signIn();
  }

  signOut(): void {
    void this.auth.signOut();
  }

  switchLanguage(): void {
    this.language.setLanguage(this.language.language() === 'pt' ? 'en' : 'pt');
  }
}
