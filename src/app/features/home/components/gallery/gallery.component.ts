import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal, NgZone } from '@angular/core';
import { ArtworkService } from '../../../../core/services/artwork.service';
import { SiteService } from '../../../../core/services/site.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';
import { ThreeService } from '../../../../core/services/three.service';

@Component({
  selector: 'app-gallery',
  imports: [SectionHeaderComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly artworkService = inject(ArtworkService);
  readonly siteService = inject(SiteService);
  private readonly ngZone = inject(NgZone);
  private readonly threeService = inject(ThreeService);

  readonly lightboxOpen = signal(false);
  readonly lightboxSrc = signal('');
  readonly lightboxAlt = signal('');
  readonly lightboxDesc = signal('');
  readonly enable3DCards = signal(false);

  private cardListeners: Array<{ el: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = [];

  ngOnInit(): void {
    this.artworkService.loadArtworks().subscribe();
    this.artworkService.loadTypes().subscribe();
    this.enable3DCards.set(this.threeService.canUse3D());
  }

  ngAfterViewInit(): void {
    this.onCardsRendered();
  }

  ngOnDestroy(): void {
    this.cleanupCardListeners();
  }

  onCardsRendered(): void {
    if (!this.enable3DCards()) return;
    this.ngZone.runOutsideAngular(() => {
      // Small delay to let DOM settle
      setTimeout(() => this.attachCardTilt(), 50);
    });
  }

  private attachCardTilt(): void {
    this.cleanupCardListeners();
    const cards = document.querySelectorAll<HTMLElement>('.card');

    cards.forEach((card) => {
      let currentX = 0, currentY = 0;
      let targetX = 0, targetY = 0;
      let raf: number | null = null;

      const animate = () => {
        currentX += (targetX - currentX) * 0.1;
        currentY += (targetY - currentY) * 0.1;
        card.style.transform =
          `perspective(600px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateY(-8px) scale(1.01)`;
        if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
          raf = requestAnimationFrame(animate);
        } else {
          raf = null;
        }
      };

      const move = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        targetY = (x - 0.5) * 10;
        targetX = -(y - 0.5) * 8;
        if (raf === null) {
          raf = requestAnimationFrame(animate);
        }
      };

      const leave = () => {
        targetX = 0;
        targetY = 0;
        if (raf !== null) cancelAnimationFrame(raf);
        // Smooth return
        const returnToNormal = () => {
          currentX += (0 - currentX) * 0.1;
          currentY += (0 - currentY) * 0.1;
          if (Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01) {
            card.style.transform =
              `perspective(600px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateY(0) scale(1)`;
            requestAnimationFrame(returnToNormal);
          } else {
            card.style.transform = '';
          }
        };
        requestAnimationFrame(returnToNormal);
        raf = null;
      };

      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      this.cardListeners.push({ el: card, move, leave });
    });
  }

  private cleanupCardListeners(): void {
    this.cardListeners.forEach(({ el, move, leave }) => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    });
    this.cardListeners = [];
  }

  setFilter(type: string): void {
    this.artworkService.setSelectedType(type === 'all' ? null : type);
    // Re-attach tilt after filter changes DOM
    if (this.enable3DCards()) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.attachCardTilt(), 100);
      });
    }
  }

  openLightbox(src: string, alt: string, desc: string): void {
    this.lightboxSrc.set(src);
    this.lightboxAlt.set(alt || 'Full size preview');
    this.lightboxDesc.set(desc || '');
    this.lightboxOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
    document.body.style.overflow = '';
  }

  onLightboxBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('lightbox')) {
      this.closeLightbox();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeLightbox();
    }
  }
}
