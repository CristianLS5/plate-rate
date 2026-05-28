import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'personal',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/personal.page').then((m) => m.PersonalPage),
  },
  {
    path: 'public/:restaurantId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/public-detail.page').then((m) => m.PublicDetailPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'personal' },
  { path: '**', redirectTo: 'personal' },
];
