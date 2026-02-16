import { Component, AfterViewInit, OnDestroy, NgZone, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PreloaderComponent } from '../../shared/components/preloader/preloader.component';
import { BackToTopComponent } from '../../shared/components/back-to-top/back-to-top.component';
import { BackgroundEffectsComponent } from '../../shared/components/background-effects/background-effects.component';
import { CustomCursorComponent } from '../../shared/components/custom-cursor/custom-cursor.component';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    PreloaderComponent,
    BackToTopComponent,
    BackgroundEffectsComponent,
    CustomCursorComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private scrollObserver: IntersectionObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              this.scrollObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      // Observe existing elements
      this.observeRevealElements();

      // Watch for dynamically added elements
      this.mutationObserver = new MutationObserver(() => {
        this.observeRevealElements();
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  private observeRevealElements(): void {
    document.querySelectorAll('.reveal:not(.visible), .stagger-children:not(.visible)').forEach(el => {
      this.scrollObserver?.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }
}
