import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Artwork, ArtworkType } from '../models/artwork.model';
import { Observable, tap, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArtworkService {
  private readonly api = inject(ApiService);

  // Signals for reactive state
  private readonly _artworks = signal<Artwork[]>([]);
  private readonly _types = signal<ArtworkType[]>([]);
  private readonly _selectedType = signal<string | null>(null);
  private readonly _isLoading = signal(false);

  // Public readonly signals
  readonly artworks = this._artworks.asReadonly();
  readonly types = this._types.asReadonly();
  readonly selectedType = this._selectedType.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  // Computed signal for filtered artworks
  readonly filteredArtworks = computed(() => {
    const type = this._selectedType();
    const artworks = this._artworks();
    if (!type || type === 'all') {
      return artworks;
    }
    return artworks.filter(a => a.typeName === type);
  });

  // Cache for API calls
  private artworks$: Observable<Artwork[]> | null = null;
  private types$: Observable<ArtworkType[]> | null = null;

  loadArtworks(): Observable<Artwork[]> {
    if (this.artworks$) {
      return this.artworks$;
    }

    this._isLoading.set(true);

    this.artworks$ = this.api.get<Artwork[]>('/artworks').pipe(
      tap(artworks => {
        this._artworks.set(artworks);
        this._isLoading.set(false);
      }),
      shareReplay(1)
    );

    return this.artworks$;
  }

  loadTypes(): Observable<ArtworkType[]> {
    if (this.types$) {
      return this.types$;
    }

    this.types$ = this.api.get<ArtworkType[]>('/artworks/types').pipe(
      tap(types => this._types.set(types)),
      shareReplay(1)
    );

    return this.types$;
  }

  getBySlug(slug: string): Observable<Artwork> {
    return this.api.get<Artwork>(`/artworks/${slug}`);
  }

  getFeatured(): Observable<Artwork[]> {
    return this.api.get<Artwork[]>('/artworks/featured');
  }

  setSelectedType(type: string | null): void {
    this._selectedType.set(type);
  }
}
