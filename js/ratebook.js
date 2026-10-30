// =========================================
// БАЗА СТАВОК — калькулятор v2, публичная часть
// Здесь только состав ставок: название, категория, единица.
// Цены, валюты, TVA, источники, коэффициенты, косвенные, риск и нормы — в файле базы ставок
// (optisolar-ratebook-base/1, в репозиторий не кладётся). Его загружают один раз — кодом
// во вкладке «Расчёт» или «Ставки» → «Импорт»; дальше он хранится в облаке Telegram.
// Без базы калькулятор не считает. Слои: эта часть → база ставок → правки вкладки «Ставки».
// Без TVA в MDL считает generator.js по курсам из fx.
// Статусы: inv — счёт/договор/КП 2026 — ориентир; mkt — публичный рыночный ориентир;
//          opt — данные OptiSolar; est — оценка, заменить котировкой.
// =========================================

window.RATEBOOK = {
    version: "public",

    fx: { EUR: 20.0228, USD: 17.8919, UAH: 0.3988, RON: 3.7407, MDL: 1, date: "08.10.2026", src: "BNM" },
    vatPct: 20,
    staleDays: 180,

    statusLabels: {
        inv: "Счёт 2026",
        mkt: "Рынок",
        opt: "OptiSolar",
        est: "Оценка"
    },

    // price, cur, vat, date, src, status; coefficients, financial, norms — из базы ставок
    rates: {
        // ---------- Проектирование ----------
        design_home:      { ru: "Проект, схема подключения (дом)", ro: "Proiect și schema electrică de conectare", cat: "engineering", unit: "lot" },
        design_biz_lv:    { ru: "Проект, схема подключения (бизнес 0,4 кВ)", ro: "Proiect de execuție și schema de conectare", cat: "engineering", unit: "lot" },
        design_mv:        { ru: "Проект ЭП, подключение СН", ro: "Proiect de execuție partea electrică (MT)", cat: "engineering", unit: "lot" },
        design_rza_cell:  { ru: "Проект РЗА, учёта и SCADA (на ячейку СН)", ro: "Proiectare RPA, evidență și SCADA (per celulă MT)", cat: "engineering", unit: "celulă" },
        foundation_design:{ ru: "Проект фундаментов", ro: "Proiectarea fundațiilor", cat: "engineering", unit: "lot" },
        foundation_design_small:{ ru: "Проект плиты под шкафы", ro: "Proiect fundație pentru dulapuri BESS", cat: "engineering", unit: "lot" },

        // ---------- Основное оборудование ----------
        pv_module_wp:     { ru: "Панель PV TOPCon, за Вт", ro: "Panou fotovoltaic TOPCon (Tier 1)", cat: "main-equipment", unit: "Wp" },
        inv_ongrid:       { ru: "Сетевой инвертор (за шт: база + за кВт)", ro: "Invertor on-grid", cat: "main-equipment", unit: "buc" },
        inv_hybrid:       { ru: "Гибридный инвертор (за шт: база + за кВт)", ro: "Invertor hibrid", cat: "main-equipment", unit: "buc" },
        bat_lv_kwh:       { ru: "Батарея LiFePO4 51,2 В (за кВт·ч)", ro: "Acumulator LiFePO4 51,2 V", cat: "main-equipment", unit: "kWh" },
        mount_roof_kwp:   { ru: "Крепёж на крышу (за кВтп)", ro: "Sistem de fixare pe acoperiș (aluminiu)", cat: "main-equipment", unit: "kWp" },
        mount_ground_kwp: { ru: "Наземный каркас (за кВтп)", ro: "Structură de montare la sol", cat: "main-equipment", unit: "kWp" },
        ci_cabinet:       { ru: "Шкаф BESS 100 кВт / 215 кВт·ч (с PCS)", ro: "Dulap BESS C&I 100 kW / 215 kWh (LFP, PCS integrat)", cat: "main-equipment", unit: "buc" },
        container_kwh:    { ru: "Контейнеры BESS (за кВт·ч)", ro: "Containere BESS LFP (bloc DC)", cat: "main-equipment", unit: "kWh" },
        pcs_kw:           { ru: "PCS для контейнеров (за кВт)", ro: "Sistem de conversie a puterii (PCS)", cat: "main-equipment", unit: "kW" },
        trafo_800:        { ru: "Трансформатор силовой (база 800 кВА)", ro: "Transformator de putere", cat: "main-equipment", unit: "buc" },
        ktp_800:          { ru: "КТП / РУ СН в сборе (без трансформатора, база 800 кВА)", ro: "Post de transformare compact (PTC) cu celule MT", cat: "main-equipment", unit: "buc" },
        ems_ci:           { ru: "Контроллер EMS + счётчик в точке подключения", ro: "Controler EMS + contor la punctul de racordare", cat: "main-equipment", unit: "set" },
        zero_export_kit:  { ru: "Комплект ограничения экспорта (смарт-счётчик)", ro: "Sistem de limitare a exportului (smart meter)", cat: "main-equipment", unit: "set" },
        scada_iec104:     { ru: "SCADA / телемеханика IEC 60870-5-104", ro: "Sistem SCADA IEC 60870-5-104 (RTU, licențe, integrare)", cat: "main-equipment", unit: "set" },
        ct_meter:         { ru: "Трансформатор тока для учёта", ro: "Transformator de curent pentru evidență", cat: "main-equipment", unit: "buc" },
        rza_terminal:     { ru: "Терминал РЗА ячейки СН", ro: "Terminal de protecție RPA (celulă MT)", cat: "main-equipment", unit: "buc" },
        shot:             { ru: "Шкаф оперативного тока 110 В DC", ro: "Dulap de curent operativ 110 V c.c.", cat: "main-equipment", unit: "buc" },
        // КП поставщиков BESS (2026-10-30): quote — цены только из файла цен (optisolar-equipment-prices/1),
        // в этом файле их нет; пока файл не загружен, позиции не видны в списках и не мешают расчёту
        gotion_grid5015:  { ru: "Контейнер BESS Gotion GRID 5015 (20 ft, 5 015,9 кВт·ч, LFP, жидкостное охлаждение)", ro: "Container BESS Gotion GRID 5015 (20 ft, 5.015,9 kWh, LFP, răcire cu lichid)", cat: "main-equipment", unit: "buc", kwh: 5015.9, quote: true },
        rept_powtrix_5015:{ ru: "Контейнер BESS REPT Powtrix 2.0 / Cospowers EnerGalactic-5015-0.5C (20 ft, 5 015 кВт·ч, LFP, жидкостное охлаждение)", ro: "Container BESS REPT Powtrix 2.0 / Cospowers EnerGalactic-5015-0.5C (20 ft, 5.015 kWh, LFP, răcire cu lichid)", cat: "main-equipment", unit: "buc", kwh: 5015, quote: true },
        sinexcel_skid_2500:{ ru: "MV Skid Sinexcel SES2H-2500-MV-EX (PCS 2×1 250 кВт, трансформатор 2 650 кВА, RMU, 20 ft)", ro: "Stație MV Skid Sinexcel SES2H-2500-MV-EX (PCS 2×1.250 kW, transformator 2.650 kVA, RMU, 20 ft)", cat: "main-equipment", unit: "buc", kw: 2500, quote: true },
        sinexcel_skid_5000:{ ru: "MV Skid Sinexcel 5 МВт (PCS, трансформатор, RMU)", ro: "Stație MV Skid Sinexcel 5 MW (PCS, transformator, RMU)", cat: "main-equipment", unit: "buc", kw: 5000, quote: true },
        // Волна 3 ревизии (2026-10-30): цены — только в базе ставок; со старой базой этих цен нет,
        // и генератор считает по-прежнему (quote: без цены позиция не добавляется и не мешает проверке базы)
        bess_freight_kwh: { ru: "Доставка контейнеров BESS до объекта (за кВт·ч)", ro: "Transport containere BESS până la obiect", cat: "logistics", unit: "kWh", quote: true },
        bess_eco_kwh:     { ru: "Сбор за загрязнение среды при ввозе аккумуляторов (за кВт·ч)", ro: "Taxa pentru mărfurile care poluează mediul (acumulatoare)", cat: "logistics", unit: "kWh", quote: true },
        foundation_design_unit: { ru: "Проект фундамента (за основание)", ro: "Proiectarea fundațiilor (per fundație)", cat: "engineering", unit: "buc", quote: true },
        site_prep_pv_kwp: { ru: "Подготовка площадки наземной СЭС (за кВтп)", ro: "Lucrări de amenajare și pregătire a terenului pentru parcul fotovoltaic", cat: "civil", unit: "kWp", quote: true },
        meteo_station:    { ru: "Метеостанция (излучение, температура модулей и воздуха, ветер)", ro: "Stație meteo (radiație, temperatura modulelor și a aerului, vânt)", cat: "main-equipment", unit: "buc", quote: true },
        metering_point:   { ru: "Точка учёта (счётчик, измерительные трансформаторы, связь)", ro: "Punct de evidență (contor, transformatoare de măsură, comunicație)", cat: "main-equipment", unit: "buc", quote: true },
        // ограждение и видеонаблюдение площадки (бизнес: наземная СЭС, BESS на площадке; 2026-10-29)
        fence_m:          { ru: "Ограждение из 3D-панелей 2 м под ключ (панели, столбы, ворота, калитка, монтаж)", ro: "Împrejmuire din panouri bordurate 3D, h = 2 m, la cheie (panouri, stâlpi, poartă, portiță, montaj)", cat: "main-equipment", unit: "m" },
        cctv_point:       { ru: "Точка видеонаблюдения под ключ: столб 6 м, IP-камера 4 МП, LED-прожектор", ro: "Punct de supraveghere video la cheie: stâlp 6 m, cameră IP 4 MP, proiector LED", cat: "main-equipment", unit: "buc" },
        cctv_nvr:         { ru: "Видеорегистратор с диском, роутер 4G, настройка удалённого доступа", ro: "Înregistrator video (NVR) cu HDD, router 4G, configurare acces la distanță", cat: "main-equipment", unit: "set" },

        // ---------- Материалы ----------
        ac_dc_home_kwp:   { ru: "Материалы AC/DC для дома (за кВтп)", ro: "Componente AC, DC, cabluri și protecții", cat: "materials", unit: "kWp" },
        ac_dc_home_bess:  { ru: "Материалы для батареи (дом)", ro: "Componente de conectare acumulator", cat: "materials", unit: "set" },
        ac_dc_biz_kwp:    { ru: "Материалы AC/DC для СЭС бизнеса (за кВтп)", ro: "Componente AC, DC, cabluri și protecții", cat: "materials", unit: "kWp" },
        dc_cable_185:     { ru: "Кабель DC NSGAFÖU 1,8/3 кВ 1×185", ro: "Cablu DC NSGAFÖU 1,8/3 kV 1×185 mm²", cat: "materials", unit: "m" },
        lug_185:          { ru: "Наконечник Cu лужёный 185 мм²", ro: "Papuc de cablu Cu cositorit 185 mm²", cat: "materials", unit: "buc" },
        small_mat_mwh:    { ru: "Мелкие материалы (термоусадка, стяжки, ленты, ПВ3, метизы)", ro: "Materiale mărunte (tuburi termocontractabile, coliere, benzi, conductor PE, feronerie)", cat: "materials", unit: "MWh" },
        corrugated_90:    { ru: "Гофротруба ПЭ Ø90", ro: "Țeavă corugată PE DE 90", cat: "materials", unit: "m" },
        lightning_set:    { ru: "Активная молниезащита + заземление (комплект)", ro: "Paratrăsnet activ ESE cu catarg 5 m + împământare", cat: "materials", unit: "set" },
        grounding_cab:    { ru: "Контур заземления шкафа", ro: "Buclă de împământare dulap BESS", cat: "materials", unit: "buc" },
        fire_post:        { ru: "Пожарный пост (щит + ОП-100 + 2×ОУ-5)", ro: "Post PSI (panou + stingător OP-100 + 2×OU-5)", cat: "materials", unit: "set" },
        cable_slab:       { ru: "Плита защиты кабеля 600×400×50", ro: "Placă de protecție cablu 600×400×50", cat: "materials", unit: "buc" },
        warning_tape:     { ru: "Лента «Внимание, кабель» 100 м", ro: "Bandă de avertizare «Atenție cablu» 100 m", cat: "materials", unit: "rolă" },
        ctrl_cable:       { ru: "Контрольный кабель YSLY 2×1,5", ro: "Cablu de control YSLY-OZ 2×1,5", cat: "materials", unit: "m" },
        pe_conductor:     { ru: "Провод ПВ3 25 мм² (заземление)", ro: "Conductor PV3 25 mm² galben-verde", cat: "materials", unit: "m" },
        lv_cable_m:       { ru: "Кабель силовой НН Al 4×240 (за м трассы на 150 кВт)", ro: "Cablu de forță JT Al 4×240 mm²", cat: "materials", unit: "m" },
        mv_cable_m:       { ru: "Кабель СН XLPE 3×1×95 (за м линии)", ro: "Cablu MT XLPE 3×1×95 mm²", cat: "materials", unit: "m" },
        mv_termination:   { ru: "Концевая муфта СН", ro: "Manșon terminal MT exterior", cat: "materials", unit: "set" },

        // ---------- СМР ----------
        foundation_m3:    { ru: "Фундамент ж/б под ключ (за м³ бетона)", ro: "Fundații din beton armat (la cheie, per m³)", cat: "civil", unit: "m³" },
        geodesy:          { ru: "Геодезия (разбивка, реперы)", ro: "Lucrări geodezice (trasare, repere)", cat: "civil", unit: "lot" },
        site_m2:          { ru: "Площадка и проезды из щебня (работы, за м²)", ro: "Amenajare platformă și drumuri din piatră spartă (lucrări)", cat: "civil", unit: "m²" },
        gravel_t:         { ru: "Щебень (за тонну)", ro: "Piatră spartă (fracții 5–20, 40–70)", cat: "civil", unit: "t" },
        trench_m:         { ru: "Траншея под кабель (выемка + засыпка)", ro: "Tranșee pentru cablu (săpătură + umplutură)", cat: "civil", unit: "m" },

        // ---------- Техника и логистика ----------
        crane_h:          { ru: "Автокран 200 т (за час)", ro: "Servicii automacara 200 t", cat: "logistics", unit: "oră" },
        crane_km:         { ru: "Перегон крана (за км)", ro: "Dislocare automacara (per km)", cat: "logistics", unit: "km" },
        crane_cw:         { ru: "Доставка противовесов (рейс)", ro: "Livrare contragreutăți (cursă)", cat: "logistics", unit: "cursă" },
        manip_trip:       { ru: "Манипулятор, рейс", ro: "Transport cu manipulator (cursă)", cat: "logistics", unit: "cursă" },
        lowboy_km:        { ru: "Трал (за км)", ro: "Transport agabaritic (trailer), per km", cat: "logistics", unit: "km" },
        import_pct:       { ru: "Доставка импортного оборудования и таможня (% от оборудования)", ro: "Transport internațional, vămuire și asigurare echipamente", cat: "logistics", unit: "%" },
        bess_eco_tax_t:   { ru: "Налог на утилизацию батарей при ввозе (2 лея/кг), за тонну", ro: "Taxa pentru poluarea mediului la importul bateriilor (2 lei/kg)", cat: "logistics", unit: "t", quote: true },
        sinexcel_duty_2500:{ ru: "Таможенная пошлина 8% на MV Skid Sinexcel 2,5 МВт", ro: "Taxă vamală 8% pentru stația MV Skid 2,5 MW", cat: "logistics", unit: "lot", quote: true },
        bess_freight_5mwh:{ ru: "Логистика комплекта BESS 2,5 МВт / 5 МВт·ч из Китая (2 × 20 ft)", ro: "Logistica sistemului BESS 2,5 MW / 5 MWh din China (2 containere 20 ft)", cat: "logistics", unit: "lot", quote: true },

        // ---------- Электромонтаж ----------
        pv_install_home:  { ru: "Монтаж СЭС (дом, за кВтп)", ro: "Servicii de montaj centrală fotovoltaică", cat: "electrical", unit: "kWp" },
        pv_install_biz:   { ru: "Монтаж СЭС (бизнес, за кВтп)", ro: "Servicii de montaj centrală fotovoltaică", cat: "electrical", unit: "kWp" },
        home_bess_install:{ ru: "Монтаж инвертора и батареи (дом)", ro: "Montaj invertor hibrid și acumulator", cat: "electrical", unit: "set" },
        cabinet_install:  { ru: "Монтаж и подключение шкафа BESS", ro: "Montaj și conectare dulap BESS", cat: "electrical", unit: "buc" },
        bess_install_mwh: { ru: "Монтаж контейнеров, DC/AC кабелей, разделка (за МВт·ч)", ro: "Montaj containere BESS, cabluri DC/AC și conexiuni", cat: "electrical", unit: "MWh" },
        lv_cable_lay_m:   { ru: "Прокладка кабеля НН (за м)", ro: "Pozarea cablului JT", cat: "electrical", unit: "m" },
        mv_cable_lay_m:   { ru: "Прокладка кабеля СН в траншее (за м)", ro: "Pozarea cablului MT în tranșee", cat: "electrical", unit: "m" },
        mv_joint:         { ru: "Соединительная муфта СН (монтаж)", ro: "Manșon de legătură MT (montaj)", cat: "electrical", unit: "set" },
        trafo_install:    { ru: "Монтаж трансформатора СН", ro: "Montaj transformator MT", cat: "electrical", unit: "buc" },
        metering_scada_cell:{ ru: "Монтаж цепей учёта и SCADA (на ячейку)", ro: "Montaj circuite evidență și echipament SCADA (per celulă)", cat: "electrical", unit: "celulă" },

        // ---------- Пусконаладка и испытания ----------
        mv_tests:         { ru: "Электрические испытания СН", ro: "Încercări electrice MT", cat: "commissioning", unit: "lot" },
        mv_connect:       { ru: "Наладка и подключение СН", ro: "Lucrări de reglare și conectare MT", cat: "commissioning", unit: "lot" },
        rza_comm_cell:    { ru: "Наладка РЗА и учёта (на ячейку СН)", ro: "Punere în funcțiune RPA și evidență (per celulă)", cat: "commissioning", unit: "celulă" },
        shot_comm:        { ru: "Монтаж и наладка ШОТ", ro: "Montaj și punere în funcțiune dulap curent operativ", cat: "commissioning", unit: "lot" },
        isee_tests_15mw:  { ru: "Измерения и испытания ISEE (база 15 МВт)", ro: "Măsurări și încercări ale instalațiilor electrice aferente ISEE", cat: "commissioning", unit: "lot" },
        bess_comm_ci:     { ru: "Пусконаладка BESS и EMS", ro: "Punere în funcțiune BESS și EMS", cat: "commissioning", unit: "lot" },
        bess_supervision_2500:{ ru: "Шефмонтаж и пусконаладка комплекта BESS 2,5 МВт / 5 МВт·ч", ro: "Supraveghere montaj și punere în funcțiune sistem BESS 2,5 MW / 5 MWh", cat: "commissioning", unit: "lot", quote: true },
        gotion_fat_sat:   { ru: "Шефмонтаж, пусконаладка и испытания FAT+SAT контейнеров Gotion", ro: "Supraveghere montaj, punere în funcțiune și teste FAT+SAT (containere Gotion)", cat: "commissioning", unit: "lot", quote: true },

        // ---------- Сдача и разрешения ----------
        dare_home:        { ru: "Сдача в эксплуатацию (дом)", ro: "Darea în exploatare", cat: "grid", unit: "lot" },
        dare_biz:         { ru: "Сдача в эксплуатацию (бизнес 0,4 кВ)", ro: "Darea în exploatare", cat: "grid", unit: "lot" },
        dare_mv:          { ru: "Сдача в эксплуатацию СН (оператор, документы)", ro: "Darea în exploatare (MT): documentație și recepție", cat: "grid", unit: "lot" },
        ecology:          { ru: "Экологическая экспертиза", ro: "Evaluare / aviz de mediu", cat: "grid", unit: "lot" }
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
