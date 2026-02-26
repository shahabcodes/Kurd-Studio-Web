import {
  Component, AfterViewInit, OnDestroy, ElementRef, NgZone,
  inject, effect, signal
} from '@angular/core';
import { ThreeService } from '../../../core/services/three.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-background-effects',
  templateUrl: './background-effects.component.html',
  styleUrl: './background-effects.component.scss'
})
export class BackgroundEffectsComponent implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly threeService = inject(ThreeService);
  private readonly themeService = inject(ThemeService);

  readonly use3D = signal(false);

  // Three.js internals
  private renderer: any;
  private scene: any;
  private camera: any;
  private particles: any;
  private inkDrops: any;
  private animationId: number | null = null;
  private mouse = { x: 0, y: 0 };
  private clock: any;

  // CSS fallback intervals
  private particleInterval: ReturnType<typeof setInterval> | null = null;
  private inkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const theme = this.themeService.theme();
      if (this.use3D() && this.scene) {
        this.updateThreeColors(theme);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.threeService.canUse3D()) {
      this.ngZone.runOutsideAngular(() => this.boot3D());
    } else {
      this.initCSSFallback();
    }
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    if (this.renderer) this.renderer.dispose();
    if (this.particleInterval) clearInterval(this.particleInterval);
    if (this.inkInterval) clearInterval(this.inkInterval);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
  }

  // Boot Three.js: create canvas manually (no @ViewChild timing issue)
  private async boot3D(): Promise<void> {
    try {
      const THREE = await this.threeService.loadThree();

      // Create canvas directly in the DOM — avoids Angular @if timing issue
      const host = this.el.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.className = 'three-canvas';
      host.insertBefore(canvas, host.firstChild);

      this.clock = new THREE.Timer();

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
      this.camera.position.z = 30;

      this.createParticles(THREE);
      this.createInkDrops(THREE);

      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('resize', this.onResize);

      this.use3D.set(true);
      this.animate();
    } catch {
      // Three.js failed — fall back to CSS
      this.use3D.set(false);
      this.initCSSFallback();
    }
  }

  private createParticles(THREE: typeof import('three')): void {
    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorIndices = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 15;
      sizes[i] = Math.random() * 4 + 2;
      colorIndices[i] = Math.floor(Math.random() * 3);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColorIndex', new THREE.BufferAttribute(colorIndices, 1));

    const colors = this.getThemeColors(this.themeService.isDark());

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color(colors[0]) },
        uColor2: { value: new THREE.Color(colors[1]) },
        uColor3: { value: new THREE.Color(colors[2]) },
        uPixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aColorIndex;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uPixelRatio;
        varying float vColorIndex;
        varying float vAlpha;

        void main() {
          vColorIndex = aColorIndex;
          vec3 pos = position;

          // Gentle floating motion
          pos.x += sin(uTime * 0.3 + position.y * 0.5) * 1.2;
          pos.y += cos(uTime * 0.2 + position.x * 0.3) * 0.8;
          pos.z += sin(uTime * 0.15 + position.x * 0.2) * 0.5;

          // Mouse influence — subtle push
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vec2 screenPos = mvPos.xy / mvPos.w * 0.5;
          float dist = length(uMouse - screenPos);
          float influence = 1.0 / (dist * 4.0 + 1.0);
          pos.x += uMouse.x * influence * 0.8;
          pos.y += uMouse.y * influence * 0.8;

          mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (22.0 / -mvPos.z);

          vAlpha = smoothstep(0.0, 8.0, -mvPos.z) * 0.7;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying float vColorIndex;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;

          vec3 color = vColorIndex < 0.5 ? uColor1 : (vColorIndex < 1.5 ? uColor2 : uColor3);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createInkDrops(THREE: typeof import('three')): void {
    const count = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = Math.random() * 30 + 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10 - 5;
      sizes[i] = Math.random() * 8 + 4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const inkColor = this.themeService.isDark() ? '#d8b4fe' : '#a855f7';

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(inkColor) },
        uPixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          float fallSpeed = 0.15;
          pos.y -= mod(uTime * fallSpeed + aPhase * 10.0, 50.0);
          pos.x += sin(uTime * 0.2 + aPhase) * 1.5;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (25.0 / -mvPos.z);

          vAlpha = smoothstep(-25.0, -5.0, pos.y) * smoothstep(30.0, 20.0, pos.y) * 0.25;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    this.inkDrops = new THREE.Points(geometry, material);
    this.scene.add(this.inkDrops);
  }

  private getThemeColors(isDark: boolean): [string, string, string] {
    return isDark
      ? ['#ec4899', '#c084fc', '#f9a8d4']
      : ['#db2777', '#a855f7', '#ec4899'];
  }

  private updateThreeColors(theme: 'dark' | 'light'): void {
    if (!this.threeService.three || !this.particles) return;
    const THREE = this.threeService.three;
    const isDark = theme === 'dark';
    const colors = this.getThemeColors(isDark);

    const pMat = this.particles.material;
    pMat.uniforms.uColor1.value = new THREE.Color(colors[0]);
    pMat.uniforms.uColor2.value = new THREE.Color(colors[1]);
    pMat.uniforms.uColor3.value = new THREE.Color(colors[2]);

    const inkColor = isDark ? '#d8b4fe' : '#a855f7';
    this.inkDrops.material.uniforms.uColor.value = new THREE.Color(inkColor);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.clock.update();
    const elapsed = this.clock.getElapsed();

    if (this.particles) {
      const mat = this.particles.material;
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      this.particles.rotation.y = elapsed * 0.02;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05;
    }

    if (this.inkDrops) {
      this.inkDrops.material.uniforms.uTime.value = elapsed;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onResize = (): void => {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ===== CSS Fallback =====
  private initCSSFallback(): void {
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
    this.particleInterval = setInterval(createParticle, 2500);
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
    this.inkInterval = setInterval(createInkDrop, 4000);
  }
}
