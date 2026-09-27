import { Routes } from '@angular/router';

import { AllocationsPageComponent } from './features/allocations/allocations-page.component';
import { DevelopersPageComponent } from './features/developers/developers-page.component';
import { HomePageComponent } from './features/home/home-page.component';
import { ProjectsPageComponent } from './features/projects/projects-page.component';
import { ProjectDetailPageComponent } from './features/projects/project-detail-page.component';
import { SettingsPageComponent } from './features/settings/settings-page.component';
import { AppShellComponent } from './shared/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: HomePageComponent },
      { path: 'allocations', component: AllocationsPageComponent },
      { path: 'projects/:projectId', component: ProjectDetailPageComponent },
      { path: 'projects', component: ProjectsPageComponent },
      { path: 'developers', component: DevelopersPageComponent },
      { path: 'settings', component: SettingsPageComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
