import { Routes } from '@angular/router';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Public routes (no layout)
  {
    path: 'login',
    title: $localize`:@@routeTitle.login:Logg inn - Diddit!`,
    loadComponent: () => import('./auth/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: $localize`:@@routeTitle.register:Registrer deg - Diddit!`,
    loadComponent: () => import('./auth/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'child-login',
    title: $localize`:@@routeTitle.childLogin:Logg inn for barn - Diddit!`,
    loadComponent: () => import('./auth/child-login').then((m) => m.ChildLoginComponent),
  },
  {
    path: 'forgot-password',
    title: $localize`:@@routeTitle.forgotPassword:Glemt passord - Diddit!`,
    loadComponent: () => import('./auth/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    title: $localize`:@@routeTitle.resetPassword:Nytt passord - Diddit!`,
    loadComponent: () => import('./auth/reset-password').then((m) => m.ResetPasswordComponent),
  },
  {
    path: 'invitations/accept/:token',
    title: $localize`:@@routeTitle.acceptInvitation:Godta invitasjon - Diddit!`,
    loadComponent: () =>
      import('./pages/invitation-accept/invitation-accept').then(
        (m) => m.InvitationAcceptComponent,
      ),
  },

  {
    // ST-1678: a child sets their own password from the link a parent made
    path: 'invitasjon/:token',
    title: $localize`:@@routeTitle.childInvite:Lag passordet ditt - Diddit!`,
    loadComponent: () => import('./auth/child-invite').then((m) => m.ChildInviteComponent),
  },

  // Parent/Admin routes - wrapped in MainLayout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    canActivate: [roleGuard(['admin', 'parent'])],
    children: [
      {
        path: 'home',
        title: $localize`:@@routeTitle.home:Hjem - Diddit!`,
        data: { ownHead: true },
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'tasks',
        title: $localize`:@@routeTitle.tasks:Oppgaver - Diddit!`,
        data: { ownHead: true },
        loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks),
      },
      {
        path: 'family',
        title: $localize`:@@routeTitle.family:Familie - Diddit!`,
        data: { ownHead: true },
        loadComponent: () => import('./pages/family/family').then((m) => m.Family),
      },
      {
        path: 'progress',
        title: $localize`:@@routeTitle.progress:Fremgang - Diddit!`,
        data: { ownHead: true },
        loadComponent: () => import('./pages/progress/progress').then((m) => m.Progress),
      },
      {
        path: 'rewards',
        title: $localize`:@@routeTitle.rewards:Belønninger - Diddit!`,
        data: { ownHead: true },
        loadComponent: () =>
          import('./pages/rewards-management/rewards-management').then(
            (m) => m.RewardsManagementComponent,
          ),
      },
      {
        path: 'household/create',
        title: $localize`:@@routeTitle.createHousehold:Opprett husstand - Diddit!`,
        loadComponent: () => import('./pages/setup-wizard/setup-wizard').then((m) => m.SetupWizard),
      },
      {
        path: 'household/settings',
        title: $localize`:@@routeTitle.householdSettings:Husstandsinnstillinger - Diddit!`,
        loadComponent: () =>
          import('./components/household-settings/household-settings').then(
            (m) => m.HouseholdSettingsComponent,
          ),
      },
      {
        path: 'invitations',
        title: $localize`:@@routeTitle.invitations:Invitasjoner - Diddit!`,
        loadComponent: () =>
          import('./components/invitation-inbox/invitation-inbox').then(
            (m) => m.InvitationInboxComponent,
          ),
      },
      {
        path: 'settings',
        title: $localize`:@@routeTitle.settings:Innstillinger - Diddit!`,
        data: { ownHead: true },
        loadComponent: () => import('./pages/settings/settings').then((m) => m.Settings),
      },
      {
        path: 'households',
        title: $localize`:@@routeTitle.manageHouseholds:Administrer husstander - Diddit!`,
        data: { ownHead: true },
        loadComponent: () =>
          import('./pages/manage-households/manage-households').then((m) => m.ManageHouseholds),
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
        title: $localize`:@@routeTitle.myTasks:Mine oppgaver - Diddit!`,
        loadComponent: () =>
          import('./pages/child-dashboard/child-dashboard').then((m) => m.ChildDashboardComponent),
      },
      {
        path: 'my-rewards',
        title: $localize`:@@routeTitle.myRewards:Mine belønninger - Diddit!`,
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
