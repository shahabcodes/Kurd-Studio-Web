import { Component, inject, signal, OnInit, OnDestroy, ElementRef, NgZone } from '@angular/core';
import { SiteService } from '../../../../core/services/site.service';
import { ThreeService } from '../../../../core/services/three.service';

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnInit, OnDestroy {
  readonly siteService = inject(SiteService);
  private readonly el = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly threeService = inject(ThreeService);

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

  // 3D tilt
  private frameEl: HTMLElement | null = null;
  private tiltRAF: number | null = null;
  private currentRotateX = 0;
  private currentRotateY = 0;
  private targetRotateX = 0;
  private targetRotateY = 0;

  ngOnInit(): void {
    setTimeout(() => this.typeWriter(), 1500);
    if (this.threeService.canUse3D()) {
      this.ngZone.runOutsideAngular(() => this.initTilt());
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.tiltRAF !== null) cancelAnimationFrame(this.tiltRAF);
    this.frameEl?.removeEventListener('mousemove', this.onFrameMouseMove);
    this.frameEl?.removeEventListener('mouseleave', this.onFrameMouseLeave);
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

  // ===== 3D Tilt =====
  private initTilt(): void {
    // Wait for DOM
    setTimeout(() => {
      this.frameEl = this.el.nativeElement.querySelector('.frame');
      if (!this.frameEl) return;

      this.frameEl.style.transition = 'none';
      this.frameEl.addEventListener('mousemove', this.onFrameMouseMove);
      this.frameEl.addEventListener('mouseleave', this.onFrameMouseLeave);
      this.animateTilt();
    }, 100);
  }

  private onFrameMouseMove = (e: MouseEvent): void => {
    const el = this.frameEl!;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Map 0-1 to tilt range (-8 to 8 degrees)
    this.targetRotateY = (x - 0.5) * 16;
    this.targetRotateX = -(y - 0.5) * 12;
  };

  private onFrameMouseLeave = (): void => {
    this.targetRotateX = 0;
    this.targetRotateY = 0;
    // Reset shadow when mouse leaves (will animate to 0 via the tilt loop)
  };

  private animateTilt = (): void => {
    this.tiltRAF = requestAnimationFrame(this.animateTilt);

    // Smooth easing
    this.currentRotateX += (this.targetRotateX - this.currentRotateX) * 0.08;
    this.currentRotateY += (this.targetRotateY - this.currentRotateY) * 0.08;

    if (this.frameEl) {
      this.frameEl.style.transform =
        `perspective(800px) rotateX(${this.currentRotateX}deg) rotateY(${this.currentRotateY}deg)`;

      // Dynamic shadow that shifts with tilt — creates a "light source follows cursor" effect
      const tiltMag = Math.sqrt(this.currentRotateX ** 2 + this.currentRotateY ** 2);
      const shadowX = -this.currentRotateY * 1.5;
      const shadowY = this.currentRotateX * 1.5;
      const glowIntensity = Math.min(tiltMag / 8, 1);
      this.frameEl.style.boxShadow =
        `${shadowX}px ${shadowY}px ${12 + tiltMag * 2}px rgba(0,0,0,0.2), ` +
        `0 0 ${20 + tiltMag * 4}px rgba(192, 132, 252, ${0.1 + glowIntensity * 0.25})`;
    }
  };
}
