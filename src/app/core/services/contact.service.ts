import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { ContactRequest, ContactResponse, ValidationErrors } from '../models/contact.model';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly api = inject(ApiService);

  // Signals for reactive state
  private readonly _isSubmitting = signal(false);
  private readonly _submitSuccess = signal(false);
  private readonly _errors = signal<Record<string, string[]> | null>(null);

  // Public readonly signals
  readonly isSubmitting = this._isSubmitting.asReadonly();
  readonly submitSuccess = this._submitSuccess.asReadonly();
  readonly errors = this._errors.asReadonly();

  submit(request: ContactRequest): Observable<ContactResponse> {
    this._isSubmitting.set(true);
    this._submitSuccess.set(false);
    this._errors.set(null);

    return this.api.post<ContactResponse>('/contact', request).pipe(
      tap(() => {
        this._isSubmitting.set(false);
        this._submitSuccess.set(true);
      }),
      catchError((error: HttpErrorResponse) => {
        this._isSubmitting.set(false);
        if (error.status === 400 && error.error?.errors) {
          this._errors.set(error.error.errors);
        }
        return throwError(() => error);
      })
    );
  }

  resetState(): void {
    this._isSubmitting.set(false);
    this._submitSuccess.set(false);
    this._errors.set(null);
  }
}
