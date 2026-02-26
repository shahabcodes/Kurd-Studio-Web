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

  private renderer: any;
  private scene: any;
  private camera: any;
  private particles: any;
  private inkDrops: any;
  private animationId: number | null = null;
  private mouse = { x: 0, y: 0 };
  private clock: any;
  private canvasEl: HTMLCanvasElement | null = null;

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
    if (this.canvasEl) this.canvasEl.remove();
    if (this.particleInterval) clearInterval(this.particleInterval);
    if (this.inkInterval) clearInterval(this.inkInterval);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
  }

  private async boot3D(): Promise<void> {
    try {
      const THREE = await this.threeService.loadThree();

      const host = this.el.nativeElement;
      const canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '-1',
        pointerEvents: 'none'
      });
      host.insertBefore(canvas, host.firstChild);
      this.canvasEl = canvas;

      this.clock = new THREE.Timer();

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power'
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);

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
      this.use3D.set(false);
      this.initCSSFallback();
    }
  }

  private createParticles(THREE: typeof import('three')): void {
    const count = 80;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorIndices = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 40;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;
      sizes[i] = Math.random() * 6 + 3;
      colorIndices[i] = Math.floor(Math.random() * 3);
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColorIndex', new THREE.BufferAttribute(colorIndices, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const isDark = this.themeService.isDark();
    const colors = this.getThemeColors(isDark);

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color(colors[0]) },
        uColor2: { value: new THREE.Color(colors[1]) },
        uColor3: { value: new THREE.Color(colors[2]) },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uAlpha: { value: isDark ? 0.45 : 0.3 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aColorIndex;
        attribute float aPhase;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uPixelRatio;
        varying float vColorIndex;
        varying float vAlpha;

        void main() {
          vColorIndex = aColorIndex;
          vec3 pos = position;

          // Organic floating — each particle has unique motion via phase
          float t = uTime * 0.25;
          pos.x += sin(t + aPhase) * 2.0 + cos(t * 0.7 + position.y * 0.1) * 1.0;
          pos.y += cos(t * 0.8 + aPhase * 2.0) * 1.5 + sin(t * 0.5 + position.x * 0.1) * 0.8;
          pos.z += sin(t * 0.3 + aPhase * 3.0) * 1.0;

          // Mouse repulsion — particles drift away from cursor
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          vec2 screenPos = (projectionMatrix * mvPos).xy / (projectionMatrix * mvPos).w;
          float dist = length(uMouse - screenPos);
          float push = smoothstep(0.6, 0.0, dist) * 3.0;
          pos.x += (screenPos.x - uMouse.x) * push;
          pos.y += (screenPos.y - uMouse.y) * push;

          mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (25.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 2.0, 40.0);

          // Depth fade
          float depthFade = smoothstep(50.0, 5.0, -mvPos.z);
          vAlpha = depthFade;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform float uAlpha;
        varying float vColorIndex;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          // Soft glow: bright center, faded edge
          float glow = exp(-d * d * 8.0);
          float alpha = glow * vAlpha * uAlpha;

          vec3 color = vColorIndex < 0.5 ? uColor1 : (vColorIndex < 1.5 ? uColor2 : uColor3);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createInkDrops(THREE: typeof import('three')): void {
    const count = 12;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = Math.random() * 40;
      positions[i3 + 2] = (Math.random() - 0.5) * 10 - 5;
      sizes[i] = Math.random() * 10 + 5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const isDark = this.themeService.isDark();

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(isDark ? '#d8b4fe' : '#a855f7') },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uAlpha: { value: isDark ? 0.3 : 0.2 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;

        void main() {
          vec3 pos = position;

          // Slow continuous fall with wrap-around
          float fallSpeed = 0.12;
          pos.y -= mod(uTime * fallSpeed + aPhase * 8.0, 50.0);
          // Gentle sway
          pos.x += sin(uTime * 0.15 + aPhase) * 2.0;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (28.0 / -mvPos.z);
          gl_PointSize = clamp(gl_PointSize, 3.0, 50.0);

          // Fade in/out at boundaries
          float yNorm = (pos.y + 25.0) / 50.0;
          vAlpha = smoothstep(0.0, 0.15, yNorm) * smoothstep(1.0, 0.85, yNorm);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uAlpha;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;

          // Teardrop glow — brighter top, faded bottom
          float glow = exp(-d * d * 6.0);
          float tear = smoothstep(0.6, 0.3, gl_PointCoord.y);
          float alpha = glow * mix(0.6, 1.0, tear) * vAlpha * uAlpha;

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
    pMat.uniforms.uAlpha.value = isDark ? 0.45 : 0.3;

    const inkColor = isDark ? '#d8b4fe' : '#a855f7';
    this.inkDrops.material.uniforms.uColor.value = new THREE.Color(inkColor);
    this.inkDrops.material.uniforms.uAlpha.value = isDark ? 0.3 : 0.2;
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.clock.update();
    const elapsed = this.clock.getElapsed();

    if (this.particles) {
      const mat = this.particles.material;
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      this.particles.rotation.y = elapsed * 0.015;
      this.particles.rotation.x = Math.sin(elapsed * 0.008) * 0.03;
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
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
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
