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
        { key: "materials", cats: ["materials"], ro: "Materiale (toate materialele incluse)", ru: "Материалы (все материалы включены)" },
        // монтаж — отдельной строкой: он без TVA, стройработы — с TVA (правило 2026-10-19)
        { key: "civil", cats: ["civil"], ro: "Lucrări de construcție", ru: "Строительные работы" },
        { key: "works", cats: ["electrical"], ro: "Lucrări de montaj", ru: "Монтажные работы" },
        { key: "logistics", cats: ["logistics"], ro: "Transport, livrare și logistică", ru: "Транспорт, доставка и логистика" },
        { key: "commissioning", cats: ["commissioning"], ro: "Punere în funcțiune", ru: "Пусконаладка" },
        { key: "grid", cats: ["grid"], ro: "Darea în exploatare și autorizări", ru: "Сдача в эксплуатацию и разрешения" }
    ];

    const T = {
        ro: {
            kicker: "OFERTĂ COMERCIALĂ", sub: "pentru implementarea proiectului energetic", variant: "Varianta {n}",
            no: "Nr. ofertă", date: "Data emiterii", valid: "Valabilă până la", days: "zile calendaristice",
            client: "CLIENT ȘI OBIECT", name: "Nume", place: "Locație", type: "Tip proiect", voltage: "Nivel de racordare",
            roofType: "Forma acoperișului", roofMaterial: "Materialul acoperișului",
            roofTypes: { flat: "Plat", mono: "Într-o apă", gable: "În două ape", hip: "În patru ape", tent: "Piramidal", mansard: "Mansardat", arched: "Arcuit", combined: "Combinat", other: "Alt tip" },
            roofMaterials: { metal_tile: "Țiglă metalică", sandwich: "Panou sandwich", profiled_sheet: "Tablă cutată", standing_seam: "Tablă fălțuită", ceramic_tile: "Țiglă ceramică", concrete_tile: "Țiglă din beton", slate: "Ardezie", bitumen_shingle: "Șindrilă bituminoasă", membrane: "Membrană / carton bitumat", concrete_slab: "Placă de beton", other: "Alt material" },
            cols: ["Nr.", "Denumire", "Cantitate", "Unitate", "Preț unitar", "Valoare", "TVA %", "TVA", "Total cu TVA"],
            subtotal: "Total fără TVA", vat: "TVA totală", vatNa: "TVA (neaplicabilă)", total: "Total cu TVA", totalNoVat: "Total",
            optional: "Opțional", battery: "Acumulator", powerIncrease: "Serviciu de majorare a puterii", pricePerKw: "Preț per kW cu TVA",
            pricePerKwNet: "Preț per kW fără TVA", pricePerKwh: "Preț per kWh cu TVA", pricePerKwhNet: "Preț per kWh fără TVA",
            pricePerKwPv: "Preț per kW centrală ({x}) cu TVA", pricePerKwPvNet: "Preț per kW centrală ({x}) fără TVA",
            pricePerKwAll: "Preț per kW total ({x}) cu TVA", pricePerKwAllNet: "Preț per kW total ({x}) fără TVA",
            blockPv: "Centrală fotovoltaică", blockBess: "Sistem de stocare a energiei (BESS)", blockBat: "Acumulator (stocarea energiei)", blockCommon: "Lucrări comune",
            blockTotal: "Total {x} cu TVA", blockTotalNoVat: "Total {x}", grandTotal: "Total {x} cu TVA", grandTotalNoVat: "Total {x}",
            note: "NOTĂ",
            n1: "Oferta comercială este valabilă timp de {days} zile calendaristice de la data emiterii.",
            n2: "Prețurile sunt exprimate în {cur}, {vat}.", vatIn: "cu TVA inclus", vatOut: "fără TVA", nMontaj: "Lucrările de montaj se facturează fără TVA.",
            nFx: "Curs BNM: 1 EUR = {fx} MDL ({date}). Plata se efectuează în MDL la cursul oficial BNM din ziua plății.",
            nFxManual: "Curs: 1 EUR = {fx} MDL ({date}). Plata se efectuează în MDL la cursul oficial BNM din ziua plății.",
            refs: "PROIECTE REALIZATE DE OPTISOLAR",
            n3: "Oferta include echipamentele, materialele și serviciile specificate în tabel.",
            n4: "Preț estimativ: valoarea exactă se confirmă după vizita tehnică la obiect.",
            n5: "Condițiile de plată, livrare și garanție se stabilesc separat în contract.",
            n6: "Oferta poate fi modificată în funcție de condițiile proiectului și cerințele finale.",
            resp: "RESPONSABIL OFERTĂ", role: "Funcție", phone: "Telefon", email: "Email",
            regards: "Cu stimă,", team: "Echipa OPTISOLAR",
            city: "Chișinău, Republica Moldova",
            stations: {
                pv: "Centrală fotovoltaică", pv_bess: "Centrală fotovoltaică cu sistem de stocare (BESS)", bess: "Sistem de stocare a energiei (BESS)"
            },
        },
        ru: {
            kicker: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", sub: "на реализацию энергетического проекта", variant: "Вариант {n}",
            no: "№ предложения", date: "Дата", valid: "Действует до", days: "календарных дней",
            client: "КЛИЕНТ И ОБЪЕКТ", name: "Название", place: "Место", type: "Тип проекта", voltage: "Напряжение подключения",
            roofType: "Форма крыши", roofMaterial: "Материал кровли",
            roofTypes: { flat: "Плоская", mono: "Односкатная", gable: "Двускатная", hip: "Вальмовая", tent: "Шатровая", mansard: "Мансардная", arched: "Арочная", combined: "Комбинированная", other: "Другая" },
            roofMaterials: { metal_tile: "Металлочерепица", sandwich: "Сэндвич-панель", profiled_sheet: "Профнастил", standing_seam: "Фальцевая кровля", ceramic_tile: "Керамическая черепица", concrete_tile: "Цементно-песчаная черепица", slate: "Шифер", bitumen_shingle: "Битумная черепица", membrane: "Мембрана / рубероид", concrete_slab: "Бетонная плита", other: "Другой материал" },
            cols: ["№", "Наименование", "Кол-во", "Ед.", "Цена за ед.", "Сумма", "TVA %", "TVA", "Итого с TVA"],
            subtotal: "Итого без TVA", vat: "TVA", vatNa: "TVA (не применяется)", total: "Итого с TVA", totalNoVat: "Итого",
            optional: "Опционально", battery: "Аккумулятор", powerIncrease: "Услуга по увеличению мощности", pricePerKw: "Цена за киловатт с TVA",
            pricePerKwNet: "Цена за киловатт без TVA", pricePerKwh: "Цена за кВт·ч с TVA", pricePerKwhNet: "Цена за кВт·ч без TVA",
            pricePerKwPv: "Цена за кВт СЭС ({x}) с TVA", pricePerKwPvNet: "Цена за кВт СЭС ({x}) без TVA",
            pricePerKwAll: "Цена за кВт всего ({x}) с TVA", pricePerKwAllNet: "Цена за кВт всего ({x}) без TVA",
            blockPv: "Солнечная электростанция", blockBess: "Система накопления энергии (BESS)", blockBat: "Аккумулятор (накопление энергии)", blockCommon: "Общие работы",
            blockTotal: "Итого {x} с TVA", blockTotalNoVat: "Итого {x}", grandTotal: "Итого {x} с TVA", grandTotalNoVat: "Итого {x}",
            note: "ПРИМЕЧАНИЕ",
            n1: "Предложение действует {days} календарных дней с даты выдачи.",
            n2: "Цены указаны в {cur}, {vat}.", vatIn: "с TVA", vatOut: "без TVA", nMontaj: "Монтажные работы — без TVA.",
            nFx: "Курс BNM: 1 EUR = {fx} MDL ({date}). Оплата в MDL по официальному курсу BNM на день оплаты.",
            nFxManual: "Курс: 1 EUR = {fx} MDL ({date}). Оплата в MDL по официальному курсу BNM на день оплаты.",
            refs: "РЕАЛИЗОВАННЫЕ ОБЪЕКТЫ OPTISOLAR",
            n3: "В предложение входят оборудование, материалы и работы, указанные в таблице.",
            n4: "Цена ориентировочная: точная сумма — после технического выезда на объект.",
            n5: "Условия оплаты, поставки и гарантии — в договоре.",
            n6: "Предложение может измениться в зависимости от условий проекта и окончательных требований.",
            resp: "ОТВЕТСТВЕННЫЙ", role: "Должность", phone: "Телефон", email: "Email",
            regards: "С уважением,", team: "Команда OPTISOLAR",
            city: "Кишинёв, Республика Молдова",
            stations: {
                pv: "Солнечная электростанция", pv_bess: "Солнечная станция с накопителем (BESS)", bess: "Система накопления энергии (BESS)"
            },
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

    function powerTitle(info, meta = {}) {
        const parts = [];
        if (info.pvKwp > 0 && info.product !== "bess") {
            const dc = info.pvKwp >= 1000 ? `${qtyFmt(info.pvKwp / 1000)} MWp` : `${qtyFmt(info.pvKwp)} kWp`;
            // Инвертор задан вручную — в заголовке DC и AC, как в КП конкурентов
            parts.push(meta.acKw > 0 && info.product === "pv" ? `${dc} DC / ${qtyFmt(meta.acKw)} kW AC` : dc);
        }
        if (info.bessKwh > 0 && info.product !== "pv") {
            const kw = info.bessKw >= 1000 ? `${qtyFmt(info.bessKw / 1000)} MW` : `${qtyFmt(info.bessKw)} kW`;
            const kwh = info.bessKwh >= 1000 ? `${qtyFmt(info.bessKwh / 1000)} MWh` : `${qtyFmt(info.bessKwh)} kWh`;
            parts.push(`BESS ${kw} / ${kwh}`);
        }
        return parts.join(" + ") || "Proiect energetic";
    }

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
        const ed = opts.editable ? ' contenteditable="true" class="offer-editable"' : "";
        const edc = cls => opts.editable ? ` contenteditable="true" class="offer-editable ${cls}"` : ` class="${cls}"`;

        const station = t.stations[info.product] || t.stations.pv_bess;
        const voltLabel = info.voltage === "0.4" ? "0,4 kV" : `${info.voltage} kV`;

        const roofType = meta.roofType ? (t.roofTypes[meta.roofType] || meta.roofType) : "";
        const roofMaterial = meta.roofMaterial ? (t.roofMaterials[meta.roofMaterial] || meta.roofMaterial) : "";
        const line = (label, value) => `<div class="offer-info-line"><span>${esc(label)}</span><strong${ed}>${esc(value)}</strong></div>`;

        // Таблица: оборудование построчно, остальное группами
        let nr = 0;
        const row = (name, qty, unit, price, net, vatPct, vat, gross) => {
            nr += 1;
            const cells = [
                ["c-n", String(nr)], ["c-name offer-description-cell", name], ["c-qty", qty], ["c-unit", unit], ["c-price", price],
                ["c-net", net], ["c-vatp", `${qtyFmt(vatPct)}%`], ["c-vat", vat], ["c-total", gross]
            ];
            return `<tr>${cells.map(([cls, v]) => `<td${edc(cls)}>${esc(v)}</td>`).join("")}</tr>`;
        };
        const live = result.items.filter(i => Math.abs(i.totalSell) > 0.004);
        const sum = (its, f) => its.reduce((s, i) => s + i[f], 0);
        const tableBody = its => {
            let html = its.filter(i => i.category === "main-equipment").map(i => row(
                lang === "ru" ? i.nameRu || i.name : i.name,
                qtyFmt(i.quantity), unitLabel(i.unit || "buc", lang),
                m(i.sell), m(i.totalSell), i.vatPct || 0, m(i.vatAmount), m(i.totalWithVat)
            )).join("");
            GROUPS.forEach(g => {
                const gi = its.filter(i => g.cats.includes(i.category));
                if (!gi.length) return;
                const net = sum(gi, "totalSell"), vat = sum(gi, "vatAmount"), gross = sum(gi, "totalWithVat");
                html += row(g[lang], "—", unitLabel("lot", lang), "—", m(net), net ? vat / net * 100 : 0, m(vat), m(gross));
            });
            return html;
        };
        // Цена за единицу мощности — без TVA и с TVA
        const perLines = (net, gross, label, labelNet, per, unit) => !(per > 0) ? "" :
            `<div class="offer-summary-perkw"><span>${esc(labelNet)}</span><strong>${m(net / per)} ${cur}/${unit}</strong></div>` +
            (vatOn ? `<div class="offer-summary-perkw"><span>${esc(label)}</span><strong>${m(gross / per)} ${cur}/${unit}</strong></div>` : "");
        const pvPer = (net, gross) => perLines(net, gross, t.pricePerKw, t.pricePerKwNet, info.pvKwp, "kWp");
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
            { key: "pv", name: t.blockPv, title: info.pvKwp > 0 ? powerTitle({ ...info, product: "pv" }, meta) : "", its: live.filter(i => i.section === "pv") },
            { key: "bess", name: info.segment === "home" ? t.blockBat : t.blockBess, title: info.bessKwh > 0 ? powerTitle({ ...info, product: "bess" }, meta).replace(/^BESS /, "") : "", its: live.filter(i => i.section === "bess") },
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
            return row(`${t.optional}: ${label}`, "—", unitLabel("lot", lang), "—", m(net), net ? vat / net * 100 : 0, m(vat), m(gross));
        };
        // функция, а не строка: номера строк идут по порядку таблицы
        // модель батареи из прайса — в названии опции: «Acumulator — Dyness PowerBox G2 10 kWh»
        const batModels = batteryItems
            .filter(i => /^eq:/.test(i.rateId || "") && /^(Acumulator|Modul baterie|Аккумулятор|Батарейный модуль)/.test(lang === "ru" ? i.nameRu || i.name : i.name))
            .map(i => `${Number(i.quantity) > 1 ? qtyFmt(i.quantity) + " × " : ""}${(lang === "ru" ? i.nameRu || i.name : i.name).replace(/\s*\(.*\)\s*$/, "").replace(/^(Acumulator|Modul baterie( HV)?|Аккумулятор|Батарейный модуль( HV)?)\s+/, "")}`);
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

        const notes = [
            t.n1.replace("{days}", days),
            t.n2.replace("{cur}", cur).replace("{vat}", vatOn ? t.vatIn : t.vatOut)
                + (vatOn && live.some(i => i.category === "electrical" && !(Number(i.vatPct) > 0)) ? " " + t.nMontaj : "") + (eur ? " " + (opts.fxSrc === "manual" ? t.nFxManual : t.nFx).replace("{fx}", String(opts.fx).replace(".", ",")).replace("{date}", opts.fxDate || "") : ""),
            t.n3, t.n4, t.n5, t.n6
        ];
        const manager = meta.manager || "Nikita Ungureanu";
        const role = meta.managerRole || "Project Manager";
        const logo = esc(opts.logo || "");

        return `
<article class="offer-document" lang="${lang}">
  <img class="offer-watermark" src="${logo}" alt="" aria-hidden="true">
  <header class="offer-brand-header">
    <div class="offer-brand-logo-wrap"><img class="offer-brand-logo" src="${logo}" alt="OPTISOLAR renewed energy"></div>
    <div class="offer-company-details">
      <div${ed}><span class="contact-symbol">⌖</span> ${esc(t.city)}</div>
      <div${ed}><span class="contact-symbol">✉</span> Optisolar.Moldova@gmail.com</div>
      <div${ed}><span class="contact-symbol">◎</span> www.optisolar.md</div>
    </div>
  </header>
  <section class="offer-title-block">
    <div class="offer-kicker">${esc(t.kicker)}</div>
    <h1${ed}>${esc(powerTitle(info, meta) + variantTitle)}</h1>
    <p${ed}>${esc(station)} — ${esc(t.sub)}</p>
    <div class="offer-yellow-rule"></div>
  </section>
  <div class="offer-document-meta">
    <div><span>${esc(t.no)}</span><strong${ed}>${esc(number)}</strong></div>
    <div><span>${esc(t.date)}</span><strong${ed}>${dateFmt(now)}</strong></div>
    <div><span>${esc(t.valid)}</span><strong${ed}>${dateFmt(valid)}</strong><small>(${days} ${esc(t.days)})</small></div>
  </div>
  <div class="offer-info-grid">
    <section class="offer-info-card">
      <h3><span>▦</span> ${esc(t.client)}</h3>
      ${line(t.name, meta.client || "—")}
      ${line(t.place, meta.location || "—")}
      ${line(t.type, station)}
      ${line(t.voltage, voltLabel)}
      ${roofType ? line(t.roofType, roofType) : ""}
      ${roofMaterial ? line(t.roofMaterial, roofMaterial) : ""}
    </section>
  </div>
  ${tablesHtml}
  <div class="offer-bottom-grid">
    <div class="offer-bottom-left">
      <section class="offer-note-card">
        <h3><span>▤</span> ${esc(t.note)}</h3>
        <ol>${notes.map(n => `<li${ed}>${esc(n)}</li>`).join("")}</ol>
      </section>
      <section class="offer-contact-card">
        <h3><span>♙</span> ${esc(t.resp)}</h3>
        ${line(t.name, manager)}
        ${line(t.role, role)}
        ${line(t.phone, meta.managerPhone || "—")}
        ${line(t.email, "Optisolar.Moldova@gmail.com")}
      </section>
    </div>
    <div class="offer-signature">
      <p${ed}>${esc(t.regards)}</p>
      <strong${ed}>${esc(t.team)}</strong>
      <div class="signature-line"></div>
      <strong${ed}>${esc(manager)}</strong>
      <span${ed}>${esc(role)}</span>
    </div>
  </div>
  ${referencesBlock(opts.references, lang, t, ed)}
  <footer class="offer-document-footer"><span>OPTISOLAR · renewed energy</span><span>www.optisolar.md</span></footer>
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
            const breaks = Array.from(root.querySelectorAll("tr, .offer-brand-header, .offer-title-block, .offer-document-meta, .offer-info-grid, .offer-summary-wrap, .offer-note-card, .offer-contact-card, .offer-bottom-grid, .offer-references"))
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

    window.EPC_OFFER = { render, toCanvas, pdfFromCanvas, pdfFromCanvases, stackCanvases, a4Pages, pageImage, phoneSize, A4, deliver, inTelegram, offerNumber, money, powerTitle, GROUPS };
})();
