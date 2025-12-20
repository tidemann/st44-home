import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent),
  },

  // Protected routes
  {
    path: 'household/create',
    loadComponent: () =>
      import('./components/household-create/household-create').then(
        (m) => m.HouseholdCreateComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'household/settings',
    loadComponent: () =>
      import('./components/household-settings/household-settings').then(
        (m) => m.HouseholdSettingsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'invitations',
    loadComponent: () =>
      import('./components/invitation-inbox/invitation-inbox').then(
        (m) => m.InvitationInboxComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/parent-dashboard/parent-dashboard').then((m) => m.ParentDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'households/:householdId/tasks',
    loadComponent: () => import('./pages/task-list/task-list').then((m) => m.TaskListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./components/child-task-list/child-task-list.component').then(
        (m) => m.ChildTaskListComponent,
      ),
    canActivate: [authGuard],
  },

  // Default redirect
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
