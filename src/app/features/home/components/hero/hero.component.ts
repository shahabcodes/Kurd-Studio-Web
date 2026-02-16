import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { SiteService } from '../../../../core/services/site.service';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnInit, OnDestroy {
  readonly siteService = inject(SiteService);

  readonly typewriterText = signal('');
  private phrases = [
    'Dreaming in watercolors & whispers',
    'Painting petals at golden hour...',
    'New poem blooming in my journal',
    'Soft words, gentle brushstrokes',
    'Creating beauty, one day at a time'
  ];
  private phraseIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private typeSpeed = 80;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    setTimeout(() => this.typeWriter(), 1500);
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private typeWriter(): void {
    const currentPhrase = this.phrases[this.phraseIndex];

    if (this.isDeleting) {
      this.typewriterText.set(currentPhrase.substring(0, this.charIndex - 1));
      this.charIndex--;
      this.typeSpeed = 40;
    } else {
      this.typewriterText.set(currentPhrase.substring(0, this.charIndex + 1));
      this.charIndex++;
      this.typeSpeed = 80 + Math.random() * 50;
    }

    if (!this.isDeleting && this.charIndex === currentPhrase.length) {
      this.isDeleting = true;
      this.typeSpeed = 2000;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
      this.typeSpeed = 500;
    }

    this.timeoutId = setTimeout(() => this.typeWriter(), this.typeSpeed);
  }
}
