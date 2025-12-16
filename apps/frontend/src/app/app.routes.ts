import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'household/create',
    loadComponent: () =>
      import('./components/household-create/household-create').then(
        (m) => m.HouseholdCreateComponent,
      ),
  },
  {
    path: 'household/settings',
    loadComponent: () =>
      import('./components/household-settings/household-settings').then(
        (m) => m.HouseholdSettingsComponent,
      ),
  },
  {
    path: 'invitations',
    loadComponent: () =>
      import('./components/invitation-inbox/invitation-inbox').then(
        (m) => m.InvitationInboxComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/parent-dashboard/parent-dashboard').then((m) => m.ParentDashboardComponent),
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];
