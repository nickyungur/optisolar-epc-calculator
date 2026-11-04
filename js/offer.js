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
            outage: "La întreruperea rețelei", outageVal: "consumatorii de pe circuitul de rezervă (se stabilesc la vizita tehnică); acumulator {kwh} kWh",
            est: "ESTIMARE ANUALĂ", prod: "Producție estimată", prodVal: "≈ {kwh} kWh/an",
            cons: "Consum anual", save: "Economie estimată", saveVal: "≈ {sum} {cur}/an", payback: "Recuperarea investiției",
            estNote: "Calcul: {y} kWh/kWp pe an{tariff}. Estimare, nu reprezintă o garanție: producția reală depinde de orientare, umbrire și vreme.", estTariff: ", tarif {t} lei/kWh",
            estNoteNet: " Surplusul livrat în rețea — prin facturare netă, ≈ {credit} lei/kWh.",
            bessTech: "SISTEMUL DE STOCARE — DATE TEHNICE", bInst: "Capacitate instalată",
            bPcs: "Putere de încărcare / descărcare",
            bChem: "Tehnologie", bChemVal: "litiu-fier-fosfat (LFP)",
            bNote: "Eficiența ciclului, numărul de cicluri, garanția capacității, răcirea și certificatele — conform fișei tehnice a producătorului{fin}.",
            bNoteFin: ", anexată la oferta finală",
            terms: "CONDIȚII COMERCIALE", pay: "Plata",
            term: "Termene", termVal: "livrarea echipamentului — până la 30 de zile calendaristice de la avans și avizul de racordare; montaj și punere în funcțiune — până la 30 de zile de la livrare; admiterea în exploatare — până la 30 de zile lucrătoare",
            warr: "Garanții", wPv: "module fotovoltaice 10–15 ani", wInv: "invertoare 5–10 ani", wMount: "structura de montaj 10 ani", wBat: "acumulatoare — conform producătorului", wWorks: "lucrări de montaj 5 ani",
            wNote: " (echipamentul — conform fișei producătorului)",
            serv: "Mentenanță", servVal: "gratuită 36 de luni de la punerea în funcțiune; intervenție la defect — până la 48 de ore",
            roles: "CINE CE FACE", rUs: "OptiSolar",
            rUsVal: "livrarea echipamentelor noi, montajul, punerea în funcțiune și admiterea în exploatare; dosarul la operatorul de rețea: avizul de racordare, proiectul de execuție, declarația electricianului autorizat, actul de delimitare",
            rUsProsumer: "; contractul de prosumator cu furnizorul de energie",
            rClient: "Beneficiarul", rClientVal: "actele și împuternicirile pentru dosar; accesul la obiect; pregătirea locului de instalare; paza echipamentelor pe șantier până la recepția finală",
            totalWith: "Total: centrala + {x}", bessWord: "BESS",
            sharedPv: "Linia de racordare MT, sistemul SCADA și darea în exploatare MT sunt comune cu centrala fotovoltaică și sunt incluse în oferta acesteia.",
            payContract: "conform contractului",
            // ---- обложка D (2026-10-31): схема станции, цена, оценка на год, что входит ----
            scheme: "Cum funcționează sistemul",
            nPv: "Panouri fotovoltaice", nInv: "Invertor", nInvHyb: "Invertor hibrid", nBat: "Acumulator", nBess: "Stocare (BESS)",
            nSrc: "Sursa", nSrcVal: "Rețea", nSrcNote: "sau centrala fotovoltaică existentă",
            nEnd: {
                zero: ["Consum propriu", "Autoconsum", "fără livrare în rețea (Zero Export)"],
                netb: ["Consum și rețea", "Facturare netă", "surplusul — în rețea (prosumator)"],
                grid: ["Rețea", "Livrare în rețea", "conform avizului de racordare"],
                bess: ["Consum", "Consum propriu", ""]
            },
            nLimit: "limita în rețea {x} kW", nVariants: "variante: {n} — vezi prețul",
            cTotal: "Total cu TVA, la cheie", cTotalNoVat: "Total, la cheie", cWithVariant: " · centrala + varianta {n}", cVariant: " · varianta {n}",
            cNetVat: "{net} fără TVA · TVA {vat}", cEst: "Preț estimativ — se confirmă după vizita tehnică.", cFirm: "Preț ferm pe durata valabilității ofertei.",
            cPerKwp: "Preț pe 1 kWp{x}, {vat}", cPerKwh: "Preț pe 1 kWh, {vat}", cNet: "fără TVA", cGross: "cu TVA",
            cNote: "Plata — conform contractului. Livrare — până la 30 de zile, montaj și punere în funcțiune — până la 30 de zile de la livrare. Detaliat — pe paginile următoare.",
            cParts: "Lucrările comune (proiectare, transport, darea în exploatare) sunt incluse în fiecare componentă; la realizarea împreună se optimizează în oferta finală.",
            rTitle: "Rezultatul estimat pe an", rStoreTitle: "Sistemul de stocare", rProd: "Producție", rSave: "Economie", rPay: "Recuperarea investiției",
            rOut: "La pană de curent", rOutVal: "acumulator {kwh} kWh",
            incTitle: "Inclus în preț",
            inc: ["Echipamente noi, cu garanția producătorului", "Proiect de execuție și autorizații", "Montaj, punere în funcțiune și admitere în exploatare"],
            incGrid: "Dosarul la operatorul de rețea", incProsumer: " și contractul de prosumator",
            incServ: ["Garanție la lucrări 5 ani; mentenanță gratuită 36 de luni", "Intervenție la defect — până la 48 de ore"],
            ask: "Aveți întrebări? Sunați-ne"
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
            outage: "При отключении сети", outageVal: "потребители резервной линии (определяются на выезде); аккумулятор {kwh} кВт·ч",
            est: "ОЦЕНКА НА ГОД", prod: "Ориентировочная выработка", prodVal: "≈ {kwh} кВт·ч/год",
            cons: "Годовое потребление", save: "Экономия (оценка)", saveVal: "≈ {sum} {cur}/год", payback: "Окупаемость",
            estNote: "Расчёт: {y} кВт·ч/кВтп в год{tariff}. Оценка, а не гарантия: реальная выработка зависит от ориентации, тени и погоды.", estTariff: ", тариф {t} лей/кВт·ч",
            estNoteNet: " Излишки в сеть — по facturare netă, ≈ {credit} лей/кВт·ч.",
            bessTech: "НАКОПИТЕЛЬ — ТЕХНИЧЕСКИЕ ДАННЫЕ", bInst: "Установленная ёмкость",
            bPcs: "Мощность заряда / разряда",
            bChem: "Технология", bChemVal: "литий-железо-фосфат (LFP)",
            bNote: "КПД цикла, число циклов, гарантия ёмкости, охлаждение и сертификаты — по техпаспорту производителя{fin}.",
            bNoteFin: ", он прилагается к финальному предложению",
            terms: "КОММЕРЧЕСКИЕ УСЛОВИЯ", pay: "Оплата",
            term: "Сроки", termVal: "поставка оборудования — до 30 календарных дней после аванса и авиза на подключение; монтаж и пуск — до 30 дней после поставки; допуск в эксплуатацию — до 30 рабочих дней",
            warr: "Гарантии", wPv: "панели 10–15 лет", wInv: "инверторы 5–10 лет", wMount: "крепёж 10 лет", wBat: "аккумуляторы — по производителю", wWorks: "монтажные работы 5 лет",
            wNote: " (оборудование — по паспорту производителя)",
            serv: "Обслуживание", servVal: "бесплатно 36 месяцев после пуска; выезд на неисправность — до 48 часов",
            roles: "КТО ЗА ЧТО ОТВЕЧАЕТ", rUs: "OptiSolar",
            rUsVal: "поставка нового оборудования, монтаж, пуск и допуск в эксплуатацию; документы у оператора сети: авиз на подключение, рабочий проект, декларация аттестованного электрика, акт разграничения",
            rUsProsumer: "; договор просюмера с поставщиком энергии",
            rClient: "Клиент", rClientVal: "документы и доверенности для оформления; доступ на объект; подготовка места установки; охрана оборудования на объекте до окончательной приёмки",
            totalWith: "Итого: СЭС + {x}", bessWord: "BESS",
            sharedPv: "Линия СН, SCADA и сдача в эксплуатацию на СН — общие с солнечной станцией и входят в её предложение.",
            payContract: "по договору",
            scheme: "Как работает система",
            nPv: "Солнечные панели", nInv: "Инвертор", nInvHyb: "Гибридный инвертор", nBat: "Аккумулятор", nBess: "Накопитель (BESS)",
            nSrc: "Источник", nSrcVal: "Сеть", nSrcNote: "или действующая солнечная станция",
            nEnd: {
                zero: ["Своё потребление", "Самопотребление", "без выдачи в сеть (Zero Export)"],
                netb: ["Потребление и сеть", "Facturare netă", "излишки — в сеть (просюмер)"],
                grid: ["Сеть", "Выдача в сеть", "по авизу на подключение"],
                bess: ["Потребление", "Своё потребление", ""]
            },
            nLimit: "лимит выдачи {x} кВт", nVariants: "вариантов: {n} — см. цену",
            cTotal: "Итого с TVA, под ключ", cTotalNoVat: "Итого, под ключ", cWithVariant: " · СЭС + вариант {n}", cVariant: " · вариант {n}",
            cNetVat: "{net} без TVA · TVA {vat}", cEst: "Цена ориентировочная — уточним после выезда на объект.", cFirm: "Цена твёрдая на срок действия предложения.",
            cPerKwp: "Цена за 1 кВтп{x}, {vat}", cPerKwh: "Цена за 1 кВт·ч, {vat}", cNet: "без TVA", cGross: "с TVA",
            cNote: "Оплата — по договору. Поставка — до 30 дней, монтаж и пуск — до 30 дней после поставки. Подробно — на следующих страницах.",
            cParts: "Общие работы (проект, транспорт, сдача в эксплуатацию) входят в каждую часть; если строим вместе, они уменьшатся в финальном предложении.",
            rTitle: "Оценка на год", rStoreTitle: "Накопитель", rProd: "Выработка", rSave: "Экономия", rPay: "Окупаемость",
            rOut: "При отключении сети", rOutVal: "аккумулятор {kwh} кВт·ч",
            incTitle: "Входит в цену",
            inc: ["Новое оборудование с гарантией производителя", "Рабочий проект и разрешения", "Монтаж, пуск и допуск в эксплуатацию"],
            incGrid: "Документы у оператора сети", incProsumer: " и договор просюмера",
            incServ: ["Гарантия на работы 5 лет; бесплатное обслуживание 36 месяцев", "Выезд на неисправность — до 48 часов"],
            ask: "Есть вопросы? Звоните"
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
    // цель накопителя коротко — подпись последнего значка схемы у BESS без СЭС
    const GOAL_SHORT = {
        ro: { backup: "Rezervă", peak_shaving: "Peak shaving", arbitrage: "Arbitraj", self_consumption: "Autoconsum", zero_export: "Zero Export", hybrid: "Autoconsum și rezervă" },
        ru: { backup: "Резерв", peak_shaving: "Снижение пиков", arbitrage: "Арбитраж", self_consumption: "Самопотребление", zero_export: "Zero Export", hybrid: "Самопотребление и резерв" }
    };

    // Значки схемы на обложке — inline SVG с размерами (html2canvas рисует их картинкой)
    const ICONS = {
        pv: '<svg width="58" height="42" viewBox="0 0 58 42" aria-hidden="true"><rect x="2" y="13" width="44" height="27" fill="#2b3440"/><path d="M16.7 13v27M31.3 13v27M2 26.5h44" stroke="#fff" stroke-width="1.2"/><circle cx="48" cy="10" r="8" fill="#ffbd18"/></svg>',
        inv: '<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><rect x="5" y="3" width="32" height="36" rx="3" fill="#fff" stroke="#1f2328" stroke-width="2.2"/><path d="M12 21c3-8 6-8 9 0s6 8 9 0" fill="none" stroke="#1f2328" stroke-width="2.6" stroke-linecap="round"/></svg>',
        bat: '<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><rect x="16" y="1" width="10" height="4" fill="#1f2328"/><rect x="9" y="5" width="24" height="35" rx="2" fill="#fff" stroke="#1f2328" stroke-width="2.2"/><rect x="13" y="9" width="16" height="8" fill="#e3e6ea"/><rect x="13" y="20" width="16" height="8" fill="#ffbd18"/><rect x="13" y="31" width="16" height="6" fill="#ffbd18"/></svg>',
        home: '<svg width="46" height="42" viewBox="0 0 46 42" aria-hidden="true"><path d="M23 2L2 20h42z" fill="#1f2328"/><rect x="8" y="19" width="30" height="21" fill="#fff" stroke="#1f2328" stroke-width="2.2"/><rect x="19.5" y="27" width="7" height="13" fill="#ffbd18"/></svg>',
        biz: '<svg width="50" height="42" viewBox="0 0 50 42" aria-hidden="true"><path d="M3 40V19l11 7v-7l11 7v-7l11 7V5h9v35z" fill="#fff" stroke="#1f2328" stroke-width="2.2" stroke-linejoin="round"/><rect x="9" y="31" width="7" height="5" fill="#ffbd18"/><rect x="21" y="31" width="7" height="5" fill="#ffbd18"/><rect x="33" y="31" width="7" height="5" fill="#ffbd18"/></svg>',
        grid: '<svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"><path d="M21 2L12 40M21 2l9 38M9 11h24M11 20h20M14 11l13 9M28 11l-13 9M13 29h16M13 29l15 8M29 29l-15 8" fill="none" stroke="#1f2328" stroke-width="2.2" stroke-linecap="round"/></svg>'
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

    // Оплата по этапам: «50/50», «30/60/10» → [50, 50]; null — непонятно или в сумме не 100.
    // В КП этапов нет — «conform contractului» (решение 2026-10-31); поле — для записки КД.
    function parsePayment(s) {
        const parts = String(s || "").split(/[\/+;\s]+/).filter(Boolean).map(x => Number(x.replace("%", "").replace(",", ".")));
        if (!parts.length || parts.some(x => !(x > 0)) || Math.abs(parts.reduce((a, b) => a + b, 0) - 100) > 0.01) return null;
        return parts;
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

    // Режим СЭС: Zero Export, facturare netă (дом и до 200 кВт AC) или выдача по авизу; без СЭС — ""
    function stationMode(info, meta) {
        if (!(info.pvKwp > 0) || info.product === "bess") return "";
        const acKw = Number(info.inverterKw) || info.pvKwp;
        return meta.zeroExport ? "zero" : (info.segment === "home" || acKw <= EST.netLimitKw) ? "netb" : "grid";
    }

    // ---------- обложка (дизайн D, 2026-10-31): схема станции, цена, оценка на год, что входит ----------
    // Первая страница A4 — сводка по всем листам оффера; таблица и условия — со второй.
    // parts: [{ info, result, variant }]; x: { t, lang, ed, k, cur, final, blocks, head, title, meta }
    function coverHtml(parts, meta, x) {
        const { t, lang, ed, k, cur, final } = x;
        const m0 = v => `${qtyFmt(Math.round(v / k))} ${cur}`;
        const nm = i => lang === "ru" ? i.nameRu || i.name : i.name;
        const eqBook = (window.RATEBOOK && window.RATEBOOK.equipment) || {};
        const eqOf = i => String(i.rateId || "").startsWith("eq:") ? eqBook[i.rateId.slice(3)] : null;
        const live = p => p.result.items.filter(i => Math.abs(i.totalSell) > 0.004);
        const val = p => ({ net: p.result.commercialPrice, vat: p.result.vatAmount, gross: p.result.priceWithVat });
        const add = (a, b) => ({ net: a.net + b.net, vat: a.vat + b.vat, gross: a.gross + b.gross });
        const pv = parts.find(p => p.info.pvKwp > 0 && p.info.product !== "bess");
        const bess = parts.filter(p => p.info.bessKwh > 0 && p.info.product !== "pv");
        const home = (pv || parts[0]).info.segment === "home";
        const vatOn = (pv || parts[0]).result.vatEnabled;
        const modeKey = pv ? stationMode(pv.info, meta) : "";

        // схема: панели → инвертор → накопитель → потребление и сеть (подпись — по режиму станции)
        const node = (icon, label, value, note) => `
      <div class="offer-scheme-node">
        <div class="offer-scheme-icon">${ICONS[icon]}</div>
        <span${ed}>${esc(label)}</span><strong${ed}>${esc(value)}</strong>${note ? `<small${ed}>${esc(note)}</small>` : ""}
      </div>`;
        // модели одного бренда — через «+»: «Huawei 6 × SUN2000-150KTL-MG0 + SUN2000-50KTL-M3»
        const models = (its, kind) => {
            const byBrand = {};
            its.forEach(i => {
                const e = eqOf(i);
                if (e && e.kind === kind) (byBrand[e.brand] = byBrand[e.brand] || []).push(`${Number(i.quantity) > 1 ? qtyFmt(i.quantity) + " × " : ""}${e.model}`);
            });
            return Object.keys(byBrand).map(b => `${b} ${byBrand[b].join(" + ")}`).join("; ");
        };
        const nodes = [];
        if (pv) {
            const its = live(pv);
            const panel = its.find(i => i.rateId === "pv_module_wp") || its.find(i => /^(panou|панель)/i.test(nm(i)));
            const panelName = panel ? nm(panel).replace(/^(Panou fotovoltaic|Панель PV)\s*/i, "") : "";
            const kwp = pv.info.pvKwp >= 1000 ? `${qtyFmt(pv.info.pvKwp / 1000)} MWp` : `${qtyFmt(pv.info.pvKwp)} kWp`;
            nodes.push(node("pv", t.nPv, kwp, panelName && pv.info.panels ? `${qtyFmt(pv.info.panels)} × ${panelName}` : panelName));
            const inv = its.filter(i => { const e = eqOf(i); return e ? e.kind === "inv" : /^inv_/.test(i.rateId || ""); });
            const hybrid = inv.some(i => { const e = eqOf(i); return e ? e.fam !== "grid" : i.rateId === "inv_hybrid"; });
            const invKw = Number(meta.acKw) || Number(pv.info.inverterKw) || 0;
            if (inv.length || invKw) nodes.push(node("inv", hybrid ? t.nInvHyb : t.nInv, invKw ? `${qtyFmt(invKw)} kW` : "", models(inv, "inv") || (final ? "" : t.noModel)));
        } else {
            nodes.push(node("grid", t.nSrc, t.nSrcVal, t.nSrcNote));
        }
        const b0 = bess[0];
        // ёмкость в оффере — только паспортная (установленная): полезная (DoD) и время на номинале вызывают вопросы клиента (2026-11-03)
        const bKwh = b0 ? Number(b0.info.bessKwh) || 0 : 0;
        if (b0) {
            const note = bess.length > 1 ? t.nVariants.replace("{n}", bess.length)
                : b0.info.segment === "home" ? models(live(b0), "bat") || (final ? "LiFePO4" : t.noModel)
                : "LFP";
            nodes.push(node("bat", b0.info.segment === "home" ? t.nBat : t.nBess, bessSize(b0.info), note));
        }
        const end = t.nEnd[modeKey || "bess"];
        const limit = meta.exportLimitKw > 0 ? t.nLimit.replace("{x}", qtyFmt(meta.exportLimitKw)) : "";
        nodes.push(modeKey
            ? node(home ? "home" : "biz", end[0], end[1], modeKey === "grid" && limit ? limit : end[2])
            : node(home ? "home" : "biz", end[0], (meta.goal && GOAL_SHORT[lang][meta.goal]) || end[1], limit));

        // цена: итог крупно, части (блоки A/B или листы с вариантами BESS), цена за кВтп
        let hero, heroSuffix = "", rows;
        if (parts.length === 1) {
            hero = val(parts[0]);
            rows = (x.blocks || []).map(b => ({ label: `${b.letter} · ${b.name}${b.title ? " " + b.title : ""}`, v: b.gross }));
        } else {
            const label = p => p === pv
                ? `${t.blockPv} ${powerTitle({ ...p.info, product: "pv" }, meta, lang)}`
                : p.variant ? `BESS ${bessSize(p.info)} · ${t.variant.replace("{n}", p.variant)}` : `${t.nBess} ${bessSize(p.info)}`;
            rows = parts.map(p => ({ label: label(p), v: val(p).gross }));
            if (pv) bess.forEach(b => rows.push({ label: t.totalWith.replace("{x}", b.variant ? t.variant.replace("{n}", b.variant) : t.bessWord), v: add(val(pv), val(b)).gross, total: true }));
            hero = pv && b0 ? add(val(pv), val(b0)) : val(parts[0]);
            if (bess.length > 1) heroSuffix = (pv ? t.cWithVariant : t.cVariant).replace("{n}", b0.variant);
        }
        // дому — цена за кВтп с TVA, бизнесу — без TVA; при нескольких блоках — блок СЭС
        const perGross = vatOn && home;
        const perVat = perGross ? t.cGross : t.cNet;
        if (pv) {
            const a = parts.length === 1 && x.blocks && x.blocks.find(b => b.key === "pv");
            const v = a || val(pv);
            rows.push({ label: t.cPerKwp.replace("{x}", a ? ` (${a.letter})` : "").replace("{vat}", perVat), text: m0((perGross ? v.gross : v.net) / pv.info.pvKwp), muted: true });
        } else if (b0) {
            const v = val(b0);
            rows.push({ label: t.cPerKwh.replace("{vat}", perVat), text: m0((perGross ? v.gross : v.net) / b0.info.bessKwh), muted: true });
        }
        const price = `
      <div class="offer-cover-price">
        <div class="offer-cover-label"${ed}>${esc((vatOn ? t.cTotal : t.cTotalNoVat) + heroSuffix)}</div>
        <div class="offer-cover-total">${esc(m0(vatOn ? hero.gross : hero.net))}</div>
        <div class="offer-cover-sub"${ed}>${esc((vatOn ? t.cNetVat.replace("{net}", m0(hero.net)).replace("{vat}", m0(hero.vat)) + " · " : "") + (final ? t.cFirm : t.cEst))}</div>
        <div class="offer-cover-rows">${rows.map(r => `
          <div class="${r.total ? "is-total" : r.muted ? "is-muted" : ""}"><span${ed}>${esc(r.label)}</span><strong>${esc(r.text || m0(r.v))}</strong></div>`).join("")}
        </div>
        <p class="offer-cover-note"${ed}>${esc(t.cNote + (parts.length > 1 ? " " + t.cParts : ""))}</p>
      </div>`;

        // оценка на год (как в карточке «Estimare anuală») или данные накопителя без СЭС
        const est = pv ? estimate(pv.info, pv.result, meta) : null;
        const tile = (label, value) => `<div class="offer-cover-tile"><span${ed}>${esc(label)}</span><strong${ed}>${esc(value)}</strong></div>`;
        const tiles = [];
        if (est) {
            tiles.push(tile(t.rProd, t.prodVal.replace("{kwh}", qtyFmt(Math.round(est.annual / 100) * 100))));
            if (est.cons) tiles.push(tile(t.rSave, t.saveVal.replace("{sum}", qtyFmt(Math.round(est.savings / k / 10) * 10)).replace("{cur}", cur)));
            if (est.payback) tiles.push(tile(t.rPay, "≈ " + yearsFmt(est.payback, lang)));
        }
        if (b0 && bKwh > 0) {
            if (b0.info.segment === "home") tiles.push(tile(t.rOut, t.rOutVal.replace("{kwh}", qtyFmt(bKwh))));
            else if (est || !(b0.info.bessKw > 0)) tiles.push(tile(t.bInst, `${qtyFmt(bKwh)} kWh`));
            else tiles.push(tile(t.bInst, `${qtyFmt(bKwh)} kWh`), tile(t.bPcs, `${qtyFmt(b0.info.bessKw)} kW`));
        }
        const num1 = v => String(v).replace(".", ",");
        const resNote = est
            ? t.estNote.replace("{y}", qtyFmt(est.perKwp)).replace("{tariff}", est.cons ? t.estTariff.replace("{t}", num1(est.tariff)) : "") + (est.cons && est.netb ? t.estNoteNet.replace("{credit}", num1(EST.credit)) : "")
            : t.bNote.replace("{fin}", final ? "" : t.bNoteFin);
        const results = !tiles.length ? "" : `
      <div class="offer-cover-result">
        <h3${ed}>${esc(est ? t.rTitle : t.rStoreTitle)}</h3>
        <div class="offer-cover-tiles">${tiles.join("")}</div>
        <p class="offer-cover-note"${ed}>${esc(resNote)}</p>
      </div>`;

        // что входит — коротко по договору NEBRECA; подробно — «Cine ce face» на следующих страницах.
        // «Nu este inclus» не печатаем: отпугивает клиента (решение 2026-11-02), границы работ — в договоре
        const inc = [...t.inc, t.incGrid + (modeKey === "netb" ? t.incProsumer : ""), ...t.incServ];

        // offer-info-line в конце — точка разреза toCanvas: на A4 обложка занимает ровно лист, таблица — со второго
        return `
  <section class="offer-cover">
    ${x.head}
    ${x.title}
    ${x.meta}
    <section class="offer-scheme">
      <h3${ed}>${esc(t.scheme)}</h3>
      <div class="offer-scheme-row">${nodes.join('<div class="offer-scheme-arrow">→</div>')}</div>
    </section>
    <div class="offer-cover-grid offer-info-grid">${price}${results}</div>
    <div class="offer-cover-list offer-info-grid">
      <h3${ed}>${esc(t.incTitle)}</h3>
      <ul>${inc.map(s => `<li><b>√</b><span${ed}>${esc(s)}</span></li>`).join("")}</ul>
    </div>
    <div class="offer-cover-contact">
      <span${ed}>${esc(t.ask)}</span>
      <strong${ed}>${esc([meta.manager || "Nikita Ungureanu", meta.managerRole || "Project Manager", meta.managerPhone || "—", meta.managerEmail || COMPANY_EMAIL].join(" · "))}</strong>
    </div>
    <div class="offer-cover-end offer-info-line"></div>
  </section>`;
    }

    // Шапка, номер и подвал листа оффера; на обложке — без водяного знака
    function headHtml(t, ed, logo, watermark = true) {
        return `${watermark ? `
  <img class="offer-watermark" src="${logo}" alt="" aria-hidden="true">` : ""}
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
        // × у строки на экране (2026-11-04): убирает её позиции из расчёта, как × в шаге ③; в PDF и печать не идёт
        const ref = i => i.extraId ? "x:" + i.extraId : i._key ? "k:" + i._key : "";
        const delBtn = its => {
            const keys = its.map(ref);
            if (!opts.editable || !keys.length || keys.some(k => !k)) return "";
            // ключи — JSON: в ключе генератора уже есть «|» (ставка|название)
            return `<button type="button" class="offer-row-del" data-del="${esc(JSON.stringify(keys))}" data-sheet="${esc(opts.sheet || "main")}" title="Убрать строку из расчёта" aria-label="Убрать строку из расчёта">×</button>`;
        };
        const row = (name, qty, unit, price, net, vatLbl, vat, gross, spec, its) => {
            nr += 1;
            const cells = [
                ["c-name offer-description-cell", esc(name) + (spec ? `<small class="offer-item-spec">${esc(spec)}</small>` : "")],
                ["c-qty", esc(qty)], ["c-unit", esc(unit)], ["c-price", esc(price)],
                ["c-net", esc(net)], ["c-vatp", esc(vatLbl)], ["c-vat", esc(vat)], ["c-total", esc(gross)]
            ];
            return `<tr><td class="c-n">${esc(nr)}${delBtn(its || [])}</td>${cells.map(([cls, v]) => `<td${edc(cls)}>${v}</td>`).join("")}</tr>`;
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
                m(i.sell), m(i.totalSell), vatLbl(i.vatPct || 0, false), m(i.vatAmount), m(i.totalWithVat), itemSpec(i), [i]
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
                    html += row(g[lang], "—", unitLabel("lot", lang), "—", m(net), vatLbl(net ? vat / net * 100 : 0, k === 0), m(vat), m(gross), groupSpec(part), part);
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
        // итог блока A / B — одной строкой; жёлтый — только у общего итога (дизайн 2026-10-31)
        const blockTotal = (net, vat, gross, label) => `
  <div class="offer-summary-wrap offer-block-total">
    <span${ed}>${esc(label)}</span>
    <span>${esc(t.subtotal)} <b>${m(net)}</b></span>
    ${vatOn ? `<span>${esc(t.vat)} <b>${m(vat)}</b></span>` : ""}
    <strong>${m(gross)} ${cur}</strong>
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
    ${blockTotal(net, vat, gross, (vatOn ? t.blockTotal : t.blockTotalNoVat).replace("{x}", b.letter))}
  </section>`;
            }).join("") + summaryBox(allNet, result.vatAmount, allGross,
                (vatOn ? t.grandTotal : t.grandTotalNoVat).replace("{x}", letters), finalPer, "offer-summary-all");
        } else {
            const per = info.product === "bess" ? bessPer(result.commercialPrice, result.priceWithVat)
                : (info.pvKwp > 0 ? pvPer(result.commercialPrice, result.priceWithVat) : "");
            tablesHtml = tableHtml(body + optRows()) + summaryBox(result.commercialPrice, result.vatAmount, result.priceWithVat, vatOn ? t.total : t.totalNoVat, per);
        }

        // ---- карточки рядом с клиентом: режим и цель, оценка на год (СЭС), данные накопителя (бизнес) ----
        const modeKey = stationMode(info, meta);
        const mode = modeKey ? t.modes[modeKey] : "";
        const goal = hasBat && meta.goal ? (GOALS[lang][meta.goal] || "") : "";
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
      ${info.bessKw > 0 ? line(t.bPcs, `${qtyFmt(info.bessKw)} kW`) : ""}
      ${line(t.bChem, t.bChemVal)}
      ${goal ? line(t.goal, goal) : ""}
      <p class="offer-card-note"${ed}>${esc(t.bNote.replace("{fin}", final ? "" : t.bNoteFin))}</p>
    </section>`;
        const cover = Array.isArray(opts.cover) && opts.cover.length ? opts.cover : null;
        const sideCards = (cover ? "" : estCard) + bessCard;

        // ---- условия (решение 2) и кто за что отвечает (4.5) ----
        const warr = [hasPv && t.wPv, (hasPv || Number(info.inverterKw) > 0) && t.wInv, hasPv && t.wMount, hasBat && t.wBat, t.wWorks].filter(Boolean).join(", ");
        const termsHtml = `
  <section class="offer-info-card offer-terms-card">
    <h3><span>§</span> ${esc(t.terms)}</h3>
    ${line(t.pay, t.payContract)}
    ${line(t.term, t.termVal)}
    ${line(t.warr, warr.charAt(0).toUpperCase() + warr.slice(1) + t.wNote)}
    ${line(t.serv, t.servVal)}
  </section>
  <section class="offer-info-card offer-terms-card">
    <h3><span>⇄</span> ${esc(t.roles)}</h3>
    ${line(t.rUs, t.rUsVal + (modeKey === "netb" ? t.rUsProsumer : ""))}
    ${line(t.rClient, t.rClientVal)}
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
        // на обложке под заголовком — клиент; на остальных листах — как раньше
        const forWhom = [meta.client, meta.location].filter(Boolean).join(", ");
        const coverPv = cover && cover.length > 1 ? cover.find(p => p.info.product === "pv") : null;
        const coverBess = cover && cover.length > 1 ? cover.filter(p => p.info.product !== "pv") : [];
        const heading = cover && cover.length > 1
            ? [coverPv ? powerTitle({ ...coverPv.info, product: "pv" }, meta, lang) : "",
                coverBess.length > 1 ? "BESS " + coverBess.map(b => qtyFmt(b.info.bessKwh)).join(" / ") + " kWh" : coverBess.map(b => "BESS " + bessSize(b.info)).join("")].filter(Boolean).join(" + ")
            : powerTitle(info, meta, lang) + variantTitle;
        const kind = coverPv && coverBess.length ? stations.pv_bess : station;
        const title = `
  <section class="offer-title-block">
    <div class="offer-kicker">${esc(final ? t.kicker : t.kickerPrelim)}</div>
    <h1${ed}>${esc(heading)}</h1>
    <p${ed}>${esc(kind)}${cover && forWhom ? " · " + esc(forWhom) : " — " + esc(t.sub)}</p>
    <div class="offer-yellow-rule"></div>
  </section>`;
        const top = cover
            ? coverHtml(cover, meta, {
                t, lang, ed, k, cur, final, head: headHtml(t, ed, logo, false), title, meta: metaHtml(t, edc, number, now, valid, days),
                blocks: blocks.map(b => ({ key: b.key, letter: b.letter, name: b.name, title: b.title, net: sum(b.its, "totalSell"), gross: sum(b.its, "totalWithVat") }))
            })
            : headHtml(t, ed, logo) + title + metaHtml(t, edc, number, now, valid, days);

        return `
<article class="offer-document" lang="${lang}">
  ${top}
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
      ${hasBat && info.segment === "home" && info.bessKwh > 0 ? line(t.outage, t.outageVal.replace("{kwh}", qtyFmt(info.bessKwh))) : ""}
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
      ${cover ? "" : contactHtml(t, line, meta)}
    </div>
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

    window.EPC_OFFER = { render, estimate, parsePayment, EST, toCanvas, pdfFromCanvas, pdfFromCanvases, stackCanvases, a4Pages, pageImage, phoneSize, A4, deliver, inTelegram, offerNumber, money, powerTitle, GROUPS };
})();
