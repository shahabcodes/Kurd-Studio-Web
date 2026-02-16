import { Component, signal, OnInit, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-preloader',
  templateUrl: './preloader.component.html',
  styleUrl: './preloader.component.scss'
})
export class PreloaderComponent implements AfterViewInit {
  readonly isHidden = signal(false);

  ngAfterViewInit(): void {
    // Hide preloader after content loads or after timeout
    const hidePreloader = () => {
      setTimeout(() => {
        this.isHidden.set(true);
        document.body.classList.remove('lock-scroll');
      }, 500);
    };

    if (document.readyState === 'complete') {
      hidePreloader();
    } else {
      window.addEventListener('load', hidePreloader);
    }

    // Fallback timeout
    setTimeout(hidePreloader, 3500);
  }
}
