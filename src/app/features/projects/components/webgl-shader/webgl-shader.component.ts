import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-webgl-shader',
  template: `<canvas #glCanvas class="webgl-canvas"></canvas>`,
  styles: [`
:host {
  position: fixed; // ثابت في الخلفية
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1; // أقل حاجة عشان يفضل ورا
  pointer-events: none; // عشان ميعطلش الكليكات على الزراير
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
  `]
})
export class WebglShaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('glCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private mesh!: THREE.Mesh;
  private animFrameId!: number;
  private clock = new THREE.Clock();

  // Custom vertex shader – full-screen quad
  private readonly vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  // Fragment shader: deep space nebula with purple/orange animated glow
  private readonly fragmentShader = `
    uniform float uTime;
    uniform vec2  uResolution;
    varying vec2 vUv;

    // Smooth noise helpers
    vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
    vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m; m = m*m;
      vec3 x = 2.0*fract(p*C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
      vec3 g;
      g.x  = a0.x *x0.x  + h.x *x0.y;
      g.yz = a0.yz*x12.xz + h.yz*x12.yw;
      return 130.0*dot(m,g);
    }

    void main() {
      vec2 uv = vUv;
      float t  = uTime * 0.12;

      // layered nebula noise
      float n1 = snoise(uv * 2.5 + vec2(t,  t * 0.4));
      float n2 = snoise(uv * 4.0 + vec2(-t * 0.7, t * 0.9));
      float n3 = snoise(uv * 1.2 + vec2(t * 0.3, -t * 0.6));
      float nebula = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2) * 0.5 + 0.5;

      // deep space base
      vec3 deepSpace = vec3(0.02, 0.02, 0.05);

      // purple cloud
      vec3 purple = vec3(0.42, 0.10, 0.65);
      // orange accent
      vec3 orange  = vec3(0.70, 0.28, 0.05);

      // blend using nebula density
      vec3 color = mix(deepSpace, purple, smoothstep(0.35, 0.8, nebula) * 0.6);
      color      = mix(color,     orange, smoothstep(0.65, 0.9, nebula) * 0.35);

      // subtle radial vignette
      float dist = distance(uv, vec2(0.5, 0.5));
      color *= 1.0 - smoothstep(0.35, 0.85, dist) * 0.7;

      // tiny bright star field
      float stars = pow(max(0.0, snoise(uv * 120.0 + vec2(42.0))), 18.0) * 1.8;
      color += vec3(stars);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  constructor(private zone: NgZone) { }

  ngOnInit() { }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initThree());
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      }
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    (this.mesh.material as THREE.ShaderMaterial).uniforms['uTime'].value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms['uResolution'].value.set(w, h);
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
