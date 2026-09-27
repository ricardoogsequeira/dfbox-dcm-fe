import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ChatMessage, DcmApiService } from '../../core/api/dcm-api.service';

@Component({
  selector: 'dcm-chat-widget',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent {
  private readonly api = inject(DcmApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly open = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Olá. Posso ajudar-te com projetos, developers, capacidade semanal e regras de alocação.',
    },
  ]);
  readonly userMessages = computed(() =>
    this.messages().filter((message) => message.role === 'user' || message.role === 'assistant'),
  );

  readonly form = this.formBuilder.nonNullable.group({
    prompt: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  toggle(): void {
    this.open.update((value) => !value);
  }

  send(): void {
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }

    const content = this.form.getRawValue().prompt.trim();
    if (!content) {
      return;
    }

    const nextMessages = [...this.messages(), { role: 'user' as const, content }];
    this.messages.set(nextMessages);
    this.form.reset({ prompt: '' });
    this.sending.set(true);
    this.error.set(null);

    this.api
      .sendChatMessage({ messages: nextMessages.filter((message) => message.role !== 'assistant') })
      .pipe(
        catchError(() => {
          this.error.set('O assistente GenAI ainda não está configurado ou está indisponível.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.sending.set(false);
        if (response?.content) {
          this.messages.update((messages) => [
            ...messages,
            { role: 'assistant', content: response.content },
          ]);
        }
      });
  }
}
