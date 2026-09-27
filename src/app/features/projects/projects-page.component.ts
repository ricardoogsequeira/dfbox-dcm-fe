import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import {
  BusinessArea,
  CsvImportPreview,
  DependencyStatus,
  DependencyType,
  Developer,
  DeliveryModel,
  DcmApiService,
  Allocation,
  ImpactLevel,
  LifecycleState,
  Priority,
  Project,
  ProjectDependency,
  ProjectType,
  ProjectRole,
  ProjectStakeholder,
} from '../../core/api/dcm-api.service';
import { enumLabel } from '../../core/display/enum-labels';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'dcm-projects-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatAutocompleteModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    RouterLink,
    MatSelectModule,
    MatSortModule,
    MatTableModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './projects-page.component.html',
  styleUrl: './projects-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPageComponent {
  private readonly api = inject(DcmApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly importError = signal<string | null>(null);
  readonly importPreview = signal<CsvImportPreview | null>(null);
  readonly importing = signal(false);
  selectedFile: File | null = null;
  readonly displayedColumns = ['code', 'name', 'developers', 'type', 'state', 'delivery', 'actions'];
  readonly projectSearch = signal('');
  readonly projectSortField = signal<'code' | 'name' | 'developers' | 'type' | 'state' | 'delivery'>('code');
  readonly projectSortDirection = signal<'asc' | 'desc'>('asc');
  readonly enumLabel = enumLabel;

  readonly businessAreas: BusinessArea[] = ['BEFS', 'NETWORKS', 'CLIENT_SOLUTIONS', 'RGA'];
  readonly projectTypes: ProjectType[] = ['BIG_BET', 'QUICK_WIN', 'NINJA', 'STANDARD'];
  readonly lifecycleStates: LifecycleState[] = ['IDENTIFIED', 'DISCOVERY', 'EXECUTION', 'HANDOVER'];
  readonly priorities: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly deliveryModels: DeliveryModel[] = ['INTERNAL', 'PARTNER', 'HYBRID'];
  readonly dependencyTypes: DependencyType[] = ['ARCHITECTURE', 'INFRA', 'SECURITY', 'BUSINESS', 'FACTORY'];
  readonly dependencyStatuses: DependencyStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CANCELLED'];
  readonly impactLevels: ImpactLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly projectRoles: ProjectRole[] = ['PRODUCT_OWNER', 'DIGITAL_MANAGER', 'SCRUM_MASTER', 'COORDINATOR', 'ARCHITECT', 'AI_COMPETENCE_CENTER_REPRESENTATIVE', 'DESIGNER'];

  readonly selectedProjectId = signal<string | null>(null);
  readonly selectedProject = computed(() => this.projects().find((project) => project.id === this.selectedProjectId()) ?? null);
  readonly dependencies = signal<ProjectDependency[]>([]);
  readonly developers = signal<Developer[]>([]);
  readonly allocations = signal<Allocation[]>([]);
  readonly keyPeople = signal<ProjectStakeholder[]>([]);
  readonly dependencyLoading = signal(false);
  readonly dependencySaving = signal(false);
  readonly dependencyError = signal<string | null>(null);
  readonly editingDependencyId = signal<string | null>(null);
  readonly keyPeopleLoading = signal(false);
  readonly keyPeopleSaving = signal(false);
  readonly keyPeopleError = signal<string | null>(null);
  readonly keyPeopleSaved = signal(false);

  readonly filteredProjects = computed(() => {
    const query = this.projectSearch().trim().toLocaleLowerCase('pt-PT');
    const projects = this.projects().filter((project) =>
      !query || project.code.toLocaleLowerCase('pt-PT').includes(query) || project.name.toLocaleLowerCase('pt-PT').includes(query),
    );
    const field = this.projectSortField();
    const direction = this.projectSortDirection() === 'asc' ? 1 : -1;

    return [...projects].sort((left, right) => {
      const leftValue = this.projectSortValue(left, field);
      const rightValue = this.projectSortValue(right, field);
      return leftValue.localeCompare(rightValue, 'pt-PT', { sensitivity: 'base' }) * direction;
    });
  });

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    business_area: ['BEFS' as BusinessArea, Validators.required],
    project_type: ['STANDARD' as ProjectType, Validators.required],
    lifecycle_state: ['IDENTIFIED' as LifecycleState, Validators.required],
    priority: ['MEDIUM' as Priority, Validators.required],
    delivery_model: ['INTERNAL' as DeliveryModel, Validators.required],
    start_date: [null as Date | null],
    target_end_date: [null as Date | null],
  });

  readonly dependencyForm = this.formBuilder.nonNullable.group({
    dependency_type: ['BUSINESS' as DependencyType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    status: ['OPEN' as DependencyStatus, Validators.required],
    start_date: [this.today(), Validators.required],
    target_date: [this.daysFromToday(14), Validators.required],
    impact_level: ['HIGH' as ImpactLevel, Validators.required],
    mitigation_plan: [''],
    external_reference: [''],
  });

  readonly keyPeopleForm = this.formBuilder.group({
    PRODUCT_OWNER: [null as Developer | null],
    DIGITAL_MANAGER: [null as Developer | null],
    SCRUM_MASTER: [null as Developer | null],
    COORDINATOR: [null as Developer | null],
    ARCHITECT: [null as Developer | null],
    AI_COMPETENCE_CENTER_REPRESENTATIVE: [null as Developer | null],
    DESIGNER: [null as Developer | null],
  });

  constructor() {
    this.loadProjects();
    this.loadDevelopers();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.projects().pipe(
      catchError(() => {
        this.error.set('Não foi possível carregar projetos.');
        return of([]);
      }),
    ).subscribe((projects) => {
      this.projects.set(projects);
      this.loading.set(false);
    });
    this.api.allocations().pipe(catchError(() => of([]))).subscribe((allocations) => this.allocations.set(allocations));
  }

  updateProjectSearch(event: Event): void {
    this.projectSearch.set((event.target as HTMLInputElement).value);
  }

  onProjectSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.projectSortField.set('code');
      this.projectSortDirection.set('asc');
      return;
    }
    this.projectSortField.set(sort.active as 'code' | 'name' | 'developers' | 'type' | 'state' | 'delivery');
    this.projectSortDirection.set(sort.direction);
  }

  private projectSortValue(project: Project, field: 'code' | 'name' | 'developers' | 'type' | 'state' | 'delivery'): string {
    switch (field) {
      case 'developers': return this.developerNamesForProject(project.id).join(', ');
      case 'type': return enumLabel(project.project_type);
      case 'state': return enumLabel(project.lifecycle_state);
      case 'delivery': return enumLabel(project.delivery_model);
      case 'name': return project.name;
      case 'code': return project.code;
    }
  }

  developerNamesForProject(projectId: string): string[] {
    const resourceIds = new Set(
      this.allocations()
        .filter((allocation) => allocation.project_id === projectId)
        .map((allocation) => allocation.resource_id),
    );

    return [...resourceIds]
      .map((resourceId) => this.developers().find((developer) => developer.id === resourceId)?.name)
      .filter((name): name is string => Boolean(name));
  }

  selectProject(project: Project): void {
    void this.router.navigate(['/projects', project.id]);
  }

  deleteProject(project: Project): void {
    if (!window.confirm(`Apagar o projeto “${project.code} · ${project.name}”?`)) return;
    this.api.deleteProject(project.id, project.version).pipe(
      catchError(() => {
        this.error.set('Não foi possível apagar o projeto.');
        return of(null);
      }),
    ).subscribe((deleted) => {
      if (deleted) this.loadProjects();
    });
  }

  loadDependencies(projectId: string): void {
    this.dependencyLoading.set(true);
    this.dependencyError.set(null);
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

  loadDevelopers(): void {
    this.api.developers().pipe(catchError(() => of([]))).subscribe((developers) => this.developers.set(developers));
  }

  loadKeyPeople(projectId: string): void {
    this.keyPeopleLoading.set(true);
    this.keyPeopleError.set(null);
    this.api.projectStakeholders(projectId).pipe(
      catchError(() => {
        this.keyPeopleError.set('Não foi possível carregar as pessoas-chave deste projeto.');
        return of([]);
      }),
    ).subscribe((stakeholders) => {
      this.keyPeople.set(stakeholders);
      for (const role of this.projectRoles) {
        const stakeholder = stakeholders.find((item) => item.role === role);
        this.keyPeopleForm.get(role)?.setValue(this.developers().find((person) => person.id === stakeholder?.key_person_id) ?? null);
      }
      this.keyPeopleLoading.set(false);
    });
  }

  filteredPeople(role: ProjectRole): Developer[] {
    const value = this.keyPeopleForm.get(role)?.value as Developer | string | null;
    const query = typeof value === 'string' ? value.toLowerCase() : value?.name.toLowerCase() ?? '';
    return this.developers().filter((person) => person.active && person.name.toLowerCase().includes(query));
  }

  displayPerson(person: Developer | null): string {
    return person?.name ?? '';
  }

  saveKeyPeople(): void {
    const projectId = this.selectedProjectId();
    if (!projectId) return;
    this.keyPeopleSaving.set(true);
    this.keyPeopleError.set(null);
    this.keyPeopleSaved.set(false);
    const assignments = this.projectRoles.map((role) => ({
      role,
      key_person_id: (this.keyPeopleForm.get(role)?.value as Developer | null)?.id ?? null,
    }));
    this.api.replaceProjectStakeholders(projectId, assignments).pipe(
      catchError(() => {
        this.keyPeopleError.set('Não foi possível guardar as pessoas-chave.');
        return of(null);
      }),
    ).subscribe((stakeholders) => {
      this.keyPeopleSaving.set(false);
      if (stakeholders) {
        this.keyPeople.set(stakeholders);
        this.keyPeopleSaved.set(true);
        this.loadProjects();
      }
    });
  }

  submitDependency(): void {
    const projectId = this.selectedProjectId();
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
    this.dependencySaving.set(true);
    this.dependencyError.set(null);
    const payload = {
      ...value,
      title: value.title.trim(),
      description: value.description.trim(),
      mitigation_plan: value.mitigation_plan || null,
      external_reference: value.external_reference || null,
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
        this.loadProjects();
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
      impact_level: dependency.impact_level,
      mitigation_plan: dependency.mitigation_plan ?? '',
      external_reference: dependency.external_reference ?? '',
    });
  }

  cancelDependencyEdit(): void {
    this.resetDependencyForm();
  }

  updateDependencyStatus(dependency: ProjectDependency, status: DependencyStatus): void {
    const projectId = this.selectedProjectId();
    if (!projectId || dependency.status === status) return;
    this.api.updateProjectDependency(projectId, dependency.id, { status }, dependency.version).pipe(
      catchError(() => {
        this.dependencyError.set('Não foi possível atualizar o estado da dependência.');
        return of(null);
      }),
    ).subscribe((updated) => {
      if (updated) {
        this.loadDependencies(projectId);
        this.loadProjects();
      }
    });
  }

  isBlockingDependency(dependency: ProjectDependency): boolean {
    return dependency.status === 'BLOCKED'
      || (['OPEN', 'IN_PROGRESS', 'BLOCKED'].includes(dependency.status)
        && dependency.impact_level === 'CRITICAL');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.api.createProject({
      ...value,
      description: value.description || null,
      start_date: this.dateToIso(value.start_date),
      target_end_date: this.dateToIso(value.target_end_date),
    }).pipe(
      catchError(() => {
        this.error.set('Não foi possível criar o projeto. Confirma constraints e BD.');
        return of(null);
      }),
    ).subscribe((project) => {
      this.saving.set(false);
      if (project) {
        this.form.reset({
          code: '',
          name: '',
          description: '',
          business_area: 'BEFS',
          project_type: 'STANDARD',
          lifecycle_state: 'IDENTIFIED',
          priority: 'MEDIUM',
          delivery_model: 'INTERNAL',
          start_date: null,
          target_end_date: null,
        });
        this.loadProjects();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.importPreview.set(null);
    this.importError.set(null);
  }

  previewImport(): void {
    if (!this.selectedFile) return;
    this.importing.set(true);
    this.importError.set(null);
    this.api.previewProjectsImport(this.selectedFile).pipe(
      catchError(() => {
        this.importError.set('Não foi possível validar o CSV. Confirma o formato e tenta novamente.');
        return of(null);
      }),
    ).subscribe((preview) => {
      this.importPreview.set(preview);
      this.importing.set(false);
    });
  }

  commitImport(): void {
    if (!this.selectedFile || !this.importPreview() || this.importPreview()!.issues.length > 0) return;
    this.importing.set(true);
    this.importError.set(null);
    this.api.importProjects(this.selectedFile).pipe(
      catchError(() => {
        this.importError.set('A importação falhou. Nenhuma linha foi gravada.');
        return of(null);
      }),
    ).subscribe((result) => {
      this.importing.set(false);
      if (result) {
        this.selectedFile = null;
        this.importPreview.set(null);
        this.loadProjects();
      }
    });
  }

  downloadTemplate(): void {
    const csv = 'code,name,description,business_area,project_type,lifecycle_state,priority,delivery_model,start_date,target_end_date\nDCM-001,Portal delivery,Example project,BEFS,STANDARD,IDENTIFIED,MEDIUM,INTERNAL,2026-10-01,2026-12-31\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'projects-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dateToIso(value: Date | null): string | null {
    if (!value) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resetDependencyForm(): void {
    this.editingDependencyId.set(null);
    this.dependencyForm.reset({
      dependency_type: 'BUSINESS', title: '', description: '', status: 'OPEN',
      start_date: this.today(), target_date: this.daysFromToday(14),
      impact_level: 'HIGH', mitigation_plan: '', external_reference: '',
    });
  }

  private daysFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private dependencyErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: unknown }).error;
      if (typeof body === 'object' && body !== null && 'detail' in body) {
        const detail = (body as { detail?: unknown }).detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail)) {
          const messages = detail
            .map((item) => typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: unknown }).msg : null)
            .filter((message): message is string => typeof message === 'string');
          if (messages.length > 0) return messages.join(' ');
        }
      }
    }
    return 'Não foi possível guardar a dependência. Confirma as datas e tenta novamente.';
  }
}
