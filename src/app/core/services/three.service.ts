import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThreeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly canUse3D = signal(false);
  readonly isMobile = signal(false);

  private _three: typeof import('three') | null = null;
  private _loadPromise: Promise<typeof import('three')> | null = null;
  private _detected = false;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.detectCapabilities();
    }
  }

  private detectCapabilities(): void {
    if (this._detected) return;
    this._detected = true;

    // Mobile detection
    const mobile = /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    this.isMobile.set(mobile);

    // Skip 3D on mobile
    if (mobile) {
      this.canUse3D.set(false);
      return;
    }

    // WebGL check
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        this.canUse3D.set(false);
        return;
      }

      // Check GPU info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Block known weak GPUs
        const weak = /SwiftShader|llvmpipe|Software|Mesa/i.test(renderer);
        if (weak) {
          this.canUse3D.set(false);
          return;
        }
      }

      // Check for reduced motion preference
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.canUse3D.set(false);
        return;
      }

      this.canUse3D.set(true);
    } catch {
      this.canUse3D.set(false);
    }
  }

  async loadThree(): Promise<typeof import('three')> {
    if (this._three) return this._three;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = import('three').then((m) => {
      this._three = m;
      return m;
    });

    return this._loadPromise;
  }

  get three(): typeof import('three') | null {
    return this._three;
  }
}
