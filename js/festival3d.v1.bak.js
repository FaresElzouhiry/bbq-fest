/* BBQ FEST — محرك مشهد الـ 3D
   يبني الأرض الفاضية ← يضع المخطط عليها ← يرفع المهرجان مجسّمًا.
   الاستخدام:  var f = Festival3D.create(element, { theme:'sunset', stage:2 });
   f.setStage(0|1|2) · f.setTheme('day'|'sunset'|'night') · f.flyTo('stage') · f.filter('G') · f.select('G5') */
(function () {
  'use strict';
  var D = window.BBQ;

  var THEMES = {
    day: { skyTop: '#3f8ddb', skyMid: '#9fd0f3', skyBot: '#f3e6c8', fog: '#ecdfc4', fogD: 0.0013, sun: '#fff1d6', sunI: 0.82, sunPos: [110, 170, 90], hemiSky: '#cfe4ff', hemiGnd: '#b89868', hemiI: 0.42, sand: '#d7b684', glow: 0, bulbs: 0.25, stars: 0, exposure: 1.0, sunGlow: 0.55 },
    sunset: { skyTop: '#1f1d4a', skyMid: '#c0577a', skyBot: '#ffb168', fog: '#e59a6c', fogD: 0.002, sun: '#ffab6b', sunI: 0.9, sunPos: [-170, 46, -50], hemiSky: '#9a78b8', hemiGnd: '#8a5636', hemiI: 0.4, sand: '#cf9c6a', glow: 0.55, bulbs: 0.85, stars: 0.25, exposure: 1.05, sunGlow: 1 },
    night: { skyTop: '#02030a', skyMid: '#0a0f26', skyBot: '#2b1322', fog: '#0c0a14', fogD: 0.0021, sun: '#8ea4ff', sunI: 0.2, sunPos: [-70, 150, 90], hemiSky: '#34407a', hemiGnd: '#1c110d', hemiI: 0.3, sand: '#6a5746', glow: 1, bulbs: 1, stars: 1, exposure: 1.18, sunGlow: 0 }
  };
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

  function create(container, opts) {
    var T = window.THREE;
    opts = Object.assign({ theme: 'sunset', stage: 2, autoRotate: true, embedded: true, labels: true, tooltip: true, intro: true, font: "'Tajawal','Segoe UI',Tahoma,sans-serif", displayFont: "'Anton','Impact','Arial Black',sans-serif" }, opts || {});
    if (!T || !webglOK()) {
      container.innerHTML = '<img src="assets/layout-map.jpg" alt="مخطط المهرجان" style="width:100%;height:100%;object-fit:contain;background:#111">';
      return null;
    }

    // ---------- أدوات هندسية ----------
    function merge(geos) {
      var n = 0, i; for (i = 0; i < geos.length; i++) n += geos[i].attributes.position.count;
      var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), o = 0;
      for (i = 0; i < geos.length; i++) {
        var g = geos[i]; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count; g.dispose();
      }
      var out = new T.BufferGeometry();
      out.setAttribute('position', new T.BufferAttribute(pos, 3)); out.setAttribute('normal', new T.BufferAttribute(nor, 3)); out.setAttribute('uv', new T.BufferAttribute(uv, 2));
      return out;
    }
    // صندوق: الأبعاد ثم المركز ثم دورانات اختيارية
    function bx(w, h, d, x, y, z, ry, rx, rz) { var g = new T.BoxGeometry(w, h, d).toNonIndexed(); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x || 0, y || 0, z || 0); return g; }
    function cyl(rt, rb, h, x, y, z, seg, rx, rz) { var g = new T.CylinderGeometry(rt, rb, h, seg || 10).toNonIndexed(); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x || 0, y || 0, z || 0); return g; }
    function std(color, o) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, metalness: 0.02 }, o || {})); }
    function canvasTex(w, h, draw) { var c = document.createElement('canvas'); c.width = w; c.height = h; var tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4; tex.userData = { draw: function () { var x = c.getContext('2d'); x.clearRect(0, 0, w, h); draw(x, w, h); tex.needsUpdate = true; } }; tex.userData.draw(); textTextures.push(tex); return tex; }
    var textTextures = [];

    // ---------- المشهد ----------
    var W = container.clientWidth || 800, Hh = container.clientHeight || 500;
    var renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, Hh);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    container.classList.add('f3d'); if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    var scene = new T.Scene();
    scene.fog = new T.FogExp2(0xffffff, 0.002);
    var camera = new T.PerspectiveCamera(42, W / Hh, 0.5, 2600);

    var hemi = new T.HemisphereLight(0xffffff, 0x886644, 0.7); scene.add(hemi);
    var sun = new T.DirectionalLight(0xffffff, 1.2); scene.add(sun); scene.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    var sc = sun.shadow.camera; sc.left = -125; sc.right = 125; sc.top = 85; sc.bottom = -85; sc.near = 10; sc.far = 520;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05;

    // السماء
    var skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 256;
    var skyTex = new T.CanvasTexture(skyCanvas); skyTex.encoding = T.sRGBEncoding;
    var sky = new T.Mesh(new T.SphereGeometry(1900, 32, 20), new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    scene.add(sky);
    function drawSky(top, mid, bot) {
      var x = skyCanvas.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, top); g.addColorStop(0.36, mid); g.addColorStop(0.5, bot); g.addColorStop(1, bot);
      x.fillStyle = g; x.fillRect(0, 0, 8, 256); skyTex.needsUpdate = true;
    }
    // النجوم
    (function () {
      var r = rng(7), n = 900, p = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) { var a = r() * Math.PI * 2, e = Math.asin(0.06 + r() * 0.94), R = 1700; p[i * 3] = Math.cos(a) * Math.cos(e) * R; p[i * 3 + 1] = Math.sin(e) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R; }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
      stars = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      scene.add(stars);
    })();
    var stars;
    // هالة الشمس
    var dotTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    var sunSprite = new T.Sprite(new T.SpriteMaterial({ map: dotTex, color: 0xffd9a8, transparent: true, blending: T.AdditiveBlending, fog: false, depthWrite: false, depthTest: true }));
    sunSprite.scale.set(520, 520, 1); scene.add(sunSprite);

    // ---------- الأرض الفاضية ----------
    var sandTex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 512; var x = c.getContext('2d'), r = rng(11), i;
      x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, 512, 512);
      var img = x.getImageData(0, 0, 512, 512), d = img.data;
      for (i = 0; i < d.length; i += 4) { var px = (i / 4) % 512, py = Math.floor(i / 4 / 512); var v = 214 + r() * 34 + Math.sin((py + Math.sin(px * 0.045) * 9) * 0.22) * 5; d[i] = v; d[i + 1] = v - 2; d[i + 2] = v - 6; }
      x.putImageData(img, 0, 0);
      for (i = 0; i < 260; i++) { x.fillStyle = 'rgba(90,70,50,' + (0.1 + r() * 0.22) + ')'; x.beginPath(); x.arc(r() * 512, r() * 512, 0.6 + r() * 1.8, 0, 6.3); x.fill(); }
      var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(70, 70); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t;
    })();
    var sandMat = std('#d9c08f', { map: sandTex, roughness: 1 });
    (function () {
      var g = new T.PlaneGeometry(2600, 2600, 200, 200); g.rotateX(-Math.PI / 2);
      var p = g.attributes.position;
      for (var i = 0; i < p.count; i++) {
        var x = p.getX(i), z = p.getZ(i), dist = Math.sqrt(x * x + z * z);
        var k = clamp((dist - 150) / 520, 0, 1); k = k * k * (3 - 2 * k);
        var hgt = (fbm(x * 0.0042 + 9, z * 0.0042 + 3) - 0.38) * 150 * k + (fbm(x * 0.02, z * 0.02) - 0.5) * 7 * clamp((dist - 135) / 120, 0, 1);
        if (dist > 900) hgt += (dist - 900) * 0.09 * fbm(x * 0.002, z * 0.002);
        p.setY(i, Math.max(hgt, -6 * k));
      }
      g.computeVertexNormals();
      var m = new T.Mesh(g, sandMat); m.receiveShadow = true; scene.add(m);
    })();
    // صخور وشجيرات صحراوية حول الأرض
    function insidePoly(x, z, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if (((a[1] > z) !== (b[1] > z)) && (x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
    function onSite(x, z, m) { m = m || 0; return (x > D.mx(20) - m && x < D.mx(1245) + m && z > D.mz(90) - m && z < D.mz(815) + m); }
    (function () {
      var r = rng(23), dummy = new T.Object3D(), i, n1 = 150, n2 = 110;
      var rocks = new T.InstancedMesh(new T.DodecahedronGeometry(1, 0), std('#a08a6c', { flatShading: true, roughness: 1 }), n1);
      var shrubs = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), std('#6f7742', { flatShading: true, roughness: 1 }), n2);
      function place(mesh, n, smin, smax, sy) {
        for (i = 0; i < n; i++) {
          var a = r() * 6.283, d = 30 + Math.pow(r(), 0.7) * 300, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8;
          if (onSite(x, z, 4)) { x += (x > 0 ? 130 : -130); z += (z > 0 ? 80 : -80); }
          var s = smin + r() * (smax - smin); dummy.position.set(x, s * sy * 0.3, z); dummy.scale.set(s, s * sy, s * (0.7 + r() * 0.6)); dummy.rotation.set(r(), r() * 6, r()); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
      }
      place(rocks, n1, 0.3, 1.5, 0.6); place(shrubs, n2, 0.5, 1.3, 0.8);
    })();

    // ---------- مجموعات المراحل ----------
    var survey = new T.Group(), built = new T.Group(), surfaces = new T.Group(), deco = new T.Group();
    scene.add(survey); scene.add(surfaces); scene.add(built); scene.add(deco);
    var fadeMats = { survey: [], zone: [] };

    function flatShape(points, y) {
      var s = new T.Shape(); points.forEach(function (p, i) { if (i === 0) s.moveTo(p[0], -p[1]); else s.lineTo(p[0], -p[1]); });
      var g = new T.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
    }
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
      function edge(a, b) { var dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz), n = Math.max(1, Math.floor(len / 3.2)), ang = Math.atan2(dz, dx); for (var i = 0; i < n; i++) { var t = (i + 0.5) / n; dashes.push(bx(1.7, 0.08, 0.34, a[0] + dx * t, 0.07, a[1] + dz * t, -ang)); } }
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
      x.arc(cx(is.x0), cz(is.z), is.r * D.PX * k, Math.PI / 2, Math.PI * 1.5); x.arc(cx(is.x1), cz(is.z), is.r * D.PX * k, -Math.PI / 2, Math.PI / 2); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(252,249,242,.92)'; x.beginPath(); x.arc(cx(D.site.balloon[0]), cz(D.site.balloon[1]), D.site.balloonR * D.PX * k, 0, 6.3); x.fill(); x.stroke();
      D.site.lawns.forEach(function (l) { x.fillStyle = 'rgba(120,170,90,.35)'; x.beginPath(); x.arc(cx(l.x), cz(l.z), l.r * D.PX * k, 0, 6.3); x.fill(); x.stroke(); });
      D.site.palms.forEach(function (p) { x.fillStyle = '#4c8a3a'; x.beginPath(); for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8, rr = (i % 2 ? 6 : 15) * k * 1.1; x.lineTo(cx(p[0]) + Math.cos(a) * rr, cz(p[1]) + Math.sin(a) * rr); } x.closePath(); x.fill(); });
      D.site.trucks.forEach(function (t) { x.save(); x.translate(cx(t.x), cz(t.z)); x.rotate(-t.rot); x.fillStyle = 'rgba(40,40,46,.2)'; x.strokeStyle = '#444'; x.lineWidth = 2; x.setLineDash([8, 6]); x.fillRect(-3.4 * D.PX * k, -1.3 * D.PX * k, 6.8 * D.PX * k, 2.6 * D.PX * k); x.strokeRect(-3.4 * D.PX * k, -1.3 * D.PX * k, 6.8 * D.PX * k, 2.6 * D.PX * k); x.restore(); });
      x.setLineDash([]);
      D.booths.forEach(function (b) {
        var t = D.types[b.type], w = b.w * D.PX * k, d = b.d * D.PX * k;
        x.save(); x.translate(cx(b.x), cz(b.z)); x.rotate(-b.rot);
        x.fillStyle = t.color; x.strokeStyle = '#1b1b1b'; x.lineWidth = 2.5; x.fillRect(-w / 2, -d / 2, w, d); x.strokeRect(-w / 2, -d / 2, w, d);
        x.rotate(b.rot); var side = Math.abs(Math.sin(b.rot)) > 0.7, ww = side ? d : w, dd = side ? w : d;
        if (dd > ww * 1.4) { x.rotate(Math.PI / 2); var tmp = ww; ww = dd; dd = tmp; }
        var label = t.special ? t.ar : b.id, fs = Math.min(dd * 0.62, ww / (label.length * 0.62));
        x.fillStyle = t.dark ? '#151515' : '#fff'; x.font = '800 ' + fs + 'px ' + opts.font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 0, fs * 0.06);
        x.restore();
      });
      x.fillStyle = '#141414'; x.textAlign = 'center'; x.textBaseline = 'middle';
      D.zones.forEach(function (z) { if (['stage', 'comp', 'gate', 'kiosk', 'diamond'].indexOf(z.key) >= 0) return; x.font = '800 30px ' + opts.font; x.direction = 'rtl'; var yy = z.key === 'gold' ? cz(z.z) + 12 : (z.key === 'exhibitor' ? cz(z.z) + 86 : (z.key === 'balloon' ? cz(z.z) + 150 : (z.key === 'silver' ? cz(z.z) - 150 : cz(z.z)))); x.fillText(z.ar, cx(z.x), yy); });
    });
    var bpMat = new T.MeshBasicMaterial({ map: bpTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var blueprint = new T.Mesh(new T.PlaneGeometry((BP.x1 - BP.x0) / D.PX, (BP.y1 - BP.y0) / D.PX), bpMat);
    blueprint.rotation.x = -Math.PI / 2; blueprint.position.set(D.mx((BP.x0 + BP.x1) / 2), 0.22, D.mz((BP.y0 + BP.y1) / 2)); blueprint.renderOrder = 2; blueprint.visible = false; scene.add(blueprint);

    // ----- المرحلة 2: الأسطح -----
    var M = {
      red: std('#c61f25', { roughness: 0.6 }), redDark: std('#8f1418', { roughness: 0.7 }), cream: std('#efe6d4'), wood: std('#b88a57', { roughness: 0.9 }), dark: std('#232327', { roughness: 0.6 }),
      white: std('#f5f3ee', { roughness: 0.5 }), leaf: std('#4f7d2f', { roughness: 1 }), glass: std('#9fd3e6', { transparent: true, opacity: 0.38, roughness: 0.1, metalness: 0.3 }), grey: std('#8a8f96', { roughness: 0.6, metalness: 0.3 }),
      redGlass: std('#e0262c', { transparent: true, opacity: 0.62, side: T.DoubleSide, roughness: 0.4 }), teal: std('#2f9c8b'), trunk: std('#8a6a48', { roughness: 1 }), palm: std('#3f7a34', { roughness: 0.9, side: T.DoubleSide }),
      asphalt: std('#3b3b40', { roughness: 0.95 }), paint: std('#eeeeea'), lawn: std('#5f8f3c', { roughness: 1 }), curb: std('#d9d4c8')
    };
    var roofMat = {}; Object.keys(D.types).forEach(function (k) { roofMat[k] = std(D.types[k].color, { roughness: 0.7 }); });
    var paveTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 256; var x = c.getContext('2d'), r = rng(3); x.fillStyle = '#e8e2d6'; x.fillRect(0, 0, 256, 256); for (var i = 0; i < 2600; i++) { x.fillStyle = 'rgba(' + (r() > 0.5 ? '255,255,255' : '120,105,85') + ',' + r() * 0.12 + ')'; x.fillRect(r() * 256, r() * 256, 2, 2); } x.strokeStyle = 'rgba(110,95,75,.28)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); x.strokeRect(0, 0, 128, 128); x.strokeRect(128, 128, 128, 128); var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.25, 0.25); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; })();
    M.pave = std('#ddd3c0', { map: paveTex, roughness: 0.95 });
    function shadowed(mesh, cast) { mesh.castShadow = cast !== false; mesh.receiveShadow = true; return mesh; }

    (function () {
      // طرق
      var seg = [], dash = [], Wd = 9;
      D.site.roads.forEach(function (r) {
        for (var i = 0; i < r.length; i++) {
          seg.push(cyl(Wd / 2, Wd / 2, 0.06, r[i][0], 0.035, r[i][1], 18));
          if (i === r.length - 1) break;
          var a = r[i], b = r[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.sqrt(dx * dx + dz * dz), ang = Math.atan2(dz, dx);
          seg.push(bx(len, 0.06, Wd, (a[0] + b[0]) / 2, 0.035, (a[1] + b[1]) / 2, -ang));
          var n = Math.floor(len / 7); for (var j = 0; j < n; j++) { var t = (j + 0.5) / n; dash.push(bx(2.6, 0.07, 0.28, a[0] + dx * t, 0.04, a[1] + dz * t, -ang)); }
        }
      });
      surfaces.add(shadowed(new T.Mesh(merge(seg), M.asphalt), false)); surfaces.add(new T.Mesh(merge(dash), M.paint));
      // أرضية الموقع وشارع العارضين
      surfaces.add(shadowed(new T.Mesh(flatShape(D.site.plot, 0.08), M.pave), false));
      surfaces.add(shadowed(new T.Mesh(flatShape(D.site.street, 0.075), M.pave), false));
      // جزيرة النخيل
      var is = D.site.island, pts = [], i, a;
      for (i = 0; i <= 12; i++) { a = Math.PI / 2 + i * Math.PI / 12; pts.push([is.x0 + Math.cos(a) * is.r, is.z + Math.sin(a) * is.r]); }
      for (i = 0; i <= 12; i++) { a = -Math.PI / 2 + i * Math.PI / 12; pts.push([is.x1 + Math.cos(a) * is.r, is.z + Math.sin(a) * is.r]); }
      surfaces.add(shadowed(new T.Mesh(flatShape(pts, 0.2), M.lawn), false));
      // مسطحات خضراء + منطقة المنطاد
      var discs = [], rings = [];
      D.site.lawns.forEach(function (l) { discs.push(cyl(l.r, l.r, 0.1, l.x, 0.14, l.z, 28)); });
      discs.push(cyl(D.site.balloonR - 0.6, D.site.balloonR - 0.6, 0.1, D.site.balloon[0], 0.1, D.site.balloon[1], 40));
      rings.push(cyl(D.site.balloonR, D.site.balloonR, 0.16, D.site.balloon[0], 0.08, D.site.balloon[1], 40));
      surfaces.add(shadowed(new T.Mesh(merge(rings), M.curb), false)); surfaces.add(shadowed(new T.Mesh(merge(discs), M.lawn), false));
      // مواقف سيارات
      var r = rng(5), carGeo = merge([bx(4.3, 0.75, 1.8, 0, 0.62, 0), bx(2.3, 0.6, 1.6, -0.2, 1.25, 0)]), n = 26;
      var cars = new T.InstancedMesh(carGeo, std('#ffffff', { roughness: 0.4, metalness: 0.3 }), n), dm = new T.Object3D(), cols = ['#f2f2f2', '#1c1c20', '#8a8f96', '#b01c22', '#d9d2c2', '#2a3a55'];
      for (i = 0; i < n; i++) { dm.position.set(D.mx(880 + (i % 13) * 24), 0.05, D.mz(i < 13 ? 598 : 632)); dm.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.06; dm.updateMatrix(); cars.setMatrixAt(i, dm.matrix); cars.setColorAt(i, new T.Color(cols[Math.floor(r() * cols.length)])); }
      cars.castShadow = true; cars.frustumCulled = false; deco.add(cars);
    })();

    // ---------- بنّاؤو الأجنحة (الواجهة باتجاه +z) ----------
    function part(group, geos, mat) { var m = new T.Mesh(merge(geos), mat); m.castShadow = true; m.receiveShadow = true; group.add(m); return m; }
    var builders = {
      E: function (g, w, d, roof) {
        var hw = w / 2 - 0.12, hd = d / 2 - 0.12;
        part(g, [bx(0.16, 2.9, 0.16, -hw, 1.45, -hd), bx(0.16, 2.9, 0.16, hw, 1.45, -hd), bx(0.16, 2.9, 0.16, -hw, 1.45, hd), bx(0.16, 2.9, 0.16, hw, 1.45, hd), bx(w, 0.16, 0.16, 0, 2.9, hd), bx(w, 0.16, 0.16, 0, 2.9, -hd), bx(0.16, 0.16, d, -hw, 2.9, 0), bx(0.16, 0.16, d, hw, 2.9, 0), bx(0.5, 0.5, 0.5, -hw - 0.1, 0.25, hd + 0.2), bx(0.5, 0.5, 0.5, hw + 0.1, 0.25, hd + 0.2)], M.red);
        part(g, [bx(w * 0.78, 1.05, 0.65, 0, 0.525, hd - 0.5), bx(w * 0.86, 2.1, 0.08, 0, 1.25, -hd + 0.05)], M.wood);
        part(g, [bx(w + 0.3, 0.3, d + 0.3, 0, 3.08, 0)], roof);
      },
      K: function (g, w, d, roof) {
        part(g, [bx(w - 0.3, 2.2, d - 0.3, 0, 1.1, 0)], M.red);
        part(g, [bx(w - 0.7, 0.9, 0.06, 0, 1.6, d / 2 - 0.13), bx(w - 0.5, 0.1, 0.5, 0, 1.08, d / 2)], M.dark);
        part(g, [bx(w + 0.1, 0.14, d + 0.1, 0, 2.3, 0), bx(w - 0.1, 0.06, 0.95, 0, 2.14, d / 2 + 0.4, 0, 0.32)], roof);
      },
      S: function (g, w, d, roof) {
        part(g, [bx(w - 0.4, 2.5, d - 0.4, 0, 1.25, 0)], M.cream);
        part(g, [bx(0.18, 2.6, 0.18, -w / 2 + 0.1, 1.3, d / 2 - 0.1), bx(0.18, 2.6, 0.18, w / 2 - 0.1, 1.3, d / 2 - 0.1), bx(0.18, 2.6, 0.18, -w / 2 + 0.1, 1.3, -d / 2 + 0.1), bx(0.18, 2.6, 0.18, w / 2 - 0.1, 1.3, -d / 2 + 0.1), bx(w - 0.5, 0.5, 0.1, 0, 0.5, d / 2 - 0.15)], M.red);
        part(g, [bx(w - 1.0, 1.15, 0.06, 0, 1.75, d / 2 - 0.17)], M.dark);
        part(g, [bx(w + 0.1, 0.16, d + 0.1, 0, 2.62, 0), bx(w - 0.3, 0.07, 1.5, 0, 2.95, d / 2 + 0.62, 0, -0.38), bx(w - 0.3, 0.07, 1.2, 0, 2.9, -d / 2 - 0.5, 0, 0.38)], roof);
      },
      B: function (g, w, d, roof) {
        part(g, [bx(w - 0.4, 2.5, d - 0.4, 0, 1.25, 0)], M.redDark);
        part(g, [bx(w - 0.9, 1.0, 0.08, 0, 0.55, d / 2 - 0.14), bx(w - 0.2, 0.07, 1.4, 0, 2.86, d / 2 + 0.6, 0, -0.3)], M.cream);
        part(g, [bx(w - 1.0, 1.2, 0.06, 0, 1.7, d / 2 - 0.17)], M.dark);
        part(g, [bx(w + 0.1, 0.16, d + 0.1, 0, 2.62, 0)], roof);
      },
      G: function (g, w, d, roof) {
        part(g, [bx(w, 0.25, d, 0, 0.125, 0), bx(1.6, 0.74, 1.6, -1.2, 0.62, 1.6), bx(1.6, 0.74, 1.6, 1.5, 0.62, 1.2)], M.wood);
        part(g, [bx(w - 0.2, 2.8, d * 0.52, 0, 1.65, -d * 0.22), bx(0.2, 3.0, 0.2, -w / 2 + 0.12, 1.75, d / 2 - 0.12), bx(0.2, 3.0, 0.2, w / 2 - 0.12, 1.75, d / 2 - 0.12)], M.red);
        part(g, [bx(w - 1.2, 1.9, 0.06, 0, 1.55, d * 0.04 + 0.02)], M.dark);
        part(g, [bx(w + 0.2, 0.18, d + 0.2, 0, 3.24, 0)], roof);
      },
      D: function (g, w, d, roof) {
        part(g, [bx(w - 0.4, 2.9, d - 0.6, 0, 1.45, 0), bx(1.3, 0.14, 5.4, w / 2 + 0.75, 1.5, 0.2, 0, 0.56), bx(0.2, 3.2, 0.2, -w / 2 + 0.2, 4.7, d / 2 - 0.2), bx(0.2, 3.2, 0.2, w / 2 - 0.2, 4.7, d / 2 - 0.2), bx(0.2, 3.2, 0.2, -w / 2 + 0.2, 4.7, -d / 2 + 0.2), bx(0.2, 3.2, 0.2, w / 2 - 0.2, 4.7, -d / 2 + 0.2)], M.red);
        part(g, [bx(w, 0.2, d, 0, 3.0, 0), bx(w - 1.4, 1.0, 0.1, 0, 0.6, d / 2 - 0.25)], M.cream);
        part(g, [bx(w * 0.5, 2.5, d * 0.62, -w * 0.2, 4.35, -d * 0.12)], M.grey);
        part(g, [bx(w - 1.6, 1.3, 0.06, 0, 1.85, d / 2 - 0.28), bx(w, 0.08, 0.08, 0, 4.1, d / 2 - 0.06), bx(w, 0.08, 0.08, 0, 4.1, -d / 2 + 0.06), bx(0.08, 0.08, d, -w / 2 + 0.06, 4.1, 0), bx(0.08, 0.08, d, w / 2 - 0.06, 4.1, 0), bx(w, 0.06, 0.06, 0, 3.6, d / 2 - 0.06), bx(0.06, 0.06, d, w / 2 - 0.06, 3.6, 0)], M.dark);
        part(g, [bx(w + 0.3, 0.2, d + 0.3, 0, 6.4, 0)], roof);
      },
      MEDIA: function (g, w, d, roof) {
        part(g, [bx(w - 0.2, 2.8, d - 0.2, 0, 1.4, 0)], M.red);
        part(g, [bx(w, 0.18, d, 0, 2.9, 0), bx(w * 0.7, 0.12, d * 0.8, 0.6, 5.5, 0)], M.white);
        part(g, [bx(w * 0.66, 2.4, d * 0.74, 0.6, 4.2, 0)], M.glass);
        part(g, [bx(1.2, 0.14, 5.0, -w / 2 - 0.7, 1.45, 0.2, 0, 0.56)], M.teal);
        part(g, [bx(w - 1.4, 1.5, 0.06, 0, 1.5, d / 2 - 0.08), bx(w, 0.07, 0.07, 0, 3.9, d / 2 - 0.05), bx(w, 0.07, 0.07, 0, 3.9, -d / 2 + 0.05), bx(0.07, 0.07, d, -w / 2 + 0.05, 3.9, 0), bx(0.07, 0.07, d, w / 2 - 0.05, 3.9, 0)], M.dark);
        part(g, [bx(w * 0.72, 0.1, d * 0.82, 0.6, 5.6, 0)], roof);
      },
      STAGE: function (g, w, d, roof) {
        var hw = w / 2, hd = d / 2;
        part(g, [bx(w, 1.2, d, 0, 0.6, 0), bx(5, 0.6, 1.2, 0, 0.3, hd + 0.6), bx(5, 0.3, 1.2, 0, 0.15, hd + 1.6), bx(1.4, 2.2, 1.2, -hw + 1.2, 2.3, hd - 1), bx(1.4, 2.2, 1.2, hw - 1.2, 2.3, hd - 1), bx(12.6, 6.4, 0.5, 0, 4.6, -hd + 0.7)], M.dark);
        part(g, [bx(w + 0.1, 0.14, 0.12, 0, 1.1, hd + 0.02), bx(w + 0.1, 0.14, 0.12, 0, 0.5, hd + 0.02)], M.red);
        var tr = [], xs = [-hw + 0.3, hw - 0.3], zs = [-hd + 0.3, hd - 0.3];
        xs.forEach(function (x) { zs.forEach(function (z) { tr.push(bx(0.4, 8.4, 0.4, x, 5.4, z)); }); tr.push(bx(0.36, 0.36, d - 0.6, x, 9.4, 0)); });
        zs.forEach(function (z) { tr.push(bx(w - 0.6, 0.36, 0.36, 0, 9.4, z)); }); tr.push(bx(w - 0.6, 0.3, 0.3, 0, 9.4, 0));
        part(g, tr, M.grey);
        var pan = []; [-8, 8].forEach(function (x) { pan.push(bx(3.4, 3.4, 0.08, x, 5.6, -hd + 0.75, 0, 0, Math.PI / 4)); pan.push(bx(2.0, 2.0, 0.08, x * 0.99, 2.8, -hd + 0.8, 0, 0, Math.PI / 4)); });
        part(g, pan, M.redGlass).castShadow = false;
        part(g, [bx(w - 0.5, 0.06, d - 0.5, 0, 1.23, 0)], roof).castShadow = false;
        var led = new T.Mesh(new T.PlaneGeometry(12, 5.8), new T.MeshBasicMaterial({ map: ledTex, toneMapped: false })); led.position.set(0, 4.6, -hd + 0.97); g.add(led);
        beams = new T.Group();
        for (var i = 0; i < 5; i++) { var c = new T.Mesh(new T.ConeGeometry(2.2, 9, 20, 1, true).translate(0, -4.5, 0), new T.MeshBasicMaterial({ color: i % 2 ? 0xff4a3a : 0xffe2b0, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); c.position.set(-8 + i * 4, 9.3, hd - 0.4); c.userData.ph = i * 1.3; beams.add(c); }
        g.add(beams);
      },
      COMP: function (g, w, d, roof) {
        var hw = w / 2, h = 5.2, fr = [], tri = [], i, s;
        part(g, [bx(w, 0.16, d, 0, 0.08, 0)], roof).castShadow = false;
        for (i = 0; i <= 3; i++) { var t = -hw + i * w / 3; [[t, -hw], [t, hw], [-hw, t], [hw, t]].forEach(function (p) { fr.push(bx(0.16, h, 0.16, p[0], h / 2, p[1])); }); }
        [-hw, hw].forEach(function (v) { fr.push(bx(w, 0.16, 0.16, 0, h, v)); fr.push(bx(0.16, 0.16, w, v, h, 0)); fr.push(bx(w, 0.12, 0.12, 0, h / 2, v)); fr.push(bx(0.12, 0.12, w, v, h / 2, 0)); });
        part(g, fr, M.white);
        // ألواح مثلثة حمراء على الجوانب
        var pos = [];
        function triangle(a, b, c) { pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
        for (s = 0; s < 4; s++) for (i = 0; i < 6; i++) {
          if (s === 0 && (i === 2 || i === 3)) continue;
          var u0 = -hw + i * w / 6, u1 = u0 + w / 6, um = (u0 + u1) / 2, y0 = (i % 2) ? h / 2 : 0, y1 = y0 + h / 2;
          var P = function (u, y) { return s === 0 ? [u, y, hw] : s === 1 ? [u, y, -hw] : s === 2 ? [hw, y, u] : [-hw, y, u]; };
          if (i % 2) triangle(P(u0, y1), P(u1, y1), P(um, y0)); else triangle(P(u0, y0), P(u1, y0), P(um, y1));
        }
        var tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); tg.computeVertexNormals();
        g.add(new T.Mesh(tg, M.redGlass));
        part(g, [bx(2.6, 1.0, 1.0, -3, 0.66, -1), bx(2.6, 1.0, 1.0, 3, 0.66, -1), bx(2.6, 1.0, 1.0, -3, 0.66, 2.4), bx(2.6, 1.0, 1.0, 3, 0.66, 2.4)], M.wood);
        part(g, [bx(5, 2.6, 0.2, 0, 2.4, -hw + 0.5)], M.dark);
      }
    };
    var beams = null;
    var ledTex = canvasTex(1024, 512, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#120304'); gr.addColorStop(1, '#3a0709'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,60,50,.35)'; x.lineWidth = 3; for (var i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 60 * i); x.bezierCurveTo(w * 0.3, 60 * i + 90, w * 0.6, 60 * i - 120, w, 60 * i + 40); x.stroke(); }
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f2efe9'; x.font = '400 250px ' + opts.displayFont; x.fillText('BBQ', w / 2, h * 0.42);
      x.save(); x.translate(w / 2 + 40, h * 0.74); x.rotate(-0.1); x.fillStyle = '#ff2a22'; x.font = 'italic 900 140px ' + opts.displayFont; x.fillText('FEST.', 0, 0); x.restore();
      x.fillStyle = '#fff'; x.font = '700 34px ' + opts.displayFont; x.fillText('WE GRILL . YOU CHILL', w / 2, h * 0.93);
    });
    var logoTex = canvasTex(512, 512, function (x, w) {
      x.fillStyle = '#141414'; x.beginPath(); x.arc(256, 256, 250, 0, 6.3); x.fill(); x.strokeStyle = '#f2efe9'; x.lineWidth = 16; x.stroke();
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f2efe9'; x.font = '400 200px ' + opts.displayFont; x.fillText('BBQ', w / 2, 230);
      x.save(); x.translate(w / 2 + 20, 360); x.rotate(-0.1); x.fillStyle = '#ff2a22'; x.font = 'italic 900 110px ' + opts.displayFont; x.fillText('FEST', 0, 0); x.restore();
    });

    // ---------- إنشاء الأجنحة ----------
    var boothObjs = [], hitMeshes = [], byId = {};
    var gate = D.site.gateIn.p;
    D.booths.forEach(function (b) {
      var t = D.types[b.type], g = new T.Group();
      g.position.set(b.x, 0.08, b.z); g.rotation.y = b.rot;
      builders[b.type](g, b.w, b.d, roofMat[b.type]);
      g.scale.y = 0.001; g.visible = false; built.add(g);
      var hit = new T.Mesh(new T.BoxGeometry(b.w, t.h, b.d), new T.MeshBasicMaterial({ visible: false }));
      hit.position.set(b.x, t.h / 2, b.z); hit.rotation.y = b.rot; hit.userData.booth = b; scene.add(hit); hitMeshes.push(hit);
      var dx = b.x - gate[0], dz = b.z - gate[1];
      var o = { b: b, t: t, group: g, hit: hit, delay: Math.sqrt(dx * dx + dz * dz) / 70, s: 0, target: 0, t0: 0, from: 0, flat: false };
      boothObjs.push(o); byId[b.id] = o;
    });

    // ملصقات الأسقف (أطلس واحد)
    var labelObjs = boothObjs.filter(function (o) { return !o.t.special; });
    var atlas = canvasTex(2048, 1024, function (x) {
      labelObjs.forEach(function (o, i) {
        var cx0 = (i % 16) * 128 + 64, cy0 = Math.floor(i / 16) * 64 + 32;
        x.font = '900 ' + (o.b.id.length > 2 ? 40 : 46) + 'px ' + opts.font; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 6; x.strokeStyle = o.t.dark ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.55)'; x.strokeText(o.b.id, cx0, cy0 + 2);
        x.fillStyle = o.t.dark ? '#141414' : '#ffffff'; x.fillText(o.b.id, cx0, cy0 + 2);
      });
    });
    var labelMat = new T.MeshBasicMaterial({ map: atlas, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, toneMapped: false });
    var labelMesh = new T.Mesh(new T.BufferGeometry(), labelMat); labelMesh.renderOrder = 5; labelMesh.visible = false; scene.add(labelMesh);
    function buildLabels() {
      var pos = [], uv = [];
      labelObjs.forEach(function (o, i) {
        var b = o.b, side = Math.abs(Math.sin(b.rot)) > 0.9, diag = !side && Math.abs(Math.sin(b.rot)) > 0.3;
        var xe = diag ? 3.4 : (side ? b.d : b.w), ze = diag ? 3.4 : (side ? b.w : b.d), rot90 = ze > xe * 1.4;
        var lw = rot90 ? Math.min(ze * 0.9, xe * 1.8) : Math.min(xe * 0.9, ze * 1.8), lh = lw / 2;
        var y = (o.flat ? o.t.h * 0.1 : (b.type === 'G' ? 3.33 : b.type === 'D' ? 6.5 : b.type === 'E' ? 3.23 : b.type === 'K' ? 2.37 : 2.7)) + 0.12;
        var r = rot90 ? [0, 1] : [1, 0], u = rot90 ? [1, 0] : [0, -1];
        function P(sr, su) { return [b.x + r[0] * lw / 2 * sr + u[0] * lh / 2 * su, y, b.z + r[1] * lw / 2 * sr + u[1] * lh / 2 * su]; }
        var TL = P(-1, 1), TR = P(1, 1), BL = P(-1, -1), BR = P(1, -1);
        var u0 = (i % 16) / 16, u1 = u0 + 1 / 16, v1 = 1 - Math.floor(i / 16) / 16, v0 = v1 - 1 / 16;
        pos.push.apply(pos, TL.concat(BL, TR, TR, BL, BR)); uv.push(u0, v1, u0, v0, u1, v1, u1, v1, u0, v0, u1, v0);
      });
      var g = labelMesh.geometry; g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2)); g.computeBoundingSphere();
    }
    buildLabels();

    // توهج الأرض + واجهات مضيئة (ليلًا)
    var glowTex = (function () { var c = document.createElement('canvas'); c.width = c.height = 128; var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,150,60,.9)'); g.addColorStop(0.45, 'rgba(255,120,40,.4)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
    var glowMat = new T.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    var frontMat = new T.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    var glowMesh, frontMesh;
    (function () {
      var n = boothObjs.length, dm = new T.Object3D(), pg = new T.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
      glowMesh = new T.InstancedMesh(pg, glowMat, n); glowMesh.renderOrder = 3;
      var fl = boothObjs.filter(function (o) { return 'KSBGD'.indexOf(o.b.type) >= 0 && o.b.type.length === 1; });
      frontMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), frontMat, fl.length); frontMesh.renderOrder = 4;
      boothObjs.forEach(function (o, i) { dm.rotation.set(0, o.b.rot, 0); dm.position.set(o.b.x, 0.16, o.b.z); dm.scale.set(o.b.w + 9, 1, o.b.d + 9); dm.updateMatrix(); glowMesh.setMatrixAt(i, dm.matrix); });
      fl.forEach(function (o, i) {
        var b = o.b, ty = b.type, hh = ty === 'K' ? 0.86 : ty === 'G' ? 1.8 : ty === 'D' ? 1.2 : 1.1, yy = ty === 'K' ? 1.6 : ty === 'G' ? 1.55 : ty === 'D' ? 1.85 : 1.72;
        var zz = ty === 'G' ? b.d * 0.04 + 0.06 : (ty === 'D' ? b.d / 2 - 0.24 : (ty === 'K' ? b.d / 2 - 0.09 : b.d / 2 - 0.13)), ww = ty === 'K' ? b.w - 0.8 : ty === 'D' ? b.w - 1.8 : b.w - 1.2;
        dm.rotation.set(0, b.rot, 0); dm.position.set(b.x + Math.sin(b.rot) * zz, yy + 0.08, b.z + Math.cos(b.rot) * zz); dm.scale.set(ww, hh, 1); dm.updateMatrix(); frontMesh.setMatrixAt(i, dm.matrix);
      });
      glowMesh.visible = frontMesh.visible = false; glowMesh.frustumCulled = frontMesh.frustumCulled = false; scene.add(glowMesh); scene.add(frontMesh);
    })();

    // ---------- النخيل ----------
    (function () {
      var fr = [], r = rng(31), k, i;
      for (k = 0; k < 12; k++) {
        var ang = k * Math.PI * 2 / 12 + (r() - 0.5) * 0.3, droop = 0.8 + r() * 0.5, L = 4.0 + r() * 1.2, pos = [], prev = null;
        for (i = 0; i <= 6; i++) { var t = i / 6, rr = t * L, y = Math.sin(t * 1.7) * 1.5 - t * t * 2.9 * droop, hw = 0.6 * (1 - t * 0.85) + 0.04; var cur = [[rr, y, -hw], [rr, y, hw]]; if (prev) { pos.push.apply(pos, prev[0].concat(prev[1], cur[0], cur[0], prev[1], cur[1])); } prev = cur; }
        var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new T.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); g.rotateY(ang); g.computeVertexNormals(); fr.push(g);
      }
      var crownGeo = merge(fr); crownGeo.translate(0, 7.6, 0);
      var n = D.site.palms.length, trunks = new T.InstancedMesh(new T.CylinderGeometry(0.2, 0.36, 7.7, 7).translate(0, 3.85, 0), M.trunk, n), crowns = new T.InstancedMesh(crownGeo, M.palm, n), dm = new T.Object3D();
      D.site.palms.forEach(function (p, j) { var s = 0.85 + r() * 0.4; dm.position.set(p[0], 0.05, p[1]); dm.scale.set(s, s, s); dm.rotation.set((r() - 0.5) * 0.08, r() * 6.28, (r() - 0.5) * 0.08); dm.updateMatrix(); trunks.setMatrixAt(j, dm.matrix); crowns.setMatrixAt(j, dm.matrix); });
      trunks.castShadow = crowns.castShadow = true; trunks.frustumCulled = crowns.frustumCulled = false; deco.add(trunks); deco.add(crowns);
    })();

    // ---------- عربات الطعام + الطاولات + الجلسات ----------
    (function () {
      var bodies = [std('#26262b', { roughness: 0.5 }), std('#b81d23', { roughness: 0.5 }), std('#e9e5dc', { roughness: 0.5 })];
      D.site.trucks.forEach(function (t, i) {
        var g = new T.Group(); g.position.set(t.x, 0.08, t.z); g.rotation.y = t.rot;
        part(g, [bx(5.4, 2.3, 2.2, -0.5, 1.6, 0), bx(1.7, 1.6, 2.1, 3.0, 1.25, 0)], bodies[i % 3]);
        part(g, [cyl(0.44, 0.44, 0.3, -2.2, 0.44, 1.0, 12, Math.PI / 2), cyl(0.44, 0.44, 0.3, 2.7, 0.44, 1.0, 12, Math.PI / 2), cyl(0.44, 0.44, 0.3, -2.2, 0.44, -1.0, 12, Math.PI / 2), cyl(0.44, 0.44, 0.3, 2.7, 0.44, -1.0, 12, Math.PI / 2), bx(1.5, 0.7, 2.12, 3.1, 1.6, 0)], M.dark);
        part(g, [bx(3.6, 0.07, 1.3, -0.6, 2.75, 1.65, 0, -0.3)], i % 3 === 1 ? M.cream : M.red);
        var win = new T.Mesh(new T.PlaneGeometry(3.2, 0.95), frontMat); win.position.set(-0.6, 1.95, 1.12); g.add(win);
        deco.add(g);
      });
      var r = rng(41), tg = merge([bx(1.9, 0.08, 0.8, 0, 0.76, 0), bx(1.9, 0.06, 0.3, 0, 0.46, 0.62), bx(1.9, 0.06, 0.3, 0, 0.46, -0.62), bx(0.1, 0.76, 1.5, -0.7, 0.38, 0), bx(0.1, 0.76, 1.5, 0.7, 0.38, 0)]);
      var spots = [], i, j;
      for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) spots.push([D.mx(408 + i * 22), D.mz(626 + j * 24), 0]);
      [[80, 398], [80, 440], [80, 480], [80, 520], [150, 768], [200, 768], [250, 768], [300, 768], [272, 432], [300, 462]].forEach(function (p) { spots.push([D.mx(p[0]), D.mz(p[1]), r() * 3]); });
      var tables = new T.InstancedMesh(tg, std('#c9463c', { roughness: 0.7 }), spots.length), dm = new T.Object3D();
      spots.forEach(function (s, k) { dm.position.set(s[0], 0.08, s[1]); dm.rotation.y = s[2]; dm.updateMatrix(); tables.setMatrixAt(k, dm.matrix); });
      tables.castShadow = true; tables.frustumCulled = false; deco.add(tables);
      // جلسات مظللة (برجولات)
      [[362, 632], [362, 690], [500, 548]].forEach(function (p) {
        var g = new T.Group(); g.position.set(D.mx(p[0]), 0.08, D.mz(p[1]));
        part(g, [bx(0.22, 3, 0.22, -2, 1.5, -1.6), bx(0.22, 3, 0.22, 2, 1.5, -1.6), bx(0.22, 3, 0.22, -2, 1.5, 1.6), bx(0.22, 3, 0.22, 2, 1.5, 1.6), bx(4.6, 0.2, 0.2, 0, 3, -1.6), bx(4.6, 0.2, 0.2, 0, 3, 1.6)], M.wood);
        part(g, [bx(4.8, 0.22, 3.8, 0, 3.2, 0)], M.leaf);
        part(g, [bx(2.6, 0.55, 0.8, 0, 0.3, -1.1), bx(0.8, 0.55, 1.4, -1.5, 0.3, 0.2), bx(0.8, 0.55, 1.4, 1.5, 0.3, 0.2)], M.cream);
        part(g, [bx(0.5, 0.5, 0.5, -2, 0.25, -1.6), bx(0.5, 0.5, 0.5, 2, 0.25, -1.6), bx(0.5, 0.5, 0.5, -2, 0.25, 1.6), bx(0.5, 0.5, 0.5, 2, 0.25, 1.6)], M.red);
        deco.add(g);
      });
    })();

    // ---------- البوابات ----------
    (function () {
      var g = new T.Group(), gi = D.site.gateIn; g.position.set(gi.p[0], 0.08, gi.p[1]); g.rotation.y = gi.rot;
      part(g, [bx(1.3, 6.6, 1.3, -3.6, 3.3, 0), bx(1.3, 6.6, 1.3, 3.6, 3.3, 0), bx(8.5, 1.3, 1.3, 0, 7.2, 0)], M.white);
      var ed = [], pan = [];
      function cube(cx, cy, s) { var h = s / 2, t = 0.12; [-h, h].forEach(function (a) { [-h, h].forEach(function (b) { ed.push(bx(s, t, t, cx, cy + a, b)); ed.push(bx(t, s, t, cx + a, cy, b)); ed.push(bx(t, t, s, cx + a, cy + b, 0)); }); }); }
      [[-6, 1.5, 3], [-9, 1.5, 3], [-6, 4.5, 3], [-11.8, 1.3, 2.6], [-8.8, 4.3, 2.4], [6, 1.5, 3], [9, 1.5, 3], [6, 4.5, 3], [11.8, 1.3, 2.6], [8.8, 4.3, 2.4], [-2.4, 9.3, 2.8], [2.4, 9.3, 2.8]].forEach(function (c, i) {
        cube(c[0], c[1], c[2]); if (i % 2 === 0 || i > 9) pan.push(bx(c[2] * 0.72, c[2] * 0.72, 0.06, c[0], c[1], c[2] / 2 - 0.1, 0, 0, Math.PI / 4));
      });
      part(g, ed, M.white); part(g, pan, M.redGlass).castShadow = false;
      var disc = new T.Mesh(new T.CircleGeometry(2.1, 40), new T.MeshBasicMaterial({ map: logoTex, toneMapped: false, side: T.DoubleSide })); disc.position.set(0, 9.6, 0.9); g.add(disc);
      var disc2 = disc.clone(); disc2.position.z = -0.9; disc2.rotation.y = Math.PI; g.add(disc2);
      deco.add(g);
      var e = new T.Group(), go = D.site.gateOut; e.position.set(go.p[0], 0.08, go.p[1]); e.rotation.y = go.rot;
      part(e, [bx(1.5, 6.4, 1.5, -3.4, 3.2, 0), bx(1.5, 6.4, 1.5, 3.4, 3.2, 0), bx(8.3, 1.5, 1.5, 0, 7.1, 0)], M.redGlass);
      var et = canvasTex(256, 96, function (x, w, h) { x.fillStyle = '#fff'; x.font = '900 78px Georgia,serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EXIT', w / 2, h / 2 + 4); });
      var ep = new T.Mesh(new T.PlaneGeometry(3.6, 1.35), new T.MeshBasicMaterial({ map: et, transparent: true, toneMapped: false, side: T.DoubleSide })); ep.position.set(0, 7.1, 0.78); e.add(ep);
      deco.add(e);
    })();

    // ---------- المنطاد ----------
    var balloon = new T.Group();
    (function () {
      var pts = [], i; for (i = 0; i <= 18; i++) { var t = i / 18, y = t * 13, rr = t < 0.62 ? 1.1 + Math.sin(t / 0.62 * Math.PI / 2) * 5.2 : Math.cos((t - 0.62) / 0.38 * Math.PI / 2) * 6.3; pts.push(new T.Vector2(Math.max(rr, 0.02), y)); }
      var tex = canvasTex(1024, 512, function (x, w, h) {
        for (var k = 0; k < 16; k++) { x.fillStyle = ['#c61f25', '#f3efe6', '#c61f25', '#1d1d21'][k % 4]; x.fillRect(k * w / 16, 0, w / 16 + 1, h); }
        x.fillStyle = '#141414'; x.fillRect(0, h * 0.4, w, h * 0.2); x.fillStyle = '#f3efe6'; x.font = '400 78px ' + opts.displayFont; x.textAlign = 'center'; x.textBaseline = 'middle';
        for (var j = 0; j < 4; j++) x.fillText('BBQ FEST', w / 8 + j * w / 4, h * 0.505);
      });
      var env = new T.Mesh(new T.LatheGeometry(pts, 32), std('#ffffff', { map: tex, roughness: 0.75, side: T.DoubleSide })); env.castShadow = true; balloon.add(env);
      part(balloon, [bx(1.7, 1.3, 1.7, 0, -2.2, 0)], M.wood);
      part(balloon, [cyl(0.03, 0.03, 2.6, -0.8, -0.5, -0.8, 4), cyl(0.03, 0.03, 2.6, 0.8, -0.5, -0.8, 4), cyl(0.03, 0.03, 2.6, -0.8, -0.5, 0.8, 4), cyl(0.03, 0.03, 2.6, 0.8, -0.5, 0.8, 4)], M.dark);
      var flame = new T.Mesh(new T.ConeGeometry(0.4, 1.4, 10), new T.MeshBasicMaterial({ color: 0xffa23a, toneMapped: false })); flame.position.y = -0.6; balloon.add(flame);
      balloon.position.set(D.site.balloon[0], 16, D.site.balloon[1]); deco.add(balloon);
    })();

    // ---------- الزوار ----------
    (function () {
      var r = rng(77), geo = merge([cyl(0.2, 0.34, 1.45, 0, 0.725, 0, 8), new T.SphereGeometry(0.21, 8, 6).toNonIndexed().translate(0, 1.62, 0)]);
      var areas = [[345, 505, 600, 735, 46], [400, 505, 615, 720, 30], [232, 305, 440, 530, 14], [48, 330, 606, 618, 12], [48, 330, 700, 712, 12], [440, 1100, 404, 411, 34], [440, 1100, 490, 497, 34], [102, 118, 372, 550, 9], [160, 178, 372, 550, 9], [345, 580, 520, 590, 16], [70, 300, 752, 770, 10]];
      var pts = [];
      areas.forEach(function (a) { var c = 0, guard = 0; while (c < a[4] && guard++ < 900) { var x = D.mx(a[0] + r() * (a[1] - a[0])), z = D.mz(a[2] + r() * (a[3] - a[2])), ok = true; for (var i = 0; i < D.booths.length; i++) { var b = D.booths[i], dx = x - b.x, dz = z - b.z, co = Math.cos(b.rot), si = Math.sin(b.rot), lx = dx * co - dz * si, lz = dx * si + dz * co; if (Math.abs(lx) < b.w / 2 + 0.7 && Math.abs(lz) < b.d / 2 + 0.7) { ok = false; break; } } if (ok) { pts.push([x, z]); c++; } } });
      var people = new T.InstancedMesh(geo, std('#ffffff', { roughness: 0.9 }), pts.length), dm = new T.Object3D(), cols = ['#f4f1ea', '#f4f1ea', '#f4f1ea', '#19191d', '#19191d', '#19191d', '#6b7a8a', '#a8553f', '#3c5a4a', '#d8c9a8'];
      pts.forEach(function (p, i) { var s = 0.9 + r() * 0.2; dm.position.set(p[0], 0.08, p[1]); dm.scale.set(s, s, s); dm.updateMatrix(); people.setMatrixAt(i, dm.matrix); people.setColorAt(i, new T.Color(cols[Math.floor(r() * cols.length)])); });
      people.castShadow = true; people.frustumCulled = false; deco.add(people);
    })();

    // ---------- حبال الإضاءة ----------
    var bulbMat = new T.PointsMaterial({ map: dotTex, color: 0xffb566, size: 1.35, sizeAttenuation: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false });
    (function () {
      var lines = [[[345, 600], [430, 560], [505, 600], [505, 735], [420, 700], [345, 735], [345, 600]], [[430, 560], [420, 700]], [[420, 412], [1120, 412]], [[420, 492], [1120, 492]], [[232, 440], [305, 440], [305, 530], [232, 530], [232, 440]], [[48, 600], [330, 600]], [[48, 708], [330, 708]]];
      var pos = [], poles = [];
      lines.forEach(function (l) {
        for (var i = 0; i < l.length - 1; i++) {
          var a = l[i], b = l[i + 1], len = Math.sqrt(Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)) / D.PX, spans = Math.max(1, Math.round(len / 14));
          for (var s = 0; s < spans; s++) {
            var p0 = [a[0] + (b[0] - a[0]) * s / spans, a[1] + (b[1] - a[1]) * s / spans], p1 = [a[0] + (b[0] - a[0]) * (s + 1) / spans, a[1] + (b[1] - a[1]) * (s + 1) / spans];
            poles.push(cyl(0.06, 0.06, 5.4, D.mx(p0[0]), 2.7, D.mz(p0[1]), 5)); if (s === spans - 1) poles.push(cyl(0.06, 0.06, 5.4, D.mx(p1[0]), 2.7, D.mz(p1[1]), 5));
            for (var k = 0; k <= 12; k++) { var t = k / 12; pos.push(D.mx(p0[0] + (p1[0] - p0[0]) * t), 5.3 - Math.sin(t * Math.PI) * 0.9, D.mz(p0[1] + (p1[1] - p0[1]) * t)); }
          }
        }
      });
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3));
      var p = new T.Points(g, bulbMat); p.renderOrder = 6; deco.add(p);
      var pm = new T.Mesh(merge(poles), M.dark); deco.add(pm);
    })();

    // ---------- ملصقات المناطق ----------
    var zoneSprites = [];
    D.zones.forEach(function (z) {
      var s = textSprite([z.ar, z.en.toUpperCase()], { world: z.key === 'exhibitor' ? 20 : 15 });
      var yy = { stage: 14, comp: 10, gate: 15, balloon: 34, diamond: 11, gold: 8, exhibitor: 10 }[z.key] || 8;
      var zz = z.key === 'gold' ? D.mz(742) : z.z;
      s.position.set(z.x, yy, zz); s.userData.zone = z; scene.add(s); zoneSprites.push(s); fadeMats.zone.push(s.material);
    });

    // ---------- التحديد ----------
    var hoverBox = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false })); hoverBox.visible = false; hoverBox.renderOrder = 8; scene.add(hoverBox);
    var selBox = new T.Group(); selBox.visible = false; scene.add(selBox);
    var selFill = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.25, depthWrite: false })); selFill.renderOrder = 8; selBox.add(selFill);
    var selEdge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), new T.LineBasicMaterial({ color: 0xffffff })); selBox.add(selEdge);
    var pin = new T.Mesh(new T.ConeGeometry(1.1, 2.6, 4).rotateX(Math.PI), new T.MeshBasicMaterial({ color: ACCENT, toneMapped: false })); pin.visible = false; scene.add(pin);
    function fitBox(obj, o) { obj.position.set(o.b.x, o.t.h * (o.flat ? 0.06 : 0.5) + 0.1, o.b.z); obj.rotation.y = o.b.rot; obj.scale.set(o.b.w + 0.5, o.t.h * (o.flat ? 0.12 : 1) + 0.3, o.b.d + 0.5); }

    // ---------- التحكم بالكاميرا ----------
    var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = 1.46; controls.minDistance = 14; controls.maxDistance = 520;
    controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = 0.35; controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.7;
    var home = { target: new T.Vector3(D.mx(520), 0, D.mz(530)), offset: new T.Vector3(-16, 84, 128) };
    function fitScale() { var a = camera.aspect; return a >= 1.5 ? 1 : clamp(1.5 / a, 1, 1.5) * 0.95; }
    function homeOffset(k) { var a = camera.aspect; if (a < 1) return new T.Vector3(-150, 150, 26).multiplyScalar(clamp(0.62 / a, 1, 1.5) * (k || 1)); return home.offset.clone().multiplyScalar(fitScale() * (k || 1)); }
    function homeTarget() { return camera.aspect < 1 ? new T.Vector3(0, 0, 3) : home.target.clone(); }
    camera.fov = camera.aspect < 1 ? 58 : 42; camera.updateProjectionMatrix();
    controls.target.copy(homeTarget());
    camera.position.copy(homeTarget()).add(homeOffset(opts.intro ? 2.3 : 1));
    if (opts.intro) camera.position.y += 120;
    var idleTimer = null, userActive = false;
    controls.addEventListener('start', function () { camTween = null; controls.autoRotate = false; userActive = true; clearTimeout(idleTimer); });
    controls.addEventListener('end', function () { userActive = false; if (opts.autoRotate) { clearTimeout(idleTimer); idleTimer = setTimeout(function () { controls.autoRotate = true; }, 9000); } });
    var embedded = !!opts.embedded, zoomLock = false;
    function syncZoom(active) { controls.enableZoom = zoomLock ? false : (embedded ? !!active : true); }
    renderer.domElement.addEventListener('pointerdown', function () { syncZoom(true); });
    renderer.domElement.addEventListener('pointerleave', function () { syncZoom(false); });
    renderer.domElement.style.touchAction = embedded ? 'pan-y' : 'none'; syncZoom(false);
    var camTween = null;
    function flyTo(key, dur) {
      var target, pos;
      if (key === 'home' || !key) { target = homeTarget(); pos = target.clone().add(homeOffset(1)); }
      else if (typeof key === 'string') { var z = D.zones.filter(function (q) { return q.key === key; })[0]; if (!z) return; target = new T.Vector3(z.target[0], 1.5, z.target[2]); pos = target.clone().add(new T.Vector3(z.offset[0], z.offset[1], z.offset[2]).multiplyScalar(camera.aspect < 1 ? 1.35 : 1)); }
      else { target = new T.Vector3(key.target[0], key.target[1], key.target[2]); pos = new T.Vector3(key.position[0], key.position[1], key.position[2]); }
      controls.autoRotate = false; clearTimeout(idleTimer);
      camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: now(), dur: (dur || 1.8) * 1000, home: key === 'home' || !key };
    }

    // ---------- الثيمات ----------
    var cur = null, themeTween = null, themeName = opts.theme;
    function themeState(n) { var t = THEMES[n], s = {}; ['skyTop', 'skyMid', 'skyBot', 'fog', 'sun', 'hemiSky', 'hemiGnd', 'sand'].forEach(function (k) { s[k] = new T.Color(t[k]); }); ['fogD', 'sunI', 'hemiI', 'glow', 'bulbs', 'stars', 'exposure', 'sunGlow'].forEach(function (k) { s[k] = t[k]; }); s.sunPos = new T.Vector3(t.sunPos[0], t.sunPos[1], t.sunPos[2]); return s; }
    function applyTheme(s) {
      drawSky('#' + s.skyTop.getHexString(), '#' + s.skyMid.getHexString(), '#' + s.skyBot.getHexString());
      scene.fog.color.copy(s.fog); scene.fog.density = s.fogD; renderer.setClearColor(s.fog);
      sun.color.copy(s.sun); sun.intensity = s.sunI; sun.position.copy(s.sunPos).add(home.target); sun.target.position.copy(home.target);
      hemi.color.copy(s.hemiSky); hemi.groundColor.copy(s.hemiGnd); hemi.intensity = s.hemiI;
      sandMat.color.copy(s.sand); renderer.toneMappingExposure = s.exposure;
      stars.material.opacity = s.stars; stars.visible = s.stars > 0.01;
      sunSprite.position.copy(s.sunPos).normalize().multiplyScalar(1500); sunSprite.material.opacity = s.sunGlow; sunSprite.material.color.copy(s.sun); sunSprite.visible = s.sunGlow > 0.01;
      cur = s; applyGlow();
    }
    function applyGlow() {
      var k = builtP, g = cur.glow;
      glowMat.opacity = g * 0.62 * k; frontMat.opacity = (0.12 + g * 0.88) * k; bulbMat.opacity = cur.bulbs * k;
      glowMesh.visible = glowMat.opacity > 0.01; frontMesh.visible = k > 0.5 && !filterType;
      if (beams) beams.children.forEach(function (c) { c.material.opacity = g * 0.16 * k; });
    }
    function setTheme(n, instant) {
      if (!THEMES[n]) return; themeName = n; var to = themeState(n);
      if (instant || !cur) { applyTheme(to); themeTween = null; } else themeTween = { from: cur, to: to, start: now(), dur: 1400 };
      container.setAttribute('data-f3d-theme', n);
    }
    function lerpTheme(a, b, t) { var s = {}; ['skyTop', 'skyMid', 'skyBot', 'fog', 'sun', 'hemiSky', 'hemiGnd', 'sand'].forEach(function (k) { s[k] = a[k].clone().lerp(b[k], t); }); ['fogD', 'sunI', 'hemiI', 'glow', 'bulbs', 'stars', 'exposure', 'sunGlow'].forEach(function (k) { s[k] = a[k] + (b[k] - a[k]) * t; }); s.sunPos = a.sunPos.clone().lerp(b.sunPos, t); return s; }

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
      if (stage < 1) return null; var r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera); var hits = ray.intersectObjects(hitMeshes, false);
      for (var i = 0; i < hits.length; i++) { var b = hits[i].object.userData.booth; if (!filterType || b.type === filterType || D.types[b.type].special) return byId[b.id]; }
      return null;
    }
    function boothInfo(o) { var t = o.t; return { id: o.b.id, type: o.b.type, name: t.ar, en: t.en, size: t.size, note: t.note, price: t.price, color: t.color, special: !!t.special }; }
    function onMove(ev) {
      if (ev.pointerType === 'touch') return;
      var o = pick(ev);
      if (o !== hovered) { hovered = o; hoverBox.visible = !!o && o !== selected; if (o) fitBox(hoverBox, o); renderer.domElement.style.cursor = o ? 'pointer' : 'grab'; fire('hover', o ? boothInfo(o) : null); }
      if (tip) {
        if (o) { var r = container.getBoundingClientRect(), t = o.t; tip.innerHTML = '<b style="--c:' + t.color + '">' + (t.special ? t.ar : o.b.id) + '</b><span>' + (t.special ? t.en : t.ar) + ' · ' + t.size + '</span><em>' + D.fmt(t.price) + ' ر.س</em>'; tip.style.transform = 'translate(' + Math.round(ev.clientX - r.left + 14) + 'px,' + Math.round(ev.clientY - r.top + 14) + 'px)'; tip.classList.add('on'); }
        else tip.classList.remove('on');
      }
    }
    function select(id, silent) {
      var o = id ? byId[id] : null; selected = o; selBox.visible = pin.visible = !!o;
      if (o) { fitBox(selBox, o); hoverBox.visible = false; pin.position.set(o.b.x, o.t.h * (o.flat ? 0.12 : 1) + 4, o.b.z); }
      if (!silent) fire('select', o ? boothInfo(o) : null);
    }
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', function () { hovered = null; hoverBox.visible = false; if (tip) tip.classList.remove('on'); });
    renderer.domElement.addEventListener('pointerdown', function (ev) { downAt = [ev.clientX, ev.clientY]; });
    renderer.domElement.addEventListener('pointerup', function (ev) { if (!downAt) return; var moved = Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]); downAt = null; if (moved > 7) return; var o = pick(ev); select(o ? o.b.id : null); });
    renderer.domElement.style.cursor = 'grab';

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

    // ---------- الحلقة ----------
    function now() { return performance.now(); }
    var running = true, visible = true, paused = false, raf = null, clock0 = now();
    function frame() {
      raf = null; if (!running) return;
      if (visible && !paused && !document.hidden) { update(); renderer.render(scene, camera); }
      raf = requestAnimationFrame(frame);
    }
    function update() {
      var t = now(), i, k, any = false;
      // قيم المراحل
      for (k in valTweens) { var v = valTweens[k]; if (!v) continue; var p = clamp((t - v.start) / v.dur, 0, 1); vals[k] = v.from + (v.to - v.from) * easeInOut(p); if (p >= 1) valTweens[k] = null; any = true; }
      if (any) applyVals();
      // الأجنحة
      for (i = 0; i < boothObjs.length; i++) {
        var o = boothObjs[i], tgt = o.target, fs = o.flat ? 0.1 : 1;
        if (o.fs === undefined) o.fs = fs;
        if (o.s !== tgt || o.fs !== fs) {
          var q = clamp((t - o.t0) / 850, 0, 1);
          if (o.s !== tgt) o.s = q >= 1 ? tgt : o.from + (tgt - o.from) * (tgt > o.from ? easeOutBack(q) : easeOutCubic(q));
          if (o.fs !== fs) { o.fs += (fs - o.fs) * 0.16; if (Math.abs(o.fs - fs) < 0.004) o.fs = fs; }
          var sy = Math.max(0.001, o.s * o.fs); o.group.scale.y = sy; o.group.visible = o.s > 0.003;
        }
      }
      // الثيم
      if (themeTween) { var tp = clamp((t - themeTween.start) / themeTween.dur, 0, 1); applyTheme(lerpTheme(themeTween.from, themeTween.to, easeInOut(tp))); if (tp >= 1) themeTween = null; }
      // الكاميرا
      if (camTween) { var cp = clamp((t - camTween.start) / camTween.dur, 0, 1), ce = easeInOut(cp); camera.position.lerpVectors(camTween.p0, camTween.p1, ce); controls.target.lerpVectors(camTween.t0, camTween.t1, ce); if (cp >= 1) { var wasHome = camTween.home; camTween = null; if (opts.autoRotate && !userActive && (wasHome || opts.orbitZones)) controls.autoRotate = true; } }
      if (shift.x !== shift.tx || shift.y !== shift.ty) { shift.x += (shift.tx - shift.x) * 0.07; shift.y += (shift.ty - shift.y) * 0.07; if (Math.abs(shift.x - shift.tx) < 0.0008) shift.x = shift.tx; if (Math.abs(shift.y - shift.ty) < 0.0008) shift.y = shift.ty; applyShift(); }
      controls.update();
      // حركة
      var s = (t - clock0) / 1000;
      balloon.position.y = 17 + Math.sin(s * 0.5) * 1.6; balloon.rotation.y = s * 0.08;
      if (beams && cur.glow > 0.05) beams.children.forEach(function (c) { c.rotation.z = Math.sin(s * 0.7 + c.userData.ph) * 0.45; c.rotation.x = 0.35 + Math.cos(s * 0.5 + c.userData.ph) * 0.2; });
      if (selected) { pin.position.y = selected.t.h * (selected.flat ? 0.12 : 1) + 4 + Math.sin(s * 3) * 0.6; pin.rotation.y = s * 1.5; selFill.material.opacity = 0.2 + Math.sin(s * 4) * 0.08; }
      // ابقِ الملصقات بحجم مقروء
      var dist = camera.position.distanceTo(controls.target), ls = clamp(dist / 190, 0.4, 1.3), far = dist > 215;
      for (i = 0; i < zoneSprites.length; i++) { var zs = zoneSprites[i], zk = zs.userData.zone.key, base = zk === 'exhibitor' ? 17 : 13; zs.scale.set(base * ls, base * ls * 160 / 512, 1); if (vals.zone > 0.01) zs.visible = !(far && (zk === 'gate' || zk === 'kiosk' || zk === 'diamond' || zk === 'bronze' || zk === 'activation')); }
    }
    var shift = { x: 0, y: 0, tx: 0, ty: 0 };
    function applyShift() { var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; if (Math.abs(shift.x) < 0.001 && Math.abs(shift.y) < 0.001) camera.clearViewOffset(); else camera.setViewOffset(w, h, shift.x * w, shift.y * h, w, h); }
    function resize() {
      var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 58 : 42; camera.updateProjectionMatrix(); applyShift();
    }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(container); else window.addEventListener('resize', resize);
    var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '120px' }) : null; if (io) io.observe(container);

    // ---------- بدء ----------
    setTheme(opts.theme, true);
    applyVals();
    setStage(opts.stage, !opts.intro);
    if (opts.intro) flyTo('home', 3.2);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(function () { textTextures.forEach(function (tx) { tx.userData.draw(); }); }, 60); });
    frame();

    var api = {
      setStage: setStage, getStage: function () { return stage; }, setTheme: setTheme, getTheme: function () { return themeName; },
      flyTo: flyTo, filter: filter, select: select, on: on, resize: resize,
      setLabels: function (v) { opts.labels = !!v; tweenVal('zone', (stage === 2 && v) ? 1 : 0, 400, 0); },
      setEmbedded: function (v) { embedded = !!v; renderer.domElement.style.touchAction = embedded ? 'pan-y' : 'none'; syncZoom(false); },
      setZoomLock: function (v) { zoomLock = !!v; syncZoom(false); },
      setPaused: function (v) { paused = !!v; },
      setShift: function (x, y) { shift.tx = x || 0; shift.ty = y || 0; },
      setAutoRotate: function (v) { opts.autoRotate = !!v; controls.autoRotate = !!v; },
      snapshot: function () { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
      dispose: function () { running = false; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); controls.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); if (tip && tip.parentNode) tip.parentNode.removeChild(tip); },
      three: { scene: scene, camera: camera, renderer: renderer, controls: controls }
    };
    return api;
  }

  // أنماط أساسية للتلميح
  var css = '.f3d{overflow:hidden}.f3d canvas{width:100%!important;height:100%!important;outline:none}' +
    '.f3d-tip{position:absolute;top:0;left:0;z-index:5;pointer-events:none;opacity:0;transition:opacity .15s;background:rgba(14,12,12,.92);color:#fff;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:9px 13px;font:500 13px/1.5 Tajawal,Segoe UI,Tahoma,sans-serif;direction:rtl;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.4);backdrop-filter:blur(6px)}' +
    '.f3d-tip.on{opacity:1}.f3d-tip b{display:inline-block;font-size:15px;font-weight:800;padding-inline-start:10px;border-inline-start:4px solid var(--c,#f33)}.f3d-tip span{display:block;opacity:.75;font-size:12px}.f3d-tip em{display:block;font-style:normal;font-weight:800;color:#ffb199}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  window.Festival3D = { create: create, THEMES: THEMES };
})();
