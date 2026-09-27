import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  Allocation,
  CalendarWeek,
  DashboardData,
  DcmApiService,
  Project,
  ProjectDependency,
} from '../../core/api/dcm-api.service';
import { HealthService } from '../../core/api/health.service';
import { enumLabel } from '../../core/display/enum-labels';

interface ProjectWeekCell {
  percentage: number;
  developers: string[];
  overallocated: boolean;
}

@Component({
  selector: 'dcm-home-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatProgressSpinnerModule, RouterLink, TranslatePipe],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly api = inject(DcmApiService);
  private readonly healthService = inject(HealthService);

  readonly health = signal<'checking' | 'available' | 'unavailable'>('checking');
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly dashboard = signal<DashboardData | null>(null);
  readonly enumLabel = enumLabel;
  readonly projectFilter = signal('');
  readonly projectSort = signal<'start_date' | 'code' | 'name'>('start_date');
  readonly projectSortDirection = signal<'asc' | 'desc'>('asc');

  constructor() {
    this.loadHealth();
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
  }

  visibleWeeks(data: DashboardData): CalendarWeek[] {
    const currentWeek = this.currentCalendarWeek(data.weeks);
    if (!currentWeek) {
      return data.weeks.slice(0, 9);
    }

    const currentStart = this.dateOnly(currentWeek.start_date).getTime();
    const lower = currentStart - 14 * 24 * 60 * 60 * 1000;
    const upper = currentStart + 42 * 24 * 60 * 60 * 1000;

    return data.weeks
      .filter((week) => {
        const start = this.dateOnly(week.start_date).getTime();
        return start >= lower && start <= upper;
      })
      .sort((left, right) => left.start_date.localeCompare(right.start_date));
  }

  orderedProjects(data: DashboardData): Project[] {
    const query = this.projectFilter().trim().toLocaleLowerCase('pt');
    const sort = this.projectSort();
    const direction = this.projectSortDirection() === 'asc' ? 1 : -1;
    return [...data.projects]
      .filter((project) => !query || `${project.code} ${project.name}`.toLocaleLowerCase('pt').includes(query))
      .sort((left, right) => {
        const leftValue = sort === 'code' ? left.code : sort === 'name' ? left.name : (left.start_date ?? '9999-12-31');
        const rightValue = sort === 'code' ? right.code : sort === 'name' ? right.name : (right.start_date ?? '9999-12-31');
        return direction * (leftValue.localeCompare(rightValue, 'pt', { numeric: true, sensitivity: 'base' })
          || left.code.localeCompare(right.code, 'pt', { numeric: true, sensitivity: 'base' }));
      });
  }

  toggleProjectSortDirection(): void {
    this.projectSortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
  }

  allocationCell(data: DashboardData, projectId: string, weekId: string): ProjectWeekCell {
    const allocations = data.allocations.filter(
      (allocation) => allocation.project_id === projectId && allocation.calendar_week_id === weekId,
    );
    const developers = new Set(allocations.map((allocation) => allocation.resource_id));
    const overallocated = [...developers].some((resourceId) =>
      data.allocations
        .filter((allocation) => allocation.resource_id === resourceId && allocation.calendar_week_id === weekId)
        .reduce((total, allocation) => total + Number(allocation.percentage), 0) > 100,
    );
    return {
      percentage: allocations.reduce((total, allocation) => total + Number(allocation.percentage), 0),
      developers: this.developerNames(data, allocations),
      overallocated,
    };
  }

  weekLabel(week: CalendarWeek): string {
    return `${week.iso_year}-W${String(week.iso_week).padStart(2, '0')}`;
  }

  isCurrentWeek(week: CalendarWeek): boolean {
    const today = this.dateOnly(new Date().toISOString().slice(0, 10));
    return today >= this.dateOnly(week.start_date) && today <= this.dateOnly(week.end_date);
  }

  totalDependencies(data: DashboardData): number {
    return data.dependencies.length;
  }

  activeDependencies(data: DashboardData): number {
    return data.dependencies.filter((dependency) => ['OPEN', 'IN_PROGRESS', 'BLOCKED'].includes(dependency.status)).length;
  }

  blockingDependencies(data: DashboardData): number {
    return data.dependencies.filter((dependency) => dependency.is_critical_open || this.isBlockingDependency(dependency)).length;
  }

  resolvedDependencies(data: DashboardData): number {
    return data.dependencies.filter((dependency) => dependency.status === 'RESOLVED').length;
  }

  dashboardDependencies(data: DashboardData): ProjectDependency[] {
    return [...data.dependencies]
      .filter((dependency) => dependency.status !== 'CANCELLED')
      .sort((left, right) => {
        const leftBlocking = this.isBlockingDependency(left) ? 0 : 1;
        const rightBlocking = this.isBlockingDependency(right) ? 0 : 1;
        return leftBlocking - rightBlocking || left.target_date.localeCompare(right.target_date);
      })
      .slice(0, 8);
  }

  dependencyProject(data: DashboardData, dependency: ProjectDependency): Project | undefined {
    return data.projects.find((project) => project.id === dependency.project_id);
  }

  isBlockingDependency(dependency: ProjectDependency): boolean {
    return dependency.status === 'BLOCKED'
      || (['OPEN', 'IN_PROGRESS', 'BLOCKED'].includes(dependency.status)
        && dependency.impact_level === 'CRITICAL');
  }

  private developerNames(data: DashboardData, allocations: Allocation[]): string[] {
    const names = allocations.map(
      (allocation) =>
        data.developers.find((developer) => developer.id === allocation.resource_id)?.name ?? 'Unknown',
    );
    return [...new Set(names)];
  }

  private currentCalendarWeek(weeks: CalendarWeek[]): CalendarWeek | null {
    const today = this.dateOnly(new Date().toISOString().slice(0, 10));
    return (
      weeks.find(
        (week) => today >= this.dateOnly(week.start_date) && today <= this.dateOnly(week.end_date),
      ) ?? null
    );
  }

  private dateOnly(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }

  private loadHealth(): void {
    this.healthService
      .check()
      .pipe(
        takeUntilDestroyed(),
        catchError(() => {
          this.health.set('unavailable');
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.health.set(response.status === 'ok' ? 'available' : 'unavailable');
        }
      });
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .dashboard()
      .pipe(
        takeUntilDestroyed(),
        catchError(() => {
          this.loadError.set('Não foi possível carregar dados operacionais. Confirma a BD e migrations.');
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      });
  }
}
