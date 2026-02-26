import {
  Component, AfterViewInit, OnDestroy, ElementRef, NgZone,
  inject, effect, ViewChild, signal
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

  @ViewChild('threeCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

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
      this.use3D.set(true);
      this.ngZone.runOutsideAngular(() => this.init3D());
    } else {
      this.initCSSFallback();
    }
  }

  ngOnDestroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.particleInterval) clearInterval(this.particleInterval);
    if (this.inkInterval) clearInterval(this.inkInterval);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
  }

  private async init3D(): Promise<void> {
    const THREE = await this.threeService.loadThree();
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.clock = new THREE.Clock();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 30;

    // Create particles
    this.createParticles(THREE);
    this.createInkDrops(THREE);

    // Events
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);

    // Animate
    this.animate();
  }

  private createParticles(THREE: typeof import('three')): void {
    const count = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colorIndices = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.02 + 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      sizes[i] = Math.random() * 3 + 1;
      colorIndices[i] = Math.floor(Math.random() * 3);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColorIndex', new THREE.BufferAttribute(colorIndices, 1));

    const isDark = this.themeService.isDark();
    const colors = this.getThemeColors(isDark);

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
          pos.x += sin(uTime * 0.3 + position.y * 0.5) * 0.8;
          pos.y += cos(uTime * 0.2 + position.x * 0.3) * 0.6;
          pos.z += sin(uTime * 0.15 + position.x * 0.2) * 0.4;

          // Mouse influence
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          float dist = length(uMouse - mvPos.xy / mvPos.w * 0.5);
          pos.x += uMouse.x * 0.5 / (dist * 5.0 + 1.0);
          pos.y += uMouse.y * 0.5 / (dist * 5.0 + 1.0);

          mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (20.0 / -mvPos.z);

          // Fade based on z distance
          vAlpha = smoothstep(0.0, 10.0, -mvPos.z) * 0.5;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        varying float vColorIndex;
        varying float vAlpha;

        void main() {
          // Soft circle
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.15, d) * vAlpha;

          // Pick color based on index
          vec3 color = vColorIndex < 0.5 ? uColor1 : (vColorIndex < 1.5 ? uColor2 : uColor3);
          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    this.particles = new THREE.Points(geometry, material);
    (this.particles as any).userData.velocities = velocities;
    this.scene.add(this.particles);
  }

  private createInkDrops(THREE: typeof import('three')): void {
    const count = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = Math.random() * 30 + 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10 - 5;
      sizes[i] = Math.random() * 6 + 3;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const isDark = this.themeService.isDark();
    const inkColor = isDark ? '#d8b4fe' : '#a855f7';

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

          // Slow fall
          float fallSpeed = 0.15;
          pos.y -= mod(uTime * fallSpeed + aPhase * 10.0, 50.0);
          pos.x += sin(uTime * 0.2 + aPhase) * 1.5;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPos;
          gl_PointSize = aSize * uPixelRatio * (25.0 / -mvPos.z);

          vAlpha = smoothstep(-25.0, -5.0, pos.y) * smoothstep(30.0, 20.0, pos.y) * 0.2;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
          // Elongated glow effect
          float elongation = smoothstep(0.5, 0.2, abs(gl_PointCoord.y - 0.4));
          alpha *= mix(0.8, 1.0, elongation);
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    this.inkDrops = new THREE.Points(geometry, material);
    this.scene.add(this.inkDrops);
  }

  private getThemeColors(isDark: boolean): [string, string, string] {
    if (isDark) {
      return ['#ec4899', '#c084fc', '#f9a8d4'];
    }
    return ['#db2777', '#a855f7', '#ec4899'];
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

    const elapsed = this.clock.getElapsedTime();

    // Update particles
    if (this.particles) {
      const mat = this.particles.material;
      mat.uniforms.uTime.value = elapsed;
      mat.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);

      // Slow rotation of entire particle system
      this.particles.rotation.y = elapsed * 0.02;
      this.particles.rotation.x = Math.sin(elapsed * 0.01) * 0.05;
    }

    // Update ink drops
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

  // ===== CSS Fallback (same as original implementation) =====
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
