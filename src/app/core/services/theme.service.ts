import { Injectable, signal, computed, effect } from '@angular/core';

type Theme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'kurd-theme';
  private readonly _theme = signal<Theme>(this.getInitialTheme());

  // Public readonly signal
  readonly theme = this._theme.asReadonly();

  // Computed signals
  readonly isDark = computed(() => this._theme() === 'dark');
  readonly isLight = computed(() => this._theme() === 'light');

  constructor() {
    // Effect to sync theme with DOM and localStorage
    effect(() => {
      const theme = this._theme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.STORAGE_KEY, theme);
    });
  }

  private getInitialTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (saved && (saved === 'dark' || saved === 'light')) {
      return saved;
    }
    // Check system preference
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  toggle(): void {
    document.body.classList.add('theme-transitioning');
    this._theme.update(t => t === 'dark' ? 'light' : 'dark');
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 400);
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }
}
