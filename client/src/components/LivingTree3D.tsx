'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

interface LivingTree3DProps {
  score: number;
}

interface LeafDatum {
  pos: THREE.Vector3;
  order: number;
  scaleTarget: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  hueShift: number;
}

export default function LivingTree3D({ score }: LivingTree3DProps) {
  const mountRef = useRef<HTMLCanvasElement>(null);

  // Live refs the score-effect needs to mutate
  const leavesMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const leafDataRef = useRef<LeafDatum[]>([]);
  const leafMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const puffsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const puffDataRef = useRef<LeafDatum[]>([]);
  const puffMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const keyLightRef = useRef<THREE.PointLight | null>(null);
  const rimLightRef = useRef<THREE.PointLight | null>(null);
  const groundMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const firefliesRef = useRef<THREE.Points | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const scoreRef = useRef<number>(score);

  // Palette
  const brown = new THREE.Color(0x8a3a22);
  const amber = new THREE.Color(0xc9a13b);
  const green = new THREE.Color(0x3fb950);
  const red = new THREE.Color(0xd5453b);

  // Growth state
  const leafTarget = useRef<number>(1);
  const maxOrder = useRef<number>(0);
  const growthT = useRef<number>(0);
  // frames during which leaf matrices keep updating after a score change (then frozen for perf)
  const leafSettle = useRef<number>(0);

  useEffect(() => {
    const canvas = mountRef.current;
    if (!canvas) return;

    const width = canvas.parentElement?.clientWidth || 300;
    const height = canvas.parentElement?.clientHeight || 300;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x070b0a, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // ---- Scene ----
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b0a, 0.018);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200);
    camera.position.set(0, 4.9, 17.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.target.set(0, 3.5, 0);
    controls.minPolarAngle = 0.6;
    controls.maxPolarAngle = Math.PI / 2.05;

    // ---- Lights ----
    const hemi = new THREE.HemisphereLight(0xbfe6cf, 0x10201a, 0.55);
    scene.add(hemi);

    const keyLight = new THREE.PointLight(0x3fb950, 1.1, 80, 1.6);
    keyLight.position.set(5, 10, 6);
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.PointLight(0x59f08a, 0.7, 60, 1.8);
    rimLight.position.set(-6, 6, -5);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.25);
    fillLight.position.set(-3, 4, 8);
    scene.add(fillLight);

    // ---- Glowing ground disc (radial-gradient sprite) ----
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = groundCanvas.height = 128;
    const gctx = groundCanvas.getContext('2d')!;
    const grad = gctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(63,185,80,0.55)');
    grad.addColorStop(0.4, 'rgba(63,185,80,0.18)');
    grad.addColorStop(1, 'rgba(63,185,80,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    const groundMat = new THREE.MeshBasicMaterial({
      map: groundTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02;
    scene.add(ground);
    groundMatRef.current = groundMat;

    // ---- Ambient star field ----
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 90;
    const starsPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starsPos[i] = (Math.random() - 0.5) * 44;
      starsPos[i + 1] = Math.random() * 22;
      starsPos[i + 2] = (Math.random() - 0.5) * 44;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0x4a5a54, size: 0.07, transparent: true, opacity: 0.4 });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // ---- Fireflies ----
    const fireflyGeo = new THREE.BufferGeometry();
    const fireflyCount = 22;
    const fireflyPos = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount * 3; i += 3) {
      fireflyPos[i] = (Math.random() - 0.5) * 7;
      fireflyPos[i + 1] = Math.random() * 7 + 0.8;
      fireflyPos[i + 2] = (Math.random() - 0.5) * 7;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0x9bffb8,
      size: 0.16,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(fireflies);
    firefliesRef.current = fireflies;

    // ---- Procedural skeleton ----
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9, metalness: 0.05 });
    const branches: THREE.Mesh[] = [];
    const leafData: LeafDatum[] = [];
    maxOrder.current = 0;
    growthT.current = 0;

    const tmpDir = new THREE.Vector3();

    function addBranch(start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, order: number): THREE.Vector3 {
      const end = start.clone().add(dir.clone().multiplyScalar(len));
      const geo = new THREE.CylinderGeometry(rad * 0.62, rad, len, 7);
      geo.translate(0, len / 2, 0);
      const m = new THREE.Mesh(geo, branchMat);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      m.position.copy(start);
      m.scale.y = 0.001;
      m.userData = { order };
      scene.add(m);
      branches.push(m);
      maxOrder.current = Math.max(maxOrder.current, order);
      return end;
    }

    function scatterLeaves(center: THREE.Vector3, order: number, count: number, spread: number) {
      for (let k = 0; k < count; k++) {
        leafData.push({
          pos: center.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread * 0.8,
            (Math.random() - 0.5) * spread
          )),
          order: order + 1,
          scaleTarget: 0.55 + Math.random() * 0.85,
          rotX: Math.random() * Math.PI,
          rotY: Math.random() * Math.PI,
          rotZ: Math.random() * Math.PI,
          hueShift: (Math.random() - 0.5) * 0.18
        });
      }
    }

    function grow(start: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, order: number, depth: number) {
      const end = addBranch(start, dir, len, rad, order);

      // Foliage on the outer canopy — dense enough to read as full, capped for perf
      if (order >= 3) {
        scatterLeaves(end, order, depth <= 1 ? 7 : 3, 0.7 + depth * 0.14);
      }
      if (depth <= 0) {
        scatterLeaves(end, order, 5, 0.55);
        return;
      }

      tmpDir.copy(dir);
      const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const side = new THREE.Vector3().crossVectors(dir, up).normalize();
      const branchCount = depth >= 4 ? 2 : (Math.random() < 0.3 ? 3 : 2);

      for (let i = 0; i < branchCount; i++) {
        const nd = dir.clone();
        const angle = (0.32 + Math.random() * 0.3) * (i % 2 === 0 ? 1 : -1);
        nd.applyAxisAngle(side, angle);
        nd.applyAxisAngle(
          new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
          (Math.random() - 0.5) * 0.5
        );
        nd.y += 0.2;
        nd.normalize();
        grow(end, nd, len * 0.8, rad * 0.76, order + 1, depth - 1);
      }
    }

    grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 2.6, 0.6, 0, 6);

    // ---- Instanced foliage ----
    const leafGeo = new THREE.IcosahedronGeometry(0.2, 0);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.0,
      emissive: green.clone(),
      emissiveIntensity: 0.0,
      flatShading: true
    });
    leafMatRef.current = leafMat;
    const leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafData.length);
    leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    leaves.frustumCulled = false;
    scene.add(leaves);
    leavesMeshRef.current = leaves;
    leafDataRef.current = leafData;

    // initialize all instances at zero scale
    const dummy = new THREE.Object3D();
    for (let i = 0; i < leafData.length; i++) {
      dummy.position.copy(leafData[i].pos);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;

    // ---- Canopy: many small overlapping puffs packed into a compact rounded
    // crown so they merge into one smooth, full foliage mass (not big boulders).
    const puffData: LeafDatum[] = [];
    const crownCenter = new THREE.Vector3(0, 4.5, 0);
    const crownRx = 2.0; // horizontal radius
    const crownRy = 1.5; // vertical radius (slightly flattened dome)
    if (leafData.length) {
      crownCenter.set(0, 0, 0);
      for (const l of leafData) crownCenter.add(l.pos);
      crownCenter.multiplyScalar(1 / leafData.length);

      const puffCount = 150;
      for (let i = 0; i < puffCount; i++) {
        // random point inside the crown ellipsoid, biased toward the surface for fullness
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const rr = Math.pow(Math.random(), 0.4);
        const off = new THREE.Vector3(
          rr * crownRx * Math.sin(phi) * Math.cos(theta),
          rr * crownRy * Math.cos(phi),
          rr * crownRx * Math.sin(phi) * Math.sin(theta)
        );
        puffData.push({
          pos: crownCenter.clone().add(off),
          order: 3,
          scaleTarget: 0.42 + Math.random() * 0.36,
          rotX: Math.random() * 6.28,
          rotY: Math.random() * 6.28,
          rotZ: Math.random() * 6.28,
          hueShift: (Math.random() - 0.5) * 0.22
        });
      }
    }
    const puffGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const puffMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.0,
      emissive: green.clone(),
      emissiveIntensity: 0.0,
      flatShading: true
    });
    puffMatRef.current = puffMat;
    const puffs = new THREE.InstancedMesh(puffGeo, puffMat, puffData.length);
    puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    puffs.frustumCulled = false;
    scene.add(puffs);
    puffsMeshRef.current = puffs;
    puffDataRef.current = puffData;
    for (let i = 0; i < puffData.length; i++) {
      dummy.position.copy(puffData[i].pos);
      dummy.scale.setScalar(0.001);
      dummy.updateMatrix();
      puffs.setMatrixAt(i, dummy.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;

    // ---- Frame the whole tree (base -> crown top) so it never clips while rotating ----
    {
      const topY = crownCenter.y + crownRy;
      const centerY = topY * 0.5;
      controls.target.set(0, centerY, 0);
      // bounding radius: half-height vs crown width, whichever is larger, + margin
      const fitR = Math.max(crownRx + 0.4, topY * 0.5 + 0.6);
      const vFov = (camera.fov * Math.PI) / 180;
      // distance that fits the bounding sphere at ANY orbit angle
      const dist = fitR / Math.sin(vFov / 2) + 1.0;
      // 3/4 hero angle (polar from +Y) — trees read best from the side, not overhead
      const polar = THREE.MathUtils.degToRad(74);
      camera.position.set(0, centerY + dist * Math.cos(polar), dist * Math.sin(polar));
      camera.updateProjectionMatrix();
      controls.update();
    }

    // ---- Postprocessing (bloom = the glow) ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.6, 0.35);
    composer.addPass(bloom);
    bloomRef.current = bloom;

    // ---- Apply initial score ----
    applyScore(scoreRef.current);

    // ---- Animate ----
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const clock = new THREE.Clock();
    let elapsed = 0;

    const tick = () => {
      const dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;
      const time = elapsed;
      // time-based growth (~1.6s) so it always settles and freezes, even on slow frames
      growthT.current = Math.min(1, growthT.current + dt / 1.6);
      const front = growthT.current * (maxOrder.current + 3);

      // branches grow
      branches.forEach(b => {
        const t = Math.max(0, Math.min(1, front - b.userData.order));
        b.scale.y += (ease(t) - b.scale.y) * 0.15;
        if (b.userData.order > 1) b.rotation.z += Math.sin(time + b.userData.order) * 0.0002;
      });

      // Leaves: only recompute matrices while growing or for a short settle window
      // after a score change, then freeze them (huge perf win for a dense canopy).
      const stillGrowing = growthT.current < 1;
      if (stillGrowing || leafSettle.current > 0) {
        const data = leafDataRef.current;
        const sizeFactor = leafTarget.current;
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          const r = Math.max(0, Math.min(1, front - d.order));
          const s = ease(r) * d.scaleTarget * sizeFactor;
          dummy.position.copy(d.pos);
          dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
          dummy.scale.setScalar(Math.max(0.0001, s));
          dummy.updateMatrix();
          leaves.setMatrixAt(i, dummy.matrix);
        }
        leaves.instanceMatrix.needsUpdate = true;

        // canopy puffs stay full at all scores (size not score-driven), grow in with the crown
        const pdata = puffDataRef.current;
        const pmesh = puffsMeshRef.current;
        if (pmesh && pdata.length) {
          for (let i = 0; i < pdata.length; i++) {
            const d = pdata[i];
            const r = Math.max(0, Math.min(1, front - d.order));
            dummy.position.copy(d.pos);
            dummy.rotation.set(d.rotX, d.rotY, d.rotZ);
            dummy.scale.setScalar(Math.max(0.0001, ease(r) * d.scaleTarget));
            dummy.updateMatrix();
            pmesh.setMatrixAt(i, dummy.matrix);
          }
          pmesh.instanceMatrix.needsUpdate = true;
        }

        if (!stillGrowing && leafSettle.current > 0) leafSettle.current--;
      }

      // fireflies float
      if (fireflyMat.opacity > 0.01) {
        const p = fireflyGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < fireflyCount * 3; i += 3) {
          p[i + 1] += Math.sin(time * 1.3 + i) * 0.0025;
          if (p[i + 1] > 7.8) p[i + 1] = 0.8;
        }
        fireflyGeo.attributes.position.needsUpdate = true;
      }

      controls.update();
      composer.render();
      animationFrameId.current = requestAnimationFrame(tick);
    };
    tick();

    const handleResize = () => {
      const w = canvas.parentElement?.clientWidth || width;
      const h = canvas.parentElement?.clientHeight || height;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      branches.forEach(b => b.geometry.dispose());
      branchMat.dispose();
      leafGeo.dispose();
      leafMat.dispose();
      leaves.dispose();
      puffGeo.dispose();
      puffMat.dispose();
      puffs.dispose();
      groundTex.dispose();
      groundMat.dispose();
      ground.geometry.dispose();
      starsGeo.dispose();
      starsMat.dispose();
      fireflyGeo.dispose();
      fireflyMat.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to score changes
  useEffect(() => {
    scoreRef.current = score;
    applyScore(score);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  function applyScore(val: number) {
    const h = Math.max(0, Math.min(1, val / 100));

    // canopy color: brown -> amber -> green
    const base = h < 0.5
      ? brown.clone().lerp(amber, h / 0.5)
      : amber.clone().lerp(green, (h - 0.5) / 0.5);

    const leaves = leavesMeshRef.current;
    const data = leafDataRef.current;
    if (leaves && data.length) {
      const c = new THREE.Color();
      for (let i = 0; i < data.length; i++) {
        c.copy(base);
        const hsl = { h: 0, s: 0, l: 0 };
        c.getHSL(hsl);
        c.setHSL((hsl.h + data[i].hueShift + 1) % 1, hsl.s, Math.min(1, hsl.l + data[i].hueShift * 0.3));
        leaves.setColorAt(i, c);
      }
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
    }
    if (leafMatRef.current) {
      // glow follows health: withered red/amber when low, lush green when high
      leafMatRef.current.emissive.copy(base);
      leafMatRef.current.emissiveIntensity = 0.04 + 0.32 * (h * h);
    }

    // canopy puffs: same colour ramp, slightly darker mass, gentler glow
    const puffs = puffsMeshRef.current;
    const pdata = puffDataRef.current;
    if (puffs && pdata.length) {
      const pc = new THREE.Color();
      for (let i = 0; i < pdata.length; i++) {
        pc.copy(base).multiplyScalar(0.82);
        const hsl = { h: 0, s: 0, l: 0 };
        pc.getHSL(hsl);
        pc.setHSL((hsl.h + pdata[i].hueShift + 1) % 1, hsl.s, Math.min(1, hsl.l + pdata[i].hueShift * 0.25));
        puffs.setColorAt(i, pc);
      }
      if (puffs.instanceColor) puffs.instanceColor.needsUpdate = true;
    }
    if (puffMatRef.current) {
      puffMatRef.current.emissive.copy(base);
      puffMatRef.current.emissiveIntensity = 0.03 + 0.2 * (h * h);
    }

    // leaf fullness — keep a full crown at all scores, score mostly drives colour
    leafTarget.current = 0.78 + 0.42 * h;
    // re-apply leaf sizes for a short window, then they stay frozen
    leafSettle.current = 70;

    // lights warm/heal
    if (keyLightRef.current) keyLightRef.current.color.copy(red.clone().lerp(green, h));
    if (rimLightRef.current) rimLightRef.current.color.copy(red.clone().lerp(green, Math.min(1, h + 0.1)));

    // ground glow color
    if (groundMatRef.current) {
      groundMatRef.current.color.copy(red.clone().lerp(green, h));
      groundMatRef.current.opacity = 0.3 + 0.4 * h;
    }

    // bloom intensifies with health
    if (bloomRef.current) bloomRef.current.strength = 0.35 + 0.5 * h;

    // fireflies appear when healthy
    if (firefliesRef.current) {
      (firefliesRef.current.material as THREE.PointsMaterial).opacity = Math.max(0, h - 0.5) * 1.6;
    }
  }

  return <canvas ref={mountRef} className="w-full block" />;
}
