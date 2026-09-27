import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../environments/environment';

export type BusinessArea = 'BEFS' | 'NETWORKS' | 'CLIENT_SOLUTIONS' | 'RGA';
export type ProjectType = 'BIG_BET' | 'QUICK_WIN' | 'NINJA' | 'STANDARD';
export type LifecycleState = 'IDENTIFIED' | 'DISCOVERY' | 'EXECUTION' | 'HANDOVER';
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type DeliveryModel = 'INTERNAL' | 'PARTNER' | 'HYBRID';
export type DependencyType = 'ARCHITECTURE' | 'INFRA' | 'SECURITY' | 'BUSINESS' | 'FACTORY';
export type DependencyStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'RESOLVED' | 'CANCELLED';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectRole =
  | 'PRODUCT_OWNER'
  | 'DIGITAL_MANAGER'
  | 'SCRUM_MASTER'
  | 'COORDINATOR'
  | 'ARCHITECT'
  | 'AI_COMPETENCE_CENTER_REPRESENTATIVE'
  | 'DESIGNER';
export type Discipline = 'BACKEND' | 'FRONTEND' | 'CLOUD' | 'DATA_SCIENCE';
export type ResourceRoleType =
  | 'BACKEND_DEVELOPER'
  | 'FRONTEND_DEVELOPER'
  | 'CLOUD_ENGINEER'
  | 'DATA_SCIENTIST';
export type ResourceStatus = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
export type AllocationType =
  | 'PROJECT'
  | 'SUPPORT'
  | 'COMMUNITY'
  | 'INNOVATION'
  | 'TRAINING'
  | 'HOLIDAY'
  | 'ABSENCE';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  business_area: BusinessArea;
  project_type: ProjectType;
  lifecycle_state: LifecycleState;
  priority: Priority;
  delivery_model: DeliveryModel;
  edpx_card_url: string | null;
  jira_url: string | null;
  confluence_url: string | null;
  figma_url: string | null;
  start_date: string | null;
  target_end_date: string | null;
  actual_end_date: string | null;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  has_blocking_dependency?: boolean;
  blocking_dependency_count?: number;
  project_at_risk?: boolean;
}

export interface ProjectCreate {
  code: string;
  name: string;
  description?: string | null;
  business_area: BusinessArea;
  project_type: ProjectType;
  lifecycle_state: LifecycleState;
  priority: Priority;
  delivery_model: DeliveryModel;
  edpx_card_url?: string | null;
  jira_url?: string | null;
  confluence_url?: string | null;
  figma_url?: string | null;
  start_date?: string | null;
  target_end_date?: string | null;
}

export interface ProjectUpdate {
  description?: string | null;
  business_area?: BusinessArea;
  project_type?: ProjectType;
  lifecycle_state?: LifecycleState;
  priority?: Priority;
  delivery_model?: DeliveryModel;
  edpx_card_url?: string | null;
  jira_url?: string | null;
  confluence_url?: string | null;
  figma_url?: string | null;
  version?: number;
}

export interface ProjectDependency {
  id: string;
  project_id: string;
  dependency_type: DependencyType;
  title: string;
  description: string;
  status: DependencyStatus;
  start_date: string;
  target_date: string;
  resolved_date: string | null;
  cancellation_reason: string | null;
  impact_level: ImpactLevel;
  mitigation_plan: string | null;
  external_reference: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  owner_key_person_id: string | null;
  is_open: boolean;
  is_overdue: boolean;
  is_critical_open: boolean;
  project_at_risk: boolean;
}

export interface ProjectDependencyCreate {
  dependency_type: DependencyType;
  title: string;
  description: string;
  status: DependencyStatus;
  start_date: string;
  target_date: string;
  resolved_date?: string | null;
  impact_level: ImpactLevel;
  mitigation_plan?: string | null;
  external_reference?: string | null;
  owner_key_person_id?: string | null;
  cancellation_reason?: string | null;
}

export type ProjectDependencyUpdate = Partial<ProjectDependencyCreate>;

export interface ProjectStakeholder {
  id: string;
  project_id: string;
  key_person_id: string;
  role: ProjectRole;
  active: boolean;
  person_name: string;
  person_email: string | null;
  version: number;
}

export interface ProjectStakeholderAssignment {
  role: ProjectRole;
  key_person_id: string | null;
}

export interface KeyPeopleDirectoryEntry {
  id: string;
  role: ProjectRole;
  key_person_id: string;
  person_name: string;
  person_email: string | null;
  active: boolean;
  version: number;
}

export interface KeyPeopleDirectoryAssignment {
  role: ProjectRole;
  key_person_id: string;
}

export interface KeyPerson {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  business_area: BusinessArea | null;
  active: boolean;
  version: number;
}

export interface KeyPersonCreate {
  name: string;
  email?: string | null;
  company?: string;
  business_area?: BusinessArea;
}

export interface KeyPersonUpdate {
  name?: string;
  email?: string | null;
  company?: string | null;
  business_area?: BusinessArea | null;
}

export interface Developer {
  id: string;
  user_id: string | null;
  name: string;
  company: string | null;
  email: string | null;
  discipline: Discipline;
  role_type: ResourceRoleType;
  specialization: string | null;
  seniority: string | null;
  default_weekly_capacity: string;
  status: ResourceStatus;
  active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DeveloperCreate {
  name: string;
  company?: string;
  email?: string | null;
  discipline: Discipline;
  role_type: ResourceRoleType;
  specialization?: string | null;
  seniority?: string | null;
  default_weekly_capacity: number;
  status: ResourceStatus;
}

export interface DeveloperUpdate extends Partial<DeveloperCreate> {
  version?: number;
}

export interface PartnerCompany { id: string; name: string; contact_name: string | null; contact_email: string | null; notes: string | null; active: boolean; version: number; }
export interface PartnerCompanyCreate { name: string; contact_name?: string | null; contact_email?: string | null; notes?: string | null; }
export interface ProjectPartner { id: string; project_id: string; partner_company_id: string; contribution_description: string | null; contribution_percentage: string | null; }
export interface ProjectPartnerCreate { partner_company_id: string; contribution_description?: string | null; contribution_percentage?: number | null; }
export interface Sprint { id: string; project_id: string; sprint_number: number; name: string; start_date: string; end_date: string; goal: string | null; version: number; }
export interface SprintCreate { sprint_number: number; name: string; start_date: string; end_date: string; goal?: string | null; }
export interface Skill { id: string; name: string; category: string | null; active: boolean; version: number; }
export interface SkillCreate { name: string; category?: string | null; }
export interface ResourceSkill { id: string; resource_id: string; skill_id: string; level: number; }
export interface ResourceSkillCreate { skill_id: string; level: number; }
export interface ResourceAvailability { id: string; resource_id: string; calendar_week_id: string; available_percentage: string; reason: string | null; version: number; }
export interface ResourceAvailabilityCreate { calendar_week_id: string; available_percentage: number; reason?: string | null; }

export interface CsvImportIssue {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportPreview {
  entity: 'developers' | 'projects';
  total: number;
  creates: number;
  updates: number;
  issues: CsvImportIssue[];
}

export interface CsvImportResult {
  entity: 'developers' | 'projects';
  created: number;
  updated: number;
}

export interface CalendarWeek {
  id: string;
  iso_year: number;
  iso_week: number;
  start_date: string;
  end_date: string;
}

export interface CalendarWeekCreate {
  iso_year: number;
  iso_week: number;
  start_date: string;
  end_date: string;
}

export interface CalendarExtendRequest {
  until_year?: number | null;
  weeks_ahead?: number | null;
}

export interface CalendarExtendResponse {
  created: number;
  total_weeks: number;
}

export interface Allocation {
  id: string;
  resource_id: string;
  project_id: string | null;
  calendar_week_id: string;
  allocation_type: AllocationType;
  percentage: string;
  notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AllocationCreate {
  resource_id: string;
  project_id?: string | null;
  calendar_week_id: string;
  allocation_type: AllocationType;
  percentage: number;
  notes?: string | null;
}

export interface AllocationRangeCreate extends Omit<AllocationCreate, 'calendar_week_id'> {
  start_week_id: string;
  end_week_id: string;
}

export interface AllocationRangeResponse {
  created: number;
  allocations: Allocation[];
}

export interface AllocationRangeUpdate {
  allocation_ids: string[];
  start_week_id: string;
  end_week_id: string;
}

export interface AllocationUpdate {
  allocation_type?: AllocationType;
  percentage?: number;
  version?: number;
}

export interface AllocationUpdate {
  allocation_type?: AllocationType;
  percentage?: number;
  version?: number;
}

export interface AllocationRangeUpdateResponse {
  created: number;
  deleted: number;
}

export interface DashboardData {
  projects: Project[];
  developers: Developer[];
  weeks: CalendarWeek[];
  allocations: Allocation[];
  dependencies: ProjectDependency[];
  totalAllocation: number;
  overAllocatedDevelopers: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string | null;
  finish_reason: string | null;
  correlation_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class DcmApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  dashboard(): Observable<DashboardData> {
    return forkJoin({
      projects: this.projects(),
      developers: this.developers(),
      weeks: this.calendarWeeks(),
      allocations: this.allocations(),
      dependencies: this.allProjectDependencies(),
    }).pipe(
      map((data) => ({
        ...data,
        totalAllocation: data.allocations.reduce(
          (total, allocation) => total + Number(allocation.percentage),
          0,
        ),
        overAllocatedDevelopers: this.countOverAllocatedDevelopers(data.allocations),
      })),
    );
  }

  projects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`);
  }

  createProject(payload: ProjectCreate): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, payload);
  }

  updateProject(projectId: string, payload: ProjectUpdate, version: number): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/projects/${projectId}`, payload, { headers: { 'If-Match': `"${version}"` } });
  }

  deleteProject(projectId: string, version: number): Observable<Project> {
    return this.http.delete<Project>(`${this.baseUrl}/projects/${projectId}`, { headers: { 'If-Match': `"${version}"` } });
  }

  projectDependencies(projectId: string): Observable<ProjectDependency[]> {
    return this.http.get<ProjectDependency[]>(`${this.baseUrl}/projects/${projectId}/dependencies`);
  }

  allProjectDependencies(): Observable<ProjectDependency[]> {
    return this.http.get<ProjectDependency[]>(`${this.baseUrl}/projects/dependencies`);
  }

  createProjectDependency(projectId: string, payload: ProjectDependencyCreate): Observable<ProjectDependency> {
    return this.http.post<ProjectDependency>(`${this.baseUrl}/projects/${projectId}/dependencies`, payload);
  }

  updateProjectDependency(projectId: string, dependencyId: string, payload: ProjectDependencyUpdate, version: number): Observable<ProjectDependency> {
    return this.http.patch<ProjectDependency>(`${this.baseUrl}/projects/${projectId}/dependencies/${dependencyId}`, payload, { headers: { 'If-Match': `"${version}"` } });
  }

  deleteProjectDependency(projectId: string, dependencyId: string, version: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${projectId}/dependencies/${dependencyId}`, { headers: { 'If-Match': `"${version}"` } });
  }

  projectStakeholders(projectId: string): Observable<ProjectStakeholder[]> {
    return this.http.get<ProjectStakeholder[]>(`${this.baseUrl}/projects/${projectId}/stakeholders`);
  }

  replaceProjectStakeholders(projectId: string, assignments: ProjectStakeholderAssignment[]): Observable<ProjectStakeholder[]> {
    return this.http.put<ProjectStakeholder[]>(`${this.baseUrl}/projects/${projectId}/stakeholders`, { assignments });
  }

  keyPeopleDirectory(): Observable<KeyPeopleDirectoryEntry[]> {
    return this.http.get<KeyPeopleDirectoryEntry[]>(`${this.baseUrl}/settings/key-people`);
  }

  replaceKeyPeopleDirectory(assignments: KeyPeopleDirectoryAssignment[]): Observable<KeyPeopleDirectoryEntry[]> {
    return this.http.put<KeyPeopleDirectoryEntry[]>(`${this.baseUrl}/settings/key-people`, { assignments });
  }

  keyPeople(): Observable<KeyPerson[]> {
    return this.http.get<KeyPerson[]>(`${this.baseUrl}/settings/key-people/people`);
  }

  createKeyPerson(payload: KeyPersonCreate): Observable<KeyPerson> {
    return this.http.post<KeyPerson>(`${this.baseUrl}/settings/key-people/people`, payload);
  }

  updateKeyPerson(id: string, payload: KeyPersonUpdate, version: number): Observable<KeyPerson> {
    return this.http.patch<KeyPerson>(`${this.baseUrl}/settings/key-people/people/${id}`, payload, { headers: { 'If-Match': `"${version}"` } });
  }

  deactivateKeyPerson(id: string): Observable<KeyPerson> {
    return this.http.delete<KeyPerson>(`${this.baseUrl}/settings/key-people/people/${id}`);
  }

  previewProjectsImport(file: File): Observable<CsvImportPreview> {
    return this.http.post<CsvImportPreview>(`${this.baseUrl}/projects/import/preview`, this.fileBody(file));
  }

  importProjects(file: File): Observable<CsvImportResult> {
    return this.http.post<CsvImportResult>(`${this.baseUrl}/projects/import`, this.fileBody(file));
  }

  developers(): Observable<Developer[]> {
    return this.http.get<Developer[]>(`${this.baseUrl}/resources`);
  }

  partners(): Observable<PartnerCompany[]> { return this.http.get<PartnerCompany[]>(`${this.baseUrl}/partners`); }
  createPartner(payload: PartnerCompanyCreate): Observable<PartnerCompany> { return this.http.post<PartnerCompany>(`${this.baseUrl}/partners`, payload); }
  deactivatePartner(id: string): Observable<PartnerCompany> { return this.http.delete<PartnerCompany>(`${this.baseUrl}/partners/${id}`); }
  projectPartners(projectId: string): Observable<ProjectPartner[]> { return this.http.get<ProjectPartner[]>(`${this.baseUrl}/projects/${projectId}/partners`); }
  addProjectPartner(projectId: string, payload: ProjectPartnerCreate): Observable<ProjectPartner> { return this.http.post<ProjectPartner>(`${this.baseUrl}/projects/${projectId}/partners`, payload); }
  sprints(projectId: string): Observable<Sprint[]> { return this.http.get<Sprint[]>(`${this.baseUrl}/projects/${projectId}/sprints`); }
  createSprint(projectId: string, payload: SprintCreate): Observable<Sprint> { return this.http.post<Sprint>(`${this.baseUrl}/projects/${projectId}/sprints`, payload); }
  skills(): Observable<Skill[]> { return this.http.get<Skill[]>(`${this.baseUrl}/skills`); }
  createSkill(payload: SkillCreate): Observable<Skill> { return this.http.post<Skill>(`${this.baseUrl}/skills`, payload); }
  resourceSkills(resourceId: string): Observable<ResourceSkill[]> { return this.http.get<ResourceSkill[]>(`${this.baseUrl}/resources/${resourceId}/skills`); }
  addResourceSkill(resourceId: string, payload: ResourceSkillCreate): Observable<ResourceSkill> { return this.http.post<ResourceSkill>(`${this.baseUrl}/resources/${resourceId}/skills`, payload); }
  resourceAvailability(resourceId: string): Observable<ResourceAvailability[]> { return this.http.get<ResourceAvailability[]>(`${this.baseUrl}/resources/${resourceId}/availability`); }
  upsertResourceAvailability(resourceId: string, payload: ResourceAvailabilityCreate): Observable<ResourceAvailability> { return this.http.put<ResourceAvailability>(`${this.baseUrl}/resources/${resourceId}/availability`, payload); }

  createDeveloper(payload: DeveloperCreate): Observable<Developer> {
    return this.http.post<Developer>(`${this.baseUrl}/resources`, payload);
  }

  updateDeveloper(resourceId: string, payload: DeveloperUpdate, version: number): Observable<Developer> {
    return this.http.patch<Developer>(`${this.baseUrl}/resources/${resourceId}`, payload, { headers: { 'If-Match': `"${version}"` } });
  }

  previewDevelopersImport(file: File): Observable<CsvImportPreview> {
    return this.http.post<CsvImportPreview>(`${this.baseUrl}/resources/import/preview`, this.fileBody(file));
  }

  importDevelopers(file: File): Observable<CsvImportResult> {
    return this.http.post<CsvImportResult>(`${this.baseUrl}/resources/import`, this.fileBody(file));
  }

  calendarWeeks(): Observable<CalendarWeek[]> {
    return this.http.get<CalendarWeek[]>(`${this.baseUrl}/capacity/weeks`);
  }

  createCalendarWeek(payload: CalendarWeekCreate): Observable<CalendarWeek> {
    return this.http.post<CalendarWeek>(`${this.baseUrl}/capacity/weeks`, payload);
  }

  extendCalendar(payload: CalendarExtendRequest): Observable<CalendarExtendResponse> {
    return this.http.post<CalendarExtendResponse>(`${this.baseUrl}/capacity/weeks/extend`, payload);
  }

  allocations(): Observable<Allocation[]> {
    return this.http.get<Allocation[]>(`${this.baseUrl}/allocations`);
  }

  createAllocation(payload: AllocationCreate): Observable<Allocation> {
    return this.http.post<Allocation>(`${this.baseUrl}/allocations`, payload);
  }

  createAllocationRange(payload: AllocationRangeCreate): Observable<AllocationRangeResponse> {
    return this.http.post<AllocationRangeResponse>(`${this.baseUrl}/allocations/range`, payload);
  }

  updateAllocationRange(payload: AllocationRangeUpdate): Observable<AllocationRangeUpdateResponse> {
    return this.http.patch<AllocationRangeUpdateResponse>(`${this.baseUrl}/allocations/range`, payload);
  }

  updateAllocation(id: string, payload: AllocationUpdate, version: number): Observable<Allocation> {
    return this.http.patch<Allocation>(`${this.baseUrl}/allocations/${id}`, payload, { headers: { 'If-Match': `"${version}"` } });
  }

  deleteAllocation(id: string, version: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/allocations/${id}`, { headers: { 'If-Match': `"${version}"` } });
  }

  sendChatMessage(payload: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat/messages`, payload);
  }

  private countOverAllocatedDevelopers(allocations: Allocation[]): number {
    const totals = new Map<string, number>();
    for (const allocation of allocations) {
      const key = `${allocation.resource_id}:${allocation.calendar_week_id}`;
      totals.set(key, (totals.get(key) ?? 0) + Number(allocation.percentage));
    }
    return [...totals.values()].filter((value) => value > 100).length;
  }

  private fileBody(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return formData;
  }
}
