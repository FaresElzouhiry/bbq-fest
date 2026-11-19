/* BBQ FEST — محرك مشهد الـ 3D (الإصدار ٢: واقعية أعلى + وضع التجوّل)
   الأرض الفاضية ← المخطط مفروشًا عليها ← المهرجان مجسّمًا، مع إمكانية المشي داخله.
   var f = Festival3D.create(element, { theme:'sunset', stage:2 });
   f.setStage(0|1|2) · f.setTheme('day'|'sunset'|'night') · f.flyTo('stage') · f.filter('G') · f.select('G5') · f.setMode('walk'|'orbit') */
(function () {
  'use strict';
  var D = window.BBQ;

  var THEMES = {
    day: { skyTop: '#2f7fd6', skyMid: '#8cc4ee', skyBot: '#e9e0cc', fog: '#e6dcc8', fogD: 0.00095, sun: '#fff3dc', sunI: 0.78, sunPos: [130, 190, 110], hemiSky: '#cfe4ff', hemiGnd: '#b89868', hemiI: 0.05, sand: '#d2b07c',
      cloud: 0.6, cloudLit: '#ffffff', cloudDark: '#b4c1d3', sunAmt: 1, envGain: 0.4, glow: 0, bulbs: 0.15, stars: 0, exposure: 0.95, lamps: 0 },
    sunset: { skyTop: '#221f52', skyMid: '#a9577f', skyBot: '#ffb46c', fog: '#e89c6c', fogD: 0.0014, sun: '#ffa765', sunI: 0.95, sunPos: [-190, 46, -60], hemiSky: '#9a78b8', hemiGnd: '#8a5636', hemiI: 0.05, sand: '#cf9c6c',
      cloud: 0.74, cloudLit: '#ffb88c', cloudDark: '#553c66', sunAmt: 1, envGain: 0.5, glow: 0.6, bulbs: 0.9, stars: 0.2, exposure: 1.02, lamps: 0.55 },
    night: { skyTop: '#02030a', skyMid: '#0b1332', skyBot: '#241729', fog: '#0c0b16', fogD: 0.0016, sun: '#aebcff', sunI: 0.22, sunPos: [-80, 170, 100], hemiSky: '#34407a', hemiGnd: '#1c110d', hemiI: 0.16, sand: '#8a735c',
      cloud: 0.42, cloudLit: '#2a3154', cloudDark: '#090b17', sunAmt: 0.55, envGain: 1.25, glow: 1, bulbs: 1, stars: 1, exposure: 1.16, lamps: 1 }
  };
  var TCOL = ['skyTop', 'skyMid', 'skyBot', 'fog', 'sun', 'hemiSky', 'hemiGnd', 'sand', 'cloudLit', 'cloudDark'];
  var TNUM = ['fogD', 'sunI', 'hemiI', 'cloud', 'sunAmt', 'envGain', 'glow', 'bulbs', 'stars', 'exposure', 'lamps'];
  var ACCENT = '#ff3b2f';

  // ---------- أدوات ----------
  function webglOK() { try { var c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash2(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { var s = 0, a = 0.5, f = 1; for (var i = 0; i < 4; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
  // ضجيج دوري (للخامات القابلة للتكرار)
  function pnoise(x, y, P) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); function h(i, j) { return hash2(((i % P) + P) % P, ((j % P) + P) % P); } var a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function pfbm(x, y, P) { var s = 0, a = 0.5, f = 1; for (var i = 0; i < 4; i++) { s += a * pnoise(x * f, y * f, P * f); f *= 2; a *= 0.5; } return s; }

  function create(container, opts) {
    var T = window.THREE;
    opts = Object.assign({ theme: 'sunset', stage: 2, autoRotate: true, embedded: true, labels: true, tooltip: true, intro: true, font: "'Tajawal','Segoe UI',Tahoma,sans-serif", displayFont: "'Anton','Impact','Arial Black',sans-serif" }, opts || {});
    if (!T || !webglOK()) {
      container.innerHTML = '<img src="assets/layout-map.jpg" alt="مخطط المهرجان" style="width:100%;height:100%;object-fit:contain;background:#111">';
      return null;
    }
    var lowEnd = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || Math.min(window.screen.width, window.screen.height) < 700;
    var lite = lowEnd || opts.lite === true; if (opts.lite === false) lite = false;
    var LQ = { dprMax: lite ? 1.25 : 2, dprMin: lite ? 0.75 : 1, shadow: lite ? 1024 : 2048, terrain: lite ? 80 : 230, skySeg: lite ? [24, 12] : [48, 24], aniso: lite ? 2 : 8, villaKeep: lite ? 3 : 1, people: lite ? 0.45 : 1, lights: lite ? 0 : 9, fps: lite ? 30 : 0, crowdEvery: 1, shadowEvery: lite ? 3 : 1 };
    var PI = Math.PI, H = PI / 2;

    // ---------- أدوات هندسية ----------
    function merge(geos) {
      var n = 0, i, hasCol = false; for (i = 0; i < geos.length; i++) { n += geos[i].attributes.position.count; if (geos[i].attributes.color) hasCol = true; }
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = hasCol ? new Float32Array(n * 3).fill(1) : null, o = 0;
      for (i = 0; i < geos.length; i++) {
        var g = geos[i]; pos.set(g.attributes.position.array, o * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); if (col && g.attributes.color) col.set(g.attributes.color.array, o * 3);
        o += g.attributes.position.count; g.dispose();
      }
      var out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
      if (col) out.setAttribute('color', new T.BufferAttribute(col, 3));
      return out;
    }
    // صندوق بإحداثيات UV بالمتر (حتى تتكرر الخامات بمقاس حقيقي)
    function bx(w, h, d, x, y, z, ry, rx, rz) {
      var g = new T.BoxGeometry(w, h, d).toNonIndexed(), uv = g.attributes.uv;
      for (var i = 0; i < 36; i++) { var f = (i / 6) | 0, fw = f < 2 ? d : w, fh = (f === 2 || f === 3) ? d : h; uv.setXY(i, uv.getX(i) * fw, uv.getY(i) * fh); }
      if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x || 0, y || 0, z || 0); return g;
    }
    function cyl(rt, rb, h, x, y, z, seg, rx, rz) { var g = new T.CylinderGeometry(rt, rb, h, seg || 10).toNonIndexed(); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x || 0, y || 0, z || 0); return g; }
    function ico(r, x, y, z, sx, sy, sz) { var g = new T.IcosahedronGeometry(r, 1); if (g.index) g = g.toNonIndexed(); if (sx) g.scale(sx, sy, sz); g.translate(x || 0, y || 0, z || 0); return g; }
    function sph(r, x, y, z, sx, sy, sz) { var g = new T.SphereGeometry(r, 10, 8).toNonIndexed(); if (sx) g.scale(sx, sy, sz); g.translate(x || 0, y || 0, z || 0); return g; }
    function tint(hex, geos) { var c = new T.Color(hex), list = Array.isArray(geos) ? geos : [geos]; list.forEach(function (g) { var n = g.attributes.position.count, a = new Float32Array(n * 3); for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); }); return list; }
    function lift(geos, dy) { geos.forEach(function (g) { g.translate(0, dy, 0); }); return geos; }
    function cat() { return [].concat.apply([], arguments); }
    function std(color, o) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, metalness: 0.02 }, o || {})); }
    var textTextures = [];
    function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = Math.min(4, LQ.aniso); tex.userData = { draw: function () { var x = c.getContext('2d'); x.clearRect(0, 0, w, h); draw(x, w, h); tex.needsUpdate = true; } }; tex.userData.draw(); textTextures.push(tex); return tex; }
    // خامة ثابتة مرسومة على كانفاس (قابلة للتكرار)
    function tileTex(size, draw, rep) { var c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.encoding = T.sRGBEncoding; t.anisotropy = LQ.aniso; if (rep) t.repeat.set(rep, rep); return t; }
    // خريطة نورمال من دالة ارتفاع دورية fn(u,v) ∈ [0,1]
    function normalTex(size, fn, strength, rep) {
      var h = new Float32Array(size * size), x, y; for (y = 0; y < size; y++) for (x = 0; x < size; x++) h[y * size + x] = fn(x / size, y / size);
      var c = document.createElement('canvas'); c.width = c.height = size; var ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) {
        var l = h[y * size + (x + size - 1) % size], r = h[y * size + (x + 1) % size], up = h[((y + size - 1) % size) * size + x], dn = h[((y + 1) % size) * size + x];
        var nx = (l - r) * strength, ny = (dn - up) * strength, len = Math.sqrt(nx * nx + ny * ny + 1), i = (y * size + x) * 4;
        d[i] = (nx / len * 0.5 + 0.5) * 255; d[i + 1] = (ny / len * 0.5 + 0.5) * 255; d[i + 2] = (1 / len * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = LQ.aniso; if (rep) t.repeat.set(rep, rep); return t;
    }

    // ---------- المشهد ----------
    var W = container.clientWidth || 800, Hh = container.clientHeight || 500;
    var renderer = new T.WebGLRenderer({ antialias: !lite, powerPreference: lite ? 'default' : 'high-performance' });
    var dpr = Math.min(window.devicePixelRatio || 1, LQ.dprMax); renderer.setPixelRatio(dpr);
    renderer.setSize(W, Hh);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = lite ? T.PCFShadowMap : T.PCFSoftShadowMap; if (lite) renderer.shadowMap.autoUpdate = false;
    container.classList.add('f3d'); if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    var scene = new T.Scene();
    scene.fog = new T.FogExp2(0xffffff, 0.0012);
    var camera = new T.PerspectiveCamera(42, W / Hh, 0.3, 4200);

    var hemi = new T.HemisphereLight(0xffffff, 0x886644, 0.12); scene.add(hemi);
    var sun = new T.DirectionalLight(0xffffff, 1.0); scene.add(sun); scene.add(sun.target);
    sun.castShadow = true; var SM = LQ.shadow; sun.shadow.mapSize.set(SM, SM);
    var sc = sun.shadow.camera; sc.near = 20; sc.far = 700; sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.04;
    var sunDir = new T.Vector3(0.5, 0.7, 0.4), shadowHalf = 0;

    // ----- السماء: شيدر (تدرّج + قرص الشمس/القمر + سحب متحركة) -----
    var skyU = { uTop: { value: new T.Color() }, uMid: { value: new T.Color() }, uBot: { value: new T.Color() }, uGround: { value: new T.Color() }, uSunDir: { value: new T.Vector3(0, 1, 0) }, uSunCol: { value: new T.Color() },
      uCloudLit: { value: new T.Color() }, uCloudDark: { value: new T.Color() }, uSunAmt: { value: 1 }, uCloud: { value: 0.5 }, uTime: { value: 0 }, uGain: { value: 1 } };
    var skyMat = new T.ShaderMaterial({
      defines: { OCT: lite ? 3 : 5 }, uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform vec3 uTop,uMid,uBot,uGround,uSunDir,uSunCol,uCloudLit,uCloudDark; uniform float uSunAmt,uCloud,uTime,uGain; varying vec3 vDir;',
        'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }',
        'float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }',
        'float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<OCT;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }',
        'void main(){ vec3 d=normalize(vDir); float h=d.y;',
        ' vec3 col=mix(uBot,uMid,smoothstep(0.,.24,h)); col=mix(col,uTop,smoothstep(.16,.85,h));',
        ' float sd=max(dot(d,uSunDir),0.);',
        ' col+=uSunCol*uSunAmt*(pow(sd,1100.)*6.+pow(sd,70.)*.32+pow(sd,7.)*.15);',
        ' if(h>0.){ vec2 p=d.xz/(h+.1)*1.25+vec2(uTime*.006,uTime*.002); float n=fbm(p); float thr=mix(.86,.4,uCloud); float c=smoothstep(thr,thr+.22,n)*smoothstep(0.,.13,h);',
        '  float lit=clamp(fbm(p*1.7+7.)*1.25-.12+pow(sd,3.)*.55,0.,1.); col=mix(col, mix(uCloudDark,uCloudLit,lit), c*.88); }',
        ' else { col=mix(uBot,uGround,smoothstep(0.,-.1,h)); }',
        ' gl_FragColor=vec4(col*uGain,1.); }'].join('\n')
    });
    var sky = new T.Mesh(new T.SphereGeometry(3600, LQ.skySeg[0], LQ.skySeg[1]), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
    // بيئة الانعكاسات تُولَّد من نفس السماء
    var envScene = new T.Scene(); envScene.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), skyMat));
    var pmrem = new T.PMREMGenerator(renderer), envRT = null, envDirty = true;
    function updateEnv(gain) { skyU.uGain.value = gain; var rt = pmrem.fromScene(envScene, 0, 1, 500); skyU.uGain.value = 1; scene.environment = rt.texture; if (envRT) envRT.dispose(); envRT = rt; envDirty = false; }

    var stars = (function () {
      var r = rng(7), n = 1100, p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { var a = r() * PI * 2, e = Math.asin(0.05 + r() * 0.95), R = 3300; p[i * 3] = Math.cos(a) * Math.cos(e) * R; p[i * 3 + 1] = Math.sin(e) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
      var s = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 1.9, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); s.frustumCulled = false; scene.add(s); return s;
    })();
    var dotTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();

    // ---------- الخامات المرسومة ----------
    var TX = {};
    TX.sand = tileTex(512, function (x, s) {
      var img = x.createImageData(s, s), d = img.data, r = rng(11);
      for (var i = 0; i < d.length; i += 4) { var px = (i / 4) % s, py = Math.floor(i / 4 / s); var n = pfbm(px / s * 8, py / s * 8, 8), v = 196 + n * 46 + r() * 16; d[i] = v; d[i + 1] = v - 3; d[i + 2] = v - 9; d[i + 3] = 255; }
      x.putImageData(img, 0, 0);
      for (var k = 0; k < 420; k++) { x.fillStyle = 'rgba(80,62,44,' + (0.08 + r() * 0.22) + ')'; x.beginPath(); x.arc(r() * s, r() * s, 0.5 + r() * 1.6, 0, 6.3); x.fill(); }
    }, 90);
    TX.sandN = normalTex(256, function (u, v) { return pfbm(u * 6, v * 6, 6) * 0.55 + (0.5 + 0.5 * Math.sin((v * 22 + pfbm(u * 3, v * 3, 3) * 2.2) * PI * 2)) * 0.45; }, 2.4, 90);
    TX.pave = tileTex(512, function (x, s) {
      var r = rng(3), bw = s / 8, bh = s / 16; x.fillStyle = '#8f8676'; x.fillRect(0, 0, s, s);
      for (var j = 0; j < 16; j++) for (var i = -1; i < 8; i++) { var ox = (j % 2) * bw / 2, t = 196 + r() * 34; x.fillStyle = 'rgb(' + t + ',' + (t - 9) + ',' + (t - 26) + ')'; x.fillRect(i * bw + ox + 1.5, j * bh + 1.5, bw - 3, bh - 3); }
      for (var k = 0; k < 1500; k++) { x.fillStyle = 'rgba(' + (r() > 0.5 ? '255,250,240' : '70,60,48') + ',' + r() * 0.1 + ')'; x.fillRect(r() * s, r() * s, 2, 2); }
    }, 0.5);
    TX.paveN = normalTex(256, function (u, v) { var j = Math.floor(v * 16), fu = (u * 8 + (j % 2) * 0.5) % 1, fv = (v * 16) % 1; var e = Math.min(fu, 1 - fu) * 8, f = Math.min(fv, 1 - fv) * 4; return clamp(Math.min(e, f) * 3, 0, 1) * 0.8 + pnoise(u * 40, v * 40, 40) * 0.2; }, 1.6, 0.5);
    TX.asphalt = tileTex(256, function (x, s) { var r = rng(9); x.fillStyle = '#3b3b40'; x.fillRect(0, 0, s, s); for (var k = 0; k < 5200; k++) { var t = 30 + r() * 70; x.fillStyle = 'rgba(' + t + ',' + t + ',' + (t + 4) + ',' + (0.25 + r() * 0.5) + ')'; x.fillRect(r() * s, r() * s, 1.5, 1.5); } }, 0.35);
    TX.asphaltN = normalTex(256, function (u, v) { return pnoise(u * 64, v * 64, 64); }, 1.3, 0.35);
    TX.grass = tileTex(256, function (x, s) { var r = rng(17); x.fillStyle = '#5c8a39'; x.fillRect(0, 0, s, s); for (var k = 0; k < 9000; k++) { var g = 95 + r() * 80; x.strokeStyle = 'rgba(' + (40 + r() * 60) + ',' + g + ',' + (30 + r() * 30) + ',.55)'; var px = r() * s, py = r() * s; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 3, py - 2 - r() * 4); x.stroke(); } }, 0.4);
    TX.grassN = normalTex(256, function (u, v) { return pnoise(u * 48, v * 48, 48) * 0.6 + pnoise(u * 12, v * 12, 12) * 0.4; }, 1.8, 0.4);
    TX.wood = tileTex(256, function (x, s) { var r = rng(21); for (var i = 0; i < 8; i++) { var t = 150 + r() * 46; x.fillStyle = 'rgb(' + t + ',' + Math.round(t * 0.72) + ',' + Math.round(t * 0.45) + ')'; x.fillRect(0, i * s / 8, s, s / 8); x.fillStyle = 'rgba(50,30,15,.5)'; x.fillRect(0, i * s / 8, s, 2); for (var k = 0; k < 26; k++) { x.strokeStyle = 'rgba(70,42,20,' + (0.08 + r() * 0.16) + ')'; var yy = i * s / 8 + r() * s / 8; x.beginPath(); x.moveTo(0, yy); x.bezierCurveTo(s * 0.3, yy + (r() - 0.5) * 5, s * 0.6, yy + (r() - 0.5) * 5, s, yy); x.stroke(); } } }, 0.8);
    TX.woodN = normalTex(128, function (u, v) { var f = (v * 8) % 1; return clamp(Math.min(f, 1 - f) * 10, 0, 1) * 0.8 + pnoise(u * 6, v * 60, 60) * 0.2; }, 1.5, 0.8);
    TX.ribsN = normalTex(128, function (u) { var s = 0.5 + 0.5 * Math.sin(u * PI * 2 * 5); return Math.pow(s, 0.6); }, 2.6, 1);
    TX.plasterN = normalTex(128, function (u, v) { return pnoise(u * 24, v * 24, 24); }, 0.9, 0.5);
    TX.fabric = tileTex(128, function (x, s) { for (var i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#f4efe6' : '#c4222a'; x.fillRect(i * s / 4, 0, s / 4, s); } }, 1);
    TX.truss = tileTex(128, function (x, s) { x.clearRect(0, 0, s, s); x.strokeStyle = '#fff'; x.lineWidth = 9; x.strokeRect(4, 4, s - 8, s - 8); x.lineWidth = 7; x.beginPath(); x.moveTo(4, 4); x.lineTo(s - 4, s - 4); x.moveTo(s - 4, 4); x.lineTo(4, s - 4); x.stroke(); }, 2);
    TX.frond = (function () { var c = document.createElement('canvas'); c.width = 128; c.height = 512; var x = c.getContext('2d'); x.strokeStyle = '#6b8f3a'; x.lineWidth = 5; x.beginPath(); x.moveTo(64, 512); x.lineTo(64, 6); x.stroke(); for (var i = 0; i < 64; i++) { var y = 500 - i * 7.6, len = 58 * Math.sin(Math.min(1, (i + 6) / 70) * PI) + 6, g = 105 + (i % 5) * 9; x.strokeStyle = 'rgb(' + (52 + (i % 3) * 8) + ',' + g + ',' + (40 + (i % 4) * 5) + ')'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(64, y); x.lineTo(64 - len, y - len * 0.55); x.moveTo(64, y); x.lineTo(64 + len, y - len * 0.55); x.stroke(); } var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; })();
    TX.trunk = tileTex(128, function (x, s) { x.fillStyle = '#7a5c3e'; x.fillRect(0, 0, s, s); for (var j = 0; j < 8; j++) for (var i = 0; i < 4; i++) { var ox = (j % 2) * s / 8; x.fillStyle = (i + j) % 2 ? '#8d6c49' : '#69492f'; x.beginPath(); x.moveTo(i * s / 4 + ox, j * s / 8 + s / 8); x.lineTo(i * s / 4 + ox + s / 8, j * s / 8); x.lineTo(i * s / 4 + ox + s / 4, j * s / 8 + s / 8); x.closePath(); x.fill(); } }, 1);
    TX.trunk.repeat.set(2, 6);

    // ---------- الأرض (فاضية) ----------
    var sandMat = std('#d9c08f', { map: TX.sand, normalMap: TX.sandN, normalScale: new T.Vector2(0.9, 0.9), roughness: 1, vertexColors: true });
    (function () {
      var g = new T.PlaneGeometry(4600, 4600, LQ.terrain, LQ.terrain); g.rotateX(-H);
      var p = g.attributes.position, col = new Float32Array(p.count * 3);
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getZ(i), dist = Math.sqrt(x * x + z * z);
        var k = clamp((dist - 560) / 900, 0, 1); k = k * k * (3 - 2 * k);
        var hgt = (fbm(x * 0.0026 + 9, z * 0.0026 + 3) - 0.36) * 210 * k + (fbm(x * 0.012, z * 0.012) - 0.5) * 6 * clamp((dist - 520) / 160, 0, 1);
        p.setY(i, Math.max(hgt, -5 * k));
        var c = 0.86 + fbm(x * 0.006 + 40, z * 0.006 + 11) * 0.28; col[i * 3] = c; col[i * 3 + 1] = c * 0.985; col[i * 3 + 2] = c * 0.96;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
      var m = new T.Mesh(g, sandMat); m.receiveShadow = true; scene.add(m);
    })();
    var SITE = { x0: D.mx(0), x1: D.mx(1245), z0: D.mz(84), z1: D.mz(822) };
    function onSite(x, z, m) { m = m || 0; return x > SITE.x0 - m && x < SITE.x1 + m && z > SITE.z0 - m && z < SITE.z1 + m; }

    // ---------- خامات المواد ----------
    var RED = '#c4222a', REDD = '#8f1418', CREAM = '#efe6d4', CHAR = '#27272b', WHITE = '#f4f2ec', GREY = '#8d9299', STEEL = '#b9bec4', GREEN = '#4d7a2c', GREEN2 = '#6a9238', TEAL = '#2f9c8b', TERR = '#b5673f', DARK = '#1c1a19';
    var M = {
      metal: std('#ffffff', { vertexColors: true, normalMap: TX.ribsN, normalScale: new T.Vector2(0.55, 0.55), roughness: 0.48, metalness: 0.3 }),
      matte: std('#ffffff', { vertexColors: true, roughness: 0.88 }),
      plaster: std('#ffffff', { vertexColors: true, roughness: 0.95, normalMap: TX.plasterN, normalScale: new T.Vector2(0.5, 0.5) }),
      wood: std('#ffffff', { map: TX.wood, normalMap: TX.woodN, roughness: 0.78 }),
      glass: std('#bfe3ee', { transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.2, envMapIntensity: 1.8 }),
      redGlass: std('#e0262c', { transparent: true, opacity: 0.66, side: T.DoubleSide, roughness: 0.35 }),
      fabric: std('#ffffff', { map: TX.fabric, roughness: 0.9, side: T.DoubleSide }),
      truss: std('#d4d8dc', { map: TX.truss, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.4, metalness: 0.6 }),
      trussW: std('#f7f5f0', { map: TX.truss, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.5, metalness: 0.2 }),
      asphalt: std('#ffffff', { map: TX.asphalt, normalMap: TX.asphaltN, roughness: 0.95 }),
      paint: std('#eeeeea', { roughness: 0.8 }),
      pave: std('#ffffff', { map: TX.pave, normalMap: TX.paveN, roughness: 0.92 }),
      lawn: std('#ffffff', { map: TX.grass, normalMap: TX.grassN, roughness: 1 }),
      curb: std('#d6d0c2', { roughness: 0.9 }),
      trunk: std('#ffffff', { map: TX.trunk, roughness: 1 }),
      frond: std('#ffffff', { map: TX.frond, alphaTest: 0.35, side: T.DoubleSide, roughness: 0.85 })
    };
    function shadowed(mesh, cast) { mesh.castShadow = cast !== false; mesh.receiveShadow = true; return mesh; }
    function part(group, geos, mat, cast) { if (!geos || !geos.length) return null; var m = new T.Mesh(merge(geos), mat); m.castShadow = cast !== false; m.receiveShadow = true; group.add(m); return m; }
    function flatShape(points, y) { var s = new T.Shape(); points.forEach(function (p, i) { if (i === 0) s.moveTo(p[0], -p[1]); else s.lineTo(p[0], -p[1]); }); var g = new T.ShapeGeometry(s); g.rotateX(-H); g.translate(0, y, 0); return g; }

    // ---------- المحيط (ثابت في كل المراحل): شوارع، فلل المجمع، أعمدة إنارة، أفق المدينة ----------
    var lampPts = [], lampPoles = [];
    var roadMeshes = (function () {
      var seg = [], dash = [], Wd = 9, r, i;
      function strip(a, b, wd, dashed) {
        var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz), ang = Math.atan2(dz, dx);
        seg.push(bx(len, 0.06, wd, (a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2, -ang));
        if (dashed) { var n = Math.floor(len / 7); for (var j = 0; j < n; j++) { var t = (j + 0.5) / n; dash.push(bx(2.6, 0.07, 0.22, a[0] + dx * t, 0.045, a[1] + dz * t, -ang)); } }
        var nl = Math.floor(len / 30); for (var q = 0; q < nl; q++) { var tt = (q + 0.5) / nl, sx = a[0] + dx * tt - Math.sin(ang) * (wd / 2 + 0.8) * (q % 2 ? 1 : -1), sz = a[1] + dz * tt + Math.cos(ang) * (wd / 2 + 0.8) * (q % 2 ? 1 : -1); if (!onSite(sx, sz, -6)) lampAt(sx, sz); }
      }
      function lampAt(x, z) { lampPoles.push(cyl(0.09, 0.13, 8, x, 4, z, 6), bx(1.6, 0.1, 0.16, x, 7.95, z), bx(0.7, 0.14, 0.3, x + 0.5, 7.86, z)); lampPts.push(x + 0.5, 7.7, z); }
      D.site.roads.forEach(function (rd) { for (i = 0; i < rd.length; i++) { seg.push(cyl(Wd / 2, Wd / 2, 0.06, rd[i][0], 0.035, rd[i][1], 18)); if (i < rd.length - 1) strip(rd[i], rd[i + 1], Wd, true); } });
      // شبكة شوارع المجمع حول الموقع
      var R = 470, x0 = SITE.x0 - 34, x1 = SITE.x1 + 34, z0 = SITE.z0 - 34, z1 = SITE.z1 + 34;
      strip([x0, z0], [x1, z0], 10, true); strip([x0, z1], [x1, z1], 10, true); strip([x0, z0], [x0, z1], 10, true); strip([x1, z0], [x1, z1], 10, true);
      for (var gx = -5; gx <= 5; gx++) { var cx = gx * 96 + 12; if (cx > x0 - 6 && cx < x1 + 6) { strip([cx, -R], [cx, z0], 8, false); strip([cx, z1], [cx, R], 8, false); } else strip([cx, -R], [cx, R], 8, false); }
      for (var gz = -5; gz <= 5; gz++) { var cz = gz * 104 + 8; if (cz > z0 - 6 && cz < z1 + 6) { strip([-R, cz], [x0, cz], 8, false); strip([x1, cz], [R, cz], 8, false); } else strip([-R, cz], [R, cz], 8, false); }
      var a = shadowed(new T.Mesh(merge(seg), M.asphalt), false), b = new T.Mesh(merge(dash), M.paint); a.renderOrder = 0; scene.add(a); scene.add(b);
      return [a, b];
    })();
    (function () {
      // فلل المجمع
      var win = [], body = [], r = rng(57), i;
      body = cat(tint('#ffffff', [bx(15, 3.7, 12, 0, 1.85, 0), bx(11, 3.3, 9, -1.4, 5.35, -1), bx(15.4, 0.5, 12.4, 0, 3.95, 0), bx(11.4, 0.5, 9.4, -1.4, 7.25, -1)]),
        tint('#e9e2d2', [bx(23, 2.3, 0.3, 0, 1.15, 13), bx(23, 2.3, 0.3, 0, 1.15, -13), bx(0.3, 2.3, 26, 11.5, 1.15, 0), bx(0.3, 2.3, 26, -11.5, 1.15, 0)]),
        tint('#3b4a5a', [bx(1.6, 1.5, 0.12, -4, 2, 6.02), bx(1.6, 1.5, 0.12, 4.4, 2, 6.02), bx(1.6, 1.4, 0.12, -4, 5.4, 3.52), bx(1.6, 1.4, 0.12, 1, 5.4, 3.52), bx(0.12, 1.5, 1.6, 7.52, 2, 2), bx(0.12, 1.5, 1.6, -7.52, 2, -2), bx(1.6, 1.5, 0.12, 2, 2, -6.02)]),
        tint('#6b4a2e', [bx(1.4, 2.4, 0.14, 0.4, 1.2, 6.03), bx(3.4, 2.1, 0.2, 4, 1.05, 13.02)]),
        tint('#f3f1ec', [cyl(0.8, 0.8, 1.3, -3.5, 8.1, -2.5, 10), bx(1.1, 0.7, 0.7, 2, 4.5, -3)]));
      win = [bx(1.5, 1.4, 0.1, -4, 2, 6.1), bx(1.5, 1.3, 0.1, 1, 5.4, 3.6), bx(1.5, 1.4, 0.1, 4.4, 2, 6.1)];
      var spots = [];
      for (var gx = -16; gx <= 16; gx++) for (var gz = -14; gz <= 14; gz++) {
        var x = gx * 32 + 12 + 16, z = gz * 34.7 + 8 + 17; if (Math.sqrt(x * x + z * z) > 455) continue; if (onSite(x, z, 50)) continue;
        var lx = ((x - 12) % 96 + 96) % 96, lz = ((z - 8) % 104 + 104) % 104; if (lx < 14 || lx > 82 || lz < 15 || lz > 89) continue;
        if (r() < 0.12) continue; spots.push([x, z]);
      }
      if (LQ.villaKeep > 1) spots = spots.filter(function (s, k) { return k % LQ.villaKeep === 0; });
      var villas = new T.InstancedMesh(merge(body), M.plaster, spots.length), wins = new T.InstancedMesh(merge(win), new T.MeshBasicMaterial({ color: 0xffc77a, transparent: true, opacity: 0, toneMapped: false }), spots.length), dm = new T.Object3D();
      var tones = ['#e8dcc4', '#dccdb0', '#efe6d6', '#d9c7a6', '#e3d5bd', '#cfc0a4'];
      spots.forEach(function (s, k) { dm.position.set(s[0], 0, s[1]); dm.rotation.y = Math.floor(r() * 4) * H; var q = 0.92 + r() * 0.16; dm.scale.set(q, 0.9 + r() * 0.25, q); dm.updateMatrix(); villas.setMatrixAt(k, dm.matrix); villas.setColorAt(k, new T.Color(tones[Math.floor(r() * tones.length)])); if (r() < 0.45) dm.scale.set(0.001, 0.001, 0.001); dm.updateMatrix(); wins.setMatrixAt(k, dm.matrix); });
      villas.castShadow = !lowEnd; villas.receiveShadow = true; villas.frustumCulled = wins.frustumCulled = false; scene.add(villas); wins.visible = false; scene.add(wins); villaWins = wins;
      // صخور وشجيرات على الأرض الفاضية
      var rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), std('#a08a6c', { flatShading: true, roughness: 1 }), 90), shrubs = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), std('#6f7742', { flatShading: true, roughness: 1 }), 70);
      function scatter(mesh, n, smin, smax, sy) { for (i = 0; i < n; i++) { var x = SITE.x0 - 26 + r() * (SITE.x1 - SITE.x0 + 52), z = SITE.z0 - 26 + r() * (SITE.z1 - SITE.z0 + 52), s = smin + r() * (smax - smin); if (insideAny(x, z)) s *= 0.001; dm.position.set(x, s * sy * 0.3, z); dm.scale.set(s, s * sy, s * (0.7 + r() * 0.6)); dm.rotation.set(r(), r() * 6, r()); dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix); } mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh); }
      scatter(rocks, 90, 0.15, 0.7, 0.6); scatter(shrubs, 70, 0.3, 0.9, 0.8);
      // أعمدة الإنارة
      var poles = new T.Mesh(merge(lampPoles), std('#4a4d52', { roughness: 0.5, metalness: 0.6 })); poles.castShadow = true; scene.add(poles);
      var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(new Float32Array(lampPts), 3));
      streetHalo = new T.Points(lg, new T.PointsMaterial({ map: dotTex, color: 0xffd9a0, size: 7, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); streetHalo.frustumCulled = false; scene.add(streetHalo);
      // أفق المدينة البعيد
      var st = tileTex(2048, function () {}, 1), cv = st.image; cv.height = 256; var x = cv.getContext('2d'), px = 0; x.clearRect(0, 0, 2048, 256); x.fillStyle = '#fff';
      while (px < 2048) { var bw = 14 + r() * 46, bh = r() < 0.06 ? 120 + r() * 110 : 18 + r() * 70; x.fillRect(px, 256 - bh, bw, bh); if (r() < 0.3) x.fillRect(px + bw * 0.3, 256 - bh - 10, bw * 0.4, 10); px += bw + r() * 6; }
      st.needsUpdate = true; st.repeat.set(3, 1);
      skyline = new T.Mesh(new T.CylinderGeometry(3000, 3000, 300, 64, 1, true), new T.MeshBasicMaterial({ map: st, transparent: true, opacity: 0.85, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
      skyline.position.y = 132; skyline.renderOrder = -5; skyline.frustumCulled = false; scene.add(skyline);
    })();
    var villaWins, streetHalo, skyline;
    function insidePoly(x, z, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
    function insideAny(x, z) { return insidePoly(x, z, D.site.plot) || insidePoly(x, z, D.site.street); }

    // ---------- مجموعات المراحل ----------
    var survey = new T.Group(), built = new T.Group(), surfaces = new T.Group(), deco = new T.Group();
    scene.add(survey); scene.add(surfaces); scene.add(built); scene.add(deco);
    var fadeMats = { survey: [], zone: [] };

    function textSprite(lines, o) {
      o = Object.assign({ w: 512, h: 160, bg: 'rgba(12,10,10,.82)', fg: '#fff', sub: '#ffb199', size: 64, world: 16, border: ACCENT }, o || {});
      var tex = canvasTex(o.w, o.h, function (x, w, h) {
        var rad = h * 0.5 - 6; x.fillStyle = o.bg; x.beginPath();
        x.moveTo(rad + 4, 4); x.arcTo(w - 4, 4, w - 4, h - 4, rad); x.arcTo(w - 4, h - 4, 4, h - 4, rad); x.arcTo(4, h - 4, 4, 4, rad); x.arcTo(4, 4, w - 4, 4, rad); x.closePath(); x.fill();
        if (o.border) { x.strokeStyle = o.border; x.lineWidth = 5; x.stroke(); }
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
        if (lines.length > 1) { x.fillStyle = o.fg; x.font = '800 ' + o.size + 'px ' + opts.font; x.fillText(lines[0], w / 2, h * 0.4); x.fillStyle = o.sub; x.font = '600 ' + Math.round(o.size * 0.42) + 'px ' + opts.font; x.direction = 'ltr'; x.fillText(lines[1], w / 2, h * 0.76); }
        else { x.fillStyle = o.fg; x.font = '800 ' + o.size + 'px ' + opts.font; x.fillText(lines[0], w / 2, h * 0.52); }
      });
      var mat = new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, opacity: 0 });
      var sp = new T.Sprite(mat); sp.scale.set(o.world, o.world * o.h / o.w, 1); sp.renderOrder = 20; return sp;
    }

    // ----- المرحلة 0: علامات المسّاح -----
    (function () {
      var dashes = [], stakes = [], flags = [];
      function edge(a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.floor(len / 3.2)), ang = Math.atan2(dz, dx); for (var i = 0; i < n; i++) { var t = (i + 0.5) / n; dashes.push(bx(1.7, 0.08, 0.34, a[0] + dx * t, 0.09, a[1] + dz * t, -ang)); } }
      [D.site.plot, D.site.street].forEach(function (poly) {
        for (var i = 0; i < poly.length; i++) { edge(poly[i], poly[(i + 1) % poly.length]); if (i % 2 === 0) { stakes.push(cyl(0.07, 0.07, 2.6, poly[i][0], 1.3, poly[i][1], 6)); flags.push(bx(0.9, 0.5, 0.04, poly[i][0] + 0.48, 2.3, poly[i][1])); } }
      });
      var m1 = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }), m2 = std('#e9e2d2', { transparent: true }), m3 = new T.MeshBasicMaterial({ color: ACCENT, transparent: true, side: T.DoubleSide });
      survey.add(new T.Mesh(merge(dashes), m1)); var st = new T.Mesh(merge(stakes), m2); st.castShadow = true; survey.add(st); survey.add(new T.Mesh(merge(flags), m3));
      fadeMats.survey.push(m1, m2, m3);
      var sign = textSprite(['موقع BBQ FEST · 10,000 م²', 'EMPTY LAND — BEFORE THE BUILD'], { w: 900, h: 190, size: 62, world: 46 });
      sign.position.set(D.mx(300), 16, D.mz(560)); survey.add(sign); fadeMats.survey.push(sign.material);
      [['97 م', 300, 826, 12], ['82 م', 6, 560, 12], ['144 م', 800, 532, 12], ['23 م', 1236, 450, 10]].forEach(function (d) {
        var s = textSprite([d[0]], { w: 256, h: 110, size: 60, world: d[3], bg: 'rgba(255,255,255,.92)', fg: '#111', border: null });
        s.position.set(D.mx(d[1]), 3.2, D.mz(d[2])); survey.add(s); fadeMats.survey.push(s.material);
      });
    })();

    // ----- المرحلة 1: المخطط مفروشًا على الأرض -----
    var BP = { x0: 0, x1: 1245, y0: 84, y1: 822 };
    var bpTex = canvasTex(2048, Math.round(2048 * (BP.y1 - BP.y0) / (BP.x1 - BP.x0)), function (x, w, h) {
      var k = w / (BP.x1 - BP.x0);
      function cx(m) { return (m * D.PX + 615 - BP.x0) * k; } function cz(m) { return (m * D.PX + 450 - BP.y0) * k; }
      function poly(pts) { x.beginPath(); pts.forEach(function (p, i) { if (i) x.lineTo(cx(p[0]), cz(p[1])); else x.moveTo(cx(p[0]), cz(p[1])); }); x.closePath(); }
      x.lineJoin = 'round';
      x.fillStyle = 'rgba(252,249,242,.95)'; x.strokeStyle = '#141414'; x.lineWidth = 5;
      poly(D.site.plot); x.fill(); x.stroke(); poly(D.site.street); x.fill(); x.stroke();
      var is = D.site.island; x.lineWidth = 3; x.fillStyle = 'rgba(120,170,90,.35)'; x.beginPath();
      x.arc(cx(is.x0), cz(is.z), is.r * D.PX * k, H, PI * 1.5); x.arc(cx(is.x1), cz(is.z), is.r * D.PX * k, -H, H); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(252,249,242,.92)'; x.beginPath(); x.arc(cx(D.site.balloon[0]), cz(D.site.balloon[1]), D.site.balloonR * D.PX * k, 0, 6.3); x.fill(); x.stroke();
      D.site.lawns.forEach(function (l) { x.fillStyle = 'rgba(120,170,90,.35)'; x.beginPath(); x.arc(cx(l.x), cz(l.z), l.r * D.PX * k, 0, 6.3); x.fill(); x.stroke(); });
      D.site.palms.forEach(function (p) { x.fillStyle = '#4c8a3a'; x.beginPath(); for (var i = 0; i < 16; i++) { var a = i * PI / 8, rr = (i % 2 ? 6 : 15) * k * 1.1; x.lineTo(cx(p[0]) + Math.cos(a) * rr, cz(p[1]) + Math.sin(a) * rr); } x.closePath(); x.fill(); });
      D.site.trucks.forEach(function (t) { x.save(); x.translate(cx(t.x), cz(t.z)); x.rotate(-t.rot); x.fillStyle = 'rgba(40,40,46,.2)'; x.strokeStyle = '#444'; x.lineWidth = 2; x.setLineDash([8, 6]); x.fillRect(-3.4 * D.PX * k, -1.3 * D.PX * k, 6.8 * D.PX * k, 2.6 * D.PX * k); x.strokeRect(-3.4 * D.PX * k, -1.3 * D.PX * k, 6.8 * D.PX * k, 2.6 * D.PX * k); x.restore(); });
      x.setLineDash([]);
      D.booths.forEach(function (b) {
        var t = D.types[b.type], w = b.w * D.PX * k, d = b.d * D.PX * k;
        x.save(); x.translate(cx(b.x), cz(b.z)); x.rotate(-b.rot);
        x.fillStyle = t.color; x.strokeStyle = '#1b1b1b'; x.lineWidth = 2.5; x.fillRect(-w / 2, -d / 2, w, d); x.strokeRect(-w / 2, -d / 2, w, d);
        x.rotate(b.rot); var side = Math.abs(Math.sin(b.rot)) > 0.7, ww = side ? d : w, dd = side ? w : d;
        if (dd > ww * 1.4) { x.rotate(H); var tmp = ww; ww = dd; dd = tmp; }
        var label = t.special ? t.ar : b.id, fs = Math.min(dd * 0.62, ww / (label.length * 0.62));
        x.fillStyle = t.dark ? '#151515' : '#fff'; x.font = '800 ' + fs + 'px ' + opts.font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, fs * 0.06);
        x.restore();
      });
      x.fillStyle = '#141414'; x.textAlign = 'center'; x.textBaseline = 'middle';
      D.zones.forEach(function (z) { if (['stage', 'comp', 'gate', 'kiosk', 'diamond'].indexOf(z.key) >= 0) return; x.font = '800 30px ' + opts.font; x.direction = 'rtl'; var yy = z.key === 'gold' ? cz(z.z) + 12 : (z.key === 'exhibitor' ? cz(z.z) + 86 : (z.key === 'balloon' ? cz(z.z) + 150 : (z.key === 'silver' ? cz(z.z) - 150 : cz(z.z)))); x.fillText(z.ar, cx(z.x), yy); });
    });
    var bpMat = new T.MeshBasicMaterial({ map: bpTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var blueprint = new T.Mesh(new T.PlaneGeometry((BP.x1 - BP.x0) / D.PX, (BP.y1 - BP.y0) / D.PX), bpMat);
    blueprint.rotation.x = -H; blueprint.position.set(D.mx((BP.x0 + BP.x1) / 2), 0.24, D.mz((BP.y0 + BP.y1) / 2)); blueprint.renderOrder = 2; blueprint.visible = false; scene.add(blueprint);

    // ----- المرحلة 2: أسطح الموقع -----
    (function () {
      surfaces.add(shadowed(new T.Mesh(flatShape(D.site.plot, 0.08), M.pave), false));
      surfaces.add(shadowed(new T.Mesh(flatShape(D.site.street, 0.075), M.pave), false));
      var is = D.site.island, pts = [], i, a, curb = [];
      for (i = 0; i <= 12; i++) { a = H + i * PI / 12; pts.push([is.x0 + Math.cos(a) * is.r, is.z + Math.sin(a) * is.r]); }
      for (i = 0; i <= 12; i++) { a = -H + i * PI / 12; pts.push([is.x1 + Math.cos(a) * is.r, is.z + Math.sin(a) * is.r]); }
      var lawnG = [flatShape(pts, 0.24)];
      curb.push(bx(is.x1 - is.x0, 0.24, 0.3, (is.x0 + is.x1) / 2, 0.14, is.z - is.r), bx(is.x1 - is.x0, 0.24, 0.3, (is.x0 + is.x1) / 2, 0.14, is.z + is.r));
      D.site.lawns.forEach(function (l) { lawnG.push(cyl(l.r, l.r, 0.1, l.x, 0.17, l.z, 32)); curb.push(cyl(l.r + 0.25, l.r + 0.25, 0.18, l.x, 0.12, l.z, 32)); });
      lawnG.push(cyl(D.site.balloonR - 0.6, D.site.balloonR - 0.6, 0.1, D.site.balloon[0], 0.12, D.site.balloon[1], 40));
      curb.push(cyl(D.site.balloonR, D.site.balloonR, 0.16, D.site.balloon[0], 0.08, D.site.balloon[1], 40));
      surfaces.add(shadowed(new T.Mesh(merge(curb), M.curb), false));
      lawnG.forEach(function (g) { var uv = g.attributes.uv, p = g.attributes.position; for (var k = 0; k < uv.count; k++) uv.setXY(k, p.getX(k), p.getZ(k)); });
      surfaces.add(shadowed(new T.Mesh(merge(lawnG.map(function (g) { return g.index ? g.toNonIndexed() : g; })), M.lawn), false));
    })();

    // ---------- خامات نصية ----------
    var beams = null;
    var ledTex = canvasTex(1024, 512, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#120304'); gr.addColorStop(1, '#3a0709'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,60,50,.35)'; x.lineWidth = 3; for (var i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 60 * i); x.bezierCurveTo(w * 0.3, 60 * i + 90, w * 0.6, 60 * i - 120, w, 60 * i + 40); x.stroke(); }
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f2efe9'; x.font = '400 250px ' + opts.displayFont; x.fillText('BBQ', w / 2, h * 0.42);
      x.save(); x.translate(w / 2 + 40, h * 0.74); x.rotate(-0.1); x.fillStyle = '#ff2a22'; x.font = 'italic 900 140px ' + opts.displayFont; x.fillText('FEST.', 0, 0); x.restore();
      x.fillStyle = '#fff'; x.font = '700 34px ' + opts.displayFont; x.fillText('WE GRILL . YOU CHILL', w / 2, h * 0.93);
    });

    // ---------- قطع جاهزة ----------
    function plant(x, z, s, y) { s = s || 1; return lift(cat(tint(TERR, [cyl(0.28 * s, 0.22 * s, 0.5 * s, x, 0.25 * s, z, 8)]), tint(GREEN, [ico(0.42 * s, x, 0.82 * s, z)]), tint(GREEN2, [ico(0.28 * s, x + 0.14 * s, 1.1 * s, z - 0.1 * s)])), y || 0); }
    function tableSet(x, z, y) { return lift(cat(tint(WHITE, [cyl(0.45, 0.45, 0.05, x, 0.74, z, 12), cyl(0.05, 0.05, 0.72, x, 0.36, z, 6)]), tint(RED, [bx(0.42, 0.45, 0.42, x - 0.75, 0.225, z), bx(0.42, 0.45, 0.42, x + 0.75, 0.225, z), bx(0.42, 0.45, 0.42, x, 0.225, z + 0.75)])), y || 0); }
    function pendants(n, w, y, z) { var a = []; for (var i = 0; i < n; i++) { var x = -w / 2 + (i + 0.5) * w / n; a.push(cyl(0.015, 0.015, 0.5, x, y + 0.3, z, 4), cyl(0.05, 0.2, 0.2, x, y, z, 8)); } return tint(RED, a); }
    function stairs(x, z0, dir, n, col, wd) { var a = []; for (var i = 0; i < n; i++) a.push(bx(wd || 1.1, 0.14, 0.36, x, 0.18 + i * 0.33, z0 - dir * i * 0.34)); a.push(bx(0.06, 0.06, n * 0.48, x - (wd || 1.1) / 2, 1.05 + n * 0.165, z0 - dir * n * 0.17, 0, dir * 0.77), bx(0.06, 0.06, n * 0.48, x + (wd || 1.1) / 2, 1.05 + n * 0.165, z0 - dir * n * 0.17, 0, dir * 0.77)); return tint(col, a); }

    // ---------- لافتات (تُجمع في شبكة واحدة) ----------
    var signs = [];
    function sign(kind, o, lx, y, lz, w, h, id) { var co = Math.cos(o.rot), si = Math.sin(o.rot); signs.push({ kind: kind, id: id, obj: o, x: o.x + lx * co + lz * si, y: y + 0.08, z: o.z - lx * si + lz * co, rot: o.rot, w: w, h: h }); }

    // ---------- بنّاؤو الأجنحة (الواجهة باتجاه +z) ----------
    var builders = {
      E: function (P, w, d, t, o) {
        var hw = w / 2 - 0.1, hd = d / 2 - 0.1, sl = [], i;
        for (i = 0; i < 5; i++) sl.push(bx(0.07, 0.07, d, -hw + 0.4 + i * (w - 1) / 4, 2.99, 0));
        P.metal = cat(tint(RED, cat([bx(0.14, 2.9, 0.14, -hw, 1.45, -hd), bx(0.14, 2.9, 0.14, hw, 1.45, -hd), bx(0.14, 2.9, 0.14, -hw, 1.45, hd), bx(0.14, 2.9, 0.14, hw, 1.45, hd), bx(w, 0.14, 0.14, 0, 2.9, hd), bx(w, 0.14, 0.14, 0, 2.9, -hd), bx(0.14, 0.14, d, -hw, 2.9, 0), bx(0.14, 0.14, d, hw, 2.9, 0)], sl)), tint(t.color, [bx(w + 0.2, 0.08, d + 0.2, 0, 3.07, 0)]));
        P.matte = cat(tint('#46692a', [ico(0.7, -0.9, 3.28, 0.3, 1.5, 0.42, 1.25), ico(0.6, 0.9, 3.3, -0.4, 1.6, 0.45, 1.3)]), tint(GREEN2, [ico(0.42, 0.1, 3.32, 0.95, 1.9, 0.4, 0.9), ico(0.3, -hw, 2.5, hd, 0.5, 1.5, 0.5)]),
          tint(RED, [bx(0.5, 0.5, 0.5, -hw - 0.05, 0.25, hd + 0.2), bx(0.38, 0.38, 0.38, -hw - 0.05, 0.69, hd + 0.2), bx(0.5, 0.5, 0.5, hw + 0.05, 0.25, hd + 0.2)]),
          tint(CREAM, [bx(w * 0.78, 0.9, 0.04, 0, 0.5, hd - 0.17)]), tint(t.color, [bx(1.0, 0.46, 0.05, 0, 2.55, hd + 0.08)]), plant(hw + 0.05, hd + 0.2, 0.55, 0.5));
        P.wood = [bx(w * 0.78, 1.05, 0.65, 0, 0.525, hd - 0.5), bx(w * 0.84, 0.06, 0.78, 0, 1.08, hd - 0.5), bx(w * 0.86, 2.2, 0.08, 0, 1.3, -hd + 0.02)];
        sign('id', o, 0, 2.55, hd + 0.11, 0.9, 0.45, o.id); sign('logo', o, 0, 0.5, hd - 0.14, 0.56, 0.56);
        return { labelY: 3.74 };
      },
      K: function (P, w, d, t, o) {
        P.metal = cat(tint(RED, [bx(w - 0.2, 2.25, d - 0.3, 0, 1.125, -0.05)]), tint(t.color, [bx(w, 0.1, d + 0.1, 0, 2.3, 0)]));
        P.matte = cat(tint(DARK, [bx(w - 0.9, 0.95, 0.06, 0, 1.62, d / 2 - 0.17)]), tint(CHAR, [bx(0.08, 0.9, 0.08, -w / 2 + 0.3, 2.8, 0.3), bx(0.08, 0.9, 0.08, w / 2 - 0.3, 2.8, 0.3)]), tint(CREAM, [bx(w - 0.5, 0.62, 0.06, 0, 3.02, 0.3)]), tint(t.color, [bx(0.62, 0.34, 0.04, -w / 2 + 0.5, 0.75, d / 2 - 0.18)]));
        P.wood = [bx(w - 0.7, 0.08, 0.5, 0, 1.1, d / 2 - 0.05)];
        P.fabric = [bx(w - 0.3, 0.05, 0.9, 0, 2.15, d / 2 + 0.3, 0, 0.3)];
        sign('logo', o, 0, 3.02, 0.34, 0.5, 0.5); sign('id', o, -w / 2 + 0.5, 0.75, d / 2 - 0.15, 0.56, 0.28, o.id);
        return { labelY: 2.38, front: [w - 0.9, 0.95, 1.62, d / 2 - 0.13] };
      },
      S: function (P, w, d, t, o) {
        var px = w / 2 - 0.23, pz = d / 2 - 0.28;
        P.metal = cat(tint(RED, [bx(w - 0.3, 1.05, d - 0.4, 0, 0.525, 0), bx(0.16, 2.6, 0.16, -px, 1.3, pz), bx(0.16, 2.6, 0.16, px, 1.3, pz), bx(0.16, 2.6, 0.16, -px, 1.3, -pz), bx(0.16, 2.6, 0.16, px, 1.3, -pz), bx(w - 0.3, 1.6, 0.1, 0, 1.85, -d / 2 + 0.25), bx(0.1, 1.6, d - 0.5, -w / 2 + 0.2, 1.85, 0), bx(0.1, 1.6, d - 0.5, w / 2 - 0.2, 1.85, 0)]),
          tint(t.color, [bx(w - 0.1, 0.1, d - 0.2, 0, 2.65, 0), bx(w - 0.4, 0.06, 1.5, 0, 3.0, d / 2 + 0.45, 0, -0.42), bx(w - 0.4, 0.06, 1.1, 0, 2.9, -d / 2 - 0.35, 0, 0.42)]));
        P.matte = cat(tint(DARK, [bx(w - 0.6, 1.5, 0.05, 0, 1.85, -d / 2 + 0.32)]), tint(CREAM, [bx(w - 0.2, 0.08, 0.6, 0, 1.09, d / 2 - 0.3), bx(w - 1, 0.05, 0.3, 0, 1.9, -d / 2 + 0.5), bx(w - 1, 0.05, 0.3, 0, 2.3, -d / 2 + 0.5)]), pendants(3, w - 1.5, 2.25, d / 2 - 0.5), tint(t.color, [bx(0.8, 0.42, 0.04, w / 2 - 0.75, 0.6, d / 2 - 0.19)]), tint('#d9a23c', [bx(0.3, 0.26, 0.2, -1.2, 2.05, -d / 2 + 0.5), bx(0.3, 0.26, 0.2, 0.4, 2.05, -d / 2 + 0.5), bx(0.3, 0.26, 0.2, 1.4, 2.45, -d / 2 + 0.5)]));
        sign('id', o, w / 2 - 0.75, 0.6, d / 2 - 0.16, 0.72, 0.36, o.id); sign('logo', o, -w / 2 + 0.85, 0.56, d / 2 - 0.19, 0.6, 0.6);
        return { labelY: 2.74, front: [w - 0.6, 1.5, 1.85, -d / 2 + 0.36] };
      },
      B: function (P, w, d, t, o) {
        var px = w / 2 - 0.23, pz = d / 2 - 0.28, jars = [], i;
        for (i = 0; i < 6; i++) jars.push(bx(0.24, 0.3, 0.24, -1.6 + i * 0.64, 1.71 + (i % 2) * 0.45, -d / 2 + 0.5));
        P.metal = cat(tint(REDD, [bx(w - 0.3, 1.05, d - 0.4, 0, 0.525, 0), bx(0.16, 2.6, 0.16, -px, 1.3, pz), bx(0.16, 2.6, 0.16, px, 1.3, pz), bx(0.16, 2.6, 0.16, -px, 1.3, -pz), bx(0.16, 2.6, 0.16, px, 1.3, -pz), bx(w - 0.3, 1.6, 0.1, 0, 1.85, -d / 2 + 0.25), bx(0.1, 1.6, d - 0.5, -w / 2 + 0.2, 1.85, 0), bx(0.1, 1.6, d - 0.5, w / 2 - 0.2, 1.85, 0)]), tint(t.color, [bx(w - 0.1, 0.1, d - 0.2, 0, 2.65, 0)]));
        P.matte = cat(tint(DARK, [bx(w - 0.6, 1.5, 0.05, 0, 1.85, -d / 2 + 0.32)]), tint('#c98a3a', jars), tint(t.color, [bx(0.8, 0.42, 0.04, w / 2 - 0.75, 0.6, d / 2 - 0.19)]), pendants(2, w - 2, 2.25, d / 2 - 0.5));
        P.wood = [bx(w - 0.8, 0.06, 0.4, 0, 1.52, -d / 2 + 0.5), bx(w - 0.8, 0.06, 0.4, 0, 1.97, -d / 2 + 0.5), bx(w - 0.2, 0.08, 0.6, 0, 1.09, d / 2 - 0.3)];
        P.fabric = [bx(w - 0.2, 0.05, 1.5, 0, 2.85, d / 2 + 0.5, 0, -0.3)];
        sign('id', o, w / 2 - 0.75, 0.6, d / 2 - 0.16, 0.72, 0.36, o.id); sign('logo', o, -w / 2 + 0.85, 0.56, d / 2 - 0.19, 0.6, 0.6);
        return { labelY: 2.74, front: [w - 0.6, 1.5, 1.85, -d / 2 + 0.36] };
      },
      G: function (P, w, d, t, o) {
        var fz = d * 0.01;
        P.wood = [bx(w, 0.22, d, 0, 0.11, 0)];
        P.metal = cat(tint(RED, [bx(w - 0.3, 2.75, d * 0.5, 0, 1.6, -d * 0.24)]), tint(t.color, [bx(w + 0.2, 0.14, d + 0.2, 0, 3.2, 0)]), tint(CHAR, [bx(0.14, 2.9, 0.14, -w / 2 + 0.15, 1.67, d / 2 - 0.15), bx(0.14, 2.9, 0.14, w / 2 - 0.15, 1.67, d / 2 - 0.15), bx(w, 0.3, 0.1, 0, 2.98, d / 2 - 0.05)]));
        P.glass = [bx(w - 0.9, 2.2, 0.04, 0, 1.45, fz + 0.06)];
        P.matte = cat(tint(DARK, [bx(w - 1, 2.1, 0.01, 0, 1.42, fz + 0.005)]), tableSet(-1.35, 1.55, 0.22), tableSet(1.45, 1.9, 0.22), plant(w / 2 - 0.5, d / 2 - 0.55, 0.8, 0.22), plant(-w / 2 + 0.5, d / 2 - 0.55, 0.7, 0.22), tint(t.color, [bx(1, 0.44, 0.05, 0, 2.98, d / 2 + 0.02)]), tint(CHAR, [cyl(0.5, 0.5, 0.06, -w / 2 + 0.95, 2.25, fz + 0.1, 20, H)]));
        sign('id', o, 0, 2.98, d / 2 + 0.05, 0.9, 0.45, o.id); sign('logo', o, -w / 2 + 0.95, 2.25, fz + 0.14, 0.9, 0.9);
        return { labelY: 3.3, front: [w - 1, 2.1, 1.42, fz + 0.02] };
      },
      D: function (P, w, d, t, o) {
        var hw = w / 2, hd = d / 2;
        P.metal = cat(tint(RED, [bx(w - 0.4, 2.9, d - 0.8, 0, 1.45, -0.1), bx(0.16, 3.2, 0.16, -hw + 0.2, 4.7, hd - 0.2), bx(0.16, 3.2, 0.16, hw - 0.2, 4.7, hd - 0.2), bx(0.16, 3.2, 0.16, -hw + 0.2, 4.7, -hd + 0.2), bx(0.16, 3.2, 0.16, hw - 0.2, 4.7, -hd + 0.2)]), stairs(hw + 0.65, hd - 0.4, 1, 9, RED), tint(t.color, [bx(w + 0.3, 0.16, d + 0.3, 0, 6.38, 0)]), tint(GREY, [bx(w * 0.4, 2.4, d * 0.5, -w * 0.24, 4.32, -d * 0.2)]));
        P.wood = [bx(w, 0.12, d, 0, 3.06, 0), bx(w - 2.4, 0.08, 0.7, 0, 1.1, hd - 0.45)];
        P.matte = cat(tint(CREAM, [bx(w + 0.1, 0.2, d + 0.1, 0, 2.9, 0)]), tint(DARK, [bx(w - 2.6, 1.4, 0.05, 0, 1.9, hd - 0.49)]),
          tint(CHAR, [bx(w, 0.06, 0.06, 0, 4.16, hd - 0.05), bx(w, 0.06, 0.06, 0, 4.16, -hd + 0.05), bx(0.06, 0.06, d, -hw + 0.05, 4.16, 0), bx(0.06, 0.06, d * 0.55, hw - 0.05, 4.16, -d * 0.2), bx(3.2, 1.3, 0.1, 0, 5.55, hd - 0.12)]),
          tableSet(1.2, 1.3, 3.12), tableSet(3.9, -0.6, 3.12), tableSet(-1.2, 1.5, 3.12), plant(hw - 0.5, -hd + 0.5, 0.8, 3.12), plant(-hw + 0.5, hd - 0.5, 0.8, 3.12), pendants(6, w - 2, 5.95, hd - 0.7), tint(t.color, [bx(1.2, 0.5, 0.05, -hw + 1.3, 2.3, hd - 0.47)]), plant(-hw + 0.3, hd - 0.2, 0.9), plant(hw - 0.9, hd - 0.2, 0.9));
        P.glass = [bx(w, 1.0, 0.03, 0, 3.64, hd - 0.05), bx(w, 1.0, 0.03, 0, 3.64, -hd + 0.05), bx(0.03, 1.0, d, -hw + 0.05, 3.64, 0), bx(0.03, 1.0, d * 0.55, hw - 0.05, 3.64, -d * 0.2)];
        P.fabric = [bx(w - 2.2, 0.05, 1.3, 0, 2.72, hd + 0.2, 0, -0.25)];
        sign('logo', o, 0, 5.55, hd - 0.06, 1.15, 1.15); sign('id', o, -hw + 1.3, 2.3, hd - 0.44, 1.08, 0.54, o.id);
        return { labelY: 6.5, front: [w - 2.6, 1.4, 1.9, hd - 0.46] };
      },
      MEDIA: function (P, w, d, t, o) {
        var hw = w / 2, hd = d / 2;
        P.metal = cat(tint(RED, [bx(w, 0.2, d, 0, 0.1, 0), bx(w, 2.7, 0.12, 0, 1.45, -hd + 0.06), bx(0.12, 2.7, d, -hw + 0.06, 1.45, 0), bx(0.12, 2.7, d, hw - 0.06, 1.45, 0), bx(w, 0.18, d, 0, 2.9, 0)]), stairs(-hw - 0.6, hd - 0.3, 1, 9, TEAL, 1.0), tint(t.color, [bx(w * 0.72, 0.08, d * 0.8, 0.6, 5.52, 0)]));
        P.matte = cat(tint(WHITE, [bx(2.4, 0.75, 0.9, 0, 0.58, 0), bx(0.1, 2.4, 0.1, 0.6 - w * 0.33, 4.2, -d * 0.36), bx(0.1, 2.4, 0.1, 0.6 + w * 0.33, 4.2, -d * 0.36), bx(0.1, 2.4, 0.1, 0.6 - w * 0.33, 4.2, d * 0.36), bx(0.1, 2.4, 0.1, 0.6 + w * 0.33, 4.2, d * 0.36), bx(w * 0.7, 0.1, d * 0.78, 0.6, 5.43, 0)]),
          tint(RED, [bx(0.45, 0.5, 0.45, -0.9, 0.45, 0.9), bx(0.45, 0.5, 0.45, 0.9, 0.45, 0.9)]), tint(CHAR, [cyl(0.03, 0.03, 1.4, 2.4, 0.9, 1.3, 4), bx(0.3, 0.22, 0.42, 2.4, 1.68, 1.3), bx(w, 0.06, 0.06, 0, 3.96, hd - 0.04), bx(w, 0.06, 0.06, 0, 3.96, -hd + 0.04), bx(0.06, 0.06, d, hw - 0.04, 3.96, 0)]), tableSet(0.8, 0, 2.99));
        P.glass = [bx(w, 0.95, 0.03, 0, 3.47, hd - 0.04), bx(w, 0.95, 0.03, 0, 3.47, -hd + 0.04), bx(0.03, 0.95, d, hw - 0.04, 3.47, 0)];
        sign('logo', o, 0, 1.75, -hd + 0.16, 1.3, 1.3);
        return { front: [w - 0.4, 2.4, 1.5, -hd + 0.14] };
      },
      STAGE: function (P, w, d, t, o, g) {
        var hw = w / 2, hd = d / 2, bar = [], fx = [], i;
        for (i = -4; i <= 4; i++) bar.push(bx(2.2, 1.05, 0.06, i * 2.4, 0.6, hd + 3.4), bx(0.06, 0.06, 0.7, i * 2.4 - 1, 0.06, hd + 3.4), bx(0.06, 0.06, 0.7, i * 2.4 + 1, 0.06, hd + 3.4));
        for (i = 0; i < 9; i++) fx.push(cyl(0.16, 0.22, 0.42, -8 + i * 2, 9.18, hd - 0.3, 8));
        P.matte = cat(tint(CHAR, cat([bx(w, 1.2, d, 0, 0.6, 0), bx(5, 0.6, 1.2, 0, 0.3, hd + 0.6), bx(5, 0.3, 1.2, 0, 0.15, hd + 1.6), bx(1.3, 2.4, 1.1, -hw + 1.1, 2.4, hd - 0.9), bx(1.3, 2.4, 1.1, hw - 1.1, 2.4, hd - 0.9), bx(2.4, 0.9, 1.1, -hw + 3.2, 1.65, hd - 0.8), bx(2.4, 0.9, 1.1, hw - 3.2, 1.65, hd - 0.8), bx(12.8, 6.6, 0.4, 0, 4.7, -hd + 0.7)], fx)),
          tint(RED, [bx(w + 0.05, 0.12, 0.1, 0, 1.1, hd + 0.03), bx(w + 0.05, 0.12, 0.1, 0, 0.45, hd + 0.03)]), tint(t.color, [bx(w - 0.5, 0.05, d - 0.5, 0, 1.23, 0)]), tint(STEEL, bar));
        P.truss = [bx(0.5, 8.6, 0.5, -hw + 0.3, 5.5, -hd + 0.3), bx(0.5, 8.6, 0.5, hw - 0.3, 5.5, -hd + 0.3), bx(0.5, 8.6, 0.5, -hw + 0.3, 5.5, hd - 0.3), bx(0.5, 8.6, 0.5, hw - 0.3, 5.5, hd - 0.3), bx(w - 0.2, 0.5, 0.5, 0, 9.6, hd - 0.3), bx(w - 0.2, 0.5, 0.5, 0, 9.6, -hd + 0.3), bx(0.5, 0.5, d - 0.2, -hw + 0.3, 9.6, 0), bx(0.5, 0.5, d - 0.2, hw - 0.3, 9.6, 0), bx(w - 0.2, 0.45, 0.45, 0, 9.6, 0)];
        P.redGlass = [bx(3.4, 3.4, 0.08, -8, 5.6, -hd + 0.75, 0, 0, PI / 4), bx(2.0, 2.0, 0.08, -7.9, 2.8, -hd + 0.8, 0, 0, PI / 4), bx(3.4, 3.4, 0.08, 8, 5.6, -hd + 0.75, 0, 0, PI / 4), bx(2.0, 2.0, 0.08, 7.9, 2.8, -hd + 0.8, 0, 0, PI / 4)];
        var led = new T.Mesh(new T.PlaneGeometry(12, 5.8), new T.MeshBasicMaterial({ map: ledTex, toneMapped: false })); led.position.set(0, 4.7, -hd + 0.92); g.add(led);
        beams = new T.Group();
        for (i = 0; i < 5; i++) { var c = new T.Mesh(new T.ConeGeometry(2.2, 9, 20, 1, true).translate(0, -4.5, 0), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4a3a : 0xffe2b0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); c.position.set(-8 + i * 4, 9.3, hd - 0.4); c.userData.ph = i * 1.3; beams.add(c); }
        g.add(beams);
        return {};
      },
      COMP: function (P, w, d, t, o, g) {
        var hw = w / 2, h = 5.2, fr = [], i, s, pos = [];
        for (i = 0; i <= 3; i++) { var tt = -hw + i * w / 3; [[tt, -hw], [tt, hw], [-hw, tt], [hw, tt]].forEach(function (p) { fr.push(bx(0.16, h, 0.16, p[0], h / 2, p[1])); }); }
        [-hw, hw].forEach(function (v) { fr.push(bx(w, 0.16, 0.16, 0, h, v), bx(0.16, 0.16, w, v, h, 0), bx(w, 0.12, 0.12, 0, h / 2, v), bx(0.12, 0.12, w, v, h / 2, 0)); });
        P.matte = cat(tint(t.color, [bx(w, 0.14, d, 0, 0.07, 0)]), tint(WHITE, fr), tint(STEEL, [bx(2.6, 0.92, 1.0, -3, 0.6, -1), bx(2.6, 0.92, 1.0, 3, 0.6, -1), bx(2.6, 0.92, 1.0, -3, 0.6, 2.4), bx(2.6, 0.92, 1.0, 3, 0.6, 2.4), bx(1.2, 0.5, 0.8, -3, 2.7, -1), bx(1.2, 0.5, 0.8, 3, 2.7, -1)]), tint(CHAR, [bx(5.2, 2.8, 0.2, 0, 2.4, -hw + 0.5), bx(0.8, 0.1, 0.6, -3, 1.11, -1), bx(0.8, 0.1, 0.6, 3, 1.11, 2.4)]));
        P.wood = [bx(2.7, 0.9, 0.06, -3, 0.6, -0.47), bx(2.7, 0.9, 0.06, 3, 0.6, -0.47), bx(2.7, 0.9, 0.06, -3, 0.6, 2.93), bx(2.7, 0.9, 0.06, 3, 0.6, 2.93)];
        function tri(a, b, c) { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
        for (s = 0; s < 4; s++) for (i = 0; i < 6; i++) {
          if (s === 0 && (i === 2 || i === 3)) continue;
          var u0 = -hw + i * w / 6, u1 = u0 + w / 6, um = (u0 + u1) / 2, y0 = (i % 2) ? h / 2 : 0, y1 = y0 + h / 2;
          var Pt = function (u, y) { return s === 0 ? [u, y, hw] : s === 1 ? [u, y, -hw] : s === 2 ? [hw, y, u] : [-hw, y, u]; };
          if (i % 2) tri(Pt(u0, y1), Pt(u1, y1), Pt(um, y0)); else tri(Pt(u0, y0), Pt(u1, y0), Pt(um, y1));
        }
        var tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); tg.computeVertexNormals(); g.add(new T.Mesh(tg, M.redGlass));
        var scr = new T.Mesh(new T.PlaneGeometry(4.8, 2.4), new T.MeshBasicMaterial({ map: ledTex, toneMapped: false })); scr.position.set(0, 2.4, -hw + 0.62); g.add(scr);
        return {};
      }
    };
    var MATS = { metal: M.metal, matte: M.matte, wood: M.wood, glass: M.glass, fabric: M.fabric, truss: M.truss, redGlass: M.redGlass };
    function assemble(g, P) { Object.keys(P).forEach(function (k) { var m = part(g, P[k], MATS[k], k !== 'glass' && k !== 'redGlass'); if (m && (k === 'glass' || k === 'redGlass')) m.renderOrder = 7; }); }

    // ---------- إنشاء الأجنحة ----------
    var boothObjs = [], hitMeshes = [], byId = {}, obstacles = [], circles = [];
    var gate = D.site.gateIn.p;
    D.booths.forEach(function (b) {
      var t = D.types[b.type], g = new T.Group(), P = {};
      g.position.set(b.x, 0.08, b.z); g.rotation.y = b.rot;
      var info = builders[b.type](P, b.w, b.d, t, b, g) || {};
      assemble(g, P);
      g.scale.y = 0.001; g.visible = false; built.add(g);
      var hit = new T.Mesh(new T.BoxGeometry(b.w, t.h, b.d), new T.MeshBasicMaterial({ visible: false }));
      hit.position.set(b.x, t.h / 2, b.z); hit.rotation.y = b.rot; hit.userData.booth = b; scene.add(hit); hitMeshes.push(hit);
      var dx = b.x - gate[0], dz = b.z - gate[1];
      var o = { b: b, t: t, group: g, hit: hit, delay: Math.sqrt(dx * dx + dz * dz) / 70, s: 0, target: 0, t0: 0, from: 0, flat: false, labelY: info.labelY, front: info.front };
      boothObjs.push(o); byId[b.id] = o; obstacles.push({ x: b.x, z: b.z, w: b.w, d: b.d, rot: b.rot });
    });
    signs.forEach(function (s) { if (s.obj && s.obj.id) s.owner = byId[s.obj.id]; });

    // ---------- عربات الطعام + الطاولات + الجلسات + الأعلام ----------
    var truckFronts = [];
    (function () {
      var cols = [CHAR, RED, '#e9e5dc'];
      D.site.trucks.forEach(function (t, i) {
        var g = new T.Group(), P = {}, c = cols[i % 3]; g.position.set(t.x, 0.08, t.z); g.rotation.y = t.rot;
        P.metal = cat(tint(c, [bx(5.2, 2.25, 2.2, -0.6, 1.65, 0), bx(1.8, 1.5, 2.1, 2.9, 1.2, 0)]), tint(CHAR, [bx(0.2, 0.3, 2.14, 3.85, 0.6, 0), bx(5.4, 0.16, 2.24, -0.6, 0.6, 0)]));
        P.glass = [bx(0.06, 0.7, 1.8, 3.79, 1.55, 0), bx(1.0, 0.6, 0.04, 3.0, 1.55, 1.06), bx(1.0, 0.6, 0.04, 3.0, 1.55, -1.06)];
        P.matte = cat(tint('#151517', [cyl(0.44, 0.44, 0.3, -2.2, 0.44, 1.0, 14, H), cyl(0.44, 0.44, 0.3, 2.7, 0.44, 1.0, 14, H), cyl(0.44, 0.44, 0.3, -2.2, 0.44, -1.0, 14, H), cyl(0.44, 0.44, 0.3, 2.7, 0.44, -1.0, 14, H)]), tint(STEEL, [cyl(0.2, 0.2, 0.32, -2.2, 0.44, 1.0, 10, H), cyl(0.2, 0.2, 0.32, 2.7, 0.44, 1.0, 10, H), bx(3.4, 0.06, 0.45, -0.6, 1.42, 1.3)]), tint(DARK, [bx(3.2, 1.0, 0.05, -0.6, 1.95, 1.08)]), tint(CHAR, [bx(0.7, 1.0, 0.06, -3.7, 0.6, 1.9, 0.3)]), tint('#fff4c8', [bx(0.05, 0.18, 0.3, 3.95, 0.95, 0.75), bx(0.05, 0.18, 0.3, 3.95, 0.95, -0.75)]));
        P.fabric = [bx(3.6, 0.05, 1.3, -0.6, 2.75, 1.7, 0, -0.28)];
        assemble(g, P); deco.add(g);
        var o = { x: t.x, z: t.z, rot: t.rot }; sign('logo', o, -2.75, 1.7, 1.12, 0.85, 0.85);
        truckFronts.push({ b: o, front: [3.2, 1.0, 1.95, 1.12], lx: -0.6 }); obstacles.push({ x: t.x, z: t.z, w: 8, d: 2.6, rot: t.rot });
      });
      var r = rng(41), tg = merge([bx(1.9, 0.08, 0.8, 0, 0.76, 0), bx(1.9, 0.06, 0.3, 0, 0.46, 0.62), bx(1.9, 0.06, 0.3, 0, 0.46, -0.62), bx(0.1, 0.76, 1.5, -0.7, 0.38, 0), bx(0.1, 0.76, 1.5, 0.7, 0.38, 0)]);
      var spots = [], i, j;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) spots.push([D.mx(408 + i * 22), D.mz(626 + j * 24), 0]);
      [[80, 398], [80, 440], [80, 480], [80, 520], [150, 768], [200, 768], [250, 768], [300, 768], [272, 432], [300, 462]].forEach(function (p) { spots.push([D.mx(p[0]), D.mz(p[1]), r() * 3]); });
      var tables = new T.InstancedMesh(tg, std('#b9402f', { roughness: 0.7, map: TX.wood }), spots.length), dm = new T.Object3D();
      spots.forEach(function (s, k) { dm.position.set(s[0], 0.08, s[1]); dm.rotation.y = s[2]; dm.updateMatrix(); tables.setMatrixAt(k, dm.matrix); });
      tables.castShadow = true; tables.receiveShadow = true; tables.frustumCulled = false; deco.add(tables);
      // جلسات مظللة
      [[362, 632], [362, 690], [500, 548]].forEach(function (p) {
        var g = new T.Group(), P = {}; g.position.set(D.mx(p[0]), 0.08, D.mz(p[1]));
        P.wood = [bx(0.24, 3, 0.24, -2, 1.5, -1.6), bx(0.24, 3, 0.24, 2, 1.5, -1.6), bx(0.24, 3, 0.24, -2, 1.5, 1.6), bx(0.24, 3, 0.24, 2, 1.5, 1.6), bx(4.7, 0.22, 0.22, 0, 3, -1.6), bx(4.7, 0.22, 0.22, 0, 3, 1.6), bx(0.18, 0.18, 3.8, -1.2, 3.18, 0), bx(0.18, 0.18, 3.8, 0, 3.18, 0), bx(0.18, 0.18, 3.8, 1.2, 3.18, 0)];
        P.matte = cat(tint('#46692a', [ico(0.9, -0.8, 3.45, 0.2, 2.2, 0.32, 1.9), ico(0.7, 1.1, 3.45, -0.3, 2, 0.3, 2), ico(0.3, -2, 2.4, 1.6, 0.6, 2, 0.6), ico(0.3, 2, 2.6, -1.6, 0.6, 1.8, 0.6)]), tint(CREAM, [bx(2.6, 0.45, 0.8, 0, 0.32, -1.1), bx(2.6, 0.5, 0.2, 0, 0.75, -1.42), bx(0.8, 0.45, 1.4, -1.5, 0.32, 0.2), bx(0.8, 0.45, 1.4, 1.5, 0.32, 0.2)]), tint(RED, [bx(0.5, 0.5, 0.5, -2, 0.25, -1.6), bx(0.5, 0.5, 0.5, 2, 0.25, -1.6), bx(0.5, 0.5, 0.5, -2, 0.25, 1.6), bx(0.5, 0.5, 0.5, 2, 0.25, 1.6), bx(0.5, 0.16, 0.5, -0.6, 0.63, -1.1), bx(0.5, 0.16, 0.5, 0.6, 0.63, -1.1)]));
        assemble(g, P); deco.add(g); obstacles.push({ x: g.position.x, z: g.position.z, w: 4.4, d: 3.6, rot: 0 });
      });
      // أعلام الراعي (10)
      var fl = [], fp = [];
      [[430, 520], [448, 548], [372, 536], [352, 560], [505, 600], [505, 735], [345, 600], [345, 735], [420, 792], [300, 560]].forEach(function (p, k) {
        var x = D.mx(p[0]), z = D.mz(p[1]); fp.push(cyl(0.04, 0.05, 5.2, x, 2.6, z, 6)); fl.push(bx(0.9, 3.2, 0.03, x + 0.5, 3.5, z, k * 0.7));
      });
      part(deco, cat(tint(STEEL, fp), tint(RED, fl)), M.matte);
    })();

    // ---------- البوابات ----------
    (function () {
      var g = new T.Group(), gi = D.site.gateIn, P = {}; g.position.set(gi.p[0], 0.08, gi.p[1]); g.rotation.y = gi.rot;
      var cubes = [], pan = [];
      [[-6, 1.5, 3], [-9, 1.5, 3], [-6, 4.5, 3], [-11.8, 1.3, 2.6], [-8.8, 4.3, 2.4], [6, 1.5, 3], [9, 1.5, 3], [6, 4.5, 3], [11.8, 1.3, 2.6], [8.8, 4.3, 2.4], [-2.4, 9.3, 2.8], [2.4, 9.3, 2.8]].forEach(function (c, i) {
        cubes.push(bx(c[2], c[2], c[2], c[0], c[1], 0)); if (i % 2 === 0 || i > 9) pan.push(bx(c[2] * 0.72, c[2] * 0.72, 0.06, c[0], c[1], c[2] / 2 + 0.05, 0, 0, PI / 4));
      });
      P.matte = cat(tint(WHITE, [bx(1.3, 6.6, 1.3, -3.6, 3.3, 0), bx(1.3, 6.6, 1.3, 3.6, 3.3, 0), bx(8.5, 1.3, 1.3, 0, 7.2, 0)]), tint(RED, [bx(0.08, 6.2, 0.04, 3.2, 3.2, 0.67), bx(0.08, 6.2, 0.04, 3.45, 3.2, 0.67), bx(0.08, 6.2, 0.04, 3.7, 3.2, 0.67)]), tint(CHAR, [cyl(2.25, 2.25, 0.3, 0, 9.6, 0, 32, H)]));
      P.redGlass = pan;
      assemble(g, P); part(g, cubes, M.trussW); deco.add(g);
      var o = { x: gi.p[0], z: gi.p[1], rot: gi.rot }; sign('logo', o, 0, 9.6, 0.2, 4.1, 4.1); sign('logo', { x: o.x, z: o.z, rot: o.rot + PI }, 0, 9.6, 0.2, 4.1, 4.1);
      var co = Math.cos(gi.rot), si = Math.sin(gi.rot); [-3.6, 3.6].forEach(function (lx) { circles.push({ x: gi.p[0] + lx * co, z: gi.p[1] - lx * si, r: 1.0 }); });
      var e = new T.Group(), go = D.site.gateOut; e.position.set(go.p[0], 0.08, go.p[1]); e.rotation.y = go.rot;
      part(e, [bx(1.5, 6.4, 1.5, -3.4, 3.2, 0), bx(1.5, 6.4, 1.5, 3.4, 3.2, 0), bx(8.3, 1.5, 1.5, 0, 7.1, 0)], M.redGlass, false);
      part(e, [bx(1.56, 6.46, 1.56, -3.4, 3.2, 0), bx(1.56, 6.46, 1.56, 3.4, 3.2, 0), bx(8.36, 1.56, 1.56, 0, 7.1, 0)], std('#c4222a', { map: TX.truss, alphaTest: 0.5, side: T.DoubleSide }));
      var et = canvasTex(256, 96, function (x, w, h) { x.fillStyle = '#fff'; x.font = '900 78px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EXIT', w / 2, h / 2 + 4); });
      var ep = new T.Mesh(new T.PlaneGeometry(3.6, 1.35), new T.MeshBasicMaterial({ map: et, transparent: true, toneMapped: false, side: T.DoubleSide })); ep.position.set(0, 7.1, 0.8); e.add(ep);
      deco.add(e); [-3.4, 3.4].forEach(function (lx) { circles.push({ x: go.p[0] + lx, z: go.p[1], r: 1.1 }); });
    })();

    // ---------- ملصقات الأسقف + لافتات الواجهات + الشعارات (شبكة واحدة) ----------
    var labelObjs = boothObjs.filter(function (o) { return !o.t.special; });
    var atlas = canvasTex(2048, 1024, function (x) {
      labelObjs.forEach(function (o, i) {
        var cx0 = (i % 16) * 128 + 64, cy0 = Math.floor(i / 16) * 64 + 32;
        x.font = '900 ' + (o.b.id.length > 2 ? 40 : 46) + 'px ' + opts.font; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 6; x.strokeStyle = o.t.dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)'; x.strokeText(o.b.id, cx0, cy0 + 2);
        x.fillStyle = o.t.dark ? '#141414' : '#ffffff'; x.fillText(o.b.id, cx0, cy0 + 2);
      });
      x.fillStyle = '#141414'; x.beginPath(); x.arc(192, 832, 186, 0, 6.3); x.fill(); x.strokeStyle = '#f2efe9'; x.lineWidth = 12; x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f2efe9'; x.font = '400 150px ' + opts.displayFont; x.fillText('BBQ', 192, 812);
      x.save(); x.translate(206, 912); x.rotate(-0.1); x.fillStyle = '#ff2a22'; x.font = 'italic 900 84px ' + opts.displayFont; x.fillText('FEST', 0, 0); x.restore();
    });
    var labelMat = new T.MeshBasicMaterial({ map: atlas, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, alphaTest: 0.02 });
    var labelMesh = new T.Mesh(new T.BufferGeometry(), labelMat); labelMesh.renderOrder = 6; labelMesh.visible = false; labelMesh.frustumCulled = false; scene.add(labelMesh);
    var LOGO_UV = [0, 384 / 2048, 0, 384 / 1024];
    function buildLabels() {
      var pos = [], uv = [];
      function quad(TL, TR, BL, BR, u0, u1, v0, v1) { pos.push.apply(pos, TL.concat(BL, TR, TR, BL, BR)); uv.push(u0, v1, u0, v0, u1, v1, u1, v1, u0, v0, u1, v0); }
      labelObjs.forEach(function (o, i) {
        var b = o.b, side = Math.abs(Math.sin(b.rot)) > 0.9, diag = !side && Math.abs(Math.sin(b.rot)) > 0.3;
        var xe = diag ? 3.4 : (side ? b.d : b.w), ze = diag ? 3.4 : (side ? b.w : b.d), rot90 = ze > xe * 1.4;
        var lw = rot90 ? Math.min(ze * 0.9, xe * 1.8) : Math.min(xe * 0.9, ze * 1.8), lh = lw / 2;
        var y = (o.flat ? o.t.h * 0.1 : o.labelY) + 0.14, r = rot90 ? [0, 1] : [1, 0], u = rot90 ? [1, 0] : [0, -1];
        function Pq(sr, su) { return [b.x + r[0] * lw / 2 * sr + u[0] * lh / 2 * su, y, b.z + r[1] * lw / 2 * sr + u[1] * lh / 2 * su]; }
        var u0 = (i % 16) / 16, v1 = 1 - Math.floor(i / 16) / 16; o.uv = [u0, u0 + 1 / 16, v1 - 1 / 16, v1];
        quad(Pq(-1, 1), Pq(1, 1), Pq(-1, -1), Pq(1, -1), o.uv[0], o.uv[1], o.uv[2], o.uv[3]);
      });
      signs.forEach(function (s) {
        if (s.owner && s.owner.flat) return; var c = Math.cos(s.rot), si = Math.sin(s.rot), X = [c * s.w / 2, 0, -si * s.w / 2], N = [si * 0.012, 0, c * 0.012];
        var cx = s.x + N[0], cz = s.z + N[2], uvq = s.kind === 'logo' ? LOGO_UV : (s.owner ? s.owner.uv : null); if (!uvq) return;
        quad([cx - X[0], s.y + s.h / 2, cz - X[2]], [cx + X[0], s.y + s.h / 2, cz + X[2]], [cx - X[0], s.y - s.h / 2, cz - X[2]], [cx + X[0], s.y - s.h / 2, cz + X[2]], uvq[0], uvq[1], uvq[2], uvq[3]);
      });
      var g = labelMesh.geometry; g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2)); g.computeBoundingSphere();
    }
    buildLabels();

    // ---------- توهج الأرض + ظلال التلامس + الواجهات المضيئة ----------
    var glowTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,150,60,.9)'); g.addColorStop(0.45, 'rgba(255,120,40,.4)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    var aoTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'); x.shadowColor = 'rgba(0,0,0,1)'; x.shadowBlur = 16; x.fillStyle = '#000'; x.fillRect(26, 26, 76, 76); return new T.CanvasTexture(c); })();
    var glowMat = new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    var aoMat = new T.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: 0, depthWrite: false, color: 0x000000 });
    var frontMat = new T.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var glowMesh, frontMesh, aoMesh;
    (function () {
      var n = boothObjs.length, dm = new T.Object3D(), pg = new T.PlaneGeometry(1, 1); pg.rotateX(-H);
      glowMesh = new T.InstancedMesh(pg, glowMat, n); glowMesh.renderOrder = 3;
      aoMesh = new T.InstancedMesh(pg, aoMat, n + D.site.trucks.length); aoMesh.renderOrder = 1;
      boothObjs.forEach(function (o, i) { dm.rotation.set(0, o.b.rot, 0); dm.position.set(o.b.x, 0.16, o.b.z); dm.scale.set(o.b.w + 9, 1, o.b.d + 9); dm.updateMatrix(); glowMesh.setMatrixAt(i, dm.matrix); dm.position.y = 0.105; dm.scale.set((o.b.w + 1.3) * 1.68, 1, (o.b.d + 1.3) * 1.68); dm.updateMatrix(); aoMesh.setMatrixAt(i, dm.matrix); });
      D.site.trucks.forEach(function (t, i) { dm.rotation.set(0, t.rot, 0); dm.position.set(t.x, 0.105, t.z); dm.scale.set(8.4 * 1.68, 1, 3.4 * 1.68); dm.updateMatrix(); aoMesh.setMatrixAt(n + i, dm.matrix); });
      var fl = boothObjs.filter(function (o) { return !!o.front; }).concat(truckFronts);
      frontMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), frontMat, fl.length); frontMesh.renderOrder = 4;
      fl.forEach(function (o, i) { var b = o.b, f = o.front, lx = o.lx || 0, co = Math.cos(b.rot), si = Math.sin(b.rot); dm.rotation.set(0, b.rot, 0); dm.position.set(b.x + lx * co + f[3] * si, f[2] + 0.08, b.z - lx * si + f[3] * co); dm.scale.set(f[0], f[1], 1); dm.updateMatrix(); frontMesh.setMatrixAt(i, dm.matrix); });
      glowMesh.visible = frontMesh.visible = aoMesh.visible = false; glowMesh.frustumCulled = frontMesh.frustumCulled = aoMesh.frustumCulled = false; scene.add(aoMesh); scene.add(glowMesh); scene.add(frontMesh);
    })();

    // ---------- النخيل (سعف بخامة شفافة) ----------
    (function () {
      var fr = [], r = rng(31), k, i;
      for (k = 0; k < 20; k++) {
        var up = k < 8, ang = k * PI * 2 / (up ? 8 : 12) + (r() - 0.5) * 0.4, L = (up ? 3.4 : 4.6) + r() * 0.9, lift0 = up ? 2.2 : 1.0, droop = up ? 1.5 : 3.6 + r() * 1.2, pos = [], uvs = [], prev = null;
        for (i = 0; i <= 7; i++) { var t = i / 7, rr = t * L * (up ? 0.75 : 1), y = t * lift0 - t * t * droop, hw = 0.85; var cur = [[rr, y, -hw, 0, t], [rr, y, hw, 1, t]]; if (prev) { [prev[0], prev[1], cur[0], cur[0], prev[1], cur[1]].forEach(function (v) { pos.push(v[0], v[1], v[2]); uvs.push(v[3], v[4]); }); } prev = cur; }
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uvs), 2)); g.rotateX((r() - 0.5) * 0.5); g.rotateY(ang); g.computeVertexNormals(); fr.push(g);
      }
      var crownGeo = merge(fr); crownGeo.translate(0, 7.55, 0);
      var tg = new T.CylinderGeometry(0.2, 0.34, 7.7, 9, 6).toNonIndexed(), tp = tg.attributes.position; for (i = 0; i < tp.count; i++) { var yy = tp.getY(i) + 3.85; tp.setX(i, tp.getX(i) + Math.sin(yy * 0.28) * 0.28); } tg.translate(0, 3.85, 0); tg.computeVertexNormals();
      var trunkGeo = merge([tg, sph(0.5, 0.26, 7.5, 0, 1, 0.8, 1)]);
      var n = D.site.palms.length, trunks = new T.InstancedMesh(trunkGeo, M.trunk, n), crowns = new T.InstancedMesh(crownGeo, M.frond, n), dm = new T.Object3D();
      crowns.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: TX.frond, alphaTest: 0.35 });
      D.site.palms.forEach(function (p, j) { var s = 0.85 + r() * 0.4; dm.position.set(p[0], 0.05, p[1]); dm.scale.set(s, s, s); dm.rotation.set(0, r() * 6.28, 0); dm.updateMatrix(); trunks.setMatrixAt(j, dm.matrix); dm.position.x += 0.26 * s * Math.cos(dm.rotation.y); dm.position.z -= 0.26 * s * Math.sin(dm.rotation.y); dm.updateMatrix(); crowns.setMatrixAt(j, dm.matrix); circles.push({ x: p[0], z: p[1], r: 0.55 }); });
      trunks.castShadow = crowns.castShadow = true; trunks.receiveShadow = true; trunks.frustumCulled = crowns.frustumCulled = false; deco.add(trunks); deco.add(crowns);
      // مواقف سيارات
      var carGeo = merge(cat(tint('#ffffff', [bx(4.3, 0.62, 1.8, 0, 0.66, 0), bx(2.3, 0.5, 1.62, -0.25, 1.2, 0)]), tint('#16181c', [bx(2.34, 0.4, 1.66, -0.25, 1.2, 0), cyl(0.34, 0.34, 1.84, -1.35, 0.34, 0, 12, H), cyl(0.34, 0.34, 1.84, 1.35, 0.34, 0, 12, H)]), tint('#fff4c8', [bx(0.05, 0.14, 1.5, 2.16, 0.72, 0)])));
      var nc = 26, cars = new T.InstancedMesh(carGeo, std('#ffffff', { vertexColors: true, roughness: 0.3, metalness: 0.55 }), nc), cc = ['#f2f2f2', '#1c1c20', '#8a8f96', '#b01c22', '#d9d2c2', '#2a3a55', '#ffffff'];
      for (i = 0; i < nc; i++) { dm.scale.set(1, 1, 1); dm.position.set(D.mx(880 + (i % 13) * 24), 0.05, D.mz(i < 13 ? 598 : 632)); dm.rotation.set(0, H + (r() - 0.5) * 0.06, 0); dm.updateMatrix(); cars.setMatrixAt(i, dm.matrix); cars.setColorAt(i, new T.Color(cc[Math.floor(r() * cc.length)])); }
      cars.castShadow = true; cars.receiveShadow = true; cars.frustumCulled = false; deco.add(cars);
    })();

    // ---------- المنطاد ----------
    var balloon = new T.Group();
    (function () {
      var pts = [], i; for (i = 0; i <= 18; i++) { var t = i / 18, y = t * 13, rr = t < 0.62 ? 1.1 + Math.sin(t / 0.62 * H) * 5.2 : Math.cos((t - 0.62) / 0.38 * H) * 6.3; pts.push(new T.Vector2(Math.max(rr, 0.02), y)); }
      var tex = canvasTex(1024, 512, function (x, w, h) {
        for (var k = 0; k < 16; k++) { x.fillStyle = ['#c61f25', '#f3efe6', '#c61f25', '#1d1d21'][k % 4]; x.fillRect(k * w / 16, 0, w / 16 + 1, h); }
        x.fillStyle = '#141414'; x.fillRect(0, h * 0.4, w, h * 0.2); x.fillStyle = '#f3efe6'; x.font = '400 78px ' + opts.displayFont; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (var j = 0; j < 4; j++) x.fillText('BBQ FEST', w / 8 + j * w / 4, h * 0.505);
      });
      var env = new T.Mesh(new T.LatheGeometry(pts, 40), std('#ffffff', { map: tex, roughness: 0.7, side: T.DoubleSide })); env.castShadow = true; balloon.add(env);
      part(balloon, [bx(1.7, 1.3, 1.7, 0, -2.2, 0)], M.wood);
      part(balloon, tint(CHAR, [cyl(0.03, 0.03, 2.6, -0.8, -0.5, -0.8, 4), cyl(0.03, 0.03, 2.6, 0.8, -0.5, -0.8, 4), cyl(0.03, 0.03, 2.6, -0.8, -0.5, 0.8, 4), cyl(0.03, 0.03, 2.6, 0.8, -0.5, 0.8, 4)]), M.matte);
      var flame = new T.Mesh(new T.ConeGeometry(0.4, 1.4, 10), new T.MeshBasicMaterial({ color: 0xffa23a, toneMapped: false })); flame.position.y = -0.6; balloon.add(flame);
      balloon.position.set(D.site.balloon[0], 16, D.site.balloon[1]); deco.add(balloon);
    })();

    // ---------- الزوار (مجسّمات بثوب/عباية/ملابس عادية) + حركة مشي ----------
    var crowd = [];
    (function () {
      var r = rng(77), SKIN = '#c99873';
      var thobe = merge(cat(tint('#f6f3ec', [cyl(0.17, 0.3, 1.36, 0, 0.68, 0, 10), sph(0.25, 0, 1.36, 0, 1, 0.5, 0.62), cyl(0.06, 0.07, 0.72, -0.27, 1.04, 0, 6), cyl(0.06, 0.07, 0.72, 0.27, 1.04, 0, 6)]), tint(SKIN, [sph(0.115, 0, 1.6, 0.02)]), tint('#d8493f', [sph(0.14, 0, 1.63, -0.02, 1, 0.9, 1), bx(0.3, 0.34, 0.07, 0, 1.44, -0.13)]), tint('#141414', [cyl(0.125, 0.125, 0.03, 0, 1.7, -0.02, 10)])));
      var abaya = merge(cat(tint('#17171a', [cyl(0.15, 0.33, 1.4, 0, 0.7, 0, 10), sph(0.24, 0, 1.38, 0, 1, 0.5, 0.62), sph(0.15, 0, 1.6, -0.02, 1, 1.05, 1), cyl(0.06, 0.07, 0.7, -0.26, 1.04, 0, 6), cyl(0.06, 0.07, 0.7, 0.26, 1.04, 0, 6)]), tint(SKIN, [sph(0.095, 0, 1.59, 0.07)])));
      var casual = merge(cat(tint('#34363c', [bx(0.14, 0.8, 0.16, -0.09, 0.4, 0), bx(0.14, 0.8, 0.16, 0.09, 0.4, 0)]), tint('#ffffff', [bx(0.42, 0.6, 0.24, 0, 1.1, 0), cyl(0.055, 0.055, 0.62, -0.26, 1.08, 0, 6), cyl(0.055, 0.055, 0.62, 0.26, 1.08, 0, 6)]), tint('#e9c9a6', [sph(0.115, 0, 1.56, 0)]), tint('#2a211c', [sph(0.12, 0, 1.6, -0.02, 1, 0.8, 1)])));
      var areas = [[345, 505, 600, 735, 40], [400, 505, 615, 720, 26], [232, 305, 440, 530, 14], [48, 330, 606, 618, 12], [48, 330, 700, 712, 12], [440, 1100, 404, 411, 32], [440, 1100, 490, 497, 32], [102, 118, 372, 550, 9], [160, 178, 372, 550, 9], [345, 580, 520, 590, 16], [70, 300, 752, 770, 10]];
      function free(x, z) { for (var i = 0; i < D.booths.length; i++) { var b = D.booths[i], dx = x - b.x, dz = z - b.z, co = Math.cos(b.rot), si = Math.sin(b.rot), lx = dx * co - dz * si, lz = dx * si + dz * co; if (Math.abs(lx) < b.w / 2 + 0.8 && Math.abs(lz) < b.d / 2 + 0.8) return false; } return true; }
      var people = [];
      areas.forEach(function (a) {
        var n = Math.ceil(a[4] * LQ.people), c = 0, guard = 0;
        function rp() { return [D.mx(a[0] + r() * (a[1] - a[0])), D.mz(a[2] + r() * (a[3] - a[2]))]; }
        while (c < n && guard++ < 900) { var p = rp(); if (!free(p[0], p[1])) continue; var q = null; if (r() < 0.45) { for (var k = 0; k < 8 && !q; k++) { var cand = rp(); if (free(cand[0], cand[1]) && free((p[0] + cand[0]) / 2, (p[1] + cand[1]) / 2)) q = cand; } } people.push({ a: p, b: q, s: 0.9 + r() * 0.2, kind: r() < 0.42 ? 0 : (r() < 0.6 ? 1 : 2), sp: 0.7 + r() * 0.6, ph: r() * 100, yaw: r() * 6.28 }); c++; }
      });
      var cols = ['#6b7a8a', '#a8553f', '#3c5a4a', '#d8c9a8', '#7b6aa0', '#c9a23a', '#dddddd'];
      [thobe, abaya, casual].forEach(function (geo, kind) {
        var list = people.filter(function (p) { return p.kind === kind; }), mesh = new T.InstancedMesh(geo, std('#ffffff', { vertexColors: true, roughness: 0.9 }), list.length), dm = new T.Object3D();
        list.forEach(function (p, i) { dm.position.set(p.a[0], 0.08, p.a[1]); dm.scale.set(p.s, p.s, p.s); dm.rotation.y = p.yaw; dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix); if (kind === 2) mesh.setColorAt(i, new T.Color(cols[Math.floor(r() * cols.length)])); p.i = i; });
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; deco.add(mesh);
        crowd.push({ mesh: mesh, list: list.filter(function (p) { return !!p.b; }), dm: dm });
      });
    })();

    // ---------- حبال الإضاءة + رايات الزينة + الدخان ----------
    var bulbMat = new T.PointsMaterial({ map: dotTex, color: 0xffb566, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    var smoke = null;
    (function () {
      var lines = [[[345, 600], [430, 560], [505, 600], [505, 735], [420, 700], [345, 735], [345, 600]], [[430, 560], [420, 700]], [[420, 412], [1120, 412]], [[420, 492], [1120, 492]], [[232, 440], [305, 440], [305, 530], [232, 530], [232, 440]], [[48, 600], [330, 600]], [[48, 708], [330, 708]]];
      var pos = [], poles = [], wire = [], pen = [], k, pcount = 0;
      lines.forEach(function (l) {
        for (var i = 0; i < l.length - 1; i++) {
          var a = l[i], b = l[i + 1], len = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)) / D.PX, spans = Math.max(1, Math.round(len / 14));
          for (var s = 0; s < spans; s++) {
            var p0 = [D.mx(a[0] + (b[0] - a[0]) * s / spans), D.mz(a[1] + (b[1] - a[1]) * s / spans)], p1 = [D.mx(a[0] + (b[0] - a[0]) * (s + 1) / spans), D.mz(a[1] + (b[1] - a[1]) * (s + 1) / spans)];
            poles.push(cyl(0.06, 0.08, 5.5, p0[0], 2.75, p0[1], 6)); if (s === spans - 1) poles.push(cyl(0.06, 0.08, 5.5, p1[0], 2.75, p1[1], 6));
            var ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), sl = Math.sqrt(Math.pow(p1[0] - p0[0], 2) + Math.pow(p1[1] - p0[1], 2)), prev = null;
            for (k = 0; k <= 12; k++) { var t = k / 12, pt = [p0[0] + (p1[0] - p0[0]) * t, 5.3 - Math.sin(t * PI) * 0.9, p0[1] + (p1[1] - p0[1]) * t]; pos.push(pt[0], pt[1], pt[2]); if (prev) wire.push(prev[0], prev[1], prev[2], pt[0], pt[1], pt[2]); prev = pt; }
            var np = Math.floor(sl / 0.62); for (k = 0; k < np; k++) { var tt = (k + 0.5) / np, g = new T.BufferGeometry(), y0 = 4.75 - Math.sin(tt * PI) * 0.75, hw2 = 0.2; g.setAttribute('position', new T.BufferAttribute(new Float32Array([-hw2, 0, 0, hw2, 0, 0, 0, -0.46, 0]), 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(6), 2)); g.rotateY(-ang); g.translate(p0[0] + (p1[0] - p0[0]) * tt, y0, p0[1] + (p1[1] - p0[1]) * tt); tint(pcount++ % 2 ? '#f4efe6' : RED, g); pen.push(g); }
          }
        }
      });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
      var p = new T.Points(g, bulbMat); p.renderOrder = 8; p.frustumCulled = false; deco.add(p);
      var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.BufferAttribute(new Float32Array(wire), 3)); deco.add(new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0x222222 })));
      var pm = new T.Mesh(merge(tint(CHAR, poles)), M.matte); pm.castShadow = true; deco.add(pm);
      var bunting = new T.Mesh(merge(pen), std('#ffffff', { vertexColors: true, side: T.DoubleSide, roughness: 0.9 })); deco.add(bunting);
      // دخان الشواء
      var em = ['B1', 'B5', 'B8', 'S4', 'S9', 'E6', 'E18', 'E33', 'E44', 'G3', 'COMP'].map(function (id) { return byId[id]; }).filter(Boolean), per = 10, n = em.length * per, sp = new Float32Array(n * 3), scol = new Float32Array(n * 3);
      var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3)); sg.setAttribute('color', new T.BufferAttribute(scol, 3));
      smoke = new T.Points(sg, new T.PointsMaterial({ map: dotTex, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0.5, vertexColors: true, blending: T.AdditiveBlending, depthWrite: false })); smoke.frustumCulled = false; smoke.renderOrder = 9; smoke.userData = { em: em, per: per }; deco.add(smoke);
    })();

    // ---------- ملصقات المناطق ----------
    var zoneSprites = [];
    D.zones.forEach(function (z) {
      var s = textSprite([z.ar, z.en.toUpperCase()], { world: z.key === 'exhibitor' ? 20 : 15 });
      var yy = { stage: 14, comp: 10, gate: 15, balloon: 34, diamond: 11, gold: 8, exhibitor: 10 }[z.key] || 8;
      var zz = z.key === 'gold' ? D.mz(742) : z.z;
      s.position.set(z.x, yy, zz); s.userData.zone = z; scene.add(s); zoneSprites.push(s); fadeMats.zone.push(s.material);
    });

    // إضاءة ليلية حقيقية
    var nightLights = [];
    [[500, 666, 9], [430, 660, 7], [404, 520, 8], [190, 655, 8], [140, 460, 7], [268, 484, 7], [600, 452, 7], [800, 452, 7], [1000, 452, 7]].slice(0, LQ.lights).forEach(function (p) { var l = new T.PointLight(0xffb070, 0, 70, 1.5); l.position.set(D.mx(p[0]), p[2], D.mz(p[1])); scene.add(l); nightLights.push(l); });

    // ---------- التحديد ----------
    var hoverBox = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false })); hoverBox.visible = false; hoverBox.renderOrder = 10; scene.add(hoverBox);
    var selBox = new T.Group(); selBox.visible = false; scene.add(selBox);
    var selFill = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.25, depthWrite: false })); selFill.renderOrder = 10; selBox.add(selFill);
    var selEdge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), new T.LineBasicMaterial({ color: 0xffffff })); selBox.add(selEdge);
    var pin = new T.Mesh(new T.ConeGeometry(1.1, 2.6, 4).rotateX(PI), new T.MeshBasicMaterial({ color: ACCENT, toneMapped: false })); pin.visible = false; scene.add(pin);
    function fitBox(obj, o) { obj.position.set(o.b.x, o.t.h * (o.flat ? 0.06 : 0.5) + 0.1, o.b.z); obj.rotation.y = o.b.rot; obj.scale.set(o.b.w + 0.5, o.t.h * (o.flat ? 0.12 : 1) + 0.3, o.b.d + 0.5); }

    // ---------- التحكم بالكاميرا (وضع الطيران حول المشهد) ----------
    var controls = new T.OrbitControls(camera, renderer.domElement), dom = renderer.domElement;
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.5; controls.minDistance = 10; controls.maxDistance = 560;
    controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = 0.35; controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.7;
    var home = { target: new T.Vector3(D.mx(520), 0, D.mz(530)), offset: new T.Vector3(-16, 84, 128) };
    function fitScale() { var a = camera.aspect; return a >= 1.5 ? 1 : clamp(1.5 / a, 1, 1.5) * 0.95; }
    function homeOffset(k) { var a = camera.aspect; if (a < 1) return new T.Vector3(-150, 150, 26).multiplyScalar(clamp(0.62 / a, 1, 1.5) * (k || 1)); return home.offset.clone().multiplyScalar(fitScale() * (k || 1)); }
    function homeTarget() { return camera.aspect < 1 ? new T.Vector3(0, 0, 3) : home.target.clone(); }
    function orbitFov() { return camera.aspect < 1 ? 58 : 42; }
    camera.fov = orbitFov(); camera.updateProjectionMatrix();
    controls.target.copy(homeTarget());
    camera.position.copy(homeTarget()).add(homeOffset(opts.intro ? 2.3 : 1));
    if (opts.intro) camera.position.y += 120;
    var idleTimer = null, userActive = false, mode = 'orbit';
    controls.addEventListener('start', function () { camTween = null; controls.autoRotate = false; userActive = true; clearTimeout(idleTimer); });
    controls.addEventListener('end', function () { userActive = false; if (opts.autoRotate) { clearTimeout(idleTimer); idleTimer = setTimeout(function () { if (mode === 'orbit') controls.autoRotate = true; }, 9000); } });
    var embedded = !!opts.embedded, zoomLock = false;
    function syncZoom(active) { controls.enableZoom = zoomLock ? false : (embedded ? !!active : true); }
    function syncTouch() { dom.style.touchAction = (mode === 'walk' || !embedded) ? 'none' : 'pan-y'; }
    dom.addEventListener('pointerdown', function () { syncZoom(true); });
    dom.addEventListener('pointerleave', function () { syncZoom(false); });
    syncTouch(); syncZoom(false);
    var camTween = null;
    function flyTo(key, dur) {
      if (mode === 'walk') { walkZone(key); return; }
      var target, pos;
      if (key === 'home' || !key) { target = homeTarget(); pos = target.clone().add(homeOffset(1)); }
      else if (typeof key === 'string') { var z = D.zones.filter(function (q) { return q.key === key; })[0]; if (!z) return; target = new T.Vector3(z.target[0], 1.5, z.target[2]); pos = target.clone().add(new T.Vector3(z.offset[0], z.offset[1], z.offset[2]).multiplyScalar(camera.aspect < 1 ? 1.35 : 1)); }
      else { target = new T.Vector3(key.target[0], key.target[1], key.target[2]); pos = new T.Vector3(key.position[0], key.position[1], key.position[2]); }
      controls.autoRotate = false; clearTimeout(idleTimer);
      camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: now(), dur: (dur || 1.8) * 1000, home: key === 'home' || !key };
    }

    // ---------- وضع التجوّل (مشي داخل المهرجان) ----------
    var EYE = 1.78, walk = { x: 0, z: 0, yaw: 0, pitch: -0.03, keys: {}, joy: [0, 0], drag: null, tween: null, saved: null, bob: 0 };
    function blocked(x, z) {
      if (stage !== 2) return false; var i, m = 0.5;
      for (i = 0; i < obstacles.length; i++) { var b = obstacles[i], dx = x - b.x, dz = z - b.z; if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue; var co = Math.cos(b.rot), si = Math.sin(b.rot), lx = dx * co - dz * si, lz = dx * si + dz * co; if (Math.abs(lx) < b.w / 2 + m && Math.abs(lz) < b.d / 2 + m) return true; }
      for (i = 0; i < circles.length; i++) { var c = circles[i], ex = x - c.x, ez = z - c.z; if (ex * ex + ez * ez < (c.r + 0.3) * (c.r + 0.3)) return true; }
      return false;
    }
    function walkTo(x, z, yaw, dur) { walk.tween = { p0: camera.position.clone(), q0: camera.quaternion.clone(), p1: new T.Vector3(x, EYE, z), q1: new T.Quaternion().setFromEuler(new T.Euler(-0.03, yaw, 0, 'YXZ')), yaw: yaw, start: now(), dur: (dur || 1.4) * 1000 }; }
    function walkZone(key) {
      var gi = D.site.gateIn, n = [Math.sin(gi.rot), Math.cos(gi.rot)];
      if (key === 'home' || !key || typeof key !== 'string') { walkTo(gi.p[0] + n[0] * 15, gi.p[1] + n[1] * 15, Math.atan2(n[0], n[1]), 1.6); return; }
      var z = D.zones.filter(function (q) { return q.key === key; })[0]; if (!z) return;
      var len = Math.sqrt(z.offset[0] * z.offset[0] + z.offset[2] * z.offset[2]) || 1, dx = z.offset[0] / len, dz = z.offset[2] / len, px = z.target[0], pz = z.target[2];
      for (var d = 12; d <= 60; d += 2) { px = z.target[0] + dx * d; pz = z.target[2] + dz * d; if (!blocked(px, pz) && !blocked(px + 0.8, pz) && !blocked(px, pz + 0.8)) break; }
      walkTo(px, pz, Math.atan2(dx, dz), 1.5);
    }
    function onKey(ev) {
      if (mode !== 'walk') return; var tg = ev.target && ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      var down = ev.type === 'keydown';
      if (down && ev.code === 'Escape') { if (!locked) setMode('orbit'); return; }
      if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Shift(Left|Right)|Space)$/.test(ev.code)) { walk.keys[ev.code] = down; if (/^Arrow|Space/.test(ev.code)) ev.preventDefault(); }
    }
    function onBlur() { walk.keys = {}; }
    window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur);
    var locked = false;
    function lockMouse() { if (dom.requestPointerLock && !locked) { try { var pr = dom.requestPointerLock(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} } }
    document.addEventListener('pointerlockchange', function () { locked = document.pointerLockElement === dom; container.setAttribute('data-f3d-lock', locked ? '1' : '0'); walk.drag = null; fire('lock', locked); });
    document.addEventListener('mousemove', function (ev) { if (!locked || mode !== 'walk' || walk.tween) return; walk.yaw -= (ev.movementX || 0) * 0.0023; walk.pitch = clamp(walk.pitch - (ev.movementY || 0) * 0.0023, -1.2, 1.2); });
    dom.addEventListener('pointerdown', function (ev) { if (mode === 'walk' && ev.pointerType === 'mouse') { lockMouse(); return; } if (mode === 'walk') { walk.drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId }; try { dom.setPointerCapture(ev.pointerId); } catch (e) {} } });
    dom.addEventListener('pointermove', function (ev) { if (mode !== 'walk' || !walk.drag || walk.drag.id !== ev.pointerId || walk.tween) return; walk.yaw += (ev.clientX - walk.drag.x) * 0.0042; walk.pitch = clamp(walk.pitch + (ev.clientY - walk.drag.y) * 0.0032, -1.1, 1.1); walk.drag.x = ev.clientX; walk.drag.y = ev.clientY; });
    function endDrag(ev) { if (walk.drag && walk.drag.id === ev.pointerId) walk.drag = null; }
    dom.addEventListener('pointerup', endDrag); dom.addEventListener('pointercancel', endDrag);
    // واجهة التجوّل: خريطة مصغّرة + عصا تحكم للمس
    var hud = document.createElement('div'); hud.className = 'f3d-hud'; hud.innerHTML = '<i class="f3d-cross"></i><canvas class="f3d-mini" width="400" height="237"></canvas><div class="f3d-joy"><i></i></div>'; container.appendChild(hud);
    var mini = hud.querySelector('canvas'), miniBg = document.createElement('canvas'), joy = hud.querySelector('.f3d-joy'), knob = joy.firstChild;
    miniBg.width = 400; miniBg.height = 237;
    if (lowEnd || ('ontouchstart' in window)) container.classList.add('f3d-touch');
    function drawMiniBg() { var x = miniBg.getContext('2d'); x.clearRect(0, 0, 400, 237); x.drawImage(bpTex.image, 0, 0, 400, 237); }
    function drawMini() {
      var x = mini.getContext('2d'); x.clearRect(0, 0, 400, 237); x.drawImage(miniBg, 0, 0);
      var px = (walk.x * D.PX + 615 - BP.x0) / (BP.x1 - BP.x0) * 400, py = (walk.z * D.PX + 450 - BP.y0) / (BP.y1 - BP.y0) * 237;
      x.save(); x.translate(clamp(px, 6, 394), clamp(py, 6, 231)); x.rotate(-walk.yaw);
      x.fillStyle = 'rgba(255,59,47,.25)'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 46, -PI / 2 - 0.5, -PI / 2 + 0.5); x.closePath(); x.fill();
      x.fillStyle = ACCENT; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -13); x.lineTo(9, 9); x.lineTo(0, 4); x.lineTo(-9, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
    }
    mini.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); var r = mini.getBoundingClientRect(), u = (ev.clientX - r.left) / r.width, v = (ev.clientY - r.top) / r.height, wx = (BP.x0 + u * (BP.x1 - BP.x0) - 615) / D.PX, wz = (BP.y0 + v * (BP.y1 - BP.y0) - 450) / D.PX; for (var k = 0; k < 12 && blocked(wx, wz); k++) { wx += 1.2; wz += 0.6; } walkTo(wx, wz, walk.yaw, 1.0); });
    function joyMove(ev) { var r = joy.getBoundingClientRect(), dx = (ev.clientX - r.left - r.width / 2) / (r.width / 2), dy = (ev.clientY - r.top - r.height / 2) / (r.height / 2), l = Math.sqrt(dx * dx + dy * dy); if (l > 1) { dx /= l; dy /= l; } walk.joy = [dx, dy]; knob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'; }
    joy.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); ev.preventDefault(); try { joy.setPointerCapture(ev.pointerId); } catch (e) {} joy.dataset.on = '1'; joyMove(ev); });
    joy.addEventListener('pointermove', function (ev) { if (joy.dataset.on) joyMove(ev); });
    function joyEnd() { delete joy.dataset.on; walk.joy = [0, 0]; knob.style.transform = ''; }
    joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);

    function setMode(m) {
      m = m === 'walk' ? 'walk' : 'orbit'; if (m === mode) return;
      mode = m; container.setAttribute('data-f3d-mode', mode); camTween = null; clearTimeout(idleTimer);
      if (m === 'walk') {
        walk.saved = { p: camera.position.clone(), t: controls.target.clone() }; controls.enabled = false; controls.autoRotate = false; walk.keys = {}; walk.joy = [0, 0];
        shift.tx = shift.ty = shift.x = shift.y = 0; camera.clearViewOffset(); camera.fov = camera.aspect < 1 ? 76 : 68; camera.near = 0.12; camera.updateProjectionMatrix();
        if (stage < 2) setStage(2); drawMiniBg(); walkZone('home'); lockMouse();
      } else {
        if (locked && document.exitPointerLock) document.exitPointerLock();
        walk.tween = null; walk.drag = null; camera.fov = orbitFov(); camera.near = 0.3; camera.updateProjectionMatrix(); controls.enabled = true;
        var fwd = new T.Vector3(0, 0, -1).applyQuaternion(camera.quaternion); controls.target.copy(camera.position).addScaledVector(fwd, 20); controls.target.y = 0;
        var s = walk.saved || { p: homeTarget().add(homeOffset(1)), t: homeTarget() };
        camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: s.p, t1: s.t, start: now(), dur: 1800, home: true };
      }
      syncTouch(); dom.style.cursor = 'grab'; fire('mode', mode);
    }
    function updateWalk(dt, t) {
      if (walk.tween) {
        var w = walk.tween, p = clamp((t - w.start) / w.dur, 0, 1), e = easeInOut(p);
        camera.position.lerpVectors(w.p0, w.p1, e); camera.quaternion.slerpQuaternions(w.q0, w.q1, e);
        if (p >= 1) { walk.x = w.p1.x; walk.z = w.p1.z; walk.yaw = w.yaw; walk.pitch = -0.03; walk.tween = null; }
        else { walk.x = camera.position.x; walk.z = camera.position.z; }
        return;
      }
      var k = walk.keys, f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - walk.joy[1], s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + walk.joy[0], turn = (k.ArrowLeft || k.KeyQ ? 1 : 0) - (k.ArrowRight || k.KeyE ? 1 : 0);
      walk.yaw += turn * 1.9 * dt;
      var len = Math.sqrt(f * f + s * s); if (len > 1) { f /= len; s /= len; len = 1; }
      var sp = (k.ShiftLeft || k.ShiftRight) ? 10 : 4.4, si = Math.sin(walk.yaw), co = Math.cos(walk.yaw);
      var nx = walk.x + (-si * f + co * s) * sp * dt, nz = walk.z + (-co * f - si * s) * sp * dt;
      if (!blocked(nx, nz)) { walk.x = nx; walk.z = nz; } else if (!blocked(nx, walk.z)) walk.x = nx; else if (!blocked(walk.x, nz)) walk.z = nz;
      var rr = Math.sqrt(walk.x * walk.x + walk.z * walk.z); if (rr > 440) { walk.x *= 440 / rr; walk.z *= 440 / rr; }
      if (len > 0.05) walk.bob += dt * sp * 1.9;
      camera.position.set(walk.x, EYE + (len > 0.05 ? Math.sin(walk.bob) * 0.035 : 0), walk.z);
      camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
    }

    // ---------- الثيمات ----------
    var cur = null, themeTween = null, themeName = opts.theme, lastEnv = 0;
    function themeState(n) { var t = THEMES[n], s = {}; TCOL.forEach(function (k) { s[k] = new T.Color(t[k]); }); TNUM.forEach(function (k) { s[k] = t[k]; }); s.sunPos = new T.Vector3(t.sunPos[0], t.sunPos[1], t.sunPos[2]); return s; }
    function lerpTheme(a, b, t) { var s = {}; TCOL.forEach(function (k) { s[k] = a[k].clone().lerp(b[k], t); }); TNUM.forEach(function (k) { s[k] = a[k] + (b[k] - a[k]) * t; }); s.sunPos = a.sunPos.clone().lerp(b.sunPos, t); return s; }
    function applyTheme(s) {
      skyU.uTop.value.copy(s.skyTop); skyU.uMid.value.copy(s.skyMid); skyU.uBot.value.copy(s.skyBot); skyU.uGround.value.copy(s.sand).multiplyScalar(0.55);
      skyU.uSunCol.value.copy(s.sun); skyU.uCloudLit.value.copy(s.cloudLit); skyU.uCloudDark.value.copy(s.cloudDark); skyU.uSunAmt.value = s.sunAmt; skyU.uCloud.value = s.cloud;
      sunDir.copy(s.sunPos).normalize(); skyU.uSunDir.value.copy(sunDir);
      scene.fog.color.copy(s.fog); scene.fog.density = s.fogD; renderer.setClearColor(s.fog);
      sun.color.copy(s.sun); sun.intensity = s.sunI; hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGnd); hemi.intensity = s.hemiI;
      sandMat.color.copy(s.sand); renderer.toneMappingExposure = s.exposure;
      stars.material.opacity = s.stars; stars.visible = s.stars > 0.01;
      skyline.material.color.copy(s.fog).lerp(s.skyTop, 0.35).multiplyScalar(0.8);
      villaWins.material.opacity = s.lamps * 0.9; villaWins.visible = s.lamps > 0.03;
      streetHalo.material.opacity = s.lamps; streetHalo.visible = s.lamps > 0.03;
      cur = s; envDirty = true; shadowHalf = 0; applyGlow();
    }
    function applyGlow() {
      var k = builtP, g = cur.glow;
      glowMat.opacity = g * 0.62 * k; frontMat.opacity = (0.14 + g * 0.86) * k; bulbMat.opacity = cur.bulbs * k; aoMat.opacity = 0.5 * k * (1 - g * 0.55);
      glowMesh.visible = glowMat.opacity > 0.01; frontMesh.visible = k > 0.5 && !filterType; aoMesh.visible = k > 0.5 && !filterType;
      if (beams) beams.children.forEach(function (c) { c.material.opacity = g * 0.16 * k; });
      for (var i = 0; i < nightLights.length; i++) nightLights[i].intensity = cur.lamps * 1.3 * k;
    }
    function setTheme(n, instant) {
      if (!THEMES[n]) return; themeName = n; var to = themeState(n);
      if (instant || !cur) { applyTheme(to); themeTween = null; } else themeTween = { from: cur, to: to, start: now(), dur: 1400 };
      container.setAttribute('data-f3d-theme', n);
    }

    // ---------- المراحل ----------
    var stage = -1, builtP = 0, vals = { bp: 0, survey: 0, zone: 0, label: 0, surf: 0, deco: 0 }, valTweens = {};
    function tweenVal(k, to, dur, delay) { valTweens[k] = { from: vals[k], to: to, start: now() + (delay || 0), dur: dur || 700 }; }
    function setStage(n, instant) {
      n = clamp(n | 0, 0, 2); if (n === stage) return; var prev = stage; stage = n;
      var show = n === 2, t = now();
      boothObjs.forEach(function (o) { o.from = o.s; o.target = show ? 1 : 0; o.t0 = t + (instant ? -99999 : (show ? 500 + o.delay * 1000 : o.delay * 250)); });
      var d = instant ? 1 : 0;
      tweenVal('bp', n === 1 ? 1 : 0, d || 800, 0); tweenVal('survey', n === 0 ? 1 : 0, d || 600, 0);
      tweenVal('zone', (show && opts.labels) ? 1 : 0, d || 500, d ? 0 : (show ? 2200 : 0));
      tweenVal('label', show ? 1 : 0, d || 600, d ? 0 : (show ? 2400 : 0));
      tweenVal('surf', show ? 1 : 0, d || 900, d ? 0 : (show ? 0 : 500)); tweenVal('deco', show ? 1 : 0, d || 1100, d ? 0 : (show ? 1300 : 0));
      container.setAttribute('data-f3d-stage', n);
      fire('stage', n, prev);
    }
    function applyVals() {
      bpMat.opacity = vals.bp; blueprint.visible = vals.bp > 0.01;
      fadeMats.survey.forEach(function (m) { m.opacity = vals.survey; }); survey.visible = vals.survey > 0.01;
      fadeMats.zone.forEach(function (m) { m.opacity = vals.zone * 0.96; }); zoneSprites.forEach(function (s) { s.visible = vals.zone > 0.01; });
      labelMat.opacity = vals.label; labelMesh.visible = vals.label > 0.01;
      surfaces.position.y = -0.9 * (1 - vals.surf); surfaces.visible = vals.surf > 0.01;
      var e = vals.deco <= 0 ? 0 : easeOutBack(vals.deco); deco.scale.set(1, Math.max(0.001, e), 1); deco.visible = vals.deco > 0.01;
      builtP = vals.deco; applyGlow();
    }

    // ---------- التفاعل ----------
    var ray = new T.Raycaster(), mouse = new T.Vector2(), hovered = null, selected = null, filterType = null, downAt = null;
    var tip = null;
    if (opts.tooltip) { tip = document.createElement('div'); tip.className = 'f3d-tip'; container.appendChild(tip); }
    function pick(ev) {
      if (stage < 1) return null; var r = dom.getBoundingClientRect();
      if (locked) mouse.set(0, 0); else { mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1; }
      ray.far = mode === 'walk' ? 70 : Infinity; ray.setFromCamera(mouse, camera); var hits = ray.intersectObjects(hitMeshes, false);
      for (var i = 0; i < hits.length; i++) { var b = hits[i].object.userData.booth; if (!filterType || b.type === filterType || D.types[b.type].special) return byId[b.id]; }
      return null;
    }
    function boothInfo(o) { var t = o.t; return { id: o.b.id, type: o.b.type, name: t.ar, en: t.en, size: t.size, note: t.note, price: t.price, color: t.color, special: !!t.special }; }
    function onMove(ev) {
      if (ev.pointerType === 'touch' || (mode === 'walk' && walk.drag)) return;
      var o = pick(ev);
      if (o !== hovered) { hovered = o; hoverBox.visible = !!o && o !== selected; if (o) fitBox(hoverBox, o); dom.style.cursor = o ? 'pointer' : 'grab'; fire('hover', o ? boothInfo(o) : null); }
      if (tip) {
        if (o) { var r = container.getBoundingClientRect(), t = o.t; tip.innerHTML = '<b style="--c:' + t.color + '">' + (t.special ? t.ar : o.b.id) + '</b><span>' + (t.special ? t.en : t.ar) + ' · ' + t.size + '</span><em>' + D.fmt(t.price) + ' ر.س</em>'; tip.style.transform = 'translate(' + Math.round((locked ? r.width / 2 : ev.clientX - r.left) + 14) + 'px,' + Math.round((locked ? r.height / 2 : ev.clientY - r.top) + 14) + 'px)'; tip.classList.add('on'); }
        else tip.classList.remove('on');
      }
    }
    function select(id, silent) {
      var o = id ? byId[id] : null; selected = o; selBox.visible = pin.visible = !!o;
      if (o) { fitBox(selBox, o); hoverBox.visible = false; pin.position.set(o.b.x, o.t.h * (o.flat ? 0.12 : 1) + 4, o.b.z); }
      if (!silent) fire('select', o ? boothInfo(o) : null);
    }
    dom.addEventListener('pointermove', onMove);
    dom.addEventListener('pointerleave', function () { hovered = null; hoverBox.visible = false; if (tip) tip.classList.remove('on'); });
    dom.addEventListener('pointerdown', function (ev) { downAt = [ev.clientX, ev.clientY, locked]; });
    dom.addEventListener('pointerup', function (ev) { if (!downAt) return; var moved = locked ? 0 : Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]), was = downAt[2]; downAt = null; if (moved > 7 || (mode === 'walk' && ev.pointerType === 'mouse' && !was)) return; var o = pick(ev); select(o ? o.b.id : null); });
    dom.style.cursor = 'grab';

    function filter(type) {
      filterType = type && D.types[type] ? type : null;
      boothObjs.forEach(function (o) { o.flat = !!filterType && o.b.type !== filterType && !o.t.special; });
      buildLabels(); applyGlow(); if (selected) { if (selected.flat) select(null); else fitBox(selBox, selected); }
      fire('filter', filterType);
    }

    // ---------- أحداث ----------
    var handlers = {};
    function on(ev, cb) { (handlers[ev] = handlers[ev] || []).push(cb); return api; }
    function fire(ev, a, b) { (handlers[ev] || []).forEach(function (cb) { try { cb(a, b); } catch (e) { console.error(e); } }); var k = 'on' + ev.charAt(0).toUpperCase() + ev.slice(1); if (typeof opts[k] === 'function') opts[k](a, b); }

    // ---------- الظلال تتبع منطقة النظر ----------
    function updateShadow() {
      var fx, fz, half;
      if (mode === 'walk') { fx = camera.position.x; fz = camera.position.z; half = 60; }
      else { var d = camera.position.distanceTo(controls.target); half = clamp(Math.ceil(d * 0.85 / 20) * 20, 40, 140); if (half >= 120) { fx = home.target.x; fz = home.target.z; } else { fx = controls.target.x; fz = controls.target.z; } }
      if (half !== shadowHalf) { shadowHalf = half; sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
      var snap = half * 2 / SM * 8; fx = Math.round(fx / snap) * snap; fz = Math.round(fz / snap) * snap;
      sun.target.position.set(fx, 0, fz); sun.position.set(fx + sunDir.x * 320, sunDir.y * 320, fz + sunDir.z * 320);
    }

    // تجهيز كل الخامات مرة واحدة عند التحميل حتى لا يتجمّد المشهد أول مرة تظهر فيها مرحلة أو منطقة
    (function precompile() {
      var hidden = []; scene.traverse(function (o) { if (!o.visible) { hidden.push(o); o.visible = true; } });
      try { renderer.compile(scene, camera); } catch (e) {}
      hidden.forEach(function (o) { o.visible = false; });
    })();

    // ---------- الحلقة ----------
    function now() { return performance.now(); }
    var running = true, visible = true, paused = false, raf = null, clock0 = now(), lastT = now(), dmW = new T.Object3D();
    var frameN = 0, lastDraw = 0, perf = { t0: 0, n: 0, slow: 0, fast: 0 };
    function adaptQuality(t) {
      if (!perf.t0) { perf.t0 = t; perf.n = 0; return; } perf.n++;
      if (t - perf.t0 < 2000) return;
      var fps = perf.n * 1000 / (t - perf.t0), goal = LQ.fps ? LQ.fps * 0.85 : 45; perf.t0 = t; perf.n = 0;
      if (fps < goal) { perf.slow++; perf.fast = 0; } else if (fps > (LQ.fps ? LQ.fps * 0.97 : 57)) { perf.fast++; perf.slow = 0; } else { perf.slow = perf.fast = 0; }
      var nd = dpr;
      if (perf.slow >= 1 && dpr > LQ.dprMin) nd = Math.max(LQ.dprMin, +(dpr - 0.25).toFixed(2));
      else if (perf.fast >= 3 && dpr < Math.min(window.devicePixelRatio || 1, LQ.dprMax)) nd = Math.min(LQ.dprMax, +(dpr + 0.25).toFixed(2));
      if (nd !== dpr) { dpr = nd; renderer.setPixelRatio(dpr); resize(); perf.slow = perf.fast = 0; }
    }
    function frame(t) {
      raf = null; if (!running) return;
      raf = requestAnimationFrame(frame); t = t || now();
      if (!(visible && !paused && !document.hidden)) { perf.t0 = 0; return; }
      if (LQ.fps && t - lastDraw < 1000 / LQ.fps - 2) return;
      lastDraw = t; frameN++;
      update();
      if (lite && (frameN % LQ.shadowEvery === 0 || frameN < 4)) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      adaptQuality(t);
    }
    function update() {
      var t = now(), dt = Math.min(0.06, (t - lastT) / 1000), i, k, any = false; lastT = t;
      for (k in valTweens) { var v = valTweens[k]; if (!v) continue; var p = clamp((t - v.start) / v.dur, 0, 1); vals[k] = v.from + (v.to - v.from) * easeInOut(p); if (p >= 1) valTweens[k] = null; any = true; }
      if (any) applyVals();
      for (i = 0; i < boothObjs.length; i++) {
        var o = boothObjs[i], tgt = o.target, fs = o.flat ? 0.1 : 1;
        if (o.fs === undefined) o.fs = fs;
        if (o.s !== tgt || o.fs !== fs) {
          var q = clamp((t - o.t0) / 850, 0, 1);
          if (o.s !== tgt) o.s = q >= 1 ? tgt : o.from + (tgt - o.from) * (tgt > o.from ? easeOutBack(q) : easeOutCubic(q));
          if (o.fs !== fs) { o.fs += (fs - o.fs) * 0.16; if (Math.abs(o.fs - fs) < 0.004) o.fs = fs; }
          o.group.scale.y = Math.max(0.001, o.s * o.fs); o.group.visible = o.s > 0.003;
        }
      }
      if (themeTween) { var tp = clamp((t - themeTween.start) / themeTween.dur, 0, 1); applyTheme(lerpTheme(themeTween.from, themeTween.to, easeInOut(tp))); if (tp >= 1) themeTween = null; }
      if (envDirty && t - lastEnv > 260) { lastEnv = t; updateEnv(cur.envGain); }
      var s = (t - clock0) / 1000; skyU.uTime.value = s;
      if (mode === 'walk') { updateWalk(dt, t); drawMini(); }
      else {
        if (camTween) { var cp = clamp((t - camTween.start) / camTween.dur, 0, 1), ce = easeInOut(cp); camera.position.lerpVectors(camTween.p0, camTween.p1, ce); controls.target.lerpVectors(camTween.t0, camTween.t1, ce); if (cp >= 1) { var wasHome = camTween.home; camTween = null; if (opts.autoRotate && !userActive && (wasHome || opts.orbitZones)) controls.autoRotate = true; } }
        if (shift.x !== shift.tx || shift.y !== shift.ty) { shift.x += (shift.tx - shift.x) * 0.07; shift.y += (shift.ty - shift.y) * 0.07; if (Math.abs(shift.x - shift.tx) < 0.0008) shift.x = shift.tx; if (Math.abs(shift.y - shift.ty) < 0.0008) shift.y = shift.ty; applyShift(); }
        controls.update();
      }
      updateShadow();
      // حركة: المنطاد، كشافات المسرح، مؤشر التحديد
      balloon.position.y = 17 + Math.sin(s * 0.5) * 1.6; balloon.rotation.y = s * 0.08;
      if (beams && cur.glow > 0.05) beams.children.forEach(function (c) { c.rotation.z = Math.sin(s * 0.7 + c.userData.ph) * 0.45; c.rotation.x = 0.35 + Math.cos(s * 0.5 + c.userData.ph) * 0.2; });
      if (selected) { pin.position.y = selected.t.h * (selected.flat ? 0.12 : 1) + 4 + Math.sin(s * 3) * 0.6; pin.rotation.y = s * 1.5; selFill.material.opacity = 0.2 + Math.sin(s * 4) * 0.08; }
      if (builtP > 0.9) {
        // الزوار المتحركون
        for (i = 0; i < crowd.length && frameN % LQ.crowdEvery === 0; i++) {
          var cg = crowd[i]; if (!cg.list.length) continue;
          for (k = 0; k < cg.list.length; k++) { var pr = cg.list[k], ax = pr.a[0], az = pr.a[1], dx = pr.b[0] - ax, dz = pr.b[1] - az, ln = Math.sqrt(dx * dx + dz * dz) || 1, u = (s * 1.05 * pr.sp / ln + pr.ph) % 2, back = u > 1; if (back) u = 2 - u; dmW.position.set(ax + dx * u, 0.08 + Math.abs(Math.sin(s * 7 * pr.sp + pr.ph)) * 0.03, az + dz * u); dmW.rotation.y = Math.atan2(dx, dz) + (back ? PI : 0); dmW.scale.set(pr.s, pr.s, pr.s); dmW.updateMatrix(); cg.mesh.setMatrixAt(pr.i, dmW.matrix); }
          cg.mesh.instanceMatrix.needsUpdate = true;
        }
        // الدخان
        var sd = smoke.userData, sp = smoke.geometry.attributes.position, scl = smoke.geometry.attributes.color;
        for (i = 0; i < sd.em.length; i++) { var eo = sd.em[i], on2 = eo.s > 0.9 && !eo.flat, by = (eo.labelY || 3) + 0.3; for (k = 0; k < sd.per; k++) { var life = (s * 0.16 + k / sd.per + i * 0.37) % 1, idx = i * sd.per + k, c2 = on2 ? Math.sin(life * PI) * 0.2 : 0; sp.setXYZ(idx, eo.b.x + Math.sin(k * 12.9 + i) * 0.5 + life * life * 3.2, by + life * 6.5, eo.b.z + Math.cos(k * 7.3 + i) * 0.5 + life * 1.1); scl.setXYZ(idx, c2, c2, c2); } }
        sp.needsUpdate = true; scl.needsUpdate = true;
      }
      // حجم ملصقات المناطق
      if (vals.zone > 0.01) {
        var dist = mode === 'walk' ? 0 : camera.position.distanceTo(controls.target), far = dist > 215;
        for (i = 0; i < zoneSprites.length; i++) {
          var zs = zoneSprites[i], zk = zs.userData.zone.key, base = zk === 'exhibitor' ? 17 : 13, ls;
          if (mode === 'walk') { var dd = camera.position.distanceTo(zs.position); ls = clamp(dd / 95, 0.2, 1); zs.visible = dd > 12; }
          else { ls = clamp(dist / 190, 0.4, 1.3); zs.visible = !(far && (zk === 'gate' || zk === 'kiosk' || zk === 'diamond' || zk === 'bronze' || zk === 'activation')); }
          zs.scale.set(base * ls, base * ls * 160 / 512, 1);
        }
      }
    }
    var shift = { x: 0, y: 0, tx: 0, ty: 0 };
    function applyShift() { var w = container.clientWidth, h = container.clientHeight; if (!w || !h || mode === 'walk') return; if (Math.abs(shift.x) < 0.001 && Math.abs(shift.y) < 0.001) camera.clearViewOffset(); else camera.setViewOffset(w, h, shift.x * w, shift.y * h, w, h); }
    function resize() {
      var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h; camera.fov = mode === 'walk' ? (camera.aspect < 1 ? 76 : 68) : orbitFov(); camera.updateProjectionMatrix(); applyShift();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '120px' }) : null; if (io) io.observe(container);

    // ---------- بدء ----------
    setTheme(opts.theme, true);
    applyVals();
    setStage(opts.stage, !opts.intro);
    if (opts.intro) flyTo('home', 3.2);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(function () { textTextures.forEach(function (tx) { tx.userData.draw(); }); drawMiniBg(); }, 60); });
    container.setAttribute('data-f3d-mode', mode);
    frame();

    var api = {
      setStage: setStage, getStage: function () { return stage; }, setTheme: setTheme, getTheme: function () { return themeName; },
      flyTo: flyTo, filter: filter, select: select, on: on, resize: resize,
      setMode: setMode, getMode: function () { return mode; }, walkTo: function (x, z, yaw) { if (mode === 'walk') walkTo(x, z, yaw == null ? walk.yaw : yaw, 1.2); },
      setLabels: function (v) { opts.labels = !!v; tweenVal('zone', (stage === 2 && v) ? 1 : 0, 400, 0); },
      setEmbedded: function (v) { embedded = !!v; if (embedded && mode === 'walk') setMode('orbit'); syncTouch(); syncZoom(false); },
      setZoomLock: function (v) { zoomLock = !!v; syncZoom(false); },
      setPaused: function (v) { paused = !!v; },
      setShift: function (x, y) { shift.tx = x || 0; shift.ty = y || 0; },
      setAutoRotate: function (v) { opts.autoRotate = !!v; controls.autoRotate = !!v && mode === 'orbit'; },
      snapshot: function () { renderer.render(scene, camera); return dom.toDataURL('image/png'); },
      dispose: function () { running = false; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); controls.dispose(); pmrem.dispose(); renderer.dispose(); [dom, tip, hud].forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); }); },
      quality: function () { return { lite: lite, dpr: dpr, fpsCap: LQ.fps, shadow: SM }; },
      three: { scene: scene, camera: camera, renderer: renderer, controls: controls }
    };
    return api;
  }

  // أنماط أساسية (التلميح + واجهة التجوّل)
  var css = '.f3d{overflow:hidden}.f3d canvas{outline:none}.f3d>canvas{width:100%!important;height:100%!important}' +
    '.f3d-tip{position:absolute;top:0;left:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .15s;background:rgba(14,12,12,.92);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:9px 13px;font:500 13px/1.5 Tajawal,Segoe UI,Tahoma,sans-serif;direction:rtl;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.4);backdrop-filter:blur(6px)}' +
    '.f3d-tip.on{opacity:1}.f3d-tip b{display:inline-block;font-size:15px;font-weight:800;padding-inline-start:10px;border-inline-start:4px solid var(--c,#f33)}.f3d-tip span{display:block;opacity:.75;font-size:12px}.f3d-tip em{display:block;font-style:normal;font-weight:800;color:#ffb199}' +
    '.f3d-hud{position:absolute;inset:0;z-index:2;pointer-events:none;display:none;direction:ltr}.f3d[data-f3d-mode=walk] .f3d-hud{display:block}' +
    '.f3d-cross{position:absolute;left:50%;top:50%;width:8px;height:8px;margin:-4px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);display:none}.f3d[data-f3d-lock="1"] .f3d-cross{display:block}.f3d-mini{position:absolute;right:14px;bottom:72px;width:210px;height:auto;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:rgba(14,12,12,.78);pointer-events:auto;cursor:crosshair;box-shadow:0 12px 30px rgba(0,0,0,.45);backdrop-filter:blur(6px)}' +
    '.f3d-joy{position:absolute;left:22px;bottom:84px;width:116px;height:116px;border-radius:50%;background:rgba(20,18,18,.45);border:1.5px solid rgba(255,255,255,.4);pointer-events:auto;touch-action:none;display:none;backdrop-filter:blur(4px)}.f3d-touch .f3d-joy{display:block}' +
    '.f3d-joy i{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px;border-radius:50%;background:rgba(255,255,255,.82);box-shadow:0 4px 12px rgba(0,0,0,.4)}' +
    '@media (max-width:860px){.f3d-mini{width:132px;right:10px;bottom:120px}.f3d-joy{bottom:128px;left:14px}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.Festival3D = { create: create, THEMES: THEMES };
})();
