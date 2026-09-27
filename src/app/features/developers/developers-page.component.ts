import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { Allocation, CalendarWeek, CsvImportPreview, Developer, DeveloperUpdate, Discipline, DcmApiService, Project, ResourceAvailability, ResourceRoleType, ResourceSkill, ResourceStatus, Skill } from '../../core/api/dcm-api.service';
import { enumLabel } from '../../core/display/enum-labels';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'dcm-developers-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSortModule, MatTableModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './developers-page.component.html',
  styleUrl: './developers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevelopersPageComponent {
  private readonly api = inject(DcmApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly developers = signal<Developer[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly allocations = signal<Allocation[]>([]);
  readonly skills = signal<Skill[]>([]);
  readonly weeks = signal<CalendarWeek[]>([]);
  readonly selectedDeveloperId = signal<string | null>(null);
  readonly resourceSkills = signal<ResourceSkill[]>([]);
  readonly availability = signal<ResourceAvailability[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly importError = signal<string | null>(null);
  readonly importPreview = signal<CsvImportPreview | null>(null);
  readonly importing = signal(false);
  readonly metadataSaving = signal(false);
  readonly metadataError = signal<string | null>(null);
  readonly editingDeveloper = signal<Developer | null>(null);
  readonly editSaving = signal(false);
  readonly editError = signal<string | null>(null);
  selectedFile: File | null = null;
  readonly displayedColumns = ['name', 'company', 'projects', 'discipline', 'role', 'capacity', 'status', 'actions'];
  readonly developerSearch = signal('');
  readonly developerSortField = signal<'name' | 'company' | 'projects' | 'discipline' | 'role' | 'capacity' | 'status'>('name');
  readonly developerSortDirection = signal<'asc' | 'desc'>('asc');
  readonly enumLabel = enumLabel;

  readonly disciplines: Discipline[] = ['BACKEND', 'FRONTEND', 'CLOUD', 'DATA_SCIENCE'];
  readonly roleTypes: ResourceRoleType[] = ['BACKEND_DEVELOPER', 'FRONTEND_DEVELOPER', 'CLOUD_ENGINEER', 'DATA_SCIENTIST'];
  readonly statuses: ResourceStatus[] = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE'];

  readonly filteredDevelopers = computed(() => {
    const query = this.developerSearch().trim().toLocaleLowerCase('pt-PT');
    const developers = this.developers().filter((developer) =>
      !query || developer.name.toLocaleLowerCase('pt-PT').includes(query) || (developer.company ?? '').toLocaleLowerCase('pt-PT').includes(query) || (developer.email ?? '').toLocaleLowerCase('pt-PT').includes(query),
    );
    const field = this.developerSortField();
    const direction = this.developerSortDirection() === 'asc' ? 1 : -1;

    return [...developers].sort((left, right) => this.developerSortValue(left, field).localeCompare(this.developerSortValue(right, field), 'pt-PT', { sensitivity: 'base' }) * direction);
  });

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    company: ['EDP', [Validators.required, Validators.maxLength(200)]],
    email: ['', Validators.maxLength(320)],
    discipline: ['BACKEND' as Discipline, Validators.required],
    role_type: ['BACKEND_DEVELOPER' as ResourceRoleType, Validators.required],
    specialization: [''],
    seniority: [''],
    default_weekly_capacity: [100, [Validators.required, Validators.min(0), Validators.max(150)]],
    status: ['AVAILABLE' as ResourceStatus, Validators.required],
    initial_skill_id: [''],
    initial_skill_level: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  readonly skillForm = this.formBuilder.nonNullable.group({
    skill_id: ['', Validators.required],
    level: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  readonly newSkillForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    category: [''],
  });

  readonly availabilityForm = this.formBuilder.nonNullable.group({
    calendar_week_id: ['', Validators.required],
    available_percentage: [100, [Validators.required, Validators.min(0), Validators.max(150)]],
    reason: [''],
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    company: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', Validators.maxLength(320)],
    discipline: ['BACKEND' as Discipline, Validators.required],
    role_type: ['BACKEND_DEVELOPER' as ResourceRoleType, Validators.required],
    specialization: [''],
    seniority: [''],
    default_weekly_capacity: [100, [Validators.required, Validators.min(0), Validators.max(150)]],
    status: ['AVAILABLE' as ResourceStatus, Validators.required],
  });

  constructor() { this.loadDevelopers(); }

  loadDevelopers(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      developers: this.api.developers(),
      skills: this.api.skills(),
      weeks: this.api.calendarWeeks(),
      projects: this.api.projects().pipe(catchError(() => of([]))),
      allocations: this.api.allocations().pipe(catchError(() => of([]))),
    }).pipe(
      catchError(() => {
        this.error.set('Não foi possível carregar developers.');
        return of({ developers: [], skills: [], weeks: [], projects: [], allocations: [] });
      }),
    ).subscribe((data) => {
      this.developers.set(data.developers);
      this.skills.set(data.skills);
      this.weeks.set(data.weeks);
      this.projects.set(data.projects);
      this.allocations.set(data.allocations);
      if (this.selectedDeveloperId() && !data.developers.some((item) => item.id === this.selectedDeveloperId())) this.selectedDeveloperId.set(null);
      this.loading.set(false);
    });
  }

  updateDeveloperSearch(event: Event): void {
    this.developerSearch.set((event.target as HTMLInputElement).value);
  }

  onDeveloperSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.developerSortField.set('name');
      this.developerSortDirection.set('asc');
      return;
    }
    this.developerSortField.set(sort.active as 'name' | 'company' | 'projects' | 'discipline' | 'role' | 'capacity' | 'status');
    this.developerSortDirection.set(sort.direction);
  }

  projectNamesForDeveloper(developerId: string): string[] {
    const projectIds = new Set(this.allocations().filter((allocation) => allocation.resource_id === developerId && allocation.project_id).map((allocation) => allocation.project_id as string));
    return [...projectIds]
      .map((projectId) => this.projects().find((project) => project.id === projectId))
      .filter((project): project is Project => Boolean(project))
      .map((project) => `${project.code} · ${project.name}`);
  }

  private developerSortValue(developer: Developer, field: 'name' | 'company' | 'projects' | 'discipline' | 'role' | 'capacity' | 'status'): string {
    switch (field) {
      case 'company': return developer.company ?? '';
      case 'projects': return this.projectNamesForDeveloper(developer.id).join(', ');
      case 'discipline': return enumLabel(developer.discipline);
      case 'role': return enumLabel(developer.role_type);
      case 'capacity': return String(developer.default_weekly_capacity).padStart(5, '0');
      case 'status': return enumLabel(developer.status);
      case 'name': return developer.name;
    }
  }

  selectDeveloper(id: string): void {
    this.selectedDeveloperId.set(id || null);
    this.resourceSkills.set([]); this.availability.set([]); this.metadataError.set(null);
    if (!id) return;
    forkJoin({ skills: this.api.resourceSkills(id), availability: this.api.resourceAvailability(id) }).pipe(catchError(() => { this.metadataError.set('Não foi possível carregar skills e disponibilidade.'); return of({ skills: [], availability: [] }); })).subscribe((data) => { this.resourceSkills.set(data.skills); this.availability.set(data.availability); });
  }

  openDeveloperEditor(developer: Developer): void {
    this.editingDeveloper.set(developer);
    this.selectDeveloper(developer.id);
    this.editError.set(null);
    this.editForm.reset({
      name: developer.name,
      company: developer.company ?? '',
      email: developer.email ?? '',
      discipline: developer.discipline,
      role_type: developer.role_type,
      specialization: developer.specialization ?? '',
      seniority: developer.seniority ?? '',
      default_weekly_capacity: Number(developer.default_weekly_capacity),
      status: developer.status,
    });
  }

  closeDeveloperEditor(): void {
    if (!this.editSaving()) this.editingDeveloper.set(null);
  }

  saveDeveloper(): void {
    const developer = this.editingDeveloper();
    if (!developer || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const value = this.editForm.getRawValue();
    const payload: DeveloperUpdate = {
      ...value,
      email: value.email || null,
      specialization: value.specialization || null,
      seniority: value.seniority || null,
    };
    this.editSaving.set(true);
    this.editError.set(null);
    this.api.updateDeveloper(developer.id, payload, developer.version).pipe(
      catchError(() => {
        this.editError.set('Não foi possível guardar o developer. A informação pode ter sido alterada; fecha e recarrega a página.');
        return of(null);
      }),
    ).subscribe((updated) => {
      this.editSaving.set(false);
      if (!updated) return;
      this.developers.update((items) => items.map((item) => item.id === updated.id ? updated : item));
      this.editingDeveloper.set(null);
    });
  }

  skillName(id: string): string { return this.skills().find((item) => item.id === id)?.name ?? 'Skill'; }

  createSkill(): void {
    if (this.newSkillForm.invalid) {
      this.newSkillForm.markAllAsTouched();
      return;
    }
    this.metadataSaving.set(true);
    this.metadataError.set(null);
    const value = this.newSkillForm.getRawValue();
    this.api.createSkill({ name: value.name.trim(), category: value.category.trim() || null }).pipe(
      catchError(() => {
        this.metadataError.set('Não foi possível criar a skill.');
        return of(null);
      }),
    ).subscribe((skill) => {
      this.metadataSaving.set(false);
      if (skill) {
        this.skills.update((items) => [...items, skill].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT')));
        this.newSkillForm.reset({ name: '', category: '' });
      }
    });
  }

  addSkill(): void {
    const resourceId = this.selectedDeveloperId();
    if (!resourceId || this.skillForm.invalid) { this.skillForm.markAllAsTouched(); return; }
    this.metadataSaving.set(true); this.metadataError.set(null);
    this.api.addResourceSkill(resourceId, this.skillForm.getRawValue()).pipe(catchError(() => { this.metadataError.set('Não foi possível associar a skill.'); return of(null); })).subscribe((item) => { this.metadataSaving.set(false); if (item) { this.resourceSkills.update((items) => [...items, item]); this.skillForm.reset({ skill_id: '', level: 3 }); } });
  }

  saveAvailability(): void {
    const resourceId = this.selectedDeveloperId();
    if (!resourceId || this.availabilityForm.invalid) { this.availabilityForm.markAllAsTouched(); return; }
    this.metadataSaving.set(true); this.metadataError.set(null);
    this.api.upsertResourceAvailability(resourceId, this.availabilityForm.getRawValue()).pipe(catchError(() => { this.metadataError.set('Não foi possível guardar a disponibilidade.'); return of(null); })).subscribe((item) => { this.metadataSaving.set(false); if (item) { this.availability.update((items) => [...items.filter((current) => current.calendar_week_id !== item.calendar_week_id), item].sort((a, b) => a.calendar_week_id.localeCompare(b.calendar_week_id))); } });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const { initial_skill_id, initial_skill_level, ...developerValue } = value;
    this.saving.set(true);
    this.error.set(null);
    this.api.createDeveloper({
      ...developerValue,
      email: developerValue.email || null,
      specialization: developerValue.specialization || null,
      seniority: developerValue.seniority || null,
    }).pipe(
      switchMap((developer) => initial_skill_id
        ? this.api.addResourceSkill(developer.id, { skill_id: initial_skill_id, level: initial_skill_level }).pipe(map(() => developer))
        : of(developer)),
      catchError(() => {
        this.error.set('Não foi possível criar o developer.');
        return of(null);
      }),
    ).subscribe((developer) => {
      this.saving.set(false);
      if (developer) {
        this.form.reset({
          name: '',
          company: 'EDP',
          email: '',
          discipline: 'BACKEND',
          role_type: 'BACKEND_DEVELOPER',
          specialization: '',
          seniority: '',
          default_weekly_capacity: 100,
          status: 'AVAILABLE',
          initial_skill_id: '',
          initial_skill_level: 3,
        });
        this.loadDevelopers();
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
    this.api.previewDevelopersImport(this.selectedFile).pipe(
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
    this.api.importDevelopers(this.selectedFile).pipe(
      catchError(() => {
        this.importError.set('A importação falhou. Nenhuma linha foi gravada.');
        return of(null);
      }),
    ).subscribe((result) => {
      this.importing.set(false);
      if (result) {
        this.selectedFile = null;
        this.importPreview.set(null);
        this.loadDevelopers();
      }
    });
  }

  downloadTemplate(): void {
    const csv = 'name,company,email,discipline,role_type,specialization,seniority,default_weekly_capacity,status\nAna Silva,EDP,ana.silva@example.com,BACKEND,BACKEND_DEVELOPER,,,100,AVAILABLE\n';
    this.downloadCsv(csv, 'developers-template.csv');
  }

  private downloadCsv(csv: string, filename: string): void {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
