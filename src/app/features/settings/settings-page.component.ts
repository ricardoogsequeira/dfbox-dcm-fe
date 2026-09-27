import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { BusinessArea, CalendarExtendResponse, CalendarWeek, DcmApiService, KeyPerson, KeyPersonUpdate, KeyPeopleDirectoryEntry, PartnerCompany, ProjectRole } from '../../core/api/dcm-api.service';
import { enumLabel } from '../../core/display/enum-labels';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'dcm-settings-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  private readonly api = inject(DcmApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<CalendarExtendResponse | null>(null);
  readonly weeks = signal<CalendarWeek[]>([]);
  readonly keyPersonList = signal<KeyPerson[]>([]);
  readonly keyPeople = signal<KeyPeopleDirectoryEntry[]>([]);
  readonly keyPeopleSaving = signal(false);
  readonly keyPeopleSaved = signal(false);
  readonly keyPeopleError = signal<string | null>(null);
  readonly editingKeyPerson = signal<KeyPerson | null>(null);
  readonly keyPersonSaving = signal(false);
  readonly partners = signal<PartnerCompany[]>([]);
  readonly partnerError = signal<string | null>(null);
  readonly partnerSaving = signal(false);
  readonly businessAreas: BusinessArea[] = ['RGA', 'NETWORKS', 'BEFS', 'CLIENT_SOLUTIONS'];
  readonly newKeyPersonForm = this.formBuilder.nonNullable.group({ name: ['', Validators.required], email: [''], company: ['EDP', Validators.required], business_area: ['BEFS' as BusinessArea, Validators.required] });
  readonly editKeyPersonForm = this.formBuilder.nonNullable.group({ name: ['', Validators.required], email: [''], company: ['', Validators.required], business_area: ['BEFS' as BusinessArea, Validators.required] });
  readonly newPartnerForm = this.formBuilder.nonNullable.group({ name: ['', Validators.required], contact_name: [''], contact_email: [''], notes: [''] });
  readonly enumLabel = enumLabel;
  readonly projectRoles: ProjectRole[] = ['PRODUCT_OWNER', 'DIGITAL_MANAGER', 'SCRUM_MASTER', 'COORDINATOR', 'ARCHITECT', 'AI_COMPETENCE_CENTER_REPRESENTATIVE', 'DESIGNER'];
  readonly latestWeek = computed(() => {
    const ordered = [...this.weeks()].sort((left, right) => left.end_date.localeCompare(right.end_date));
    return ordered[ordered.length - 1] ?? null;
  });
  readonly latestWeekLabel = computed(() => this.latestWeek()?.end_date ?? 'a última semana');

  readonly form = this.formBuilder.nonNullable.group({
    weeks_ahead: [52, [Validators.required, Validators.min(1), Validators.max(520)]],
  });

  readonly keyPeopleForm = this.formBuilder.nonNullable.group({
    PRODUCT_OWNER: [[] as string[]],
    DIGITAL_MANAGER: [[] as string[]],
    SCRUM_MASTER: [[] as string[]],
    COORDINATOR: [[] as string[]],
    ARCHITECT: [[] as string[]],
    AI_COMPETENCE_CENTER_REPRESENTATIVE: [[] as string[]],
    DESIGNER: [[] as string[]],
  });

  constructor() {
    this.loadWeeks();
    this.loadKeyPeople();
    this.loadPartners();
  }

  loadPartners(): void {
    this.api.partners().pipe(catchError(() => { this.partnerError.set('Não foi possível carregar os parceiros.'); return of([]); })).subscribe((partners) => this.partners.set(partners));
  }

  addPartner(): void {
    if (this.newPartnerForm.invalid) { this.newPartnerForm.markAllAsTouched(); return; }
    const value = this.newPartnerForm.getRawValue();
    this.partnerSaving.set(true); this.partnerError.set(null);
    this.api.createPartner({ name: value.name.trim(), contact_name: value.contact_name.trim() || null, contact_email: value.contact_email.trim() || null, notes: value.notes.trim() || null }).pipe(catchError(() => { this.partnerError.set('Não foi possível adicionar o parceiro.'); return of(null); })).subscribe((partner) => {
      this.partnerSaving.set(false);
      if (partner) { this.newPartnerForm.reset(); this.loadPartners(); }
    });
  }

  removePartner(partner: PartnerCompany): void {
    if (!window.confirm(`Remover o parceiro “${partner.name}”?`)) return;
    this.partnerError.set(null);
    this.api.deactivatePartner(partner.id).pipe(catchError(() => { this.partnerError.set('Não foi possível remover o parceiro.'); return of(null); })).subscribe((removed) => { if (removed) this.loadPartners(); });
  }

  loadKeyPeople(): void {
    forkJoin({ people: this.api.keyPeople(), keyPeople: this.api.keyPeopleDirectory() }).pipe(
      catchError(() => {
        this.keyPeopleError.set('Não foi possível carregar a configuração de key people.');
        return of({ people: [], keyPeople: [] });
      }),
    ).subscribe((data) => {
      this.keyPersonList.set(data.people);
      this.keyPeople.set(data.keyPeople);
      for (const role of this.projectRoles) {
        this.keyPeopleForm.get(role)?.setValue(
          data.keyPeople.filter((entry) => entry.role === role).map((entry) => entry.key_person_id),
        );
      }
    });
  }

  saveKeyPeople(): void {
    this.keyPeopleSaving.set(true);
    this.keyPeopleSaved.set(false);
    this.keyPeopleError.set(null);
    const assignments = this.projectRoles.flatMap((role) =>
      (this.keyPeopleForm.get(role)?.value ?? []).map((key_person_id) => ({ role, key_person_id })),
    );
    this.api.replaceKeyPeopleDirectory(assignments).pipe(
      catchError(() => {
        this.keyPeopleError.set('Não foi possível guardar a configuração de key people.');
        return of(null);
      }),
    ).subscribe((entries) => {
      this.keyPeopleSaving.set(false);
      if (entries) {
        this.keyPeople.set(entries);
        this.keyPeopleSaved.set(true);
      }
    });
  }

  personName(personId: string): string {
    return this.keyPersonList().find((person) => person.id === personId)?.name ?? 'Pessoa indisponível';
  }

  removePersonFromRole(role: ProjectRole, personId: string): void {
    const control = this.keyPeopleForm.get(role);
    const selected = (control?.value ?? []) as string[];
    control?.setValue(selected.filter((id) => id !== personId));
    this.keyPeopleSaved.set(false);
  }

  addKeyPerson(): void {
    if (this.newKeyPersonForm.invalid) { this.newKeyPersonForm.markAllAsTouched(); return; }
    const value = this.newKeyPersonForm.getRawValue();
    this.api.createKeyPerson({ name: value.name.trim(), email: value.email.trim() || null, company: value.company.trim(), business_area: value.business_area }).pipe(
      catchError(() => { this.keyPeopleError.set('Não foi possível adicionar a pessoa.'); return of(null); }),
    ).subscribe((person) => { if (person) { this.newKeyPersonForm.reset({ name: '', email: '', company: 'EDP', business_area: 'BEFS' }); this.loadKeyPeople(); } });
  }

  editKeyPerson(person: KeyPerson): void {
    this.editingKeyPerson.set(person);
    this.editKeyPersonForm.reset({ name: person.name, email: person.email ?? '', company: person.company ?? '', business_area: person.business_area ?? 'BEFS' });
  }

  closeKeyPersonEditor(): void { if (!this.keyPersonSaving()) this.editingKeyPerson.set(null); }

  saveKeyPerson(): void {
    const person = this.editingKeyPerson();
    if (!person || this.editKeyPersonForm.invalid) { this.editKeyPersonForm.markAllAsTouched(); return; }
    const value = this.editKeyPersonForm.getRawValue();
    const payload: KeyPersonUpdate = { name: value.name.trim(), email: value.email.trim() || null, company: value.company.trim(), business_area: value.business_area };
    this.keyPersonSaving.set(true);
    this.api.updateKeyPerson(person.id, payload, person.version).pipe(catchError(() => { this.keyPeopleError.set('Não foi possível guardar a pessoa. Recarrega a configuração e tenta novamente.'); return of(null); })).subscribe((updated) => {
      this.keyPersonSaving.set(false);
      if (updated) { this.editingKeyPerson.set(null); this.loadKeyPeople(); }
    });
  }

  removeKeyPerson(person: KeyPerson): void {
    this.api.deactivateKeyPerson(person.id).pipe(
      catchError(() => { this.keyPeopleError.set('Não foi possível remover a pessoa.'); return of(null); }),
    ).subscribe((removed) => { if (removed) this.loadKeyPeople(); });
  }

  loadWeeks(): void {
    this.api.calendarWeeks().pipe(
      catchError(() => of([])),
    ).subscribe((weeks) => this.weeks.set(weeks));
  }

  extendByWeeks(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.runCalendarCommand({ weeks_ahead: this.form.getRawValue().weeks_ahead });
  }

  private runCalendarCommand(payload: { until_year?: number; weeks_ahead?: number }): void {
    this.saving.set(true);
    this.error.set(null);
    this.result.set(null);
    this.api.extendCalendar(payload).pipe(
      catchError(() => {
        this.error.set('Não foi possível estender o calendário ISO. Confirma a BD e migrations.');
        return of(null);
      }),
    ).subscribe((response) => {
      this.saving.set(false);
      this.result.set(response);
      if (response) this.loadWeeks();
    });
  }
}
