/* BBQ FEST — منطق مشترك للموديلات الثلاثة (عرض البيانات، العد التنازلي، الحجز، ربط المخطط) */
(function () {
  'use strict';
  var D = window.BBQ, E = D.event;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var WHY = [
    { t: 'جمهور يتجاوز 10,000 زائر يوميًا', d: 'وصول مباشر إلى جمهور مستهدف على مدار أيام المهرجان الخمسة.' },
    { t: 'حضور في المحتوى والتغطية', d: 'دمج علامتك ضمن التغطية الإعلامية ومنصات التواصل بحسب فئة الرعاية.' },
    { t: 'ارتباط بعالم الشواء', d: 'علامتك وسط الطهاة والعارضين والمتخصصين في قطاع الشواء والطهي الخارجي.' },
    { t: 'نقاط ظهور متعددة', d: 'المسرح، الشاشات، البوابات، اللوحات والمناطق الرئيسية وفق مستوى الباقة.' },
    { t: 'تفاعل مباشر مع الجمهور', d: 'عروض حية وتذوق وتجارب تفاعلية تصنع اتصالًا حقيقيًا مع الزوار.' },
    { t: 'ضيافة VIP لشركائك', d: 'مزايا ومساحات ضيافة خاصة في بعض الباقات لاستضافة العملاء والشركاء.' }
  ];
  var SECTORS = ['الأغذية والمنتجات الاستهلاكية', 'الشوايات ومعدات الطهي', 'الرحلات والتخييم', 'السيارات والـ Off-Road', 'المشروبات', 'التجزئة والتجارة الإلكترونية', 'التقنية والمدفوعات', 'النقل والتوصيل'];
  var GALLERY = [
    ['gate-render.jpg', 'بوابة الدخول'], ['stage-render.jpg', 'المسرح الرئيسي'], ['competition-c.jpg', 'منطقة المسابقات'], ['sitting-b.jpg', 'الجلسات المظللة'],
    ['trucks-b.jpg', 'عربات الطعام'], ['vip-a.jpg', 'ضيافة كبار الزوار'], ['media-a.jpg', 'الجناح الإعلامي'], ['exit-render.jpg', 'بوابة الخروج']
  ];
  var STATS = [
    { n: E.days, s: '', l: 'أيام متواصلة' }, { n: E.visitorsPerDay, s: '+', l: 'زائر يوميًا' },
    { n: E.area, s: '', l: 'م² مساحة الموقع' }, { n: D.booths.length, s: '', l: 'جناحًا ومساحة مشاركة' }
  ];

  var R = {
    packages: function (el) {
      el.innerHTML = D.packages.map(function (p, i) {
        var isType = !!D.types[p.key] && !D.types[p.key].special;
        return '<article class="pkg" data-tier="' + p.key + '" data-reveal style="--i:' + i + '">' +
          '<figure class="pkg-media"><img loading="lazy" src="assets/' + p.img + '" alt="' + p.ar + '"></figure>' +
          '<div class="pkg-body"><header class="pkg-head"><span class="pkg-tier">' + p.tier + '</span><h3 class="pkg-title">' + p.ar + '</h3><span class="pkg-en">' + p.en + '</span></header>' +
          '<p class="pkg-lead">' + p.lead + '</p>' +
          '<div class="pkg-meta"><span class="pkg-space">' + p.space + '</span><span class="pkg-count">' + (p.count > 1 ? p.count + ' مساحات' : 'مساحة واحدة حصرية') + '</span></div>' +
          '<ul class="pkg-perks">' + p.perks.map(function (k) { return '<li>' + k + '</li>'; }).join('') + '</ul>' +
          '<footer class="pkg-foot"><div class="pkg-price"><b>' + D.fmt(p.price) + '</b><span>ريال سعودي</span></div>' +
          '<div class="pkg-actions"><a class="btn pkg-book" href="#booking" data-book="' + p.key + '">اطلب الباقة</a>' +
          '<button type="button" class="pkg-map" data-zone="' + p.zone + '" data-filter="' + (isType ? p.key : '') + '">على المخطط ↗</button></div></footer></div></article>';
      }).join('');
    },
    experiences: function (el) {
      el.innerHTML = D.experiences.map(function (x, i) {
        return '<article class="exp" data-reveal style="--i:' + i + '"><figure class="exp-media"><img loading="lazy" src="assets/' + x.img + '" alt="' + x.ar + '"></figure>' +
          '<div class="exp-body"><span class="exp-n">' + pad(i + 1) + '</span><h3>' + x.ar + '</h3><span class="exp-en">' + x.en + '</span><p>' + x.d + '</p></div></article>';
      }).join('');
    },
    program: function (el) { el.innerHTML = D.program.map(function (p, i) { return '<li data-reveal style="--i:' + i + '"><span>' + pad(i + 1) + '</span>' + p + '</li>'; }).join(''); },
    categories: function (el) { el.innerHTML = D.categories.map(function (p, i) { return '<li data-reveal style="--i:' + i + '">' + p + '</li>'; }).join(''); },
    audience: function (el) { el.innerHTML = D.audience.map(function (a, i) { return '<li data-reveal style="--i:' + i + '"><h4>' + a.ar + '</h4><p>' + a.d + '</p></li>'; }).join(''); },
    why: function (el) { el.innerHTML = WHY.map(function (w, i) { return '<li data-reveal style="--i:' + i + '"><span class="why-n">' + pad(i + 1) + '</span><h4>' + w.t + '</h4><p>' + w.d + '</p></li>'; }).join(''); },
    sectors: function (el) { el.innerHTML = SECTORS.map(function (s) { return '<li>' + s + '</li>'; }).join(''); },
    gallery: function (el) { el.innerHTML = GALLERY.map(function (g, i) { return '<figure class="gal" data-reveal style="--i:' + i + '"><img loading="lazy" src="assets/' + g[0] + '" alt="' + g[1] + '"><figcaption>' + g[1] + '</figcaption></figure>'; }).join(''); },
    stats: function (el) { el.innerHTML = STATS.map(function (s) { return '<div class="stat"><b><span data-count="' + s.n + '">0</span>' + s.s + '</b><span>' + s.l + '</span></div>'; }).join(''); },
    pricelist: function (el) {
      el.innerHTML = D.packages.map(function (p) { return '<tr><th>' + p.ar + '<small>' + p.en + '</small></th><td>' + p.space + '</td><td class="num">' + D.fmt(p.price) + '</td></tr>'; }).join('');
    },
    countdown: function (el) {
      el.innerHTML = ['يوم', 'ساعة', 'دقيقة', 'ثانية'].map(function (l) { return '<div class="cd"><b>00</b><span>' + l + '</span></div>'; }).join('');
      var bs = $$('b', el), end = new Date(E.dateStart).getTime();
      function tick() { var s = Math.max(0, Math.floor((end - Date.now()) / 1000)); var v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60]; bs.forEach(function (b, i) { b.textContent = pad(v[i]); }); }
      tick(); setInterval(tick, 1000);
    },
    booking: function (el) {
      el.innerHTML = '<form class="book" novalidate>' +
        '<label class="f"><span>الاسم الكامل *</span><input name="name" required autocomplete="name"></label>' +
        '<label class="f"><span>الشركة / العلامة التجارية *</span><input name="company" required autocomplete="organization"></label>' +
        '<label class="f"><span>رقم الجوال *</span><input name="phone" required inputmode="tel" autocomplete="tel" dir="ltr" placeholder="+966"></label>' +
        '<label class="f"><span>البريد الإلكتروني</span><input name="email" type="email" autocomplete="email" dir="ltr"></label>' +
        '<label class="f"><span>نوع المشاركة *</span><select name="pkg" required><option value="">اختر الباقة</option>' + D.packages.map(function (p) { return '<option value="' + p.key + '">' + p.ar + ' — ' + D.fmt(p.price) + ' ر.س</option>'; }).join('') + '</select></label>' +
        '<label class="f"><span>رقم الجناح (اختياري)</span><input name="booth" placeholder="مثال: G5 — اختره من المخطط" dir="ltr"></label>' +
        '<label class="f f-wide"><span>ملاحظات</span><textarea name="notes" rows="3"></textarea></label>' +
        '<div class="book-foot"><button class="btn btn-main" type="submit">إرسال الطلب</button><p class="book-note">سيتواصل معك فريق الرعايات لتأكيد التوفر والتفاصيل.</p></div>' +
        '<div class="book-done" hidden><h4>تم تجهيز طلبك ✓</h4><pre></pre><div class="book-send"></div></div></form>';
      var form = $('form', el), done = $('.book-done', el);
      form.addEventListener('submit', function (ev) {
        ev.preventDefault(); var ok = true;
        $$('[required]', form).forEach(function (i) { var bad = !i.value.trim(); i.closest('.f').classList.toggle('bad', bad); if (bad) ok = false; });
        if (!ok) { var first = $('.bad input, .bad select', form); if (first) first.focus(); return; }
        var v = {}; $$('input,select,textarea', form).forEach(function (i) { v[i.name] = i.value.trim(); });
        var p = D.packages.filter(function (x) { return x.key === v.pkg; })[0];
        var txt = 'طلب مشاركة — BBQ FEST\n' + 'الاسم: ' + v.name + '\nالشركة: ' + v.company + '\nالجوال: ' + v.phone + (v.email ? '\nالبريد: ' + v.email : '') +
          '\nالباقة: ' + p.ar + ' (' + D.fmt(p.price) + ' ر.س)' + (v.booth ? '\nالجناح: ' + v.booth.toUpperCase() : '') + (v.notes ? '\nملاحظات: ' + v.notes : '');
        $('pre', done).textContent = txt;
        var send = $('.book-send', done), c = E.contact, html = '';
        if (c.whatsapp) html += '<a class="btn btn-main" target="_blank" rel="noopener" href="https://wa.me/' + c.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(txt) + '">إرسال عبر واتساب</a>';
        if (c.email) html += '<a class="btn" href="mailto:' + c.email + '?subject=' + encodeURIComponent('طلب مشاركة — BBQ FEST') + '&body=' + encodeURIComponent(txt) + '">إرسال بالبريد</a>';
        html += '<button type="button" class="btn book-copy">نسخ الطلب</button>';
        send.innerHTML = html;
        $('.book-copy', send).addEventListener('click', function () { var b = this; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { b.textContent = 'تم النسخ ✓'; }, function () { b.textContent = 'انسخ النص يدويًا'; }); });
        done.hidden = false; done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  function prefill(key, booth) {
    var map = { STAGE: 'PLAT' }, k = map[key] || key, sel = $('.book select[name=pkg]'), inp = $('.book input[name=booth]');
    if (sel && k) sel.value = k; if (inp) inp.value = booth && !/^(STAGE|COMP|MEDIA)$/.test(booth) ? booth : '';
  }
  function goto(id) { var t = document.getElementById(id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function init(o) {
    o = o || {};
    try { if (o.model) localStorage.setItem('bbq-model', o.model); } catch (e) {}
    $$('[data-bind]').forEach(function (el) { var v = E[el.getAttribute('data-bind')]; if (v != null) el.textContent = v; });
    $$('[data-render]').forEach(function (el) { var f = R[el.getAttribute('data-render')]; if (f) f(el); });

    // ظهور العناصر
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); if (e.target.hasAttribute('data-count')) countUp(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      $$('[data-reveal],[data-count]').forEach(function (el) { io.observe(el); });
    } else { $$('[data-reveal]').forEach(function (el) { el.classList.add('in'); }); $$('[data-count]').forEach(function (el) { el.textContent = D.fmt(+el.getAttribute('data-count')); }); }
    function countUp(el) { var to = +el.getAttribute('data-count'), t0 = performance.now(); (function step(t) { var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = D.fmt(Math.round(to * e)); if (p < 1) requestAnimationFrame(step); })(t0); }

    // الشريط العلوي
    var hdr = $('[data-header]');
    if (hdr) { var onS = function () { hdr.classList.toggle('scrolled', window.scrollY > 30); }; onS(); window.addEventListener('scroll', onS, { passive: true }); }
    var tg = $('[data-nav-toggle]'); if (tg) { tg.addEventListener('click', function () { document.body.classList.toggle('nav-open'); }); $$('[data-nav] a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('nav-open'); }); }); }

    // المخطط
    var ui = null, mapEl = $('[data-map]');
    var soonDone = false;
    function mountMap() {
      if (D.map3dSoon) {
        if (soonDone || !mapEl) return null; soonDone = true; document.documentElement.classList.add('map-soon');
        var stl = document.createElement('style'); stl.textContent = '.map-soon .pkg-map,.map-soon .map-more,.map-soon [data-explore],.map-soon #exploreBtn,.map-soon .rail{display:none!important}.soon3d{position:relative;display:grid;place-items:center;overflow:hidden;background:#0d0c0e;color:#fff;text-align:center}.soon3d img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1) brightness(.32) blur(3px);transform:scale(1.05)}.soon3d div{position:relative;padding:24px}.soon3d b{display:inline-block;font:400 clamp(26px,4.5vw,54px)/1.1 Anton,Impact,sans-serif;letter-spacing:5px;background:#e5261f;padding:10px 30px;border-radius:999px}.soon3d p{margin:16px 0 0;font-size:18px;font-weight:700;color:#fff}.soon3d-badge{position:fixed;z-index:60;bottom:16px;left:50%;transform:translateX(-50%);font:400 14px Anton,Impact,sans-serif;letter-spacing:3px;background:#e5261f;color:#fff;padding:6px 20px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,.5);white-space:nowrap}'; document.head.appendChild(stl);
        if (mapEl.classList.contains('bg3d')) { var bd = document.createElement('div'); bd.className = 'soon3d-badge'; bd.textContent = '3D TOUR · AVAILABLE SOON'; document.body.appendChild(bd); }
        else { mapEl.classList.add('soon3d'); mapEl.innerHTML = '<img src="assets/layout-map.jpg" alt=""><div><b>AVAILABLE SOON</b><p>المخطط ثلاثي الأبعاد — قريبًا</p></div>'; }
        if (o.onMap) o.onMap(null); return null;
      }
      if (ui || !mapEl || !window.MapUI) return ui; ui = window.MapUI.mount(mapEl, Object.assign({ theme: mapEl.getAttribute('data-theme') || 'sunset', stage: +(mapEl.getAttribute('data-stage') || 2), embedded: true }, o.map || {})); api.ui = ui; if (o.onMap) o.onMap(ui); return ui; }
    if (mapEl) {
      if (o.eagerMap || !('IntersectionObserver' in window)) mountMap();
      else { var mo = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { mo.disconnect(); mountMap(); } }, { rootMargin: '500px' }); mo.observe(mapEl); }
    }
    document.addEventListener('click', function (ev) {
      var m = ev.target.closest('.pkg-map,[data-zone-go]');
      if (m) { ev.preventDefault(); if (D.map3dSoon) return; var u = mountMap(); goto(o.mapId || 'map'); if (u) setTimeout(function () { u.f3d.setStage(2); u.f3d.filter(m.getAttribute('data-filter') || null); u.f3d.flyTo(m.getAttribute('data-zone') || m.getAttribute('data-zone-go')); u.setZone(m.getAttribute('data-zone') || m.getAttribute('data-zone-go')); }, 500); return; }
      var b = ev.target.closest('[data-book]'); if (b) prefill(b.getAttribute('data-book'), '');
    });
    window.addEventListener('bbq:book', function (ev) { prefill(ev.detail.type, ev.detail.id); goto('booking'); });
    var q = new URLSearchParams(location.search).get('booth');
    if (q && D.booths.some(function (b) { return b.id === q; })) { var bt = D.booths.filter(function (b) { return b.id === q; })[0]; prefill(bt.type, bt.id); }
    return api;
  }
  var api = { init: init, mountMap: null, ui: null, goto: goto };
  window.BBQSite = api;
})();
