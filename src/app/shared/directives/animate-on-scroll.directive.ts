import { Directive, ElementRef, inject, AfterViewInit, OnDestroy, input } from '@angular/core';

@Directive({
  selector: '[appAnimateOnScroll]',
  standalone: true
})
export class AnimateOnScrollDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private observer: IntersectionObserver | null = null;

  delay = input<number>(0);
  threshold = input<number>(0.1);

  ngAfterViewInit(): void {
    this.el.nativeElement.classList.add('reveal');

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              this.el.nativeElement.classList.add('visible');
            }, this.delay());
            this.observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: this.threshold() }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
