import { Component, ChangeDetectionStrategy, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@/services/user.service';
import type { User } from '@/models/user';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class UserForm {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  @Input() user: User | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isSubmitting = signal(false);

  form = this.fb.group({
    id_user: [null],
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    phone_number: [''],
    is_admin: [false],
    account_status: ['ENABLED']
  });

  ngOnChanges(): void {
    if (this.user) {
      this.form.patchValue({
        id_user: this.user.id,
        name: this.user.fullName,
        email: this.user.email,
        phone_number: this.user.phone ?? '',
        is_admin: this.user.isAdmin,
        account_status: this.user.enabled ? 'ENABLED' : 'DISABLED'
      });
      this.form.get('password')!.setValue('');
    } else {
      this.form.reset({ account_status: 'ENABLED', is_admin: false });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value;
    this.isSubmitting.set(true);

    if (payload.id_user) {
      const updatePayload: Partial<Record<string, unknown>> & { id_user: number } = {
        id_user: payload.id_user,
        name: payload.name,
        email: payload.email,
        phone_number: payload.phone_number || null,
        account_status: payload.account_status
      };
      if (payload.password) updatePayload.password = payload.password;
      if (typeof payload.is_admin === 'boolean') updatePayload.is_admin = payload.is_admin;

      this.userService.updateUser(updatePayload as any).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.saved.emit();
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
        }
      });
    } else {
      const createPayload = {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone_number: payload.phone_number || null,
        is_admin: payload.is_admin || false
      };
      this.userService.createUser(createPayload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.saved.emit();
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
        }
      });
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
