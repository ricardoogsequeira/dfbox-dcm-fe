import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

import { Allocation, AllocationRangeUpdate, AllocationType, AllocationUpdate, CalendarWeek, Developer, DcmApiService, Project } from '../../core/api/dcm-api.service';
import { enumLabel } from '../../core/display/enum-labels';

@Component({
  selector: 'dcm-allocations-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, MatNativeDateModule, MatProgressSpinnerModule, MatSelectModule, MatSliderModule, MatTableModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './allocations-page.component.html',
  styleUrl: './allocations-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'pt-PT' }],
})
export class AllocationsPageComponent {
  private readonly api = inject(DcmApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly allocations = signal<Allocation[]>([]);
  readonly developers = signal<Developer[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly weeks = signal<CalendarWeek[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly groupSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly displayedColumns = ['developer', 'project', 'week', 'type', 'percentage'];
  readonly detailsColumns = ['developer', 'project', 'week', 'type', 'percentage', 'actions'];
  readonly enumLabel = enumLabel;
  readonly allocationTypes: AllocationType[] = ['PROJECT', 'SUPPORT', 'COMMUNITY', 'INNOVATION', 'TRAINING', 'HOLIDAY', 'ABSENCE'];
  readonly rangeDrafts = signal<Record<string, { start: number; end: number }>>({});
  readonly showDetails = signal(false);
  readonly developerFilter = signal('');
  readonly projectFilter = signal('');
  readonly sortColumn = signal<AllocationSortColumn>('developer');
  readonly sortDirection = signal<SortDirection>('asc');
  readonly editingAllocationId = signal<string | null>(null);
  readonly editSaving = signal(false);
  readonly editForm = this.formBuilder.nonNullable.group({
    allocation_type: ['PROJECT' as AllocationType, Validators.required],
    percentage: [50, [Validators.required, Validators.min(1), Validators.max(150)]],
  });
  readonly filteredAllocations = computed(() => {
    const developerId = this.developerFilter();
    const projectId = this.projectFilter();
    return this.allocations().filter((allocation) =>
      (!developerId || allocation.resource_id === developerId)
      && (!projectId || (projectId === '__non_project__' ? !allocation.project_id : allocation.project_id === projectId)),
    );
  });
  readonly sortedAllocations = computed(() => {
    const rows = [...this.filteredAllocations()];
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return rows.sort((left, right) => direction * this.compareAllocations(left, right, column));
  });
  readonly editorWeeks = computed(() => {
    const weeks = this.weeks();
    const indexes = this.allocations()
      .map((allocation) => weeks.findIndex((week) => week.id === allocation.calendar_week_id))
      .filter((index) => index >= 0);
    if (indexes.length === 0) return weeks;
    const first = Math.max(0, Math.min(...indexes) - 4);
    const last = Math.min(weeks.length - 1, Math.max(...indexes) + 4);
    return weeks.slice(first, last + 1);
  });

  readonly form = this.formBuilder.nonNullable.group({
    resource_id: ['', Validators.required],
    project_id: [''],
    start_date: [this.monday(new Date()), Validators.required],
    end_date: [this.sunday(new Date()), Validators.required],
    allocation_type: ['PROJECT' as AllocationType, Validators.required],
    percentage: [50, [Validators.required, Validators.min(1), Validators.max(150)]],
    notes: [''],
  });

  constructor() { this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      allocations: this.api.allocations(),
      developers: this.api.developers(),
      projects: this.api.projects(),
      weeks: this.api.calendarWeeks(),
    }).pipe(
      catchError(() => {
        this.error.set('Não foi possível carregar dados de alocação.');
        return of({ allocations: [], developers: [], projects: [], weeks: [] });
      }),
    ).subscribe((data) => {
      this.allocations.set(data.allocations);
      this.developers.set(data.developers);
      this.projects.set(data.projects);
      this.weeks.set(data.weeks);
      const currentWeek = data.weeks.find((week) => week.start_date <= this.isoDate(new Date()) && week.end_date >= this.isoDate(new Date()));
      if (currentWeek) {
        this.form.patchValue({ start_date: this.parseDate(currentWeek.start_date), end_date: this.parseDate(currentWeek.end_date) });
      }
      this.loading.set(false);
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const range = this.selectedWeekRange();
    if (!range) {
      this.error.set('Seleciona um intervalo de semanas válido.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.createAllocationRange({
      resource_id: value.resource_id,
      project_id: value.project_id || null,
      start_week_id: range.start.id,
      end_week_id: range.end.id,
      allocation_type: value.allocation_type,
      percentage: value.percentage,
      notes: value.notes || null,
    }).pipe(
      catchError((error: unknown) => {
        this.error.set(this.errorMessage(error));
        return of(null);
      }),
    ).subscribe((allocation) => {
      this.saving.set(false);
      if (allocation) {
        this.form.patchValue({ percentage: 50, notes: '' });
        this.loadAll();
      }
    });
  }

  developerName(id: string): string { return this.developers().find((item) => item.id === id)?.name ?? 'Unknown'; }
  projectCode(id: string | null): string { return id ? this.projects().find((item) => item.id === id)?.code ?? 'Unknown' : 'Non-project'; }
  projectLabel(id: string | null): string {
    if (!id) return 'Non-project';
    const project = this.projects().find((item) => item.id === id);
    return project ? `${project.code} — ${project.name}` : 'Unknown';
  }
  weekLabel(id: string): string {
    const week = this.weeks().find((item) => item.id === id);
    return week ? `${week.iso_year}-W${String(week.iso_week).padStart(2, '0')}` : 'Unknown';
  }

  startEdit(allocation: Allocation): void {
    this.editingAllocationId.set(allocation.id);
    this.editForm.setValue({ allocation_type: allocation.allocation_type, percentage: Number(allocation.percentage) });
  }

  cancelEdit(): void {
    this.editingAllocationId.set(null);
    this.editForm.reset({ allocation_type: 'PROJECT', percentage: 50 });
  }

  saveEdit(allocation: Allocation): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const payload: AllocationUpdate = this.editForm.getRawValue();
    this.editSaving.set(true);
    this.error.set(null);
    this.api.updateAllocation(allocation.id, payload, allocation.version).pipe(
      catchError((error: unknown) => {
        this.error.set(this.errorMessage(error, 'Não foi possível atualizar a alocação.'));
        return of(null);
      }),
    ).subscribe((updated) => {
      this.editSaving.set(false);
      if (updated) {
        this.cancelEdit();
        this.loadAll();
      }
    });
  }

  deleteAllocation(allocation: Allocation): void {
    if (!window.confirm('Apagar esta alocação? Esta ação não pode ser anulada.')) return;
    this.editSaving.set(true);
    this.error.set(null);
    this.api.deleteAllocation(allocation.id, allocation.version).pipe(
      catchError((error: unknown) => {
        this.error.set(this.errorMessage(error, 'Não foi possível apagar a alocação.'));
        return of('error' as const);
      }),
    ).subscribe((deleted) => {
      this.editSaving.set(false);
      if (deleted === 'error') return;
      this.cancelEdit();
      this.loadAll();
    });
  }

  allocationTypesFor(allocation: Allocation): AllocationType[] {
    return allocation.project_id ? this.allocationTypes : this.allocationTypes.filter((type) => type !== 'PROJECT');
  }

  timelineLeft(group: AllocationGroup): string {
    return `${this.timelinePercent(this.groupStart(group))}%`;
  }

  timelineWidth(group: AllocationGroup): string {
    const start = this.timelinePercent(this.groupStart(group));
    const step = 100 / Math.max(this.editorWeeks().length - 1, 1);
    const width = (this.groupEnd(group) - this.groupStart(group) + 1) * step;
    return `${Math.max(Math.min(width, 100 - start), 1.5)}%`;
  }

  groupHasOverAllocation(group: AllocationGroup): boolean {
    const start = this.groupStart(group);
    const end = this.groupEnd(group);
    return this.editorWeeks().some((_, index) =>
      index >= start && index <= end && this.weeklyDeveloperPercentage(group.resourceId, index) > 100,
    );
  }

  private weeklyDeveloperPercentage(resourceId: string, weekIndex: number): number {
    const weekId = this.editorWeeks()[weekIndex]?.id;
    if (!weekId) return 0;
    return this.allocations()
      .filter((allocation) => allocation.resource_id === resourceId && allocation.calendar_week_id === weekId)
      .reduce((total, allocation) => total + Number(allocation.percentage), 0);
  }

  private timelinePercent(index: number): number {
    const max = Math.max(this.editorWeeks().length - 1, 1);
    return (index / max) * 100;
  }

  sortBy(column: AllocationSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
      return;
    }
    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  sortIndicator(column: AllocationSortColumn): string {
    return this.sortColumn() === column ? (this.sortDirection() === 'asc' ? '↑' : '↓') : '↕';
  }

  private compareAllocations(left: Allocation, right: Allocation, column: AllocationSortColumn): number {
    const leftValue = this.sortValue(left, column);
    const rightValue = this.sortValue(right, column);
    if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
    return String(leftValue).localeCompare(String(rightValue), 'pt', { numeric: true, sensitivity: 'base' });
  }

  private sortValue(allocation: Allocation, column: AllocationSortColumn): string | number {
    switch (column) {
      case 'developer': return this.developerName(allocation.resource_id);
      case 'project': return this.projectCode(allocation.project_id);
      case 'week': return this.weeks().find((week) => week.id === allocation.calendar_week_id)?.start_date ?? '';
      case 'type': return this.enumLabel(allocation.allocation_type);
      case 'percentage': return Number(allocation.percentage);
    }
  }

  allocationGroups(): AllocationGroup[] {
    const weeks = this.editorWeeks();
    const groupsByAllocation = new Map<string, AllocationGroup[]>();
    const indexedAllocations = this.allocations()
      .map((allocation) => ({ allocation, index: weeks.findIndex((week) => week.id === allocation.calendar_week_id) }))
      .filter((item) => item.index >= 0)
      .sort((left, right) => left.index - right.index);

    for (const { allocation, index } of indexedAllocations) {
      const baseKey = `${allocation.resource_id}:${allocation.project_id ?? 'non-project'}:${allocation.allocation_type}:${allocation.percentage}:${allocation.notes ?? ''}`;
      const groups = groupsByAllocation.get(baseKey) ?? [];
      const previous = groups.at(-1);
      if (previous && index <= previous.end + 1) {
        previous.allocationIds.push(allocation.id);
        previous.end = Math.max(previous.end, index);
      } else {
        groups.push({
          key: `${baseKey}:${groups.length}`,
          resourceId: allocation.resource_id,
          projectId: allocation.project_id,
          allocationType: allocation.allocation_type,
          percentage: allocation.percentage,
          allocationIds: [allocation.id],
          start: index,
          end: index,
        });
      }
      groupsByAllocation.set(baseKey, groups);
    }

    return [...groupsByAllocation.values()].flat().sort((left, right) => left.start - right.start);
  }

  allocationBundles(): AllocationDeveloperBundle[] {
    const projectBundles = new Map<string, AllocationBundle>();
    for (const group of this.allocationGroups()) {
      const key = `${group.resourceId}:${group.projectId ?? 'non-project'}`;
      const bundle = projectBundles.get(key);
      if (bundle) {
        bundle.groups.push(group);
      } else {
        projectBundles.set(key, {
          key,
          resourceId: group.resourceId,
          projectId: group.projectId,
          groups: [group],
        });
      }
    }
    const developers = new Map<string, AllocationDeveloperBundle>();
    for (const projectBundle of projectBundles.values()) {
      const developer = developers.get(projectBundle.resourceId);
      if (developer) {
        developer.projects.push(projectBundle);
      } else {
        developers.set(projectBundle.resourceId, {
          key: projectBundle.resourceId,
          resourceId: projectBundle.resourceId,
          projects: [projectBundle],
        });
      }
    }
    return [...developers.values()].sort((left, right) => {
      return this.developerName(left.resourceId).localeCompare(this.developerName(right.resourceId), 'pt');
    });
  }

  groupStart(group: AllocationGroup): number { return this.rangeDrafts()[group.key]?.start ?? group.start; }
  groupEnd(group: AllocationGroup): number { return this.rangeDrafts()[group.key]?.end ?? group.end; }

  setGroupStart(group: AllocationGroup, value: number | null): void {
    if (value === null) return;
    this.rangeDrafts.update((drafts) => ({
      ...drafts,
      [group.key]: { start: value, end: Math.max(value, this.groupEnd(group)) },
    }));
  }

  setGroupEnd(group: AllocationGroup, value: number | null): void {
    if (value === null) return;
    this.rangeDrafts.update((drafts) => ({
      ...drafts,
      [group.key]: { start: Math.min(value, this.groupStart(group)), end: value },
    }));
  }

  groupChanged(group: AllocationGroup): boolean {
    return this.groupStart(group) !== group.start || this.groupEnd(group) !== group.end;
  }

  saveGroup(group: AllocationGroup): void {
    const groupsToMerge = this.groupsToMerge(group);
    const start = Math.min(...groupsToMerge.map((item) => this.groupStart(item)));
    const end = Math.max(...groupsToMerge.map((item) => this.groupEnd(item)));
    const startWeek = this.editorWeeks()[start];
    const endWeek = this.editorWeeks()[end];
    if (!startWeek || !endWeek) return;
    const payload: AllocationRangeUpdate = {
      allocation_ids: groupsToMerge.flatMap((item) => item.allocationIds),
      start_week_id: startWeek.id,
      end_week_id: endWeek.id,
    };
    this.groupSaving.set(true);
    this.error.set(null);
    this.api.updateAllocationRange(payload).pipe(
      catchError((error: unknown) => {
        this.error.set(this.errorMessage(error, 'Não foi possível atualizar o intervalo da alocação.'));
        return of(null);
      }),
    ).subscribe((result) => {
      this.groupSaving.set(false);
      if (result) {
        this.rangeDrafts.update((drafts) => {
          const next = { ...drafts };
          delete next[group.key];
          return next;
        });
        this.loadAll();
      }
    });
  }

  private groupsToMerge(group: AllocationGroup): AllocationGroup[] {
    const candidates = this.allocationGroups().filter((candidate) =>
      candidate.resourceId === group.resourceId
      && candidate.projectId === group.projectId
      && candidate.allocationType === group.allocationType
      && candidate.percentage === group.percentage,
    );
    const selected = [group];
    const selectedKeys = new Set([group.key]);
    let start = this.groupStart(group);
    let end = this.groupEnd(group);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of candidates) {
        if (selectedKeys.has(candidate.key)) continue;
        const candidateStart = this.groupStart(candidate);
        const candidateEnd = this.groupEnd(candidate);
        if (candidateStart <= end + 1 && candidateEnd >= start - 1) {
          selected.push(candidate);
          selectedKeys.add(candidate.key);
          start = Math.min(start, candidateStart);
          end = Math.max(end, candidateEnd);
          changed = true;
        }
      }
    }
    return selected;
  }

  weekLabelWithDate(id: string): string {
    const week = this.weeks().find((item) => item.id === id);
    return week ? `${this.weekLabel(id)} · ${week.start_date}` : 'Unknown';
  }

  onStartDateChange(value: Date | null): void {
    if (!value) return;
    const start = this.monday(value);
    const end = this.form.controls.end_date.value;
    this.form.patchValue({ start_date: start, ...(end < start ? { end_date: this.sunday(value) } : {}) });
  }

  onEndDateChange(value: Date | null): void {
    if (!value) return;
    const end = this.sunday(value);
    const start = this.form.controls.start_date.value;
    this.form.patchValue({ end_date: end, ...(end < start ? { start_date: this.monday(value) } : {}) });
  }

  selectedWeekRange(): { start: CalendarWeek; end: CalendarWeek } | null {
    const startDate = this.form.controls.start_date.value;
    const endDate = this.form.controls.end_date.value;
    const start = this.weeks().find((week) => week.start_date === this.isoDate(startDate));
    const end = this.weeks().find((week) => week.end_date === this.isoDate(endDate));
    return start && end && start.start_date <= end.start_date ? { start, end } : null;
  }

  private monday(value: Date): Date {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    const offset = result.getDay() === 0 ? -6 : 1 - result.getDay();
    result.setDate(result.getDate() + offset);
    return result;
  }

  private sunday(value: Date): Date {
    const result = this.monday(value);
    result.setDate(result.getDate() + 6);
    return result;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private isoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private errorMessage(error: unknown, fallback = 'Não foi possível criar a alocação.'): string {
    if (typeof error === 'object' && error && 'status' in error && error.status === 409) {
      return 'Uma das semanas excede o limite de 150% para este developer.';
    }
    return fallback;
  }
}

interface AllocationGroup {
  key: string;
  resourceId: string;
  projectId: string | null;
  allocationType: AllocationType;
  percentage: string;
  allocationIds: string[];
  start: number;
  end: number;
}

type AllocationSortColumn = 'developer' | 'project' | 'week' | 'type' | 'percentage';
type SortDirection = 'asc' | 'desc';

interface AllocationBundle {
  key: string;
  resourceId: string;
  projectId: string | null;
  groups: AllocationGroup[];
}

interface AllocationDeveloperBundle {
  key: string;
  resourceId: string;
  projects: AllocationBundle[];
}
