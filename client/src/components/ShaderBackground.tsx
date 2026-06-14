'use client';

import React, { useRef, useEffect } from 'react';

/**
 * Pointer-reactive WebGL nebula, recolored to the AEGIS forest/dark palette.
 * Adapted from Matthias Hurrle's fragment shader (@atzedent) — the rainbow
 * output is biased toward our forest greens so it reads as ambient "secure
 * signal" rather than a generic space scene. Renders behind the hero headline.
 *
 * One GL context, lives only on the landing page (the Living Tree's context is
 * on the scan dashboard), so the two never compete.
 */

const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 touch;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(in vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);float a=rnd(i),b=rnd(i+vec2(1,0)),c=rnd(i+vec2(0,1)),d=rnd(i+1.);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;mat2 m=mat2(1.,-.5,.2,1.2);for(int i=0;i<5;i++){t+=a*noise(p);p*=2.*m;a*=.5;}return t;}
float clouds(vec2 p){float d=1.,t=.0;for(float i=.0;i<3.;i++){float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);t=mix(t,d,a);d=a;p*=2./(i+1.);}return t;}
void main(void){
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  // gentle parallax toward the pointer
  uv+=.06*(touch/R-.5);
  float bg=clouds(vec2(st.x+T*.35,-st.y));
  uv*=1.-.28*(sin(T*.18)*.5+.5);
  for(float i=1.;i<12.;i++){
    uv+=.1*cos(i*vec2(.1+.01*i,.8)+i*i+T*.4+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    // forest-tinted glow instead of rainbow
    col+=.0011/d*(cos(sin(i)*vec3(1,2,3))+1.)*vec3(.22,1.,.42);
    float b=noise(i+p+bg*1.731);
    col+=.0016*b/length(max(p,vec2(b*p.x*.02,p.y)))*vec3(.3,1.,.5);
    // deep charcoal-green haze, matching --bg / --forest-deep
    col=mix(col,vec3(bg*.03,bg*.13,bg*.08),d);
  }
  // tone down overall so headline text stays readable
  col=pow(col*1.05,vec3(1.08));
  O=vec4(col,1);
}`;

const VERT = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

export default function ShaderBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced-motion: skip the animation entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const dpr = Math.min(1.5, Math.max(1, 0.6 * window.devicePixelRatio));
    const touch = [0, 0];
    let raf = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30; // cap at ~30fps — plenty for ambient motion
    let visible = true; // paused when scrolled offscreen or tab hidden

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'resolution');
    const uTime = gl.getUniformLocation(program, 'time');
    const uTouch = gl.getUniformLocation(program, 'touch');

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      touch[0] = (e.clientX - r.left) * dpr;
      touch[1] = canvas.height - (e.clientY - r.top) * dpr;
    };
    window.addEventListener('pointermove', onMove);

    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      // Don't burn the GPU when the hero is offscreen or the tab is hidden,
      // and throttle to the frame cap so the Living Tree's context isn't starved.
      if (!visible || document.hidden || now - last < FRAME_MS) return;
      last = now;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, now * 1e-3);
      gl.uniform2f(uTouch, touch[0], touch[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    raf = requestAnimationFrame(render);

    // Pause rendering once the hero scrolls out of view.
    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none ${className}`}
    />
  );
}
