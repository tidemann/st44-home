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
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },

  // Protected routes - Parent and Admin only
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'family',
    loadComponent: () => import('./pages/family/family').then((m) => m.Family),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'progress',
    loadComponent: () => import('./pages/progress/progress').then((m) => m.Progress),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
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
    path: 'household/all-tasks',
    loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks),
    canActivate: [roleGuard(['admin', 'parent'])],
  },
  {
    path: 'household/rewards',
    loadComponent: () =>
      import('./pages/rewards-management/rewards-management').then(
        (m) => m.RewardsManagementComponent,
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
  {
    path: 'my-rewards',
    loadComponent: () => import('./pages/child-rewards/child-rewards').then((m) => m.ChildRewards),
    canActivate: [roleGuard(['child'])],
  },

  // Default redirect
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
];
