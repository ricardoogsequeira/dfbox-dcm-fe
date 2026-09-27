import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import {
  DependencyStatus,
  DependencyType,
  KeyPerson,
  DcmApiService,
  ImpactLevel,
  KeyPeopleDirectoryEntry,
  Project,
  ProjectDependency,
  ProjectRole,
  ProjectStakeholder,
  PartnerCompany,
  ProjectPartner,
  ProjectPartnerCreate,
  Sprint,
  SprintCreate,
  ProjectUpdate,
  BusinessArea,
  ProjectType,
  LifecycleState,
  Priority,
  DeliveryModel,
} from '../../core/api/dcm-api.service';
import { enumLabel } from '../../core/display/enum-labels';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'dcm-project-detail-page',
  standalone: true,
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './project-detail-page.component.html',
  styleUrl: './project-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPageComponent {
  private readonly api = inject(DcmApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly project = signal<Project | null>(null);
  readonly keyPersons = signal<KeyPerson[]>([]);
  readonly keyPeople = signal<ProjectStakeholder[]>([]);
  readonly keyPeopleDirectory = signal<KeyPeopleDirectoryEntry[]>([]);
  readonly dependencies = signal<ProjectDependency[]>([]);
  readonly partners = signal<PartnerCompany[]>([]);
  readonly projectPartners = signal<ProjectPartner[]>([]);
  readonly sprints = signal<Sprint[]>([]);
  readonly loading = signal(true);
  readonly dependencyLoading = signal(false);
  readonly dependencySaving = signal(false);
  readonly keyPeopleLoading = signal(false);
  readonly keyPeopleSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly dependencyError = signal<string | null>(null);
  readonly keyPeopleError = signal<string | null>(null);
  readonly keyPeopleSaved = signal(false);
  readonly projectDataError = signal<string | null>(null);
  readonly projectDataSaving = signal(false);
  readonly editingDependencyId = signal<string | null>(null);
  readonly editMode = signal(false);
  readonly enumLabel = enumLabel;

  readonly dependencyTypes: DependencyType[] = ['ARCHITECTURE', 'INFRA', 'SECURITY', 'BUSINESS', 'FACTORY'];
  readonly dependencyStatuses: DependencyStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CANCELLED'];
  readonly impactLevels: ImpactLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly projectRoles: ProjectRole[] = ['PRODUCT_OWNER', 'DIGITAL_MANAGER', 'SCRUM_MASTER', 'COORDINATOR', 'ARCHITECT', 'AI_COMPETENCE_CENTER_REPRESENTATIVE', 'DESIGNER'];
  readonly businessAreas: BusinessArea[] = ['BEFS', 'NETWORKS', 'CLIENT_SOLUTIONS', 'RGA'];
  readonly projectTypes: ProjectType[] = ['BIG_BET', 'QUICK_WIN', 'NINJA', 'STANDARD'];
  readonly lifecycleStates: LifecycleState[] = ['IDENTIFIED', 'DISCOVERY', 'EXECUTION', 'HANDOVER'];
  readonly priorities: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly deliveryModels: DeliveryModel[] = ['INTERNAL', 'PARTNER', 'HYBRID'];

  readonly dependencyForm = this.formBuilder.nonNullable.group({
    dependency_type: ['BUSINESS' as DependencyType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    status: ['OPEN' as DependencyStatus, Validators.required],
    start_date: [this.today(), Validators.required],
    target_date: [this.daysFromToday(14), Validators.required],
    resolved_date: [''],
    impact_level: ['HIGH' as ImpactLevel, Validators.required],
    mitigation_plan: [''],
    external_reference: [''],
    owner_key_person_id: [''],
    cancellation_reason: [''],
  });

  readonly keyPeopleForm = this.formBuilder.group({
    PRODUCT_OWNER: [[] as KeyPerson[]], DIGITAL_MANAGER: [[] as KeyPerson[]],
    SCRUM_MASTER: [[] as KeyPerson[]], COORDINATOR: [[] as KeyPerson[]],
    ARCHITECT: [[] as KeyPerson[]], AI_COMPETENCE_CENTER_REPRESENTATIVE: [[] as KeyPerson[]],
    DESIGNER: [[] as KeyPerson[]],
  });

  readonly projectPartnerForm = this.formBuilder.nonNullable.group({
    partner_company_id: ['', Validators.required],
    contribution_description: [''],
    contribution_percentage: [0, [Validators.min(0), Validators.max(100)]],
  });

  readonly sprintForm = this.formBuilder.nonNullable.group({
    sprint_number: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    start_date: [this.today(), Validators.required],
    end_date: [this.daysFromToday(14), Validators.required],
    goal: [''],
  });

  readonly projectDescriptionForm = this.formBuilder.nonNullable.group({
    description: [''],
    business_area: ['BEFS' as BusinessArea, Validators.required],
    project_type: ['STANDARD' as ProjectType, Validators.required],
    lifecycle_state: ['IDENTIFIED' as LifecycleState, Validators.required],
    priority: ['MEDIUM' as Priority, Validators.required],
    delivery_model: ['INTERNAL' as DeliveryModel, Validators.required],
    edpx_card_url: ['', [Validators.maxLength(2000), Validators.pattern(/^https?:\/\/\S+$/i)]],
    jira_url: ['', [Validators.maxLength(2000), Validators.pattern(/^https?:\/\/\S+$/i)]],
    confluence_url: ['', [Validators.maxLength(2000), Validators.pattern(/^https?:\/\/\S+$/i)]],
    figma_url: ['', [Validators.maxLength(2000), Validators.pattern(/^https?:\/\/\S+$/i)]],
  });

  constructor() {
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if (projectId) this.load(projectId);
    else {
      this.error.set('Projeto não encontrado.');
      this.loading.set(false);
    }
  }

  load(projectId = this.project()?.id): void {
    if (!projectId) return;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      projects: this.api.projects(),
      keyPersons: this.api.keyPeople(),
      dependencies: this.api.projectDependencies(projectId),
      stakeholders: this.api.projectStakeholders(projectId),
      keyPeopleDirectory: this.api.keyPeopleDirectory(),
      partners: this.api.partners(),
      projectPartners: this.api.projectPartners(projectId),
      sprints: this.api.sprints(projectId),
    }).pipe(
      catchError(() => {
        this.error.set('Não foi possível carregar a ficha do projeto.');
        return of({ projects: [], keyPersons: [], dependencies: [], stakeholders: [], keyPeopleDirectory: [], partners: [], projectPartners: [], sprints: [] });
      }),
    ).subscribe((data) => {
      const project = data.projects.find((item) => item.id === projectId) ?? null;
      this.project.set(project);
      if (project) this.resetProjectDetailsForm(project);
      this.keyPersons.set(data.keyPersons);
      this.keyPeopleDirectory.set(data.keyPeopleDirectory);
      this.dependencies.set(data.dependencies);
      this.partners.set(data.partners);
      this.projectPartners.set(data.projectPartners);
      this.sprints.set(data.sprints);
      this.setKeyPeople(data.stakeholders);
      if (!project) this.error.set('Projeto não encontrado.');
      this.loading.set(false);
    });
  }

  partnerName(id: string): string { return this.partners().find((item) => item.id === id)?.name ?? 'Parceiro'; }

  toggleEditMode(): void {
    const next = !this.editMode();
    this.editMode.set(next);
    if (next && this.project()) this.resetProjectDetailsForm(this.project()!);
  }

  saveProjectDescription(): void {
    const project = this.project();
    if (!project || this.projectDescriptionForm.invalid) return;
    const value = this.projectDescriptionForm.getRawValue();
    const payload: ProjectUpdate = { ...value, description: value.description.trim() || null };
    this.projectDataSaving.set(true); this.projectDataError.set(null);
    this.api.updateProject(project.id, payload, project.version).pipe(catchError(() => { this.projectDataError.set('Não foi possível guardar a descrição do projeto.'); return of(null); })).subscribe((updated) => {
      this.projectDataSaving.set(false);
      if (updated) { this.project.set(updated); this.resetProjectDetailsForm(updated); }
    });
  }

  private resetProjectDetailsForm(project: Project): void {
    this.projectDescriptionForm.reset({
      description: project.description ?? '',
      business_area: project.business_area,
      project_type: project.project_type,
      lifecycle_state: project.lifecycle_state,
      priority: project.priority,
      delivery_model: project.delivery_model,
      edpx_card_url: project.edpx_card_url ?? '',
      jira_url: project.jira_url ?? '',
      confluence_url: project.confluence_url ?? '',
      figma_url: project.figma_url ?? '',
    });
  }

  addProjectPartner(): void {
    const projectId = this.project()?.id;
    if (!projectId || this.projectPartnerForm.invalid) { this.projectPartnerForm.markAllAsTouched(); return; }
    this.projectDataSaving.set(true); this.projectDataError.set(null);
    const value = this.projectPartnerForm.getRawValue();
    const payload: ProjectPartnerCreate = { ...value, contribution_description: value.contribution_description || null, contribution_percentage: value.contribution_percentage || null };
    this.api.addProjectPartner(projectId, payload).pipe(catchError(() => { this.projectDataError.set('Não foi possível adicionar o parceiro.'); return of(null); })).subscribe((item) => {
      this.projectDataSaving.set(false);
      if (item) { this.projectPartners.update((items) => [...items, item]); this.projectPartnerForm.reset({ partner_company_id: '', contribution_description: '', contribution_percentage: 0 }); }
    });
  }

  addSprint(): void {
    const projectId = this.project()?.id;
    if (!projectId || this.sprintForm.invalid) { this.sprintForm.markAllAsTouched(); return; }
    const value = this.sprintForm.getRawValue();
    if (value.end_date < value.start_date) { this.projectDataError.set('A data de fim da sprint deve ser posterior ao início.'); return; }
    this.projectDataSaving.set(true); this.projectDataError.set(null);
    const payload: SprintCreate = { ...value, goal: value.goal || null };
    this.api.createSprint(projectId, payload).pipe(catchError(() => { this.projectDataError.set('Não foi possível adicionar a sprint.'); return of(null); })).subscribe((item) => {
      this.projectDataSaving.set(false);
      if (item) { this.sprints.update((items) => [...items, item].sort((a, b) => a.sprint_number - b.sprint_number)); this.sprintForm.reset({ sprint_number: item.sprint_number + 1, name: '', start_date: this.today(), end_date: this.daysFromToday(14), goal: '' }); }
    });
  }

  goBack(): void { void this.router.navigate(['/projects']); }

  isBlockingDependency(dependency: ProjectDependency): boolean {
    return dependency.status === 'BLOCKED'
      || (['OPEN', 'IN_PROGRESS', 'BLOCKED'].includes(dependency.status) && dependency.impact_level === 'CRITICAL');
  }

  submitDependency(): void {
    const projectId = this.project()?.id;
    if (!projectId || this.dependencyForm.invalid) {
      this.dependencyForm.markAllAsTouched();
      return;
    }
    const value = this.dependencyForm.getRawValue();
    if (!value.title.trim() || !value.description.trim()) {
      this.dependencyError.set('Preenche o título e a descrição da dependência.');
      this.dependencyForm.markAllAsTouched();
      return;
    }
    if (value.status === 'RESOLVED' && !value.resolved_date) {
      this.dependencyError.set('Indica a data de resolução.');
      return;
    }
    if (value.status === 'CANCELLED' && !value.cancellation_reason.trim()) {
      this.dependencyError.set('Indica o motivo do cancelamento.');
      return;
    }
    this.dependencySaving.set(true);
    this.dependencyError.set(null);
    const payload = {
      ...value,
      title: value.title.trim(),
      description: value.description.trim(),
      mitigation_plan: value.mitigation_plan || null,
      external_reference: value.external_reference || null,
      owner_key_person_id: value.owner_key_person_id || null,
      resolved_date: value.resolved_date || null,
      cancellation_reason: value.cancellation_reason || null,
    };
    const request = this.editingDependencyId()
      ? this.api.updateProjectDependency(projectId, this.editingDependencyId()!, payload, this.dependencies().find((item) => item.id === this.editingDependencyId())?.version ?? 0)
      : this.api.createProjectDependency(projectId, payload);
    request.pipe(
      catchError((error: unknown) => {
        this.dependencyError.set(this.dependencyErrorMessage(error));
        return of(null);
      }),
    ).subscribe((dependency) => {
      this.dependencySaving.set(false);
      if (dependency) {
        this.resetDependencyForm();
        this.loadDependencies(projectId);
      }
    });
  }

  editDependency(dependency: ProjectDependency): void {
    this.editingDependencyId.set(dependency.id);
    this.dependencyForm.reset({
      dependency_type: dependency.dependency_type,
      title: dependency.title,
      description: dependency.description,
      status: dependency.status,
      start_date: dependency.start_date,
      target_date: dependency.target_date,
      resolved_date: dependency.resolved_date ?? '',
      impact_level: dependency.impact_level,
      mitigation_plan: dependency.mitigation_plan ?? '',
      external_reference: dependency.external_reference ?? '',
      owner_key_person_id: dependency.owner_key_person_id ?? '',
      cancellation_reason: dependency.cancellation_reason ?? '',
    });
  }

  cancelDependencyEdit(): void { this.resetDependencyForm(); }

  deleteDependency(dependency: ProjectDependency): void {
    const projectId = this.project()?.id;
    if (!projectId || !window.confirm(`Cancelar a dependência “${dependency.title}”? O histórico será mantido.`)) return;
    this.dependencyError.set(null);
    this.api.deleteProjectDependency(projectId, dependency.id, dependency.version).pipe(
      catchError(() => {
        this.dependencyError.set('Não foi possível cancelar a dependência.');
        return of(null);
      }),
    ).subscribe((deleted) => {
      if (deleted === null) return;
      if (this.editingDependencyId() === dependency.id) this.resetDependencyForm();
      this.dependencies.update((items) => items.filter((item) => item.id !== dependency.id));
      this.loadDependencies(projectId);
    });
  }

  saveKeyPeople(): void {
    const projectId = this.project()?.id;
    if (!projectId) return;
    this.keyPeopleSaving.set(true);
    this.keyPeopleError.set(null);
    this.keyPeopleSaved.set(false);
    const assignments = this.projectRoles.flatMap((role) => ((this.keyPeopleForm.get(role)?.value ?? []) as KeyPerson[]).map((person) => ({ role, key_person_id: person.id })));
    this.api.replaceProjectStakeholders(projectId, assignments).pipe(
      catchError(() => {
        this.keyPeopleError.set('Não foi possível guardar as pessoas-chave.');
        return of(null);
      }),
    ).subscribe((stakeholders) => {
      this.keyPeopleSaving.set(false);
      if (stakeholders) {
        this.setKeyPeople(stakeholders);
        this.keyPeopleSaved.set(true);
      }
    });
  }

  filteredPeople(role: ProjectRole): KeyPerson[] {
    const selected = (this.keyPeopleForm.get(role)?.value ?? []) as KeyPerson[];
    const query = '';
    const configuredIds = new Set(
      this.keyPeopleDirectory().filter((entry) => entry.role === role).map((entry) => entry.key_person_id),
    );
    const people = this.keyPersons().filter((person) => configuredIds.has(person.id));
    return people.filter((person) => person.active && !selected.some((item) => item.id === person.id) && person.name.toLowerCase().includes(query));
  }

  removePersonFromProjectRole(role: ProjectRole, personId: string): void {
    const control = this.keyPeopleForm.get(role);
    const selected = (control?.value ?? []) as KeyPerson[];
    control?.setValue(selected.filter((person) => person.id !== personId));
    this.keyPeopleSaved.set(false);
  }

  displayPerson(person: KeyPerson | null): string { return person?.name ?? ''; }

  private personFromValue(value: KeyPerson | string | null): KeyPerson | null {
    if (!value) return null;
    if (typeof value !== 'string') return value;
    const query = value.trim().toLowerCase();
    return this.keyPersons().find((person) =>
      person.active && (person.name.toLowerCase() === query || person.email?.toLowerCase() === query),
    ) ?? null;
  }

  private loadDependencies(projectId: string): void {
    this.dependencyLoading.set(true);
    this.api.projectDependencies(projectId).pipe(
      catchError(() => {
        this.dependencyError.set('Não foi possível carregar as dependências deste projeto.');
        return of([]);
      }),
    ).subscribe((dependencies) => {
      this.dependencies.set(dependencies);
      this.dependencyLoading.set(false);
    });
  }

  private setKeyPeople(stakeholders: ProjectStakeholder[]): void {
    this.keyPeople.set(stakeholders);
    for (const role of this.projectRoles) {
      const people = stakeholders.filter((item) => item.role === role).map((item) => this.keyPersons().find((person) => person.id === item.key_person_id)).filter((person): person is KeyPerson => person !== undefined);
      this.keyPeopleForm.get(role)?.setValue(people);
    }
  }

  private resetDependencyForm(): void {
    this.editingDependencyId.set(null);
    this.dependencyForm.reset({
      dependency_type: 'BUSINESS', title: '', description: '', status: 'OPEN',
      start_date: this.today(), target_date: this.daysFromToday(14),
      resolved_date: '',
      impact_level: 'HIGH', mitigation_plan: '', external_reference: '',
      owner_key_person_id: '', cancellation_reason: '',
    });
  }

  isDependencyResolved(): boolean { return this.dependencyForm.controls.status.value === 'RESOLVED'; }

  isDependencyCancelled(): boolean { return this.dependencyForm.controls.status.value === 'CANCELLED'; }

  private dependencyErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: unknown }).error;
      if (typeof body === 'object' && body !== null && 'detail' in body) {
        const detail = (body as { detail?: unknown }).detail;
        if (typeof detail === 'string') return detail;
      }
    }
    return 'Não foi possível guardar a dependência. Confirma as datas e tenta novamente.';
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  private daysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
