import { Component, inject, OnInit, signal } from '@angular/core';
import { ArtworkService } from '../../../../core/services/artwork.service';
import { SectionHeaderComponent } from '../../../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-gallery',
  imports: [SectionHeaderComponent],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  readonly artworkService = inject(ArtworkService);

  readonly lightboxOpen = signal(false);
  readonly lightboxSrc = signal('');
  readonly lightboxAlt = signal('');

  ngOnInit(): void {
    this.artworkService.loadArtworks().subscribe();
    this.artworkService.loadTypes().subscribe();
  }

  setFilter(type: string): void {
    this.artworkService.setSelectedType(type === 'all' ? null : type);
  }

  openLightbox(src: string, alt: string): void {
    this.lightboxSrc.set(src);
    this.lightboxAlt.set(alt || 'Full size preview');
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
