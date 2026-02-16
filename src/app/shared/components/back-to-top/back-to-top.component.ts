import { Component, signal, HostListener } from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  templateUrl: './back-to-top.component.html',
  styleUrl: './back-to-top.component.scss'
})
export class BackToTopComponent {
  readonly isVisible = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.isVisible.set(window.scrollY > 500);
  }

  scrollToTop(event: Event): void {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
