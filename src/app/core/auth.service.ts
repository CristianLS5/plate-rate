import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly userState = signal<User | null>(null);
  private readonly loadingState = signal(true);

  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => Boolean(this.userState()));
  readonly isLoading = computed(() => this.loadingState());

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.userState.set(user);
      this.loadingState.set(false);
    });
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    await this.router.navigateByUrl('/personal');
  }

  async logout(): Promise<void> {
    await signOut(auth);
    await this.router.navigateByUrl('/login');
  }
}
