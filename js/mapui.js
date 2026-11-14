/* BBQ FEST — واجهة التحكم بالمخطط ثلاثي الأبعاد (تُستخدم في كل الموديلات)
   MapUI.mount(element, { theme, stage, embedded, autoRotate, bookHref }) */
(function () {
  'use strict';
  var D = window.BBQ;
  var ICON = {
    day: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 18a7 7 0 0 1 14 0M2 18h20M6 22h12M12 3v4M4.2 9.2l1.4 1.4M19.8 9.2l-1.4 1.4"/></svg>',
    night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>',
    shot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>'
  };
  var STEPS = [
    { n: '١', t: 'الأرض الفاضية', h: 'الأرض قبل البناء — نحو 10,000 م² في مجمع نجد بالرياض.' },
    { n: '٢', t: 'المخطط على الأرض', h: 'المخطط مفروش على الأرض بمقاسه الحقيقي — اضغط على أي مساحة لمعرفة تفاصيلها.' },
    { n: '٣', t: 'المهرجان مجسّمًا', h: 'اسحب للتدوير · اضغط على أي جناح لمعرفة نوعه ومساحته وقيمته.' }
  ];
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function mount(root, opts) {
    opts = Object.assign({ theme: 'sunset', stage: 2, embedded: true, autoRotate: true, intro: true, tools: true, zones: true, filters: true }, opts || {});
    root.classList.add('mapui'); root.setAttribute('dir', 'rtl');
    var canvasBox = el('div', 'mapui-canvas'); root.appendChild(canvasBox);
    var f3d = window.Festival3D.create(canvasBox, { theme: opts.theme, stage: opts.stage, embedded: opts.embedded, autoRotate: opts.autoRotate, intro: opts.intro, labels: opts.labels !== false, orbitZones: !!opts.orbitZones });
    if (!f3d) { root.classList.add('mapui--fallback'); return null; }

    // المراحل + الثيم + الأدوات
    var top = el('div', 'mapui-top'); root.appendChild(top);
    var steps = el('div', 'mapui-steps'); steps.setAttribute('role', 'tablist'); top.appendChild(steps);
    STEPS.forEach(function (s, i) {
      var b = el('button', 'mapui-step', '<i>' + s.n + '</i><span>' + s.t + '</span>'); b.type = 'button'; b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { f3d.setStage(i); }); steps.appendChild(b);
    });
    var right = el('div', 'mapui-right'); top.appendChild(right);
    var themes = el('div', 'mapui-themes'); right.appendChild(themes);
    [['day', 'نهار'], ['sunset', 'غروب'], ['night', 'ليل']].forEach(function (t) {
      var b = el('button', 'mapui-theme', ICON[t[0]] + '<span>' + t[1] + '</span>'); b.type = 'button'; b.dataset.theme = t[0]; b.title = t[1];
      b.addEventListener('click', function () { f3d.setTheme(t[0]); syncTheme(); }); themes.appendChild(b);
    });
    function syncTheme() { [].forEach.call(themes.children, function (b) { b.classList.toggle('on', b.dataset.theme === f3d.getTheme()); }); }
    if (opts.tools) {
      var tools = el('div', 'mapui-tools'); right.appendChild(tools);
      var bHome = el('button', 'mapui-tool', ICON.home); bHome.type = 'button'; bHome.title = 'المنظر العام'; bHome.addEventListener('click', function () { f3d.flyTo('home'); setZone(null); }); tools.appendChild(bHome);
      var bLab = el('button', 'mapui-tool on', ICON.tag); bLab.type = 'button'; bLab.title = 'إظهار/إخفاء أسماء المناطق'; bLab.addEventListener('click', function () { var on = !bLab.classList.contains('on'); bLab.classList.toggle('on', on); f3d.setLabels(on); }); tools.appendChild(bLab);
      var bShot = el('button', 'mapui-tool', ICON.shot); bShot.type = 'button'; bShot.title = 'حفظ صورة'; bShot.addEventListener('click', function () { var a = document.createElement('a'); a.href = f3d.snapshot(); a.download = 'bbq-fest-3d.png'; document.body.appendChild(a); a.click(); a.remove(); }); tools.appendChild(bShot);
      if (root.requestFullscreen) { var bFull = el('button', 'mapui-tool', ICON.full); bFull.type = 'button'; bFull.title = 'ملء الشاشة'; bFull.addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen(); }); tools.appendChild(bFull); }
    }
    var hint = el('div', 'mapui-hint'); root.appendChild(hint);

    // فلاتر الأنواع
    var filters = el('div', 'mapui-filters'); if (opts.filters) root.appendChild(filters);
    var counts = {}; D.booths.forEach(function (b) { counts[b.type] = (counts[b.type] || 0) + 1; });
    function chip(key, label, color, meta) { var b = el('button', 'mapui-chip', (color ? '<i style="background:' + color + '"></i>' : '') + '<span>' + label + '</span>' + (meta ? '<em>' + meta + '</em>' : '')); b.type = 'button'; b.dataset.key = key || ''; b.addEventListener('click', function () { f3d.setStage(Math.max(f3d.getStage(), 1)); f3d.filter(key); }); filters.appendChild(b); return b; }
    chip(null, 'كل الأجنحة', null, D.booths.length);
    D.typeOrder.forEach(function (k) { var t = D.types[k]; chip(k, t.ar, t.color, counts[k]); });
    function syncFilter(k) { [].forEach.call(filters.children, function (b) { b.classList.toggle('on', (b.dataset.key || null) === (k || null)); }); }

    // المناطق
    var zones = el('div', 'mapui-zones'); if (opts.zones) root.appendChild(zones);
    var zl = el('span', 'mapui-zones-label', 'جولة:'); zones.appendChild(zl);
    D.zones.forEach(function (z) { var b = el('button', 'mapui-zone', z.ar); b.type = 'button'; b.dataset.key = z.key; b.addEventListener('click', function () { if (f3d.getStage() === 0) f3d.setStage(2); f3d.flyTo(z.key); setZone(z.key); }); zones.appendChild(b); });
    function setZone(k) { [].forEach.call(zones.querySelectorAll('.mapui-zone'), function (b) { b.classList.toggle('on', b.dataset.key === k); }); }

    // بطاقة الجناح
    var card = el('div', 'mapui-card'); card.hidden = true; root.appendChild(card);
    function showCard(info) {
      if (!info) { card.hidden = true; return; }
      var title = info.special ? info.name : info.id;
      card.innerHTML = '<button type="button" class="mapui-card-x" aria-label="إغلاق">×</button>' +
        '<div class="mapui-card-tag" style="--c:' + info.color + '">' + title + '</div>' +
        '<h4>' + (info.special ? info.en : info.name + ' <small>' + info.en + '</small>') + '</h4>' +
        '<dl><div><dt>المساحة</dt><dd>' + info.size + '</dd></div><div><dt>القيمة</dt><dd>' + D.fmt(info.price) + ' <small>ر.س</small></dd></div></dl>' +
        (info.note ? '<p>' + info.note + '</p>' : '') +
        '<a class="mapui-book" href="#booking">اطلب حجز ' + (info.special ? 'هذه الرعاية' : 'الجناح ' + info.id) + '</a>';
      card.hidden = false;
      card.querySelector('.mapui-card-x').addEventListener('click', function () { f3d.select(null); });
      card.querySelector('.mapui-book').addEventListener('click', function (ev) {
        if (typeof opts.bookHref === 'function') { ev.preventDefault(); location.href = opts.bookHref(info); return; }
        window.dispatchEvent(new CustomEvent('bbq:book', { detail: info }));
      });
    }

    function syncStage(n) { [].forEach.call(steps.children, function (b, i) { b.classList.toggle('on', i === n); b.classList.toggle('done', i < n); b.setAttribute('aria-selected', i === n ? 'true' : 'false'); }); hint.textContent = STEPS[n].h; root.dataset.stage = n; if (n === 0) { f3d.select(null); } }
    f3d.on('stage', syncStage).on('select', showCard).on('filter', syncFilter);
    syncStage(f3d.getStage()); syncTheme(); syncFilter(null);
    return { f3d: f3d, root: root, setZone: setZone };
  }
  window.MapUI = { mount: mount };
})();
