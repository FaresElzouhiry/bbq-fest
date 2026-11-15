/* BBQ FEST — بيانات المهرجان (مصدر واحد لكل الموديلات ومشهد الـ 3D)
   عدّل الأسعار / التواريخ / بيانات التواصل من هنا فقط. */
(function () {
  'use strict';

  // ---------- معلومات الفعالية ----------
  var event = {
    name: 'BBQ FEST',
    slogan: 'WE GRILL . YOU CHILL',
    sloganAr: 'إحنا نشوي.. وأنت استمتع',
    dateLabel: '19 – 23 يناير 2027',
    dateStart: '2027-01-19T00:00:00+03:00', // السنة مفترضة — الملف يذكر "19-23 يناير" فقط
    days: 5,
    visitorsPerDay: 10000,
    area: 10000,
    city: 'الرياض',
    location: 'مجمع نجد — على بُعد 10 دقائق من مترو الرياض',
    locationEn: 'Najd Compound · 10 min from Riyadh Metro',
    contact: { email: '', whatsapp: '', website: 'via-saudi.com' } // أضف وسائل التواصل هنا
  };

  // ---------- أنواع الأجنحة (الألوان مطابقة لمفتاح المخطط) ----------
  var types = {
    D: { key: 'D', ar: 'الجناح الماسي', en: 'Diamond Booth', size: '6 × 12 م', note: 'دبل ديك (طابقان)', price: 350000, color: '#f4cf45', dark: true, h: 6.6 },
    G: { key: 'G', ar: 'الجناح الذهبي', en: 'Gold Booth', size: '6 × 6 م', note: 'شامل إيجار الأرض', price: 250000, color: '#22b3bb', h: 3.4 },
    S: { key: 'S', ar: 'الجناح الفضي', en: 'Silver Booth', size: '3 × 6 م', note: '', price: 100000, color: '#f58f3c', h: 3.0 },
    B: { key: 'B', ar: 'الجناح البرونزي', en: 'Bronze Booth', size: '5 × 4 م', note: '', price: 65000, color: '#e2302b', h: 3.0 },
    E: { key: 'E', ar: 'جناح العارضين', en: 'Exhibitor Booth', size: '3 × 4 م', note: 'شامل إيجار الأرض', price: 35000, color: '#3f4d27', h: 3.2 },
    K: { key: 'K', ar: 'كشك', en: 'Kiosk', size: '3 × 2 م', note: 'شامل إيجار الأرض', price: 17000, color: '#bfe8d2', dark: true, h: 2.6 },
    STAGE: { key: 'STAGE', ar: 'المسرح الرئيسي', en: 'Main Stage', size: '20 × 8 م', note: 'ضمن باقة الراعي البلاتيني', price: 500000, color: '#f25fb0', h: 9, special: true },
    COMP: { key: 'COMP', ar: 'منطقة المسابقات', en: 'Competition Area', size: '12 × 12 م', note: 'راعي منطقة المسابقات', price: 350000, color: '#5a1fd6', h: 5.6, special: true },
    MEDIA: { key: 'MEDIA', ar: 'الجناح الإعلامي', en: 'Media Booth', size: '4 × 7 م', note: 'دبل ديك (طابقان)', price: 120000, color: '#c4122c', h: 6.0, special: true }
  };

  // ---------- إحداثيات المخطط (بكسل من ملف الخريطة → أمتار) ----------
  var PX = 5.75, CX = 615, CZ = 450;
  function mx(px) { return (px - CX) / PX; }
  function mz(py) { return (py - CZ) / PX; }
  var booths = [];
  var H = Math.PI / 2;
  // w = عرض الواجهة ، d = العمق ، rot = اتجاه الواجهة (0 = جنوب)
  function add(id, type, px, py, w, d, rot) { booths.push({ id: id, type: type, x: mx(px), z: mz(py), w: w, d: d, rot: rot || 0 }); }
  var i;

  // الذهبي: صف علوي G12→G7 ، صف سفلي G6→G1
  var gx = [63, 112, 161, 210, 259, 310];
  for (i = 0; i < 6; i++) add('G' + (12 - i), 'G', gx[i], 577, 6, 6, 0);
  for (i = 0; i < 6; i++) add('G' + (6 - i), 'G', gx[i], 730, 6, 6, Math.PI);
  // الماسي
  add('D5', 'D', 65, 655, 12, 6, H);
  add('D3', 'D', 170, 637.5, 12, 6, Math.PI); add('D4', 'D', 170, 672.5, 12, 6, 0);
  add('D1', 'D', 256, 637.5, 12, 6, Math.PI); add('D2', 'D', 256, 672.5, 12, 6, 0);
  // الفضي
  var sy = [385, 435, 485, 537];
  [['S15', 'S11', 'S7', 'S3'], ['S14', 'S10', 'S6', 'S2'], ['S13', 'S9', 'S5', 'S1'], ['S12', 'S8', 'S4']].forEach(function (col, c) {
    var x = [89, 130, 148, 189][c], r = [H, -H, H, -H][c];
    col.forEach(function (id, k) { add(id, 'S', x, sy[k], 6, 3, r); });
  });
  // البرونزي
  add('B2', 'B', 218, 403, 5, 4, H); add('B1', 'B', 218, 433, 5, 4, H);
  add('B3', 'B', 262, 410, 5, 4, -Math.PI / 4); add('B4', 'B', 285, 433, 5, 4, -Math.PI / 4);
  add('B10', 'B', 218, 484, 5, 4, H); add('B9', 'B', 218, 514, 5, 4, H);
  add('B5', 'B', 314, 485, 5, 4, -H); add('B6', 'B', 314, 515, 5, 4, -H);
  add('B8', 'B', 243, 540, 5, 4, Math.PI); add('B7', 'B', 274, 540, 5, 4, Math.PI);
  // العارضون: E50→E26 شمال الجزيرة ، E1→E25 جنوبها
  for (i = 0; i < 25; i++) add('E' + (50 - i), 'E', 446 + i * 27.3, 421, 4, 3, Math.PI);
  for (i = 0; i < 25; i++) add('E' + (i + 1), 'E', 446 + i * 27.3, 480, 4, 3, 0);
  // الأكشاك
  for (i = 0; i < 18; i++) add('K' + (38 - i), 'K', 386 + i * 23.8, 393.5 - i * 0.1, 3, 2, 0);
  for (i = 0; i < 8; i++) add('K' + (i + 1), 'K', 641 + i * 22, 507, 3, 2, Math.PI);
  for (i = 0; i < 12; i++) add('K' + (i + 9), 'K', 592, 522 + i * 22.4, 3, 2, H);
  // العناصر الخاصة
  add('STAGE', 'STAGE', 538, 666, 20, 8, -H);
  add('COMP', 'COMP', 450, 764, 12, 12, Math.PI);
  add('MEDIA', 'MEDIA', 404, 566, 7, 4, 0);

  // ---------- عناصر الموقع ----------
  function pt(px, py) { return [mx(px), mz(py)]; }
  var site = {
    // حدود الأرض الرئيسية
    plot: [[30, 345], [30, 762], [42, 790], [70, 802], [548, 802], [576, 790], [586, 762], [586, 510], [385, 500], [236, 350], [200, 334], [84, 291], [50, 300], [34, 322]].map(function (p) { return pt(p[0], p[1]); }),
    // شارع العارضين
    street: [[386, 384], [1216, 384], [1216, 516], [600, 516], [586, 510], [385, 500]].map(function (p) { return pt(p[0], p[1]); }),
    island: { x0: mx(407), x1: mx(1132), z: mz(454), r: 24 / PX },
    roads: [
      [[214, 96], [228, 232], [372, 392]],      // الطريق المائل
      [[372, 364], [1240, 364]],                // شمال شارع العارضين
      [[848, 96], [848, 372]],                  // طريق عمودي
      [[610, 538], [1240, 538]]                 // جنوب الشارع
    ].map(function (r) { return r.map(function (p) { return pt(p[0], p[1]); }); }),
    palms: [[437, 453], [487, 455], [538, 452], [596, 455], [648, 453], [702, 455], [755, 452], [795, 455], [843, 453], [893, 455], [948, 452], [1003, 455], [1058, 453],
      [75, 138], [110, 166], [70, 182], [88, 300], [128, 311], [162, 301], [210, 363], [378, 745], [530, 762], [352, 520], [560, 535], [345, 600], [345, 700]].map(function (p) { return pt(p[0], p[1]); }),
    balloon: pt(88, 162),
    balloonR: 68 / PX,
    gateIn: { p: pt(404, 512), rot: Math.PI * 0.86 },
    gateOut: { p: pt(566, 800), rot: 0 },
    trucks: [
      [48, 372, H], [48, 412, H], [48, 452, H], [48, 492, H], [48, 532, H],
      [128, 786, Math.PI], [172, 786, Math.PI], [216, 786, Math.PI], [260, 786, Math.PI], [304, 786, Math.PI],
      [296, 396, -Math.PI / 4], [326, 426, -Math.PI / 4], [356, 456, -Math.PI / 4]
    ].map(function (t) { return { x: mx(t[0]), z: mz(t[1]), rot: t[2] }; }),
    lawns: [[378, 745, 26], [530, 762, 24]].map(function (l) { return { x: mx(l[0]), z: mz(l[1]), r: l[2] / PX }; })
  };

  var zones = [
    { key: 'gold', ar: 'المنطقة الذهبية', en: 'Gold Zone', p: pt(186, 600), cam: [[186, 665], [-10, 62, 92]] },
    { key: 'diamond', ar: 'المنطقة الماسية', en: 'Diamond Zone', p: pt(190, 655), cam: [[190, 655], [22, 34, 58]] },
    { key: 'silver', ar: 'المنطقة الفضية', en: 'Silver Zone', p: pt(138, 460), cam: [[150, 460], [-52, 46, 40]] },
    { key: 'bronze', ar: 'المنطقة البرونزية', en: 'Bronze Zone', p: pt(268, 472), cam: [[262, 470], [40, 44, 48]] },
    { key: 'exhibitor', ar: 'منطقة العارضين', en: 'Exhibitor Zone', p: pt(770, 452), cam: [[770, 452], [-30, 52, 84]] },
    { key: 'stage', ar: 'المسرح الرئيسي', en: 'Main Stage', p: pt(538, 666), cam: [[520, 666], [-48, 20, 6]] },
    { key: 'comp', ar: 'منطقة المسابقات', en: 'Competition Zone', p: pt(450, 764), cam: [[450, 760], [-16, 22, -40]] },
    { key: 'activation', ar: 'منطقة التفعيل', en: 'Activation Area', p: pt(440, 650), cam: [[450, 660], [-40, 60, 70]] },
    { key: 'trucks', ar: 'منطقة عربات الطعام', en: 'Food Truck Zone', p: pt(216, 800), cam: [[216, 780], [0, 26, 52]] },
    { key: 'balloon', ar: 'منطقة المنطاد', en: 'Hot Air Balloon Zone', p: pt(88, 162), cam: [[88, 200], [-46, 34, 70]] },
    { key: 'gate', ar: 'بوابة الدخول', en: 'Main Gate', p: pt(404, 512), cam: [[420, 540], [34, 16, -44]] },
    { key: 'kiosk', ar: 'الأكشاك', en: 'Kiosks', p: pt(590, 384), cam: [[600, 400], [-10, 30, -52]] }
  ].map(function (z) {
    var t = pt(z.cam[0][0], z.cam[0][1]);
    return { key: z.key, ar: z.ar, en: z.en, x: z.p[0], z: z.p[1], target: [t[0], 0, t[1]], offset: z.cam[1] };
  });

  // ---------- باقات الرعاية ----------
  var packages = [
    { key: 'PLAT', tier: 'بلاتيني', ar: 'الراعي البلاتيني', en: 'Platinum Sponsor', price: 500000, space: 'منطقة VIP بمساحة 200 م²', count: 1, img: 'vip-c.jpg', img2: 'vip-a.jpg', zone: 'stage',
      lead: 'الشراكة الأعلى حضورًا في BBQ FEST: وجهة ضيافة تحمل هوية الراعي، تضم مسبحًا ومنضدة مطعم وجلسات مظللة بطابع المنتجعات الطبيعية.',
      perks: ['أعلى مستوى لظهور الشعار في هوية المهرجان وإعلاناته', 'ظهور رئيسي على خلفية المسرح وشاشات LED', 'الشعار على البوابة الرئيسية والجدار الإعلامي واللوحات الرسمية', 'حضور داخل منطقة المسابقات', 'حزمة ترويج متكاملة قبل المهرجان وأثناءه وبعده', 'ذكر الراعي في إعلانات الافتتاح والختام', '10 أعلام بهوية الراعي داخل الموقع', '20 تذكرة VIP'] },
    { key: 'D', tier: 'ماسي', ar: 'الراعي الماسي', en: 'Diamond Sponsor', price: 350000, space: 'جناح Double Deck بمساحة 6 × 12 م', count: 5, img: 'diamond-a.jpg', img2: 'diamond-b.jpg', zone: 'diamond',
      lead: 'جناح بطابقين في قلب المهرجان يمنح العلامة مساحة بارزة للحضور والتفاعل.',
      perks: ['ظهور مميز للشعار (Premium placement)', 'حضور عند البوابة الرئيسية', 'حضور في المنطقة الإعلامية ومنطقة المسابقات', 'حزمة ترويج متكاملة عبر منصات التواصل', '10 تذاكر VIP'] },
    { key: 'COMP', tier: 'مسابقات', ar: 'راعي منطقة المسابقات', en: 'Competition Area Sponsor', price: 350000, space: 'مساحة 12 × 12 م', count: 1, img: 'competition-a.jpg', img2: 'competition-c.jpg', zone: 'comp',
      lead: 'اربط علامتك بأكثر التجارب الحية حماسًا: منافسات الطهي المباشرة أمام الجمهور.',
      perks: ['عرض الشعار داخل منطقة المسابقات', 'ذكر العلامة في محتوى وإعلانات المسابقات', 'ظهور رقمي مرتبط بتغطية المنافسات'] },
    { key: 'G', tier: 'ذهبي', ar: 'الراعي الذهبي', en: 'Gold Sponsor', price: 250000, space: 'جناح 6 × 6 م', count: 12, img: 'gold-a.jpg', img2: 'gold-b.jpg', zone: 'gold',
      lead: 'جناح ذهبي شامل إيجار الأرض مع ظهور في أبرز مناطق الفعالية.',
      perks: ['الشعار في مناطق رئيسية مختارة', 'ظهور الشعار على المسرح ومنطقة المسابقات', 'ظهور عبر منصات التواصل الاجتماعي', '6 تذاكر VIP'] },
    { key: 'MEDIA', tier: 'إعلامي', ar: 'راعي المنطقة الإعلامية', en: 'Media Booth Sponsor', price: 120000, space: 'جناح Double Deck بمساحة 4 × 7 م', count: 1, img: 'media-a.jpg', img2: 'media-b.jpg', zone: 'activation',
      lead: 'نقطة الاتصال بين العلامات التجارية والحضور الإعلامي والرقمي للمهرجان.',
      perks: ['الشعار على الجناح الإعلامي', 'حضور العلامة في المواد الصحفية والمحتوى الرقمي', 'ذكر العلامة في التغطية الإعلامية للمهرجان'] },
    { key: 'S', tier: 'فضي', ar: 'الراعي الفضي', en: 'Silver Sponsor', price: 100000, space: 'جناح 3 × 6 م', count: 15, img: 'silver-a.jpg', img2: 'silver-b.jpg', zone: 'silver',
      lead: 'حضور ميداني فعّال بتكلفة متوازنة.',
      perks: ['الشعار على لوحات الرعاة المشتركة', 'ظهور محدود على المسرح أو المسابقات', 'ذكر أساسي عبر منصات التواصل', 'إضافات اختيارية متاحة'] },
    { key: 'B', tier: 'برونزي', ar: 'الجناح البرونزي', en: 'Bronze Booth', price: 65000, space: 'جناح 5 × 4 م', count: 10, img: 'bronze-a.jpg', img2: 'bronze-b.jpg', zone: 'bronze',
      lead: 'مساحة عرض وبيع مباشرة بجوار منطقة عربات الطعام.',
      perks: ['الشعار على لوحات الرعاة المشتركة', 'ظهور محدود على المسرح أو المسابقات', 'ذكر أساسي عبر منصات التواصل', 'إضافات اختيارية متاحة'] },
    { key: 'E', tier: 'عارض', ar: 'مساحة العارض', en: 'Exhibitor Booth', price: 35000, space: 'جناح 3 × 4 م', count: 50, img: 'exhibitor-a.jpg', img2: 'exhibitor-b.jpg', zone: 'exhibitor',
      lead: 'خمسون جناحًا على شارع العارضين المظلل بالنخيل.',
      perks: ['شامل إيجار الأرض', 'ظهور الشعار على جميع شاشات الموقع'] },
    { key: 'K', tier: 'كشك', ar: 'الكشك', en: 'Kiosk', price: 17000, space: 'كشك 3 × 2 م', count: 38, img: 'trucks-b.jpg', img2: 'trucks-a.jpg', zone: 'kiosk',
      lead: 'أصغر مساحة مشاركة.. وأسرع طريق للوصول إلى الزوار.',
      perks: ['شامل إيجار الأرض', 'ظهور الشعار على جميع شاشات الموقع'] }
  ];

  var experiences = [
    { ar: 'عروض الطهي الحية', en: 'Live Cooking Shows', d: 'طهاة ينفّذون فنون الشواء أمام الجمهور في قلب المهرجان.', img: 'zones.jpg', zone: 'activation' },
    { ar: 'تجارب التذوق', en: 'Tasting Experiences', d: 'مساحات تفاعلية لاكتشاف النكهات والمنتجات وتجربتها مباشرة.', img: 'overview.jpg', zone: 'bronze' },
    { ar: 'مسابقات الطهي', en: 'Cooking Competition', d: 'منطقة مخصصة للمنافسات الحية بمشاركة طهاة محترفين.', img: 'competition-b.jpg', zone: 'comp' },
    { ar: 'المسرح الرئيسي', en: 'Main Stage', d: 'مركز العروض والإعلانات وأبرز فقرات البرنامج.', img: 'stage-render.jpg', zone: 'stage' },
    { ar: 'عربات الطعام', en: 'Food Trucks', d: 'ثلاث مناطق لعربات الطعام مع جلسات خارجية.', img: 'trucks-night.jpg', zone: 'trucks' },
    { ar: 'ضيافة كبار الزوار', en: 'VIP Hospitality', d: 'منطقة ضيافة خاصة بمسبح وجلسات مظللة.', img: 'vip-pool.jpg', zone: 'stage' },
    { ar: 'التخييم والطهي الخارجي', en: 'Outdoor & Camping', d: 'معدات الرحلات والتخييم والطهي في الهواء الطلق.', img: 'sitting-b.jpg', zone: 'exhibitor' },
    { ar: 'السيارات والدراجات', en: 'Automotive & Off-Road', d: 'تجمعات الدراجات وعروض الدفع الرباعي والطرق الوعرة.', img: 'stage-sunset.jpg', zone: 'balloon' }
  ];

  var program = [
    'عروض طهي حية', 'مسابقة طهي بمشاركة طهاة محترفين', 'مؤثرون محليون ودوليون', 'تفعيلات تجارب التذوق',
    'لقاءات Meet & Greet', 'تجربة Live Pro BBQ', 'ماستر كلاس وورش عمل'
  ];
  var categories = [
    'الشوايات ومعدات الشواء', 'الفحم والوقود والأخشاب', 'الأدوات والإكسسوارات',
    'المدخّنات وأجهزة التدخين', 'منتجات التخييم والطهي الخارجي', 'التوابل والتتبيلات ومكونات الشواء'
  ];
  var audience = [
    { ar: 'عشاق الشواء والطهي', d: 'المهتمون بفنون الشواء والنكهات والمعدات.' },
    { ar: 'العائلات والزوار', d: 'الباحثون عن تجربة ترفيهية واجتماعية حية.' },
    { ar: 'الطهاة ومحترفو القطاع', d: 'المتخصصون في تقنيات الشواء والتجارب الاحترافية.' },
    { ar: 'جمهور الرحلات والأنشطة الخارجية', d: 'التخييم، الطهي الخارجي، السيارات والـ Off-Road.' },
    { ar: 'العارضون والعلامات التجارية', d: 'شركات الشوايات، الفحم، التوابل، ومنتجات التخييم.' }
  ];

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  window.BBQ = {
    map3dSoon: true, // اجعلها false لإظهار المخطط ثلاثي الأبعاد داخل المواقع
    event: event, types: types, booths: booths, site: site, zones: zones, packages: packages,
    experiences: experiences, program: program, categories: categories, audience: audience,
    fmt: fmt, PX: PX, mx: mx, mz: mz,
    typeOrder: ['D', 'G', 'S', 'B', 'E', 'K']
  };
})();
