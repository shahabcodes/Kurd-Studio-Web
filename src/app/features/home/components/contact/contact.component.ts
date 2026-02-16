import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactService } from '../../../../core/services/contact.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, SectionHeaderComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  readonly contactService = inject(ContactService);

  readonly contactForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    subject: ['', [Validators.required, Validators.maxLength(255)]],
    budget: [''],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const formValue = this.contactForm.getRawValue();
    this.contactService.submit(formValue).subscribe({
      next: () => {
        this.contactForm.reset();
      },
      error: () => {
        // Error is handled in service
      }
    });
  }

  onReset(): void {
    this.contactForm.reset();
    this.contactService.resetState();
  }

  getFieldError(field: string): string | null {
    const control = this.contactForm.get(field);
    if (!control || !control.touched || !control.errors) return null;

    // Check for server-side errors first
    const serverErrors = this.contactService.errors();
    if (serverErrors && serverErrors[field]) {
      return serverErrors[field][0];
    }

    // Client-side validation errors
    if (control.errors['required']) return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters allowed`;

    return null;
  }
}
