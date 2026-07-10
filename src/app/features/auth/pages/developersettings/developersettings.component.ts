import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DeveloperService } from 'src/app/core/services/developer.service';
import { AuthService } from 'src/app/core/services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-developersettings',
  templateUrl: './developersettings.component.html',
  styleUrls: ['./developersettings.component.scss']
})
export class DevelopersettingsComponent implements OnInit {

  // ── State ──────────────────────────────────────────────────────────────────
  activeTab: 'profile' | 'preferences' | 'security' = 'profile';
  profile: any = null;
  isLoading      = false;
  isDeleting     = false;
  showDeleteModal = false;

  // ── Forms ──────────────────────────────────────────────────────────────────
  profileForm: FormGroup;
  prefsForm: FormGroup;
  deleteForm: FormGroup;
  showDeletePassword = false;

  constructor(
    private fb: FormBuilder,
    private developerService: DeveloperService,
    private authService: AuthService,
    private router: Router
  ) {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    });

    this.prefsForm = this.fb.group({
      theme:                ['dark', [Validators.required]],
      language:             ['en',  [Validators.required]],
      emailOnTaskComplete:  [false],
      emailOnProjectUpdate: [false],
    });

    this.deleteForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadProfile();
  }

  // ── Tab Navigation ─────────────────────────────────────────────────────────
  setTab(tab: 'profile' | 'preferences' | 'security'): void {
    this.activeTab = tab;
  }

  // ── Load Profile ───────────────────────────────────────────────────────────
  loadProfile(): void {
    this.isLoading = true;
    this.developerService.getProfile().subscribe({
      next: (res) => {
        this.profile = res.data;
        this.isLoading = false;

        // Patch profile form with fetched data
        this.profileForm.patchValue({ name: this.profile.name || '' });

        // Patch preferences form if data exists
        const prefs = this.profile.preferences || {};
        const notif = this.profile.notifications || {};
        this.prefsForm.patchValue({
          theme:                prefs.theme   || 'dark',
          language:             prefs.language || 'en',
          emailOnTaskComplete:  notif.emailOnTaskComplete  ?? false,
          emailOnProjectUpdate: notif.emailOnProjectUpdate ?? false,
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('error', 'Could not load profile. Please refresh.');
      }
    });
  }

  // ── Update Profile Info ────────────────────────────────────────────────────
  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.developerService.updateSettings({ name: this.profileForm.value.name }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.profile = res.data;
        // Keep localStorage profile in sync
        const stored = JSON.parse(localStorage.getItem('developerProfile') || '{}');
        stored.name = res.data.name;
        localStorage.setItem('developerProfile', JSON.stringify(stored));
        localStorage.setItem('userName', res.data.name);
        this.showToast('success', 'Profile updated successfully!');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('error', err?.error?.message || 'Update failed. Please try again.');
      }
    });
  }

  // ── Update Preferences ─────────────────────────────────────────────────────
  savePreferences(): void {
    if (this.prefsForm.invalid) {
      this.prefsForm.markAllAsTouched();
      return;
    }
    const { theme, language, emailOnTaskComplete, emailOnProjectUpdate } = this.prefsForm.value;
    this.isLoading = true;
    this.developerService.updateSettings({
      preferences:   { theme, language },
      notifications: { emailOnTaskComplete, emailOnProjectUpdate },
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.showToast('success', 'Preferences saved!');
      },
      error: (err) => {
        this.isLoading = false;
        this.showToast('error', err?.error?.message || 'Could not save preferences.');
      }
    });
  }

  // ── Delete Account Modal ───────────────────────────────────────────────────
  openDeleteModal(): void {
    this.deleteForm.reset();
    this.showDeletePassword = false;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  toggleDeletePassword(): void {
    this.showDeletePassword = !this.showDeletePassword;
  }

  confirmDeleteAccount(): void {
    if (this.deleteForm.invalid) {
      this.deleteForm.markAllAsTouched();
      return;
    }
    this.isDeleting = true;
    const { password } = this.deleteForm.value;
    this.developerService.deleteAccount(password).subscribe({
      next: () => {
        this.isDeleting = false;
        this.showDeleteModal = false;
        // Clear all local session state
        this.authService.clearLocalState();
        // Show farewell toast then redirect
        Swal.mixin({
          toast: true, position: 'bottom-end',
          showConfirmButton: false, timer: 3000,
          background: 'rgba(15,23,42,0.95)', color: '#fff',
        }).fire({ icon: 'info', title: 'Account deleted. Goodbye!' });
        setTimeout(() => this.router.navigate(['/auth/login']), 2500);
      },
      error: (err) => {
        this.isDeleting = false;
        this.showToast('error', err?.error?.message || 'Incorrect password or server error.');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  get avatarInitial(): string {
    return this.profile?.name?.charAt(0)?.toUpperCase() || 'D';
  }

  private showToast(icon: 'success' | 'error' | 'info', title: string): void {
    Swal.mixin({
      toast: true, position: 'bottom-end',
      showConfirmButton: false, timer: 2800,
      background: 'rgba(15,23,42,0.95)', color: '#fff',
    }).fire({ icon, title });
  }
}