// =========================================
// ОФФЕР — дизайн исходного калькулятора (app/): белый лист, логотип,
// жёлтые акценты, карточка клиента и объекта, таблица с TVA.
// В клиентском оффере нет себестоимости, коэффициентов и маржи.
// Валюта — MDL или EUR (пересчёт по курсу BNM на дату оффера: fx.json, его обновляет задание GitHub).
// =========================================

(function () {
    "use strict";

    // Оборудование — построчно, остальное — одной строкой на группу (как в app/).
    const GROUPS = [
        { key: "design", cats: ["engineering"], ro: "Proiectare și inginerie", ru: "Проектирование и инжиниринг" },
        // состав группы — строкой под названием (волна 2 ревизии, 4.5), поэтому без «toate materialele incluse»
        { key: "materials", cats: ["materials"], ro: "Materiale", ru: "Материалы" },
        // монтаж и стройка — отдельными строками; работы станции scutit, накопителя — 20% (ст. 103 п. 30, 2026-10-30)
        { key: "civil", cats: ["civil"], ro: "Lucrări de construcție", ru: "Строительные работы" },
        { key: "works", cats: ["electrical"], ro: "Lucrări de montaj", ru: "Монтажные работы" },
        { key: "logistics", cats: ["logistics"], ro: "Transport, livrare și logistică", ru: "Транспорт, доставка и логистика" },
        { key: "commissioning", cats: ["commissioning"], ro: "Punere în funcțiune", ru: "Пусконаладка" },
        { key: "grid", cats: ["grid"], ro: "Darea în exploatare și autorizații", ru: "Сдача в эксплуатацию и разрешения" }
    ];

    const WORK_KEYS = ["civil", "works", "commissioning"];   // группы работ, где бывает scutit

    const T = {
        ro: {
            kicker: "OFERTĂ COMERCIALĂ", sub: "pentru implementarea proiectului energetic", variant: "Varianta {n}",
            no: "Nr. ofertă", date: "Data emiterii", valid: "Valabilă până la", days: "zile calendaristice",
            client: "CLIENT ȘI OBIECT", name: "Nume", beneficiary: "Beneficiar", place: "Locație", type: "Tip proiect", voltage: "Nivel de racordare",
            roofType: "Forma acoperișului", roofMaterial: "Materialul acoperișului",
            roofTypes: { flat: "Plat", mono: "Într-o apă", gable: "În două ape", hip: "În patru ape", tent: "Piramidal", mansard: "Mansardat", arched: "Arcuit", combined: "Combinat", other: "Alt tip" },
            roofMaterials: { metal_tile: "Țiglă metalică", sandwich: "Panou sandwich", profiled_sheet: "Tablă cutată", standing_seam: "Tablă fălțuită", ceramic_tile: "Țiglă ceramică", concrete_tile: "Țiglă din beton", slate: "Ardezie", bitumen_shingle: "Șindrilă bituminoasă", membrane: "Membrană / carton bitumat", concrete_slab: "Placă de beton", other: "Alt material" },
            cols: ["Nr.", "Denumire", "Cantitate", "Unitate", "Preț unitar", "Valoare", "TVA %", "TVA", "Total cu TVA"],
            subtotal: "Total fără TVA", vat: "TVA totală", vatNa: "TVA (neaplicabilă)", total: "Total cu TVA", totalNoVat: "Total",
            optional: "Opțional", battery: "Acumulator", powerIncrease: "Serviciu de majorare a puterii", pricePerKw: "Preț pe 1 kW cu TVA",
            pricePerKwNet: "Preț pe 1 kW fără TVA", pricePerKwh: "Preț pe 1 kWh cu TVA", pricePerKwhNet: "Preț pe 1 kWh fără TVA",
            pricePerKwp: "Preț pe 1 kWp instalat cu TVA", pricePerKwpNet: "Preț pe 1 kWp instalat fără TVA",
            pricePerKwPv: "Preț pe 1 kWp — centrala ({x}), cu TVA", pricePerKwPvNet: "Preț pe 1 kWp — centrala ({x}), fără TVA",
            pricePerKwAll: "Preț pe 1 kWp — total ({x}), cu TVA", pricePerKwAllNet: "Preț pe 1 kWp — total ({x}), fără TVA",
            blockPv: "Centrală fotovoltaică", blockBess: "Sistem de stocare a energiei (BESS)", blockBat: "Acumulator (stocare de energie)", blockCommon: "Lucrări comune",
            battWord: "acumulator", exportLimit: "Limita de livrare în rețea (aviz)",
            blockTotal: "Total {x} cu TVA", blockTotalNoVat: "Total {x}", grandTotal: "Total {x} cu TVA", grandTotalNoVat: "Total {x}",
            note: "NOTĂ",
            n1: "Oferta comercială este valabilă timp de {days} zile calendaristice de la data emiterii.",
            n2: "Prețurile sunt exprimate în {cur}, fără TVA.", n2Vat: "Prețurile sunt exprimate în {cur} și includ TVA {p}%.",
            n2VatMontaj: "Prețurile sunt exprimate în {cur} și includ TVA {p}%, cu excepția lucrărilor de construcție și montaj ale centralei fotovoltaice, scutite de TVA fără drept de deducere conform art. 103 alin. (1) pct. 30) din Codul fiscal.",
            nFx: "Curs BNM: 1 EUR = {fx} MDL ({date}). Plata se efectuează în MDL la cursul oficial BNM din ziua plății.",
            nFxManual: "Curs: 1 EUR = {fx} MDL ({date}). Plata se efectuează în MDL la cursul oficial BNM din ziua plății.",
            refs: "PROIECTE REALIZATE DE OPTISOLAR",
            n3: "Oferta include echipamentele, materialele și serviciile specificate în tabel.",
            n4: "Preț estimativ: valoarea exactă se confirmă după vizita tehnică la obiect.",
            n4Final: "Prețul este ferm pe durata valabilității ofertei, pentru soluția tehnică confirmată la vizita tehnică.",
            n5: "Condițiile comerciale de mai sus se fixează în contract.",
            n6: "Oferta poate fi modificată în funcție de condițiile proiectului și cerințele finale.",
            resp: "RESPONSABIL OFERTĂ", role: "Funcție", phone: "Telefon", email: "Email",
            regards: "Cu stimă,", team: "Echipa OPTISOLAR",
            city: "Chișinău, Republica Moldova",
            stations: {
                pv: "Centrală fotovoltaică", pv_bess: "Centrală fotovoltaică cu sistem de stocare (BESS)", bess: "Sistem de stocare a energiei (BESS)"
            },
            stationsHome: {
                pv: "Centrală fotovoltaică", pv_bess: "Centrală fotovoltaică hibridă cu acumulator", bess: "Acumulator (stocare de energie)"
            },
            // ---- волна 2 ревизии (2026-10-30): условия, реквизиты, выработка, состав, сводная страница ----
            kickerPrelim: "OFERTĂ COMERCIALĂ PRELIMINARĂ",
            company: "NEBRECA ENERGY SRL · IDNO 1022600014790",
            requisites: "NEBRECA ENERGY SRL · IDNO 1022600014790 · Cod TVA 0612104 · str. Ginta Latină 12/16, of. 96, MD-2044, Chișinău",
            scutit: "scutit",
            pvTotal: "putere totală {x} kWp", pvBrand: "marca (Tier 1) — în oferta finală",
            eqWarr: "garanția producătorului {y}", noModel: "marca și modelul — în oferta finală",
            mode: "Regim de funcționare",
            modes: { zero: "Zero Export (fără livrare în rețea)", netb: "Facturare netă (prosumator)", grid: "Livrare în rețea conform avizului de racordare" },
            goal: "Scopul stocării",
            outage: "La întreruperea rețelei", outageVal: "consumatorii de pe circuitul de rezervă (se stabilesc la vizita tehnică); energie utilă ≈ {kwh} kWh",
            est: "ESTIMARE ANUALĂ", prod: "Producție estimată", prodVal: "≈ {kwh} kWh/an",
            cons: "Consum anual", save: "Economie estimată", saveVal: "≈ {sum} {cur}/an", payback: "Recuperarea investiției",
            estNote: "Calcul: {y} kWh/kWp pe an{tariff}. Estimare, nu reprezintă o garanție: producția reală depinde de orientare, umbrire și vreme.", estTariff: ", tarif {t} lei/kWh",
            estNoteNet: " Surplusul livrat în rețea — prin facturare netă, ≈ {credit} lei/kWh.",
            bessTech: "SISTEMUL DE STOCARE — DATE TEHNICE", bInst: "Capacitate instalată", bUse: "Capacitate utilă (DoD {d}%)",
            bPcs: "Putere de încărcare / descărcare", bDur: "Durată la putere nominală", bDurVal: "≈ {h} ore",
            bChem: "Tehnologie", bChemVal: "litiu-fier-fosfat (LFP)",
            bNote: "Eficiența ciclului, numărul de cicluri, garanția capacității, răcirea și certificatele — conform fișei tehnice a producătorului{fin}.",
            bNoteFin: ", anexată la oferta finală",
            terms: "CONDIȚII COMERCIALE", pay: "Plata",
            payStages: ["avans în 3 zile bancare de la semnarea contractului", "la livrarea echipamentului", "după montaj și punerea în funcțiune", "în 3 zile bancare de la admiterea în exploatare"],
            term: "Termene", termVal: "livrarea echipamentului — până la 30 de zile calendaristice de la avans și avizul de racordare; montaj și punere în funcțiune — până la 30 de zile de la livrare; admiterea în exploatare — până la 30 de zile lucrătoare",
            warr: "Garanții", wPv: "module fotovoltaice 10–15 ani", wInv: "invertoare 5–10 ani", wMount: "structura de montaj 10 ani", wBat: "acumulatoare — conform producătorului", wWorks: "lucrări de montaj 5 ani",
            wNote: " (echipamentul — conform fișei producătorului)",
            serv: "Mentenanță", servVal: "gratuită 36 de luni de la punerea în funcțiune; intervenție la defect — până la 48 de ore",
            roles: "CINE CE FACE", rUs: "OptiSolar",
            rUsVal: "livrarea echipamentelor noi, montajul, punerea în funcțiune și admiterea în exploatare; dosarul la operatorul de rețea: avizul de racordare, proiectul de execuție, declarația electricianului autorizat, actul de delimitare",
            rUsProsumer: "; contractul de prosumator cu furnizorul de energie",
            rClient: "Beneficiarul", rClientVal: "actele și împuternicirile pentru dosar; accesul la obiect; pregătirea locului de instalare; paza echipamentelor pe șantier până la recepția finală",
            rNot: "Nu este inclus", rNotRoof: "consolidarea acoperișului; ",
            rNotVal: "instalația de împământare a clădirii, lucrările în rețeaua interioară, taxele operatorului de rețea și ale autorităților — dacă nu sunt în tabel; alte lucrări — doar prin anexă la contract",
            totalKicker: "TOTAL: CENTRALĂ FOTOVOLTAICĂ + STOCARE", totalCols: ["Nr.", "Denumire", "Total fără TVA", "TVA", "Total cu TVA"],
            totalWith: "Total: centrala + {x}", bessWord: "BESS",
            sharedPv: "Linia de racordare MT, sistemul SCADA și darea în exploatare MT sunt comune cu centrala fotovoltaică și sunt incluse în oferta acesteia.",
            totalNote: "Oferta detaliată pentru fiecare componentă — pe paginile anterioare. Lucrările comune (proiectare, transport, darea în exploatare) sunt incluse în fiecare componentă; la realizarea împreună se optimizează în oferta finală."
        },
        ru: {
            kicker: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", sub: "на реализацию энергетического проекта", variant: "Вариант {n}",
            no: "№ предложения", date: "Дата", valid: "Действует до", days: "календарных дней",
            client: "КЛИЕНТ И ОБЪЕКТ", name: "Имя", beneficiary: "Клиент", place: "Место", type: "Тип проекта", voltage: "Напряжение подключения",
            roofType: "Форма крыши", roofMaterial: "Материал кровли",
            roofTypes: { flat: "Плоская", mono: "Односкатная", gable: "Двускатная", hip: "Вальмовая", tent: "Шатровая", mansard: "Мансардная", arched: "Арочная", combined: "Комбинированная", other: "Другая" },
            roofMaterials: { metal_tile: "Металлочерепица", sandwich: "Сэндвич-панель", profiled_sheet: "Профнастил", standing_seam: "Фальцевая кровля", ceramic_tile: "Керамическая черепица", concrete_tile: "Цементно-песчаная черепица", slate: "Шифер", bitumen_shingle: "Битумная черепица", membrane: "Мембрана / рубероид", concrete_slab: "Бетонная плита", other: "Другой материал" },
            cols: ["№", "Наименование", "Кол-во", "Ед.", "Цена за ед.", "Сумма", "TVA %", "TVA", "Итого с TVA"],
            subtotal: "Итого без TVA", vat: "TVA", vatNa: "TVA (не применяется)", total: "Итого с TVA", totalNoVat: "Итого",
            optional: "Опционально", battery: "Аккумулятор", powerIncrease: "Услуга по увеличению мощности", pricePerKw: "Цена за 1 кВт с TVA",
            pricePerKwNet: "Цена за 1 кВт без TVA", pricePerKwh: "Цена за 1 кВт·ч с TVA", pricePerKwhNet: "Цена за 1 кВт·ч без TVA",
            pricePerKwp: "Цена за 1 кВтп с TVA", pricePerKwpNet: "Цена за 1 кВтп без TVA",
            pricePerKwPv: "Цена за 1 кВтп — СЭС ({x}), с TVA", pricePerKwPvNet: "Цена за 1 кВтп — СЭС ({x}), без TVA",
            pricePerKwAll: "Цена за 1 кВтп — всего ({x}), с TVA", pricePerKwAllNet: "Цена за 1 кВтп — всего ({x}), без TVA",
            blockPv: "Солнечная электростанция", blockBess: "Система накопления энергии (BESS)", blockBat: "Аккумулятор (накопление энергии)", blockCommon: "Общие работы",
            battWord: "аккумулятор", exportLimit: "Лимит выдачи в сеть (авиз)",
            blockTotal: "Итого {x} с TVA", blockTotalNoVat: "Итого {x}", grandTotal: "Итого {x} с TVA", grandTotalNoVat: "Итого {x}",
            note: "ПРИМЕЧАНИЕ",
            n1: "Предложение действует {days} календарных дней с даты выдачи.",
            n2: "Цены указаны в {cur}, без TVA.", n2Vat: "Цены указаны в {cur} и включают TVA {p}%.",
            n2VatMontaj: "Цены указаны в {cur} и включают TVA {p}%, кроме строительно-монтажных работ солнечной станции: они освобождены от TVA без права на вычет (ст. 103 ч. (1) п. 30) Налогового кодекса).",
            nFx: "Курс BNM: 1 EUR = {fx} MDL ({date}). Оплата в MDL по официальному курсу BNM на день оплаты.",
            nFxManual: "Курс: 1 EUR = {fx} MDL ({date}). Оплата в MDL по официальному курсу BNM на день оплаты.",
            refs: "РЕАЛИЗОВАННЫЕ ОБЪЕКТЫ OPTISOLAR",
            n3: "В предложение входят оборудование, материалы и работы, указанные в таблице.",
            n4: "Цена ориентировочная: точная сумма — после технического выезда на объект.",
            n4Final: "Цена твёрдая в течение срока действия предложения — для технического решения, подтверждённого на выезде.",
            n5: "Коммерческие условия выше закрепляются в договоре.",
            n6: "Предложение может измениться в зависимости от условий проекта и окончательных требований.",
            resp: "ОТВЕТСТВЕННЫЙ", role: "Должность", phone: "Телефон", email: "Email",
            regards: "С уважением,", team: "Команда OPTISOLAR",
            city: "Кишинёв, Республика Молдова",
            stations: {
                pv: "Солнечная электростанция", pv_bess: "Солнечная станция с накопителем (BESS)", bess: "Система накопления энергии (BESS)"
            },
            stationsHome: {
                pv: "Солнечная электростанция", pv_bess: "Гибридная солнечная станция с аккумулятором", bess: "Аккумулятор (накопление энергии)"
            },
            kickerPrelim: "ПРЕДВАРИТЕЛЬНОЕ КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ",
            company: "NEBRECA ENERGY SRL · IDNO 1022600014790",
            requisites: "NEBRECA ENERGY SRL · IDNO 1022600014790 · код TVA 0612104 · str. Ginta Latină 12/16, of. 96, MD-2044, Кишинёв",
            scutit: "освоб.",
            pvTotal: "общая мощность {x} кВтп", pvBrand: "марка (Tier 1) — в финальном предложении",
            eqWarr: "гарантия производителя {y}", noModel: "марка и модель — в финальном предложении",
            mode: "Режим работы",
            modes: { zero: "Zero Export (без выдачи в сеть)", netb: "Facturare netă (просюмер)", grid: "Выдача в сеть по авизу на подключение" },
            goal: "Цель накопителя",
            outage: "При отключении сети", outageVal: "потребители резервной линии (определяются на выезде); полезная энергия ≈ {kwh} кВт·ч",
            est: "ОЦЕНКА НА ГОД", prod: "Ориентировочная выработка", prodVal: "≈ {kwh} кВт·ч/год",
            cons: "Годовое потребление", save: "Экономия (оценка)", saveVal: "≈ {sum} {cur}/год", payback: "Окупаемость",
            estNote: "Расчёт: {y} кВт·ч/кВтп в год{tariff}. Оценка, а не гарантия: реальная выработка зависит от ориентации, тени и погоды.", estTariff: ", тариф {t} лей/кВт·ч",
            estNoteNet: " Излишки в сеть — по facturare netă, ≈ {credit} лей/кВт·ч.",
            bessTech: "НАКОПИТЕЛЬ — ТЕХНИЧЕСКИЕ ДАННЫЕ", bInst: "Установленная ёмкость", bUse: "Полезная ёмкость (DoD {d}%)",
            bPcs: "Мощность заряда / разряда", bDur: "Время работы на номинальной мощности", bDurVal: "≈ {h} ч",
            bChem: "Технология", bChemVal: "литий-железо-фосфат (LFP)",
            bNote: "КПД цикла, число циклов, гарантия ёмкости, охлаждение и сертификаты — по техпаспорту производителя{fin}.",
            bNoteFin: ", он прилагается к финальному предложению",
            terms: "КОММЕРЧЕСКИЕ УСЛОВИЯ", pay: "Оплата",
            payStages: ["аванс в течение 3 банковских дней после подписания договора", "при поставке оборудования", "после монтажа и пуска", "в течение 3 банковских дней после допуска в эксплуатацию"],
            term: "Сроки", termVal: "поставка оборудования — до 30 календарных дней после аванса и авиза на подключение; монтаж и пуск — до 30 дней после поставки; допуск в эксплуатацию — до 30 рабочих дней",
            warr: "Гарантии", wPv: "панели 10–15 лет", wInv: "инверторы 5–10 лет", wMount: "крепёж 10 лет", wBat: "аккумуляторы — по производителю", wWorks: "монтажные работы 5 лет",
            wNote: " (оборудование — по паспорту производителя)",
            serv: "Обслуживание", servVal: "бесплатно 36 месяцев после пуска; выезд на неисправность — до 48 часов",
            roles: "КТО ЗА ЧТО ОТВЕЧАЕТ", rUs: "OptiSolar",
            rUsVal: "поставка нового оборудования, монтаж, пуск и допуск в эксплуатацию; документы у оператора сети: авиз на подключение, рабочий проект, декларация аттестованного электрика, акт разграничения",
            rUsProsumer: "; договор просюмера с поставщиком энергии",
            rClient: "Клиент", rClientVal: "документы и доверенности для оформления; доступ на объект; подготовка места установки; охрана оборудования на объекте до окончательной приёмки",
            rNot: "Не входит", rNotRoof: "усиление крыши; ",
            rNotVal: "контур заземления здания, работы во внутренней сети, сборы оператора сети и госорганов — если их нет в таблице; другие работы — только дополнением к договору",
            totalKicker: "ИТОГО: СЭС + НАКОПИТЕЛЬ", totalCols: ["№", "Наименование", "Итого без TVA", "TVA", "Итого с TVA"],
            totalWith: "Итого: СЭС + {x}", bessWord: "BESS",
            sharedPv: "Линия СН, SCADA и сдача в эксплуатацию на СН — общие с солнечной станцией и входят в её предложение.",
            totalNote: "Подробное предложение по каждой части — на предыдущих страницах. Общие работы (проект, транспорт, сдача в эксплуатацию) входят в каждую часть; если строим вместе, они уменьшатся в финальном предложении."
        }
    };

    const GOALS = {
        ro: {
            backup: "alimentare de rezervă în caz de întreruperi ale rețelei",
            peak_shaving: "reducerea vârfurilor de consum și a puterii solicitate din rețea (peak shaving)",
            arbitrage: "stocarea energiei la preț mic și utilizarea ei la preț mare (arbitraj)",
            self_consumption: "creșterea autoconsumului energiei produse de centrala fotovoltaică",
            zero_export: "funcționare fără livrarea surplusului în rețea (Zero Export)",
            hybrid: "autoconsum, rezervă și limitarea exportului"
        },
        ru: {
            backup: "резервное питание при отключениях сети",
            peak_shaving: "снижение пиков потребления и заявленной мощности (peak shaving)",
            arbitrage: "накопление дешёвой энергии и использование в дорогие часы (арбитраж)",
            self_consumption: "больше собственного потребления энергии солнечной станции",
            zero_export: "работа без выдачи излишков в сеть (Zero Export)",
            hybrid: "самопотребление, резерв и ограничение экспорта"
        }
    };

    function esc(v) {
        return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    function money(x) {
        const n = Math.round(Number(x) * 100) / 100;
        return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/ /g, " ").replace(",", ".");
    }

    function qtyFmt(x) {
        const n = Math.round(Number(x) * 100) / 100;
        return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(n).replace(/ /g, " ");
    }

    function dateFmt(d) {
        return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    }

    function offerNumber(meta, now) {
        const p = n => String(n).padStart(2, "0");
        const base = `OP-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
        return meta.leadId ? `${base}-${meta.leadId}` : base;
    }

    function unitLabel(u, lang) {
        if (lang === "ru") return ({ buc: "шт", set: "компл", lot: "компл", kWh: "кВт·ч", kWp: "кВтп", kW: "кВт", m: "м", ore: "ч" })[u] || u;
        return u;
    }

    // Мощность и ёмкость накопителя: у дома — только ёмкость аккумулятора, у бизнеса — «kW / kWh»
    function bessSize(info) {
        const kwh = info.bessKwh >= 1000 ? `${qtyFmt(info.bessKwh / 1000)} MWh` : `${qtyFmt(info.bessKwh)} kWh`;
        if (info.segment === "home") return kwh;
        const kw = info.bessKw >= 1000 ? `${qtyFmt(info.bessKw / 1000)} MW` : `${qtyFmt(info.bessKw)} kW`;
        return `${kw} / ${kwh}`;
    }

    // Дом без жаргона BESS: «10 kWp + acumulator 10 kWh» (ревизия 2026-10-29, А3-F14)
    function powerTitle(info, meta = {}, lang = "ro") {
        const parts = [];
        if (info.pvKwp > 0 && info.product !== "bess") {
            const dc = info.pvKwp >= 1000 ? `${qtyFmt(info.pvKwp / 1000)} MWp` : `${qtyFmt(info.pvKwp)} kWp`;
            // Инвертор задан вручную — в заголовке DC и AC, как в КП конкурентов
            parts.push(meta.acKw > 0 && info.product === "pv" ? `${dc} DC / ${qtyFmt(meta.acKw)} kW AC` : dc);
        }
        if (info.bessKwh > 0 && info.product !== "pv") {
            parts.push(`${info.segment === "home" ? T[lang].battWord : "BESS"} ${bessSize(info)}`);
        }
        return parts.join(" + ") || (lang === "ru" ? "Энергетический проект" : "Proiect energetic");
    }

    // ---------- волна 2 ревизии (2026-10-30): условия, выработка, окупаемость ----------
    const COMPANY_EMAIL = "Optisolar.Moldova@gmail.com";   // ящик на optisolar.md — потом (решение 5)

    function yearsFmt(y, lang) {
        const s = qtyFmt(y);
        if (lang !== "ru") return `${s} ${y === 1 ? "an" : "ani"}`;
        if (y % 1) return `${s} года`;
        const n = y % 100, d = y % 10;
        return `${s} ${d === 1 && n !== 11 ? "год" : d >= 2 && d <= 4 && (n < 12 || n > 14) ? "года" : "лет"}`;
    }

    // Оплата по этапам: «50/50», «30/60/10» → [50, 50]; null — непонятно или в сумме не 100
    function parsePayment(s) {
        const parts = String(s || "").split(/[\/+;\s]+/).filter(Boolean).map(x => Number(x.replace("%", "").replace(",", ".")));
        if (!parts.length || parts.some(x => !(x > 0)) || Math.abs(parts.reduce((a, b) => a + b, 0) - 100) > 0.01) return null;
        return parts;
    }
    // этапы: первый — аванс, последний — после допуска, между ними — поставка, затем монтаж и пуск
    function paymentText(parts, t) {
        const st = t.payStages;
        const n = parts.length;
        const labels = n === 1 ? [st[3]] : n === 2 ? [st[0], st[3]] : [st[0], st[1], ...Array(n - 3).fill(st[2]), st[3]];
        return parts.map((p, i) => `${qtyFmt(p)}% — ${labels[i]}`).join("; ");
    }

    // Выработка, экономия и окупаемость (решение 7). Экономия — только при введённом потреблении:
    // прямое потребление по тарифу, излишки по кредиту facturare netă (до 200 кВт, не Zero Export),
    // не больше годового счёта. Окупаемость: дом — от цены с TVA, бизнес — без TVA.
    // Тариф: Premier Energy 3,56 лей/кВт·ч (ANRE, Moldpres 31.03.2026); кредит — среднее Premier за январь–август 2026.
    const EST = { tariff: 3.56, credit: 2.68, shareNoBat: 35, shareBat: 70, netLimitKw: 200 };
    function estimate(info, result, meta = {}) {
        const annual = Number(info.pvAnnualKwh) || 0;
        if (!(info.pvKwp > 0) || !(annual > 0) || info.product === "bess") return null;
        const out = { annual, perKwp: Math.round(annual / info.pvKwp) };
        const cons = (Number(meta.consumptionKwh) || 0) * 12;
        if (!(cons > 0)) return out;
        const tariff = Number(meta.tariff) > 0 ? Number(meta.tariff) : EST.tariff;
        const share = (Number(meta.selfShare) > 0 ? Math.min(100, Number(meta.selfShare)) : (info.bessKwh > 0 && info.product !== "pv" ? EST.shareBat : EST.shareNoBat)) / 100;
        const acKw = Number(info.inverterKw) || info.pvKwp;
        const netb = !meta.zeroExport && acKw <= EST.netLimitKw;
        const direct = Math.min(annual, cons * share);
        const exported = netb ? Math.min((annual - direct) * EST.credit, (cons - direct) * tariff) : 0;
        const savings = direct * tariff + exported;
        const price = info.segment === "home" ? result.priceWithVat : result.commercialPrice;
        return { ...out, cons, tariff, share, netb, savings, payback: savings > 0 ? Math.round(price / savings * 2) / 2 : 0 };
    }

    // Шапка, номер и подвал — общие для листа оффера и сводной страницы
    function headHtml(t, ed, logo) {
        return `
  <img class="offer-watermark" src="${logo}" alt="" aria-hidden="true">
  <header class="offer-brand-header">
    <div class="offer-brand-logo-wrap"><img class="offer-brand-logo" src="${logo}" alt="OPTISOLAR renewed energy"></div>
    <div class="offer-company-details">
      <div${ed}><span class="contact-symbol">▣</span> ${esc(t.company)}</div>
      <div${ed}><span class="contact-symbol">⌖</span> ${esc(t.city)}</div>
      <div${ed}><span class="contact-symbol">✉</span> ${esc(COMPANY_EMAIL)}</div>
      <div${ed}><span class="contact-symbol">◎</span> www.optisolar.md</div>
    </div>
  </header>`;
    }
    function metaHtml(t, edc, number, now, valid, days) {
        return `
  <div class="offer-document-meta">
    <div><span>${esc(t.no)}</span><strong${edc("offer-no")}>${esc(number)}</strong></div>
    <div><span>${esc(t.date)}</span><strong${edc("offer-date")}>${dateFmt(now)}</strong></div>
    <div><span>${esc(t.valid)}</span><strong${edc("offer-valid")}>${dateFmt(valid)}</strong><small>(${days} ${esc(t.days)})</small></div>
  </div>`;
    }
    function contactHtml(t, line, meta) {
        return `
      <section class="offer-contact-card">
        <h3><span>♙</span> ${esc(t.resp)}</h3>
        ${line(t.name, meta.manager || "Nikita Ungureanu")}
        ${line(t.role, meta.managerRole || "Project Manager")}
        ${line(t.phone, meta.managerPhone || "—")}
        ${line(t.email, meta.managerEmail || COMPANY_EMAIL)}
      </section>`;
    }
    function signatureHtml(t, ed, meta) {
        return `
    <div class="offer-signature">
      <p${ed}>${esc(t.regards)}</p>
      <strong${ed}>${esc(t.team)}</strong>
      <div class="signature-line"></div>
      <strong${ed}>${esc(meta.manager || "Nikita Ungureanu")}</strong>
      <span${ed}>${esc(meta.managerRole || "Project Manager")}</span>
    </div>`;
    }
    const footHtml = t => `<footer class="offer-document-footer"><span>${esc(t.requisites)}</span><span>www.optisolar.md</span></footer>`;

    // state: { result, info, meta }; opts: { lang, logo, draft, now, currency, fx, fxDate, fxSrc (BNM | manual | ratebook), editable, number }
    function render(state, opts) {
        const lang = opts.lang === "ru" ? "ru" : "ro";
        const t = T[lang];
        const { result, info, meta } = state;
        const eur = opts.currency === "EUR";
        const cur = eur ? "EUR" : "MDL";
        const k = eur ? (Number(opts.fx) || 1) : 1;
        const m = x => `${money(x / k)}`;
        const now = opts.now || new Date();
        const days = meta.validDays || 7;
        const valid = new Date(now);
        valid.setDate(valid.getDate() + days);
        // несколько листов в одном документе: номер с суффиксом -1, -2…; у вариантов BESS — «Varianta N»
        const number = opts.number || offerNumber(meta, now) + (opts.numberSuffix ? "-" + opts.numberSuffix : "");
        const variantTitle = opts.variant ? " — " + t.variant.replace("{n}", opts.variant) : "";
        const vatOn = result.vatEnabled;
        const final = meta.offerKind === "final";
        const ed = opts.editable ? ' contenteditable="true" class="offer-editable"' : "";
        const edc = cls => opts.editable ? ` contenteditable="true" class="offer-editable ${cls}"` : ` class="${cls}"`;
        const nm = i => lang === "ru" ? i.nameRu || i.name : i.name;

        const stations = info.segment === "home" ? t.stationsHome : t.stations;
        const station = stations[info.product] || stations.pv_bess;
        const voltLabel = info.voltage === "0.4" ? "0,4 kV" : `${info.voltage} kV`;
        const hasPv = info.pvKwp > 0 && info.product !== "bess";
        const hasBat = info.bessKwh > 0 && info.product !== "pv";

        const roofType = meta.roofType ? (t.roofTypes[meta.roofType] || meta.roofType) : "";
        const roofMaterial = meta.roofMaterial ? (t.roofMaterials[meta.roofMaterial] || meta.roofMaterial) : "";
        const line = (label, value) => `<div class="offer-info-line"><span>${esc(label)}</span><strong${ed}>${esc(value)}</strong></div>`;

        // Таблица: оборудование построчно, остальное группами; под названием — детали (марка, гарантия, состав группы)
        let nr = 0;
        const row = (name, qty, unit, price, net, vatLbl, vat, gross, spec) => {
            nr += 1;
            const cells = [
                ["c-n", esc(nr)], ["c-name offer-description-cell", esc(name) + (spec ? `<small class="offer-item-spec">${esc(spec)}</small>` : "")],
                ["c-qty", esc(qty)], ["c-unit", esc(unit)], ["c-price", esc(price)],
                ["c-net", esc(net)], ["c-vatp", esc(vatLbl)], ["c-vat", esc(vat)], ["c-total", esc(gross)]
            ];
            return `<tr>${cells.map(([cls, v]) => `<td${edc(cls)}>${v}</td>`).join("")}</tr>`;
        };
        // работы станции без TVA — «scutit» (решение 6), остальные ставки — процентом
        const vatLbl = (pct, exempt) => exempt && vatOn ? t.scutit : `${qtyFmt(pct)}%`;
        const eqBook = (window.RATEBOOK && window.RATEBOOK.equipment) || {};
        const itemSpec = i => {
            const id = String(i.rateId || "");
            if (id === "pv_module_wp") return t.pvTotal.replace("{x}", qtyFmt(info.pvKwp)) + (!final && /\(Tier 1\)/.test(i.name || "") ? "; " + t.pvBrand : "");
            if (id.startsWith("eq:")) {
                const e = eqBook[id.slice(3)];
                return e && e.warranty ? t.eqWarr.replace("{y}", yearsFmt(e.warranty, lang)) : "";
            }
            if (!final && ["inv_hybrid", "inv_ongrid", "bat_lv_kwh"].includes(id)) return t.noModel;
            return "";
        };
        const groupSpec = gi => {
            const names = [...new Set(gi.map(i => String(nm(i) || "").trim()).filter(Boolean))];
            return names.length > 7 ? names.slice(0, 7).join("; ") + "; …" : names.join("; ");
        };
        const live = result.items.filter(i => Math.abs(i.totalSell) > 0.004);
        const sum = (its, f) => its.reduce((s, i) => s + i[f], 0);
        const tableBody = its => {
            let html = its.filter(i => i.category === "main-equipment").map(i => row(
                nm(i), qtyFmt(i.quantity), unitLabel(i.unit || "buc", lang),
                m(i.sell), m(i.totalSell), vatLbl(i.vatPct || 0, false), m(i.vatAmount), m(i.totalWithVat), itemSpec(i)
            )).join("");
            // группа делится по TVA: работы станции (scutit) — отдельной строкой от облагаемых 20%
            // (ст. 103 п. 30: стройка и монтаж СЭС — scutit, накопитель, услуги и товар — 20%; 2026-10-30)
            GROUPS.forEach(g => {
                const gi = its.filter(i => g.cats.includes(i.category));
                if (!gi.length) return;
                const free = i => vatOn && WORK_KEYS.includes(g.key) && !(Number(i.vatPct) > 0);
                [gi.filter(free), gi.filter(i => !free(i))].forEach((part, k) => {
                    if (!part.length) return;
                    const net = sum(part, "totalSell"), vat = sum(part, "vatAmount"), gross = sum(part, "totalWithVat");
                    html += row(g[lang], "—", unitLabel("lot", lang), "—", m(net), vatLbl(net ? vat / net * 100 : 0, k === 0), m(vat), m(gross), groupSpec(part));
                });
            });
            return html;
        };
        // Цена за единицу мощности — без TVA и с TVA
        const perLines = (net, gross, label, labelNet, per, unit) => !(per > 0) ? "" :
            `<div class="offer-summary-perkw"><span>${esc(labelNet)}</span><strong>${m(net / per)} ${cur}/${unit}</strong></div>` +
            (vatOn ? `<div class="offer-summary-perkw"><span>${esc(label)}</span><strong>${m(gross / per)} ${cur}/${unit}</strong></div>` : "");
        const pvPer = (net, gross) => perLines(net, gross, t.pricePerKwp, t.pricePerKwpNet, info.pvKwp, "kWp");
        const bessPer = (net, gross) => perLines(net, gross, t.pricePerKwh, t.pricePerKwhNet, info.bessKwh, "kWh") +
            perLines(net, gross, t.pricePerKw, t.pricePerKwNet, info.bessKw, "kW");
        const summaryBox = (net, vat, gross, grandLabel, extra, cls) => `
  <div class="offer-summary-wrap${cls ? " " + cls : ""}">
    <div class="offer-summary">
      <div><span>${esc(t.subtotal)}</span><strong>${m(net)} ${cur}</strong></div>
      <div><span>${esc(vatOn ? t.vat : t.vatNa)}</span><strong>${m(vat)} ${cur}</strong></div>
      <div class="offer-summary-grand"><span>${esc(grandLabel)}</span><strong>${m(gross)} ${cur}</strong></div>
      ${extra}
    </div>
  </div>`;
        const tableHtml = bodyHtml => `
  <div class="offer-table-wrap">
    <table class="offer-pricing-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  </div>`;

        // Блоки A — СЭС и B — аккумулятор / BESS (поле section у позиций: генератор и расчёт от Claude),
        // если блоков хотя бы два; иначе одна таблица
        const blocks = [
            { key: "pv", name: t.blockPv, title: info.pvKwp > 0 ? powerTitle({ ...info, product: "pv" }, meta, lang) : "", its: live.filter(i => i.section === "pv") },
            { key: "bess", name: info.segment === "home" ? t.blockBat : t.blockBess, title: info.bessKwh > 0 ? bessSize(info) : "", its: live.filter(i => i.section === "bess") },
            { key: "common", name: t.blockCommon, title: "", its: live.filter(i => i.section !== "pv" && i.section !== "bess") }
        ].filter(b => b.its.length);
        const sectioned = blocks.length >= 2 && live.some(i => i.section === "pv" || i.section === "bess");
        if (!sectioned) blocks.length = 0;
        blocks.forEach((b, i) => { b.letter = "ABCD"[i]; });
        const letters = blocks.map(b => b.letter).join(" + ");

        const body = sectioned ? "" : tableBody(live);
        const optionalItems = result.optionalItems || [];
        const batteryItems = optionalItems.filter(i => i._key !== "optional-power-increase");
        const powerItem = optionalItems.find(i => i._key === "optional-power-increase");
        const optionRow = (label, items) => {
            if (!items.length) return "";
            const net = items.reduce((s, i) => s + i.totalSell, 0);
            const vat = items.reduce((s, i) => s + i.vatAmount, 0);
            const gross = items.reduce((s, i) => s + i.totalWithVat, 0);
            return row(`${t.optional}: ${label}`, "—", unitLabel("lot", lang), "—", m(net), vatLbl(net ? vat / net * 100 : 0, false), m(vat), m(gross));
        };
        // функция, а не строка: номера строк идут по порядку таблицы
        // модель батареи из прайса — в названии опции: «Acumulator — Dyness PowerBox G2 10 kWh»
        const batModels = batteryItems
            .filter(i => /^eq:/.test(i.rateId || "") && /^(Acumulator|Modul baterie|Аккумулятор|Батарейный модуль)/.test(nm(i)))
            .map(i => `${Number(i.quantity) > 1 ? qtyFmt(i.quantity) + " × " : ""}${nm(i).replace(/\s*\(.*\)\s*$/, "").replace(/^(Acumulator|Modul baterie( HV)?|Аккумулятор|Батарейный модуль( HV)?)\s+/, "")}`);
        const batLabel = batModels.length ? `${t.battery} — ${batModels.join(" + ")}` : t.battery;
        const optRows = () => optionRow(batLabel, batteryItems) + (powerItem ? optionRow(t.powerIncrease, [powerItem]) : "");
        const head = t.cols.map((c, i) => `<th class="${["c-n", "c-name", "c-qty", "c-unit", "c-price", "c-net", "c-vatp", "c-vat", "c-total"][i]}">${esc(c)}</th>`).join("");

        let tablesHtml;
        if (blocks.length) {
            // Цена за kW — только в общем итоге (запрос 2026-10-20): станция (блок A) и всё вместе на kWp СЭС;
            // без СЭС — за kWh и kW накопителя
            const pvBlock = blocks.find(b => b.key === "pv");
            const allNet = result.commercialPrice, allGross = result.priceWithVat;
            const finalPer = pvBlock && info.pvKwp > 0
                ? perLines(sum(pvBlock.its, "totalSell"), sum(pvBlock.its, "totalWithVat"), t.pricePerKwPv.replace("{x}", pvBlock.letter), t.pricePerKwPvNet.replace("{x}", pvBlock.letter), info.pvKwp, "kWp") +
                  perLines(allNet, allGross, t.pricePerKwAll.replace("{x}", letters), t.pricePerKwAllNet.replace("{x}", letters), info.pvKwp, "kWp")
                : bessPer(allNet, allGross);
            tablesHtml = blocks.map((b, i) => {
                const rows = tableBody(b.its) + (i === 0 ? optRows() : "");
                const net = sum(b.its, "totalSell"), vat = sum(b.its, "vatAmount"), gross = sum(b.its, "totalWithVat");
                return `
  <section class="offer-block">
    <div${edc("offer-block-title")}><span class="offer-block-letter">${b.letter}</span> ${esc(b.name)}${b.title ? " — " + esc(b.title) : ""}</div>
    ${tableHtml(rows)}
    ${summaryBox(net, vat, gross, (vatOn ? t.blockTotal : t.blockTotalNoVat).replace("{x}", b.letter), "")}
  </section>`;
            }).join("") + summaryBox(allNet, result.vatAmount, allGross,
                (vatOn ? t.grandTotal : t.grandTotalNoVat).replace("{x}", letters), finalPer, "offer-summary-all");
        } else {
            const per = info.product === "bess" ? bessPer(result.commercialPrice, result.priceWithVat)
                : (info.pvKwp > 0 ? pvPer(result.commercialPrice, result.priceWithVat) : "");
            tablesHtml = tableHtml(body + optRows()) + summaryBox(result.commercialPrice, result.vatAmount, result.priceWithVat, vatOn ? t.total : t.totalNoVat, per);
        }

        // ---- карточки рядом с клиентом: режим и цель, оценка на год (СЭС), данные накопителя (бизнес) ----
        const acKw = Number(info.inverterKw) || info.pvKwp;
        const mode = !hasPv ? "" : meta.zeroExport ? t.modes.zero : (info.segment === "home" || acKw <= EST.netLimitKw) ? t.modes.netb : t.modes.grid;
        const goal = hasBat && meta.goal ? (GOALS[lang][meta.goal] || "") : "";
        const usable = Number(info.usableKwh) || 0;
        const est = estimate(info, result, meta);
        const num1 = x => String(x).replace(".", ",");
        const estCard = !est ? "" : `
    <section class="offer-info-card offer-est-card">
      <h3><span>☀</span> ${esc(t.est)}</h3>
      ${line(t.prod, t.prodVal.replace("{kwh}", qtyFmt(Math.round(est.annual / 100) * 100)))}
      ${est.cons ? line(t.cons, `${qtyFmt(Math.round(est.cons))} ${lang === "ru" ? "кВт·ч" : "kWh"}`) : ""}
      ${est.cons ? line(t.save, t.saveVal.replace("{sum}", qtyFmt(Math.round(est.savings / k / 10) * 10)).replace("{cur}", cur)) : ""}
      ${est.payback ? line(t.payback, "≈ " + yearsFmt(est.payback, lang)) : ""}
      <p class="offer-card-note"${ed}>${esc(t.estNote.replace("{y}", qtyFmt(est.perKwp)).replace("{tariff}", est.cons ? t.estTariff.replace("{t}", num1(est.tariff)) : "") + (est.cons && est.netb ? t.estNoteNet.replace("{credit}", num1(EST.credit)) : ""))}</p>
    </section>`;
        const bessCard = !(hasBat && info.segment !== "home") ? "" : `
    <section class="offer-info-card offer-bess-card">
      <h3><span>▥</span> ${esc(t.bessTech)}</h3>
      ${line(t.bInst, `${qtyFmt(info.bessKwh)} kWh`)}
      ${usable > 0 ? line(t.bUse.replace("{d}", Math.round(usable / info.bessKwh * 100)), `≈ ${qtyFmt(usable)} kWh`) : ""}
      ${info.bessKw > 0 ? line(t.bPcs, `${qtyFmt(info.bessKw)} kW`) : ""}
      ${info.bessKw > 0 ? line(t.bDur, t.bDurVal.replace("{h}", qtyFmt(Math.round(info.bessKwh / info.bessKw * 10) / 10))) : ""}
      ${line(t.bChem, t.bChemVal)}
      ${goal ? line(t.goal, goal) : ""}
      <p class="offer-card-note"${ed}>${esc(t.bNote.replace("{fin}", final ? "" : t.bNoteFin))}</p>
    </section>`;
        const sideCards = estCard + bessCard;

        // ---- условия (решение 2) и кто за что отвечает (4.5) ----
        const pay = parsePayment(meta.payment) || [50, 50];
        const warr = [hasPv && t.wPv, (hasPv || Number(info.inverterKw) > 0) && t.wInv, hasPv && t.wMount, hasBat && t.wBat, t.wWorks].filter(Boolean).join(", ");
        const termsHtml = `
  <section class="offer-info-card offer-terms-card">
    <h3><span>§</span> ${esc(t.terms)}</h3>
    ${line(t.pay, paymentText(pay, t))}
    ${line(t.term, t.termVal)}
    ${line(t.warr, warr.charAt(0).toUpperCase() + warr.slice(1) + t.wNote)}
    ${line(t.serv, t.servVal)}
  </section>
  <section class="offer-info-card offer-terms-card">
    <h3><span>⇄</span> ${esc(t.roles)}</h3>
    ${line(t.rUs, t.rUsVal + (hasPv && !meta.zeroExport ? t.rUsProsumer : ""))}
    ${line(t.rClient, t.rClientVal)}
    ${line(t.rNot, (hasPv && meta.mount !== "ground" ? t.rNotRoof : "") + t.rNotVal)}
  </section>`;

        // TVA одной фразой: «включают TVA 20%, кроме монтажа (scutit, art. 103)» — раньше две фразы противоречили друг другу
        const vatMax = Math.max(0, ...live.map(i => Number(i.vatPct) || 0));
        const montaj0 = live.some(i => ["electrical", "civil", "commissioning"].includes(i.category) && !(Number(i.vatPct) > 0));
        const notes = [
            t.n1.replace("{days}", days),
            (vatOn && vatMax > 0 ? (montaj0 ? t.n2VatMontaj : t.n2Vat) : t.n2).replace("{cur}", cur).replace("{p}", qtyFmt(vatMax))
                + (eur ? " " + (opts.fxSrc === "manual" ? t.nFxManual : t.nFx).replace("{fx}", String(opts.fx).replace(".", ",")).replace("{date}", opts.fxDate || "") : ""),
            t.n3, ...(info.sharedWithPv ? [t.sharedPv] : []), final ? t.n4Final : t.n4, t.n5, t.n6
        ];
        const logo = esc(opts.logo || "");

        return `
<article class="offer-document" lang="${lang}">
  ${headHtml(t, ed, logo)}
  <section class="offer-title-block">
    <div class="offer-kicker">${esc(final ? t.kicker : t.kickerPrelim)}</div>
    <h1${ed}>${esc(powerTitle(info, meta, lang) + variantTitle)}</h1>
    <p${ed}>${esc(station)} — ${esc(t.sub)}</p>
    <div class="offer-yellow-rule"></div>
  </section>
  ${metaHtml(t, edc, number, now, valid, days)}
  <div class="offer-info-grid${sideCards ? " two" : ""}">
    <section class="offer-info-card">
      <h3><span>▦</span> ${esc(t.client)}</h3>
      ${line(t.beneficiary, meta.client || "—")}
      ${line(t.place, meta.location || "—")}
      ${line(t.type, station)}
      ${line(t.voltage, voltLabel)}
      ${mode ? line(t.mode, mode) : ""}
      ${meta.exportLimitKw > 0 && info.bessKw > 0 && info.product !== "pv" ? line(t.exportLimit, `${qtyFmt(meta.exportLimitKw)} kW · PCS ${qtyFmt(info.bessKw)} kW`) : ""}
      ${goal && info.segment === "home" ? line(t.goal, goal) : ""}
      ${hasBat && info.segment === "home" && usable > 0 ? line(t.outage, t.outageVal.replace("{kwh}", qtyFmt(usable))) : ""}
      ${roofType ? line(t.roofType, roofType) : ""}
      ${roofMaterial ? line(t.roofMaterial, roofMaterial) : ""}
    </section>${sideCards}
  </div>
  ${tablesHtml}
  ${termsHtml}
  <div class="offer-bottom-grid">
    <div class="offer-bottom-left">
      <section class="offer-note-card">
        <h3><span>▤</span> ${esc(t.note)}</h3>
        <ol>${notes.map(n => `<li${ed}>${esc(n)}</li>`).join("")}</ol>
      </section>
      ${contactHtml(t, line, meta)}
    </div>
    ${signatureHtml(t, ed, meta)}
  </div>
  ${referencesBlock(opts.references, lang, t, ed)}
  ${footHtml(t)}
</article>`;
    }

    // Сводная страница бизнеса «СЭС + BESS» (4.x ревизии): части и сумма СЭС с каждым вариантом накопителя.
    // parts: [{ info, result, variant }] — листы в оффере; цены не меняются, общие работы не вычитаются (это решение — потом)
    function renderTotal(parts, meta, opts) {
        const lang = opts.lang === "ru" ? "ru" : "ro";
        const t = T[lang];
        const eur = opts.currency === "EUR";
        const cur = eur ? "EUR" : "MDL";
        const k = eur ? (Number(opts.fx) || 1) : 1;
        const m = x => `${money(x / k)} ${cur}`;
        const now = opts.now || new Date();
        const days = meta.validDays || 7;
        const valid = new Date(now);
        valid.setDate(valid.getDate() + days);
        const ed = opts.editable ? ' contenteditable="true" class="offer-editable"' : "";
        const edc = cls => opts.editable ? ` contenteditable="true" class="offer-editable ${cls}"` : ` class="${cls}"`;
        const line = (label, value) => `<div class="offer-info-line"><span>${esc(label)}</span><strong${ed}>${esc(value)}</strong></div>`;
        const pv = parts.find(p => p.info.product === "pv");
        const bess = parts.filter(p => p !== pv);
        const label = p => p === pv
            ? `${t.blockPv} ${powerTitle({ ...p.info, product: "pv" }, meta, lang)}`
            : `${t.blockBess}${p.variant ? " — " + t.variant.replace("{n}", p.variant) : ""}: ${bessSize(p.info)}`;
        const val = p => ({ net: p.result.commercialPrice, vat: p.result.vatAmount, gross: p.result.priceWithVat });
        let nr = 0;
        const tr = (name, v, cls) => {
            nr += 1;
            return `<tr${cls ? ` class="${cls}"` : ""}><td class="c-n">${nr}</td><td${edc("c-name offer-description-cell")}>${esc(name)}</td><td class="c-net">${m(v.net)}</td><td class="c-vat">${m(v.vat)}</td><td class="c-total">${m(v.gross)}</td></tr>`;
        };
        const rows = parts.map(p => tr(label(p), val(p))).join("") + (pv ? bess.map(b => {
            const a = val(pv), c = val(b);
            return tr(t.totalWith.replace("{x}", b.variant ? t.variant.replace("{n}", b.variant) : t.bessWord), { net: a.net + c.net, vat: a.vat + c.vat, gross: a.gross + c.gross }, "offer-total-row");
        }).join("") : "");
        const title = [pv ? powerTitle({ ...pv.info, product: "pv" }, meta, lang) : "", ...bess.map(b => "BESS " + bessSize(b.info))].filter(Boolean).join(" + ");
        const logo = esc(opts.logo || "");
        return `
<article class="offer-document offer-total-doc" lang="${lang}">
  ${headHtml(t, ed, logo)}
  <section class="offer-title-block">
    <div class="offer-kicker">${esc(t.totalKicker)}</div>
    <h1${ed}>${esc(title)}</h1>
    <p${ed}>${esc(meta.client || "")}${meta.location ? " · " + esc(meta.location) : ""}</p>
    <div class="offer-yellow-rule"></div>
  </section>
  ${metaHtml(t, edc, opts.number || offerNumber(meta, now), now, valid, days)}
  <div class="offer-table-wrap">
    <table class="offer-pricing-table offer-total-table">
      <thead><tr>${t.totalCols.map((c, i) => `<th class="${["c-n", "c-name", "c-net", "c-vat", "c-total"][i]}">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <p class="offer-card-note offer-total-note"${ed}>${esc(t.totalNote)}</p>
  <div class="offer-bottom-grid">
    <div class="offer-bottom-left">${contactHtml(t, line, meta)}</div>
    ${signatureHtml(t, ed, meta)}
  </div>
  ${referencesBlock(opts.references, lang, t, ed)}
  ${footHtml(t)}
</article>`;
    }

    // Проекты, реализованные OptiSolar (js/references.js): фото и название под подписью
    function referencesBlock(ids, lang, t, ed) {
        const all = Array.isArray(window.EPC_REFERENCES) ? window.EPC_REFERENCES : [];
        const chosen = Array.isArray(ids) ? all.filter(r => ids.includes(r.id)) : [];
        if (!chosen.length) return "";
        return `<section class="offer-references">
    <h3><span>★</span> ${esc(t.refs)}</h3>
    <div class="offer-references-grid">${chosen.map(r => `
      <div class="offer-reference">
        <img class="offer-reference-img" data-ref="${esc(r.id)}" src="${esc(r.photo)}" alt="${esc(r.title)}">
        <div class="offer-reference-cap"><strong${ed}>${esc(r.title)}</strong><span${ed}>${esc(r[lang] || r.ro || "")}</span></div>
      </div>`).join("")}
    </div>
  </section>`;
    }

    // ---------- Экспорт ----------
    // node — готовый документ (клон оффера со страницы, с ручными правками) или HTML-строка
    async function toCanvas(node, width) {
        const host = document.createElement("div");
        host.className = "offer-render-host";
        host.style.width = width + "px";
        if (typeof node === "string") host.innerHTML = node;
        else host.appendChild(node);
        document.body.appendChild(host);
        try {
            const imgs = Array.from(host.querySelectorAll("img"));
            await Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
            const root = host.firstElementChild;
            // Где можно разрезать лист: под строками таблицы и под блоками (в пикселях холста, scale 2)
            const top = root.getBoundingClientRect().top;
            const breaks = Array.from(root.querySelectorAll("tr, .offer-brand-header, .offer-title-block, .offer-document-meta, .offer-info-grid, .offer-summary-wrap, .offer-note-card, .offer-contact-card, .offer-bottom-grid, .offer-references, .offer-info-card, .offer-info-line, .offer-total-note"))
                .map(el => Math.round((el.getBoundingClientRect().bottom - top) * 2))
                .sort((a, b) => a - b);
            const canvas = await window.html2canvas(root, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
            canvas.breaks = breaks;
            return canvas;
        } finally {
            host.remove();
        }
    }

    const A4 = { w: 210, h: 297 };

    // Раскладка A4 по листам — одна и та же для PDF и для просмотра.
    // Лист: { y, h } — кусок холста в пикселях; { x, top, w, hMm } — где он стоит на листе, мм.
    function a4Pages(canvas) {
        const pagePx = canvas.width * A4.h / A4.w;
        if (canvas.height <= pagePx * 1.12) {
            // помещается на один лист (с небольшим уменьшением)
            let w = A4.w, h = A4.w * canvas.height / canvas.width;
            if (h > A4.h) { h = A4.h; w = A4.h * canvas.width / canvas.height; }
            return [{ y: 0, h: canvas.height, x: (A4.w - w) / 2, top: 0, w, hMm: h }];
        }
        // длинный оффер — режем по границе строки или блока; со второго листа поле сверху 10 мм
        const breaks = canvas.breaks || [];
        const pages = [];
        for (let y = 0, sliceH = 0; y < canvas.height - 1; y += sliceH) {
            const top = pages.length ? 10 : 0;
            const avail = pagePx * (A4.h - top) / A4.h;
            sliceH = Math.min(avail, canvas.height - y);
            if (y + sliceH < canvas.height) {
                const cut = breaks.filter(b => b > y + avail * 0.5 && b <= y + avail).pop();
                if (cut) sliceH = cut - y;
            }
            pages.push({ y, h: sliceH, x: 0, top, w: A4.w, hMm: sliceH * A4.w / canvas.width });
        }
        return pages;
    }

    // Картинка одного листа (кусок холста) для PDF и просмотра
    function pageImage(canvas, page, quality) {
        if (page.y === 0 && page.h >= canvas.height) return canvas.toDataURL("image/jpeg", quality || 0.92);
        const c = document.createElement("canvas");
        c.width = canvas.width;
        c.height = Math.ceil(page.h);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(canvas, 0, page.y, canvas.width, page.h, 0, 0, canvas.width, page.h);
        return c.toDataURL("image/jpeg", quality || 0.92);
    }

    // Телефон: одна длинная страница шириной 100 мм
    function phoneSize(canvas) {
        return { w: 100, h: 100 * canvas.height / canvas.width };
    }

    function pdfFromCanvas(canvas, format) {
        const { jsPDF } = window.jspdf;
        if (format === "a4") {
            const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
            a4Pages(canvas).forEach((p, i) => {
                if (i) doc.addPage();
                doc.addImage(pageImage(canvas, p), "JPEG", p.x, p.top, p.w, p.hMm);
            });
            return doc;
        }
        const { w, h } = phoneSize(canvas);
        const doc = new jsPDF({ unit: "mm", format: [w, h], orientation: "portrait", compress: true });
        doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
        return doc;
    }

    function download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return "downloaded";
    }

    // Запущены ли из Telegram. Скрипт telegram-web-app.js создаёт window.Telegram.WebApp
    // и в обычном браузере — там initData пустой, а platform = "unknown".
    function inTelegram() {
        const tg = window.Telegram && window.Telegram.WebApp;
        return Boolean(tg && (tg.initData || (tg.platform && tg.platform !== "unknown")));
    }

    async function deliver(blob, filename, mode = "download") {
        const telegramWebApp = inTelegram();
        // В Telegram ссылка <a download> на blob ничего не скачивает. Там файл
        // отдаётся только через меню «Поделиться», если клиент его даёт;
        // иначе — открыть калькулятор во внешнем браузере (main.js).
        const shouldShare = mode === "share" || telegramWebApp;
        if (shouldShare && typeof navigator.share === "function") {
            try {
                const file = new File([blob], filename, { type: blob.type || "application/pdf" });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    // Отправляем только файл: на iOS Safari title может уйти
                    // в Telegram как текстовое сообщение без вложения.
                    await navigator.share({ files: [file] });
                    return "shared";
                }
            } catch (e) {
                if (e && e.name === "AbortError") return "cancelled";
                if (telegramWebApp) return "telegram-unavailable";
            }
        }
        if (telegramWebApp) return "telegram-unavailable";
        return download(blob, filename);
    }

    // Несколько листов оффера (СЭС, варианты BESS): A4 — каждый лист с новой страницы
    function pdfFromCanvases(canvases, format) {
        if (format !== "a4" || canvases.length === 1) return pdfFromCanvas(format === "a4" ? canvases[0] : stackCanvases(canvases), format);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
        let first = true;
        canvases.forEach(canvas => a4Pages(canvas).forEach(p => {
            if (!first) doc.addPage();
            first = false;
            doc.addImage(pageImage(canvas, p), "JPEG", p.x, p.top, p.w, p.hMm);
        }));
        return doc;
    }

    // Телефон: листы друг под другом в одну длинную страницу, между ними — серая полоса
    function stackCanvases(canvases) {
        if (canvases.length === 1) return canvases[0];
        const gap = 48;
        const out = document.createElement("canvas");
        out.width = Math.max(...canvases.map(c => c.width));
        out.height = canvases.reduce((s, c) => s + c.height, 0) + gap * (canvases.length - 1);
        const ctx = out.getContext("2d");
        ctx.fillStyle = "#d9dde3";
        ctx.fillRect(0, 0, out.width, out.height);
        let y = 0;
        canvases.forEach(c => { ctx.drawImage(c, 0, y); y += c.height + gap; });
        return out;
    }

    window.EPC_OFFER = { render, renderTotal, estimate, parsePayment, EST, toCanvas, pdfFromCanvas, pdfFromCanvases, stackCanvases, a4Pages, pageImage, phoneSize, A4, deliver, inTelegram, offerNumber, money, powerTitle, GROUPS };
})();
