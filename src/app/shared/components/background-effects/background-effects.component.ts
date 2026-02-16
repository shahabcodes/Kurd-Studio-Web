import { Component, OnInit, AfterViewInit, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'app-background-effects',
  templateUrl: './background-effects.component.html',
  styleUrl: './background-effects.component.scss'
})
export class BackgroundEffectsComponent implements AfterViewInit {
  private readonly el = inject(ElementRef);

  ngAfterViewInit(): void {
    this.initParticles();
    this.initInkDrops();
  }

  private initParticles(): void {
    const container = this.el.nativeElement.querySelector('#particles');
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 12 + 10) + 's';
      particle.style.animationDelay = Math.random() * 3 + 's';
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 25000);
    };

    for (let i = 0; i < 15; i++) {
      setTimeout(createParticle, i * 400);
    }
    setInterval(createParticle, 2500);
  }

  private initInkDrops(): void {
    const container = this.el.nativeElement.querySelector('#inkDrops');
    if (!container) return;

    const createInkDrop = () => {
      const drop = document.createElement('div');
      drop.className = 'ink-drop';
      const size = Math.random() * 8 + 4;
      drop.style.width = size + 'px';
      drop.style.height = size * 1.4 + 'px';
      drop.style.left = Math.random() * 100 + '%';
      drop.style.animationDuration = (Math.random() * 15 + 20) + 's';
      drop.style.animationDelay = Math.random() * 5 + 's';
      container.appendChild(drop);
      setTimeout(() => drop.remove(), 35000);
    };

    for (let i = 0; i < 8; i++) {
      setTimeout(createInkDrop, i * 800);
    }
    setInterval(createInkDrop, 4000);
  }
}
