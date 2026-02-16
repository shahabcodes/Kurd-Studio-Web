import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Writing, WritingType } from '../models/writing.model';
import { Observable, tap, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WritingService {
  private readonly api = inject(ApiService);

  // Signals for reactive state
  private readonly _writings = signal<Writing[]>([]);
  private readonly _types = signal<WritingType[]>([]);
  private readonly _selectedType = signal<string>('reflection');
  private readonly _isLoading = signal(false);
  private readonly _expandedWriting = signal<Writing | null>(null);

  // Public readonly signals
  readonly writings = this._writings.asReadonly();
  readonly types = this._types.asReadonly();
  readonly selectedType = this._selectedType.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly expandedWriting = this._expandedWriting.asReadonly();

  // Computed signal for filtered writings
  readonly filteredWritings = computed(() => {
    const type = this._selectedType();
    const writings = this._writings();
    if (!type) {
      return writings;
    }
    return writings.filter(w => w.typeName === type);
  });

  // Cache for API calls
  private writings$: Observable<Writing[]> | null = null;
  private types$: Observable<WritingType[]> | null = null;

  loadWritings(): Observable<Writing[]> {
    if (this.writings$) {
      return this.writings$;
    }

    this._isLoading.set(true);

    this.writings$ = this.api.get<Writing[]>('/writings').pipe(
      tap(writings => {
        this._writings.set(writings);
        this._isLoading.set(false);
      }),
      shareReplay(1)
    );

    return this.writings$;
  }

  loadTypes(): Observable<WritingType[]> {
    if (this.types$) {
      return this.types$;
    }

    this.types$ = this.api.get<WritingType[]>('/writings/types').pipe(
      tap(types => this._types.set(types)),
      shareReplay(1)
    );

    return this.types$;
  }

  getBySlug(slug: string): Observable<Writing> {
    return this.api.get<Writing>(`/writings/${slug}`);
  }

  setSelectedType(type: string): void {
    this._selectedType.set(type);
    this._expandedWriting.set(null);
  }

  expandWriting(writing: Writing): void {
    this.getBySlug(writing.slug).subscribe(full => {
      this._expandedWriting.set(full);
    });
  }

  collapseWriting(): void {
    this._expandedWriting.set(null);
  }
}
