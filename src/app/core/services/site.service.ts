import { Injectable, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from './api.service';
import { SiteData } from '../models/site-data.model';
import { Profile } from '../models/profile.model';
import { Hero } from '../models/hero.model';
import { Section } from '../models/section.model';
import { NavigationItem, SocialLink } from '../models/navigation.model';
import { map, shareReplay, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SiteService {
  private readonly api = inject(ApiService);

  // Signals for reactive state
  private readonly _siteData = signal<SiteData | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  readonly siteData = this._siteData.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed signals for individual data
  readonly settings = computed(() => this._siteData()?.settings ?? {});
  readonly profile = computed(() => this._siteData()?.profile ?? null);
  readonly hero = computed(() => this._siteData()?.hero ?? null);
  readonly sections = computed(() => this._siteData()?.sections ?? []);
  readonly navigation = computed(() => this._siteData()?.navigation ?? []);
  readonly socialLinks = computed(() => this._siteData()?.socialLinks ?? []);

  // Cache for API call
  private siteData$: Observable<SiteData> | null = null;

  loadSiteData(): Observable<SiteData> {
    if (this.siteData$) {
      return this.siteData$;
    }

    this._isLoading.set(true);
    this._error.set(null);

    this.siteData$ = this.api.get<SiteData>('/site/all').pipe(
      tap(data => {
        this._siteData.set(data);
        this._isLoading.set(false);
      }),
      shareReplay(1)
    );

    return this.siteData$;
  }

  getProfile(): Observable<Profile> {
    return this.api.get<Profile>('/site/profile');
  }

  getHero(): Observable<Hero> {
    return this.api.get<Hero>('/site/hero');
  }

  getSections(): Observable<Section[]> {
    return this.api.get<Section[]>('/site/sections');
  }

  getNavigation(): Observable<NavigationItem[]> {
    return this.api.get<NavigationItem[]>('/site/navigation');
  }

  getSocialLinks(): Observable<SocialLink[]> {
    return this.api.get<SocialLink[]>('/site/social');
  }
}
