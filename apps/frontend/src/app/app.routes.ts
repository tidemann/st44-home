import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

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
  {
    path: 'child-login',
    loadComponent: () => import('./auth/child-login.component').then((m) => m.ChildLoginComponent),
  },

  // Protected routes - Parent and Admin only
  {
    path: 'household/create',
    loadComponent: () =>
      import('./components/household-create/household-create').then(
        (m) => m.HouseholdCreateComponent,
      ),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'household/settings',
    loadComponent: () =>
      import('./components/household-settings/household-settings').then(
        (m) => m.HouseholdSettingsComponent,
      ),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'invitations',
    loadComponent: () =>
      import('./components/invitation-inbox/invitation-inbox').then(
        (m) => m.InvitationInboxComponent,
      ),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/parent-dashboard/parent-dashboard').then((m) => m.ParentDashboardComponent),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'households/:householdId/tasks',
    loadComponent: () => import('./pages/task-list/task-list').then((m) => m.TaskListComponent),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'household/tasks',
    loadComponent: () =>
      import('./features/tasks/parent-task-dashboard.component').then(
        (m) => m.ParentTaskDashboardComponent,
      ),
    canActivate: [roleGuard(['admin', 'parent'])],
  },

  // Protected routes - Child only
  {
    path: 'my-tasks',
    loadComponent: () =>
      import('./pages/child-dashboard/child-dashboard').then((m) => m.ChildDashboardComponent),
    canActivate: [roleGuard(['child'])],
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./components/child-task-list/child-task-list.component').then(
        (m) => m.ChildTaskListComponent,
      ),
    canActivate: [roleGuard(['child'])],
  },

  // Default redirect
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
