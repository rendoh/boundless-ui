import GUI from 'lil-gui';
import * as THREE from 'three';
import { clamp, lerp } from 'three/src/math/MathUtils';

import backdropFragmentShader from './backdropFragment.glsl';
import backdropVertexShader from './backdropVertex.glsl';
import { camera } from './core/camera';
import { clock } from './core/clock';
import { renderer } from './core/renderer';
import { sizes } from './core/sizes';
import fragmentShader from './fragment.glsl';
import { icons } from './icons';
import vertexShader from './vertex.glsl';

const gui = new GUI();
const config = {
  curvature: 0.5,
  lazy: 0.6,
};
gui.add(config, 'curvature', 0, 1, 0.01);
gui.add(config, 'lazy', 0, 1, 0.01);

const resolution = new THREE.Vector2(
  sizes.width * sizes.pixelRatio,
  sizes.height * sizes.pixelRatio,
);

sizes.addEventListener('resize', () => {
  resolution.x = sizes.width * sizes.pixelRatio;
  resolution.y = sizes.height * sizes.pixelRatio;
});

function* range(start: number, end: number, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

function beta(p: number, delta: number) {
  return 1 - Math.pow(1 - p, 60 * (delta / 1000));
}

function wrap(min: number, max: number, value: number) {
  const range = max - min;
  return ((range + ((value - min) % range)) % range) + min;
}

const textureLoader = new THREE.TextureLoader();
const width = 200;
const height = 200;
const geometry = new THREE.PlaneGeometry(width, height, 4, 4);

class Button {
  public mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  public readonly texture: THREE.Texture;
  private isHovered = false;
  public x = 0;
  public y = 0;

  constructor(image: string) {
    this.texture = textureLoader.load(image);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: clock.elapsed / 1000 },
        uResolution: { value: resolution },
        uPixelRatio: { value: sizes.pixelRatio },
        uTexture: { value: this.texture },
        uHovered: { value: 0 },
        uCurvature: { value: config.curvature },
      },
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  public setHovered(isHovered: boolean) {
    this.isHovered = isHovered;
  }

  public update() {
    this.mesh.material.uniforms.uTime.value = clock.elapsed / 1000;
    this.mesh.material.uniforms.uResolution.value = resolution;
    this.mesh.material.uniforms.uPixelRatio.value = sizes.pixelRatio;
    this.mesh.material.uniforms.uCurvature.value = config.curvature;
    this.mesh.material.uniforms.uHovered.value = lerp(
      this.mesh.material.uniforms.uHovered.value,
      this.isHovered ? 1 : 0,
      beta(0.1, clock.delta),
    );
    this.mesh.position.x = wrap(-halfWidth, halfWidth, this.x);
    this.mesh.position.y = wrap(halfHeight, -halfHeight, this.y);

    // this.mesh.position.z = lerp(
    //   this.mesh.position.z,
    //   this.isHovered ? 50 : 0,
    //   beta(0.1, clock.delta),
    // );
  }
}

class Backdrop {
  public mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor() {
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: backdropVertexShader,
      fragmentShader: backdropFragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: clock.elapsed / 1000 },
        uResolution: { value: resolution },
        uTexture: { value: null },
        uOpacity: { value: 0 },
      },
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }

  public setTexture(texture: THREE.Texture) {
    this.mesh.material.uniforms.uTexture.value = texture;
  }

  public clearTexture() {
    this.mesh.material.uniforms.uTexture.value = null;
  }

  public update() {
    this.mesh.material.uniforms.uTime.value = clock.elapsed / 1000;
    this.mesh.material.uniforms.uResolution.value = resolution;
    this.mesh.material.uniforms.uOpacity.value = lerp(
      this.mesh.material.uniforms.uOpacity.value,
      this.mesh.material.uniforms.uTexture.value ? 1 : 0,
      beta(
        this.mesh.material.uniforms.uTexture.value ? 0.08 : 0.7,
        clock.delta,
      ),
    );
  }
}

const col = 5;
const row = 5;
const gutter = 150;
const area = width + gutter;
const origin2 = new THREE.Vector2(0, 0);
const origin3 = new THREE.Vector3(0, 0, 0);
const totalWidth = area * col;
const totalHeight = area * row;
const halfWidth = totalWidth / 2;
const halfHeight = totalHeight / 2;

export class Sketch {
  public scene = new THREE.Scene();
  private x = 0;
  private y = 0;
  private isDragging = false;
  private velocity = new THREE.Vector2(0, 0);
  private buttons: Button[];
  // >[];
  private backdrop = new Backdrop();
  private mouse = new THREE.Vector2(-2, -2);
  private raycaster = new THREE.Raycaster();

  constructor() {
    this.buttons = [...range(0, col * row)].map((i) => {
      const button = new Button(icons[i]);
      this.scene.add(button.mesh);
      return button;
    });
    this.scene.add(this.backdrop.mesh);

    this.initDnD();
    this.resize();

    renderer.renderer.domElement.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / sizes.width) * 2 - 1;
      this.mouse.y = -(e.clientY / sizes.height) * 2 + 1;
    });
  }

  private initDnD() {
    let startX = 0;
    let startY = 0;
    const tmpV = new THREE.Vector2(0, 0);
    const handleStart = (e: MouseEvent | TouchEvent) => {
      this.isDragging = true;
      startX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      startY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      tmpV.copy(origin2);
      document.body.style.cursor = 'grabbing';
    };
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      this.x += deltaX;
      this.y -= deltaY;
      startX = clientX;
      startY = clientY;
      tmpV.set(deltaX, deltaY);
    };
    const handleEnd = () => {
      this.isDragging = false;
      this.velocity.copy(tmpV);
      document.body.style.removeProperty('cursor');
    };
    renderer.renderer.domElement.addEventListener('mousedown', handleStart);
    renderer.renderer.domElement.addEventListener('touchstart', handleStart);
    renderer.renderer.domElement.addEventListener('mousemove', handleMove);
    renderer.renderer.domElement.addEventListener('touchmove', handleMove, {
      passive: false,
    });
    renderer.renderer.domElement.addEventListener('mouseup', handleEnd);
    renderer.renderer.domElement.addEventListener('touchend', handleEnd);

    renderer.renderer.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.x -= e.deltaX;
        this.y += e.deltaY;
      },
      {
        passive: false,
      },
    );
  }

  public resize() {
    const scale = Math.max(sizes.width, sizes.height) / 1280;
    this.scene.scale.setScalar(scale);
  }

  public update() {
    const scale = Math.max(sizes.width, sizes.height) / 1280;
    const lazyBase = 850 + (1 - config.lazy) * 1000;
    this.buttons.forEach((button, i) => {
      const x = i % col;
      const y = ~~(i / col);
      const distance = button.mesh.position.distanceTo(origin3);
      const p = beta(
        clamp(Math.pow(1 - distance / lazyBase, 2), 0.07, 1),
        clock.delta,
      );
      button.x = lerp(
        button.x,
        area * x - area * (col - 1) * 0.5 + this.x / scale,
        p,
      );
      button.y = lerp(
        button.y,
        area * y - area * (row - 1) * 0.5 + this.y / scale,
        p,
      );
      button.update();
      button.setHovered(false);
    });

    if (!this.isDragging) {
      this.x += this.velocity.x;
      this.y -= this.velocity.y;
    }
    this.velocity.lerp(origin2, beta(0.05, clock.delta));

    this.raycaster.setFromCamera(this.mouse, camera.camera);

    const intersects = this.raycaster.intersectObjects(
      this.buttons.map(({ mesh }) => mesh),
    );

    this.backdrop.clearTexture();
    for (const intersect of intersects) {
      const button = this.findButtonByMesh(intersect.object);
      if (!button) break;
      this.backdrop.setTexture(button.texture);
      button.setHovered(true);
    }
    this.backdrop.update();
  }
  private findButtonByMesh(mesh: THREE.Object3D) {
    return this.buttons.find(({ mesh: m }) => m === mesh);
  }
}
