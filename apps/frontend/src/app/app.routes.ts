import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Public routes (no layout)
  {
    path: 'login',
    title: 'Login - Diddit!',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Register - Diddit!',
    loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'child-login',
    title: 'Child Login - Diddit!',
    loadComponent: () => import('./auth/child-login.component').then((m) => m.ChildLoginComponent),
  },
  {
    path: 'forgot-password',
    title: 'Forgot Password - Diddit!',
    loadComponent: () =>
      import('./auth/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: 'Reset Password - Diddit!',
    loadComponent: () =>
      import('./auth/reset-password.component').then((m) => m.ResetPasswordComponent),
  },

  // Parent/Admin routes - wrapped in MainLayout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [roleGuard(['admin', 'parent'])],
    children: [
      {
        path: 'home',
        title: 'Home - Diddit!',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'tasks',
        title: 'Tasks - Diddit!',
        loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks),
      },
      {
        path: 'family',
        title: 'Family - Diddit!',
        loadComponent: () => import('./pages/family/family').then((m) => m.Family),
      },
      {
        path: 'progress',
        title: 'Progress - Diddit!',
        loadComponent: () => import('./pages/progress/progress').then((m) => m.Progress),
      },
      {
        path: 'rewards',
        title: 'Rewards - Diddit!',
        loadComponent: () =>
          import('./pages/rewards-management/rewards-management').then(
            (m) => m.RewardsManagementComponent,
          ),
      },
      {
        path: 'household/create',
        title: 'Create Household - Diddit!',
        loadComponent: () =>
          import('./components/household-create/household-create').then(
            (m) => m.HouseholdCreateComponent,
          ),
      },
      {
        path: 'household/settings',
        title: 'Household Settings - Diddit!',
        loadComponent: () =>
          import('./components/household-settings/household-settings').then(
            (m) => m.HouseholdSettingsComponent,
          ),
      },
      {
        path: 'invitations',
        title: 'Invitations - Diddit!',
        loadComponent: () =>
          import('./components/invitation-inbox/invitation-inbox').then(
            (m) => m.InvitationInboxComponent,
          ),
      },
      {
        path: 'settings',
        title: 'Settings - Diddit!',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
      },
      // Default redirect for authenticated parent/admin users
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },

  // Child routes - wrapped in ChildLayout
  {
    path: '',
    loadComponent: () => import('./layouts/child-layout/child-layout').then((m) => m.ChildLayout),
    canActivate: [roleGuard(['child'])],
    children: [
      {
        path: 'my-tasks',
        title: 'My Tasks - Diddit!',
        loadComponent: () =>
          import('./pages/child-dashboard/child-dashboard').then((m) => m.ChildDashboardComponent),
      },
      {
        path: 'my-rewards',
        title: 'My Rewards - Diddit!',
        loadComponent: () =>
          import('./pages/child-rewards/child-rewards').then((m) => m.ChildRewards),
      },
    ],
  },

  // Legacy route redirects for backward compatibility
  {
    path: 'household/all-tasks',
    redirectTo: 'tasks',
    pathMatch: 'full',
  },
  {
    path: 'household/rewards',
    redirectTo: 'rewards',
    pathMatch: 'full',
  },
];
