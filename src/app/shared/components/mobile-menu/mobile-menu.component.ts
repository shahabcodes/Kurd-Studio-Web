import { Component, inject, input, output } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-mobile-menu',
  templateUrl: './mobile-menu.component.html',
  styleUrl: './mobile-menu.component.scss'
})
export class MobileMenuComponent {
  readonly themeService = inject(ThemeService);

  isOpen = input.required<boolean>();
  close = output<void>();

  onClose(): void {
    this.close.emit();
  }

  onLinkClick(): void {
    this.close.emit();
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }
}
