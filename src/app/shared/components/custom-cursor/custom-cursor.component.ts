import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, inject, signal } from '@angular/core';

@Component({
  selector: 'app-custom-cursor',
  templateUrl: './custom-cursor.component.html',
  styleUrl: './custom-cursor.component.scss'
})
export class CustomCursorComponent implements AfterViewInit, OnDestroy {
  private mouseX = 0;
  private mouseY = 0;
  private ringX = 0;
  private ringY = 0;
  private animationId: number | null = null;
  private isDesktop = false;

  ngAfterViewInit(): void {
    this.isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!this.isDesktop) return;

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseleave', this.onMouseLeave);
    document.addEventListener('mouseenter', this.onMouseEnter);

    this.setupHoverListeners();
    this.animateRing();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseleave', this.onMouseLeave);
    document.removeEventListener('mouseenter', this.onMouseEnter);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const cursor = document.getElementById('cursor');
    if (cursor) {
      cursor.style.transform = `translate(${this.mouseX}px, ${this.mouseY}px)`;
      cursor.style.opacity = '1';
    }
    const ring = document.getElementById('cursorRing');
    if (ring) {
      ring.style.opacity = '0.4';
    }
  };

  private onMouseLeave = () => {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    if (cursor) cursor.style.opacity = '0';
    if (ring) ring.style.opacity = '0';
  };

  private onMouseEnter = () => {
    const cursor = document.getElementById('cursor');
    const ring = document.getElementById('cursorRing');
    if (cursor) cursor.style.opacity = '1';
    if (ring) ring.style.opacity = '0.4';
  };

  private setupHoverListeners(): void {
    document.querySelectorAll('a, button, .card, .tab, input, textarea, select').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const ring = document.getElementById('cursorRing');
        if (ring) ring.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => {
        const ring = document.getElementById('cursorRing');
        if (ring) ring.classList.remove('hover');
      });
    });
  }

  private animateRing = () => {
    this.ringX += (this.mouseX - this.ringX) * 0.12;
    this.ringY += (this.mouseY - this.ringY) * 0.12;
    const ring = document.getElementById('cursorRing');
    if (ring) {
      ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px) translate(-50%, -50%)`;
    }
    this.animationId = requestAnimationFrame(this.animateRing);
  };
}
