// =========================================
// БАЗА СТАВОК — калькулятор v2
// Цена хранится как в документе: валюта + с TVA / без TVA.
// Без TVA в MDL считает generator.js по курсам из fx.
// Статусы: inv — счёт/договор/КП 2026 (объект BESS 15 МВт / 60 МВт·ч, 35 кВ) — ориентир;
//          mkt — публичный рыночный ориентир; opt — данные OptiSolar;
//          est — оценка, заменить котировкой.
// Менять ставки — в интерфейсе (вкладка «Ставки») или здесь с подтверждения пользователя.
// =========================================

window.RATEBOOK = {
    version: "2026-10-29",

    fx: { EUR: 20.0228, USD: 17.8919, UAH: 0.3988, RON: 3.7407, MDL: 1, date: "08.10.2026", src: "BNM" },
    vatPct: 20,
    staleDays: 180,

    statusLabels: {
        inv: "Счёт 2026",
        mkt: "Рынок",
        opt: "OptiSolar",
        est: "Оценка"
    },

    // Наценка (коэффициент) по сегменту и категории. Сейчас везде 1,20 — как в data.js.
    coefficients: {
        home: { "engineering": 1.2, "main-equipment": 1.2, "materials": 1.2, "civil": 1.2, "electrical": 1.2, "grid": 1.2, "logistics": 1.2, "commissioning": 1.2 },
        biz:  { "engineering": 1.2, "main-equipment": 1.2, "materials": 1.2, "civil": 1.2, "electrical": 1.2, "grid": 1.2, "logistics": 1.2, "commissioning": 1.2 }
    },
    financial: { indirect: 5, risk: 3 },

    // Нормы, по которым считаются количества (на объекте 15 МВт / 60,18 МВт·ч и типовые)
    norms: {
        panelWp: 600,
        yieldKwhPerKwp: 1350,
        usableShare: 0.9,
        cabinetKwh: 215, cabinetKw: 100,
        containerKwh: 5016,
        containerFromKwh: 4000,
        dcCableMPerMwh: 57.3,
        lugsPerMwh: 7.3,
        concreteM3PerMwh: 2.78,
        concreteM3PerCabinet: 1.5,
        siteM2PerMwh: 69,
        gravelTPerM2: 0.2,
        unitsPerFirePost: 4,
        mwhPerLightningSet: 30,
        tsnKvaPerMwh: 13.3,
        craneHoursPerUnit: 1.5,
        craneMinHours: 8,
        cabinetsPerTrip: 2,
        portKm: 220,
        transformerSizes: [100, 160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300],
        trafoScaleExp: 0.8,
        // ограждение и видеонаблюдение (2026-10-29)
        fenceM2PerKwp: 15, fenceMarginM: 3, cabinetSiteM2: 10, cctvSpacingM: 100
    },

    rates: {
        // ---------- Проектирование ----------
        design_home:      { ru: "Проект, схема подключения (дом)", ro: "Proiect și schema electrică de conectare", cat: "engineering", unit: "lot", price: 5555.56, cur: "MDL", vat: "excl", date: "05.2026", src: "Оффер OptiSolar 12 кВт: 8 000 с TVA ÷ 1,2 TVA ÷ 1,2 коэф.", status: "opt" },
        design_biz_lv:    { ru: "Проект, схема подключения (бизнес 0,4 кВ)", ro: "Proiect de execuție și schema de conectare", cat: "engineering", unit: "lot", price: { base: 15000, perKw: 25 }, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка: 15 000 + 25 MDL/кВт", status: "est" },
        design_mv:        { ru: "Проект ЭП, подключение СН", ro: "Proiect de execuție partea electrică (MT)", cat: "engineering", unit: "lot", price: { base: 60000, perKw: 15 }, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка: 60 000 + 15 MDL/кВт", status: "est" },
        design_rza_cell:  { ru: "Проект РЗА, учёта и SCADA (на ячейку СН)", ro: "Proiectare RPA, evidență și SCADA (per celulă MT)", cat: "engineering", unit: "celulă", price: 56400, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect: 112 800 с TVA за 2 ячейки 35 кВ", status: "inv" },
        foundation_design:{ ru: "Проект фундаментов", ro: "Proiectarea fundațiilor", cat: "engineering", unit: "lot", price: 159674.67, cur: "MDL", vat: "excl", date: "03.2026", src: "Договор на проектирование фундаментов (16 оснований, 60 МВт·ч)", status: "inv" },
        foundation_design_small: { ru: "Проект плиты под шкафы", ro: "Proiect fundație pentru dulapuri BESS", cat: "engineering", unit: "lot", price: 15000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },

        // ---------- Основное оборудование ----------
        pv_module_wp:     { ru: "Панель PV TOPCon, за Вт", ro: "Panou fotovoltaic TOPCon (Tier 1)", cat: "main-equipment", unit: "Wp", price: 0.135, cur: "EUR", vat: "excl", date: "07.2026", src: "pvXchange mainstream, опт ЕС (0,135 €/Вт)", status: "mkt" },
        inv_ongrid:       { ru: "Сетевой инвертор (за шт: база + за кВт)", ro: "Invertor on-grid", cat: "main-equipment", unit: "buc", price: { base: 600, perKw: 28 }, cur: "EUR", vat: "excl", date: "08.2026", src: "Huawei SUN2000-100KTL ≈ 3 250–3 780 € без НДС (Offgridtec, 7SUN); малые мощности — оценка", status: "mkt" },
        inv_hybrid:       { ru: "Гибридный инвертор (за шт: база + за кВт)", ro: "Invertor hibrid", cat: "main-equipment", unit: "buc", price: { base: 450, perKw: 125 }, cur: "EUR", vat: "excl", date: "10.2026", src: "Deye SUN-12K-SG05LP3 1 950 € без НДС (Autosolar ES)", status: "mkt" },
        bat_lv_kwh:       { ru: "Батарея LiFePO4 51,2 В (за кВт·ч)", ro: "Acumulator LiFePO4 51,2 V", cat: "main-equipment", unit: "kWh", price: 634.6, cur: "RON", vat: "incl21", date: "07.2026", src: "V-TAC 16,07 кВт·ч — 10 199 RON с TVA 21% (Hornbach RO)", status: "mkt" },
        mount_roof_kwp:   { ru: "Крепёж на крышу (за кВтп)", ro: "Sistem de fixare pe acoperiș (aluminiu)", cat: "main-equipment", unit: "kWp", price: 45, cur: "EUR", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        mount_ground_kwp: { ru: "Наземный каркас (за кВтп)", ro: "Structură de montare la sol", cat: "main-equipment", unit: "kWp", price: 70, cur: "EUR", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        ci_cabinet:       { ru: "Шкаф BESS 100 кВт / 215 кВт·ч (с PCS)", ro: "Dulap BESS C&I 100 kW / 215 kWh (LFP, PCS integrat)", cat: "main-equipment", unit: "buc", price: 24388, cur: "USD", vat: "excl", date: "10.2026", src: "Шкаф LFP 215 кВт·ч, made-in-china (DAH), 1–9 шт, FOB", status: "mkt" },
        container_kwh:    { ru: "Контейнеры BESS (за кВт·ч)", ro: "Containere BESS LFP (bloc DC)", cat: "main-equipment", unit: "kWh", price: 125, cur: "USD", vat: "excl", date: "2026", src: "DC-блок 110–140 $/кВт·ч (обзоры интеграторов 2026)", status: "mkt" },
        pcs_kw:           { ru: "PCS для контейнеров (за кВт)", ro: "Sistem de conversie a puterii (PCS)", cat: "main-equipment", unit: "kW", price: 70, cur: "USD", vat: "excl", date: "2026", src: "Оценка по доле PCS 10–25% (35–115 $/кВт)", status: "est" },
        trafo_800:        { ru: "Трансформатор силовой (база 800 кВА)", ro: "Transformator de putere", cat: "main-equipment", unit: "buc", price: 19038, cur: "USD", vat: "incl", date: "04.2026", src: "Energcompletcons: 35/0,4 кВ 800 кВА; другие мощности — по степени 0,8", status: "inv" },
        ktp_800:          { ru: "КТП / РУ СН в сборе (без трансформатора, база 800 кВА)", ro: "Post de transformare compact (PTC) cu celule MT", cat: "main-equipment", unit: "buc", price: 63672, cur: "USD", vat: "incl", date: "04.2026", src: "Energcompletcons: КТП 800 кВА 35/0,4 кВ", status: "inv" },
        ems_ci:           { ru: "Контроллер EMS + счётчик в точке подключения", ro: "Controler EMS + contor la punctul de racordare", cat: "main-equipment", unit: "set", price: 3500, cur: "EUR", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        zero_export_kit:  { ru: "Комплект ограничения экспорта (смарт-счётчик)", ro: "Sistem de limitare a exportului (smart meter)", cat: "main-equipment", unit: "set", price: 250, cur: "EUR", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        scada_iec104:     { ru: "SCADA / телемеханика IEC 60870-5-104", ro: "Sistem SCADA IEC 60870-5-104 (RTU, licențe, integrare)", cat: "main-equipment", unit: "set", price: 20000, cur: "EUR", vat: "excl", date: "05.2026", src: "Orcolia-Lux, оффер и договор (до 20 МВт)", status: "inv" },
        ct_meter:         { ru: "Трансформатор тока для учёта", ro: "Transformator de curent pentru evidență", cat: "main-equipment", unit: "buc", price: 10690, cur: "MDL", vat: "incl", date: "06.2026", src: "Corden-ST: 20/5 0,5 2,5 ВА кабельного типа", status: "inv" },
        rza_terminal:     { ru: "Терминал РЗА ячейки СН", ro: "Terminal de protecție RPA (celulă MT)", cat: "main-equipment", unit: "buc", price: 86310, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect: e2TANGO-450", status: "inv" },
        shot:             { ru: "Шкаф оперативного тока 110 В DC", ro: "Dulap de curent operativ 110 V c.c.", cat: "main-equipment", unit: "buc", price: 793600, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect: APS Energia, АКБ 40 А·ч, Rittal", status: "inv" },
        // ограждение и видеонаблюдение площадки (бизнес: наземная СЭС, BESS на площадке; 2026-10-29)
        fence_m:          { ru: "Ограждение из 3D-панелей 2 м под ключ (панели, столбы, ворота, калитка, монтаж)", ro: "Împrejmuire din panouri bordurate 3D, h = 2 m, la cheie (panouri, stâlpi, poartă, portiță, montaj)", cat: "main-equipment", unit: "m", price: 450, cur: "MDL", vat: "excl", date: "10.2026", src: "Рынок MD 29.10.2026, подтверждено пользователем, с TVA ÷ 1,2: панель 3D 2,0–2,03×2,5 м 345–500 лей (garduri.md, supraten.md), столб 2,5 м 350 лей (supraten.md), крепёж и бетон ≈100 лей на столб, монтаж ≈120 лей/м, ворота 4 м + калитка ≈50 лей/м, доставка ≈20 лей/м", status: "mkt" },
        cctv_point:       { ru: "Точка видеонаблюдения под ключ: столб 6 м, IP-камера 4 МП, LED-прожектор", ro: "Punct de supraveghere video la cheie: stâlp 6 m, cameră IP 4 MP, proiector LED", cat: "main-equipment", unit: "buc", price: 13000, cur: "MDL", vat: "excl", date: "10.2026", src: "Рынок MD 29.10.2026, подтверждено пользователем, с TVA ÷ 1,2: столб 6 м Elmos HD-106 4 495 лей (volta.md), IP-камера 4 МП 2 200–3 400 лей (maximum.md, smart.md), прожектор LED 100 Вт 415–552 лей (volta.md) + фотореле, фундамент ≈1 000, кабель 100 м ≈3 000, монтаж ≈3 000 лей", status: "mkt" },
        cctv_nvr:         { ru: "Видеорегистратор с диском, роутер 4G, настройка удалённого доступа", ro: "Înregistrator video (NVR) cu HDD, router 4G, configurare acces la distanță", cat: "main-equipment", unit: "set", price: 11200, cur: "MDL", vat: "excl", date: "10.2026", src: "Рынок MD 29.10.2026, подтверждено пользователем, с TVA ÷ 1,2: NVR Hikvision 8 каналов PoE 6 972 лей (smart.md), диск 4 ТБ ≈2 000, роутер 4G ≈1 500, ИБП ≈1 500, настройка ≈1 500 лей", status: "mkt" },

        // ---------- Материалы ----------
        ac_dc_home_kwp:   { ru: "Материалы AC/DC для дома (за кВтп)", ro: "Componente AC, DC, cabluri și protecții", cat: "materials", unit: "kWp", price: 1273.15, cur: "MDL", vat: "excl", date: "05.2026", src: "Оффер OptiSolar 12 кВт: 22 000 с TVA ÷ 1,2 ÷ 1,2 ÷ 12 кВтп", status: "opt" },
        ac_dc_home_bess:  { ru: "Материалы для батареи (дом)", ro: "Componente de conectare acumulator", cat: "materials", unit: "set", price: 4000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        ac_dc_biz_kwp:    { ru: "Материалы AC/DC для СЭС бизнеса (за кВтп)", ro: "Componente AC, DC, cabluri și protecții", cat: "materials", unit: "kWp", price: 650, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        dc_cable_185:     { ru: "Кабель DC NSGAFÖU 1,8/3 кВ 1×185", ro: "Cablu DC NSGAFÖU 1,8/3 kV 1×185 mm²", cat: "materials", unit: "m", price: 27.48, cur: "EUR", vat: "excl", date: "04.2026", src: "LAPP 14.04.2026 после скидки 4% (ALTCON 28,08 €/м CPT, 25.03.2026). Цена зависит от меди", status: "inv" },
        lug_185:          { ru: "Наконечник Cu лужёный 185 мм²", ro: "Papuc de cablu Cu cositorit 185 mm²", cat: "materials", unit: "buc", price: 138.75, cur: "MDL", vat: "incl", date: "05.2026", src: "Polev Business: AUS185-12", status: "inv" },
        small_mat_mwh:    { ru: "Мелкие материалы (термоусадка, стяжки, ленты, ПВ3, метизы)", ro: "Materiale mărunte (tuburi termocontractabile, coliere, benzi, conductor PE, feronerie)", cat: "materials", unit: "MWh", price: 976, cur: "MDL", vat: "excl", date: "06.2026", src: "Счета Volta, Polev, Profmet 06.2026 ÷ 60,18 МВт·ч", status: "inv" },
        corrugated_90:    { ru: "Гофротруба ПЭ Ø90", ro: "Țeavă corugată PE DE 90", cat: "materials", unit: "m", price: 27.42, cur: "MDL", vat: "excl", date: "06.2026", src: "Cegoltar (Ø40 — 9,08; Ø75 — 22,50 без TVA)", status: "inv" },
        lightning_set:    { ru: "Активная молниезащита + заземление (комплект)", ro: "Paratrăsnet activ ESE cu catarg 5 m + împământare", cat: "materials", unit: "set", price: 44750, cur: "MDL", vat: "incl", date: "06.2026", src: "Corden-ST: Gromostar 25, мачта 5 м, 6 электродов Ø20, полоса 40×4", status: "inv" },
        grounding_cab:    { ru: "Контур заземления шкафа", ro: "Buclă de împământare dulap BESS", cat: "materials", unit: "buc", price: 5000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        fire_post:        { ru: "Пожарный пост (щит + ОП-100 + 2×ОУ-5)", ro: "Post PSI (panou + stingător OP-100 + 2×OU-5)", cat: "materials", unit: "set", price: 19058, cur: "MDL", vat: "incl", date: "06.2026", src: "Securitate Antiincendiară: щит 9 998, ОП-100 6 580, ОУ-5 1 240", status: "inv" },
        cable_slab:       { ru: "Плита защиты кабеля 600×400×50", ro: "Placă de protecție cablu 600×400×50", cat: "materials", unit: "buc", price: 150, cur: "MDL", vat: "excl", date: "05.2026", src: "FEC (Fabrica Elemente de Construcții)", status: "inv" },
        warning_tape:     { ru: "Лента «Внимание, кабель» 100 м", ro: "Bandă de avertizare «Atenție cablu» 100 m", cat: "materials", unit: "rolă", price: 177.66, cur: "MDL", vat: "incl", date: "06.2026", src: "Volta", status: "inv" },
        ctrl_cable:       { ru: "Контрольный кабель YSLY 2×1,5", ro: "Cablu de control YSLY-OZ 2×1,5", cat: "materials", unit: "m", price: 13.14, cur: "MDL", vat: "incl", date: "06.2026", src: "Volta", status: "inv" },
        pe_conductor:     { ru: "Провод ПВ3 25 мм² (заземление)", ro: "Conductor PV3 25 mm² galben-verde", cat: "materials", unit: "m", price: 75.33, cur: "MDL", vat: "incl", date: "06.2026", src: "Volta (16 мм² — 50,69 с TVA)", status: "inv" },
        lv_cable_m:       { ru: "Кабель силовой НН Al 4×240 (за м трассы на 150 кВт)", ro: "Cablu de forță JT Al 4×240 mm²", cat: "materials", unit: "m", price: 200, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        mv_cable_m:       { ru: "Кабель СН XLPE 3×1×95 (за м линии)", ro: "Cablu MT XLPE 3×1×95 mm²", cat: "materials", unit: "m", price: 450, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        mv_termination:   { ru: "Концевая муфта СН", ro: "Manșon terminal MT exterior", cat: "materials", unit: "set", price: 3000, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ (CAE-F/36kV/50-240)", status: "inv" },

        // ---------- СМР ----------
        foundation_m3:    { ru: "Фундамент ж/б под ключ (за м³ бетона)", ro: "Fundații din beton armat (la cheie, per m³)", cat: "civil", unit: "m³", price: 8080, cur: "MDL", vat: "excl", date: "04.2026", src: "Смета фундаментов: 1 349 357 без TVA ÷ 167 м³ (бетон C16/20, арматура 5,4 т, выемка, гидроизоляция, накладные 14% + рентаб. 6%)", status: "inv" },
        geodesy:          { ru: "Геодезия (разбивка, реперы)", ro: "Lucrări geodezice (trasare, repere)", cat: "civil", unit: "lot", price: 12000, cur: "MDL", vat: "excl", date: "04.2026", src: "Смета фундаментов", status: "inv" },
        site_m2:          { ru: "Площадка и проезды из щебня (работы, за м²)", ro: "Amenajare platformă și drumuri din piatră spartă (lucrări)", cat: "civil", unit: "m²", price: 34, cur: "MDL", vat: "excl", date: "06.2026", src: "Договор на дорогу: 175 000 с TVA ≈ 4 150 м², щебень не входит", status: "inv" },
        gravel_t:         { ru: "Щебень (за тонну)", ro: "Piatră spartă (fracții 5–20, 40–70)", cat: "civil", unit: "t", price: 300, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        trench_m:         { ru: "Траншея под кабель (выемка + засыпка)", ro: "Tranșee pentru cablu (săpătură + umplutură)", cat: "civil", unit: "m", price: 155, cur: "MDL", vat: "excl", date: "04.2026", src: "Ставки сметы: 0,7 м³/м × (65 выемка + 100 засыпка) × 1,35 накладные", status: "inv" },

        // ---------- Техника и логистика ----------
        crane_h:          { ru: "Автокран 200 т (за час)", ro: "Servicii automacara 200 t", cat: "logistics", unit: "oră", price: 4000, cur: "MDL", vat: "incl", date: "06.2026", src: "Stalcom-BM: Liebherr LTM 1160-5.2", status: "inv" },
        crane_km:         { ru: "Перегон крана (за км)", ro: "Dislocare automacara (per km)", cat: "logistics", unit: "km", price: 313, cur: "MDL", vat: "incl", date: "06.2026", src: "Stalcom-BM, с разрешением", status: "inv" },
        crane_cw:         { ru: "Доставка противовесов (рейс)", ro: "Livrare contragreutăți (cursă)", cat: "logistics", unit: "cursă", price: 6000, cur: "MDL", vat: "incl", date: "06.2026", src: "Stalcom-BM, Кишинёв", status: "inv" },
        manip_trip:       { ru: "Манипулятор, рейс", ro: "Transport cu manipulator (cursă)", cat: "logistics", unit: "cursă", price: 6458.33, cur: "MDL", vat: "excl", date: "12.2025", src: "Olan Tur: перевозка манипулятором Кишинёв — Кожушна", status: "inv" },
        lowboy_km:        { ru: "Трал (за км)", ro: "Transport agabaritic (trailer), per km", cat: "logistics", unit: "km", price: 23.33, cur: "MDL", vat: "excl", date: "12.2025", src: "Olan Tur: большой трал, 240 км", status: "inv" },
        import_pct:       { ru: "Доставка импортного оборудования и таможня (% от оборудования)", ro: "Transport internațional, vămuire și asigurare echipamente", cat: "logistics", unit: "%", price: 7, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },

        // ---------- Электромонтаж ----------
        pv_install_home:  { ru: "Монтаж СЭС (дом, за кВтп)", ro: "Servicii de montaj centrală fotovoltaică", cat: "electrical", unit: "kWp", price: 694.44, cur: "MDL", vat: "excl", date: "05.2026", src: "Оффер OptiSolar 12 кВт: 12 000 с TVA ÷ 1,2 ÷ 1,2 ÷ 12 кВтп", status: "opt" },
        pv_install_biz:   { ru: "Монтаж СЭС (бизнес, за кВтп)", ro: "Servicii de montaj centrală fotovoltaică", cat: "electrical", unit: "kWp", price: 450, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        home_bess_install:{ ru: "Монтаж инвертора и батареи (дом)", ro: "Montaj invertor hibrid și acumulator", cat: "electrical", unit: "set", price: 2500, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        cabinet_install:  { ru: "Монтаж и подключение шкафа BESS", ro: "Montaj și conectare dulap BESS", cat: "electrical", unit: "buc", price: 6000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        bess_install_mwh: { ru: "Монтаж контейнеров, DC/AC кабелей, разделка (за МВт·ч)", ro: "Montaj containere BESS, cabluri DC/AC și conexiuni", cat: "electrical", unit: "MWh", price: 2600, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка: 116 MDL/чел·ч × ~11 ч/МВт·ч × 2,09 накладные", status: "est" },
        lv_cable_lay_m:   { ru: "Прокладка кабеля НН (за м)", ro: "Pozarea cablului JT", cat: "electrical", unit: "m", price: 34.36, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ: 16,47 MDL/м × 2,086 (соцфонд, накладные 76%, прибыль 10%)", status: "inv" },
        mv_cable_lay_m:   { ru: "Прокладка кабеля СН в траншее (за м)", ro: "Pozarea cablului MT în tranșee", cat: "electrical", unit: "m", price: 34.36, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ: 16,47 MDL/м × 2,086", status: "inv" },
        mv_joint:         { ru: "Соединительная муфта СН (монтаж)", ro: "Manșon de legătură MT (montaj)", cat: "electrical", unit: "set", price: 11421, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ: 5 475 × 2,086", status: "inv" },
        trafo_install:    { ru: "Монтаж трансформатора СН", ro: "Montaj transformator MT", cat: "electrical", unit: "buc", price: 8154, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ: 3 909 × 2,086", status: "inv" },
        metering_scada_cell: { ru: "Монтаж цепей учёта и SCADA (на ячейку)", ro: "Montaj circuite evidență și echipament SCADA (per celulă)", cat: "electrical", unit: "celulă", price: 68360, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect: 136 720 с TVA за 2 ячейки", status: "inv" },

        // ---------- Пусконаладка и испытания ----------
        mv_tests:         { ru: "Электрические испытания СН", ro: "Încercări electrice MT", cat: "commissioning", unit: "lot", price: 55000, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ", status: "inv" },
        mv_connect:       { ru: "Наладка и подключение СН", ro: "Lucrări de reglare și conectare MT", cat: "commissioning", unit: "lot", price: 5000, cur: "MDL", vat: "excl", date: "06.2026", src: "Локальная смета 35 кВ", status: "inv" },
        rza_comm_cell:    { ru: "Наладка РЗА и учёта (на ячейку СН)", ro: "Punere în funcțiune RPA și evidență (per celulă)", cat: "commissioning", unit: "celulă", price: 35670, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect: 71 340 с TVA за 2 ячейки", status: "inv" },
        shot_comm:        { ru: "Монтаж и наладка ШОТ", ro: "Montaj și punere în funcțiune dulap curent operativ", cat: "commissioning", unit: "lot", price: 84850, cur: "MDL", vat: "incl", date: "02.2026", src: "КП EnergoArhitect", status: "inv" },
        isee_tests_15mw:  { ru: "Измерения и испытания ISEE (база 15 МВт)", ro: "Măsurări și încercări ale instalațiilor electrice aferente ISEE", cat: "commissioning", unit: "lot", price: 300000, cur: "MDL", vat: "incl", date: "2026", src: "Договор: ISEE 15 МВт / 60,18 МВт·ч. Другие мощности — × √(P/15 МВт), не меньше 30 000", status: "inv" },
        bess_comm_ci:     { ru: "Пусконаладка BESS и EMS", ro: "Punere în funcțiune BESS și EMS", cat: "commissioning", unit: "lot", price: { base: 5000, perKw: 20 }, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },

        // ---------- Сдача и разрешения ----------
        dare_home:        { ru: "Сдача в эксплуатацию (дом)", ro: "Darea în exploatare", cat: "grid", unit: "lot", price: 13888.89, cur: "MDL", vat: "excl", date: "05.2026", src: "Оффер OptiSolar 12 кВт: 20 000 с TVA ÷ 1,2 ÷ 1,2", status: "opt" },
        dare_biz:         { ru: "Сдача в эксплуатацию (бизнес 0,4 кВ)", ro: "Darea în exploatare", cat: "grid", unit: "lot", price: 25000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        dare_mv:          { ru: "Сдача в эксплуатацию СН (оператор, документы)", ro: "Darea în exploatare (MT): documentație și recepție", cat: "grid", unit: "lot", price: 60000, cur: "MDL", vat: "excl", date: "10.2026", src: "Оценка", status: "est" },
        ecology:          { ru: "Экологическая экспертиза", ro: "Evaluare / aviz de mediu", cat: "grid", unit: "lot", price: 35000, cur: "MDL", vat: "incl", date: "2026", src: "Договор на экологию (BESS при СЭС 15 МВт)", status: "inv" }
    }
};

// =========================================
// ОБОРУДОВАНИЕ ПО МОДЕЛЯМ — Huawei, Solis, Dyness (прайс дистрибьютора)
// Цен в этом файле нет: репозиторий публичный. Цены загружаются один раз
// файлом импорта («Ставки» → «Импорт») и хранятся в облаке Telegram (правки ставок).
// Без цен модели в подбор не идут — позиции считаются по рыночным ставкам.
// kind: inv — инвертор; bat — батарейный модуль; batpm — силовой модуль / блок управления;
//       guard — блок резерва; acc — аксессуар (в авто-подборе только счётчик, логгер, донгл).
// fam:  luna — Huawei + LUNA2000; lv — Solis LV + Dyness LV; hv — Solis HV + Dyness STACK280;
//       grid — сетевой инвертор без батареи.
// =========================================

window.RATEBOOK.equipmentLevel = "angro";
window.RATEBOOK.equipmentLevels = { angro: "Angro", installer: "Instalators", retail: "Retail" };
window.RATEBOOK.equipmentSource = "";   // откуда цены — приходит с файлом импорта
window.RATEBOOK.equipment = (function () {
    // id, бренд, модель, kind, fam, фазы, кВт, кВт·ч, гарантия (лет)
    const rows = [
        ["hw-l1-5", "Huawei", "SUN2000-5KTL-L1", "inv", "luna", 1, 5, 0, 10],
        ["hw-l1-6", "Huawei", "SUN2000-6KTL-L1", "inv", "luna", 1, 6, 0, 10],
        ["hw-m1-5", "Huawei", "SUN2000-5KTL-M1", "inv", "luna", 3, 5, 0, 10],
        ["hw-lc0-8", "Huawei", "SUN2000-8KTL-LC0", "inv", "luna", 1, 8, 0, 10],
        ["hw-lc0-10", "Huawei", "SUN2000-10KTL-LC0", "inv", "luna", 1, 10, 0, 10],
        ["hw-map0-8", "Huawei", "SUN2000-8KTL-MAP0", "inv", "luna", 3, 8, 0, 10],
        ["hw-map0-10", "Huawei", "SUN2000-10KTL-MAP0", "inv", "luna", 3, 10, 0, 10],
        ["hw-map0-12", "Huawei", "SUN2000-12KTL-MAP0", "inv", "luna", 3, 12, 0, 10],
        ["hw-mb0-15", "Huawei", "SUN2000-15KTL-MB0", "inv", "luna", 3, 15, 0, 10],
        ["hw-mb0-20", "Huawei", "SUN2000-20KTL-MB0", "inv", "luna", 3, 20, 0, 10],
        ["hw-mb0-25", "Huawei", "SUN2000-25KTL-MB0", "inv", "luna", 3, 25, 0, 10],
        ["hw-m3-30", "Huawei", "SUN2000-30KTL-M3", "inv", "grid", 3, 30, 0, 5],
        ["hw-m3-40", "Huawei", "SUN2000-40KTL-M3", "inv", "grid", 3, 40, 0, 5],
        ["hw-m3-50", "Huawei", "SUN2000-50KTL-M3", "inv", "grid", 3, 50, 0, 5],
        ["hw-m2-100", "Huawei", "SUN2000-100KTL-M2", "inv", "grid", 3, 100, 0, 5],
        ["hw-m2-115", "Huawei", "SUN2000-115KTL-M2", "inv", "grid", 3, 115, 0, 5],
        ["hw-mg0-150", "Huawei", "SUN2000-150KTL-MG0", "inv", "grid", 3, 150, 0, 5],
        ["hw-opt-600", "Huawei", "SUN2000-600W-P", "acc", "", 0, 0, 0, 2],
        ["hw-opt-1300", "Huawei", "SUN2000-1300W-MERC", "acc", "", 0, 0, 0, 2],
        ["hw-dongle", "Huawei", "SmartDongle WLAN-FE", "acc", "", 0, 0, 0, 2],
        ["hw-dongle-4g", "Huawei", "SmartDongle 4G", "acc", "", 0, 0, 0, 2],
        ["hw-meter", "Huawei", "Smart Power Sensor DTSU666-H", "acc", "", 3, 0, 0, 2],
        ["hw-meter-hw", "Huawei", "Smart Power Sensor DTSU666-HW", "acc", "", 3, 0, 0, 2],
        ["hw-logger", "Huawei", "SmartLogger3000A01EU", "acc", "", 0, 0, 0, 2],
        ["hw-logger-a03", "Huawei", "SmartLogger3000A03EU", "acc", "", 0, 0, 0, 2],
        ["hw-ev-22", "Huawei", "SCharger-22KT-S0", "acc", "", 3, 22, 0, 3],
        ["hw-guard-1", "Huawei", "SmartGuard-63A-S0 with EMMA", "guard", "luna", 1, 0, 0, 10],
        ["hw-guard-3", "Huawei", "SmartGuard-63A-T0 with EMMA", "guard", "luna", 3, 0, 0, 10],
        ["hw-luna-pm", "Huawei", "LUNA2000-10KW-C1", "batpm", "luna", 0, 10, 0, 15],
        ["hw-luna-7", "Huawei", "LUNA2000-7-E1", "bat", "luna", 0, 0, 7, 15],
        ["solis-1p-6", "Solis", "S6-EH1P6K-L-PLUS", "inv", "lv", 1, 6, 0, 10],
        ["solis-1p-8", "Solis", "S6-EH1P8K-L-PLUS", "inv", "lv", 1, 8, 0, 10],
        ["solis-3p-8", "Solis", "S6-EH3P8K02-NV-YD-L", "inv", "lv", 3, 8, 0, 10],
        ["solis-3p-10", "Solis", "S6-EH3P10K02-NV-YD-L", "inv", "lv", 3, 10, 0, 10],
        ["solis-3p-12", "Solis", "S6-EH3P12K02-NV-YD-L", "inv", "lv", 3, 12, 0, 10],
        ["solis-3p-15", "Solis", "S6-EH3P15K02-NV-YD-L", "inv", "lv", 3, 15, 0, 10],
        ["solis-hv-20", "Solis", "S6-EH3P20K-HV", "inv", "hv", 3, 20, 0, 10],
        ["solis-hv-30", "Solis", "S6-EH3P30K-HV", "inv", "hv", 3, 30, 0, 10],
        ["solis-hv-50", "Solis", "S6-EH3P50K-HV", "inv", "hv", 3, 50, 0, 10],
        ["dyness-5", "Dyness", "Power Depot G2", "bat", "lv", 0, 0, 5, 10],
        ["dyness-10", "Dyness", "PowerBox G2", "bat", "lv", 0, 0, 10, 10],
        ["dyness-16", "Dyness", "PowerBrick Plus", "bat", "lv", 0, 0, 16, 10],
        ["dyness-stack", "Dyness", "STACK280", "bat", "hv", 0, 0, 14.33, 10],
        ["dyness-sbdu", "Dyness", "SBDU 200", "batpm", "hv", 0, 0, 0, 10]
    ];
    const ph = (p, ro) => p === 1 ? (ro ? "monofazat" : "1 фаза") : (ro ? "trifazat" : "3 фазы");
    const names = (r) => {
        const [id, brand, model, kind, fam, phases, kw, kwh] = r;
        const kwhRo = String(kwh).replace(".", ",");
        if (kind === "inv" && fam === "grid") return [`Invertor on-grid ${brand} ${model} (${kw} kW, trifazat)`, `Сетевой инвертор ${brand} ${model} (${kw} кВт, 3 фазы)`];
        if (kind === "inv") return [`Invertor hibrid ${brand} ${model} (${kw} kW, ${ph(phases, true)})`, `Гибридный инвертор ${brand} ${model} (${kw} кВт, ${ph(phases)})`];
        if (kind === "bat" && fam === "luna") return [`Modul baterie ${brand} ${model} (${kwhRo} kWh, LiFePO4)`, `Батарейный модуль ${brand} ${model} (${kwhRo} кВт·ч, LiFePO4)`];
        if (kind === "bat" && fam === "hv") return [`Modul baterie HV ${brand} ${model} (${kwhRo} kWh, LiFePO4)`, `Батарейный модуль HV ${brand} ${model} (${kwhRo} кВт·ч, LiFePO4)`];
        if (kind === "bat") return [`Acumulator ${brand} ${model} ${kwhRo} kWh (LiFePO4, 48 V)`, `Аккумулятор ${brand} ${model} ${kwhRo} кВт·ч (LiFePO4, 48 В)`];
        if (id === "hw-luna-pm") return [`Modul de putere ${brand} ${model} pentru baterie LUNA2000`, `Силовой модуль ${brand} ${model} для батареи LUNA2000`];
        if (id === "dyness-sbdu") return [`Unitate de control baterii HV ${brand} ${model} (BMS)`, `Блок управления батареей HV ${brand} ${model} (BMS)`];
        if (kind === "guard") return [`${brand} ${model.replace(" with ", " cu ")} (rezervă și management energetic, ${ph(phases, true)})`, `${brand} ${model.replace(" with ", " с ")} (резерв и управление энергией, ${ph(phases)})`];
        const acc = {
            "hw-opt-600": ["Optimizator", "Оптимизатор"], "hw-opt-1300": ["Optimizator", "Оптимизатор"],
            "hw-dongle": ["Modul de monitorizare", "Модуль мониторинга"], "hw-dongle-4g": ["Modul de monitorizare 4G", "Модуль мониторинга 4G"],
            "hw-meter": ["Contor inteligent (≤250 A)", "Смарт-счётчик (до 250 А)"], "hw-meter-hw": ["Contor inteligent (>250 A, cu TC)", "Смарт-счётчик (свыше 250 А, с ТТ)"],
            "hw-logger": ["Sistem de monitorizare și control", "Система мониторинга и управления"], "hw-logger-a03": ["Sistem de monitorizare și control", "Система мониторинга и управления"],
            "hw-ev-22": ["Stație de încărcare auto 22 kW", "Зарядная станция для электромобиля 22 кВт"]
        }[id] || ["", ""];
        return [`${acc[0]} ${brand} ${model}`.trim(), `${acc[1]} ${brand} ${model}`.trim()];
    };
    const out = {};
    rows.forEach(r => {
        const [id, brand, model, kind, fam, phases, kw, kwh, warranty] = r;
        const [ro, ru] = names(r);
        out[id] = {
            brand, model, kind, fam, phases, kw, kwh, ro, ru, warranty,
            price: { angro: null, installer: null, retail: null }, cur: "MDL", vat: "incl",
            date: "10.2026", src: "Цена — из файла импорта", status: "opt"
        };
    });
    // LUNA2000-7-E1: до 3 модулей в стойке; скидка за модуль в стойке (stackDiscount) — в файле импорта
    out["hw-luna-7"].perStack = 3;
    // STACK280: 3–15 модулей в стеке на один SBDU 200 (по магазинам, сверить с даташитом)
    out["dyness-stack"].minPerStack = 3;
    out["dyness-stack"].perStack = 15;
    return out;
})();
