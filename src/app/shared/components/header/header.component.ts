import { Component, inject, signal, HostListener } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { SiteService } from '../../../core/services/site.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';

@Component({
  selector: 'app-header',
  imports: [SafeHtmlPipe, MobileMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  readonly themeService = inject(ThemeService);
  readonly siteService = inject(SiteService);

  readonly isScrolled = signal(false);
  readonly scrollProgress = signal(0);
  readonly isMobileMenuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;

    this.isScrolled.set(scrollY > 50);
    this.scrollProgress.set(progress);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
    document.body.style.overflow = this.isMobileMenuOpen() ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
