// =========================================
// ОФФЕР — дизайн исходного калькулятора (app/): белый лист, логотип,
// жёлтые акценты, карточки «Client» и «Parametri tehnici», таблица с TVA.
// В клиентском оффере нет себестоимости, коэффициентов и маржи.
// Валюта — MDL или EUR (пересчёт по курсу BNM из ratebook).
// =========================================

(function () {
    "use strict";

    // Оборудование — построчно, остальное — одной строкой на группу (как в app/).
    const GROUPS = [
        { key: "design", cats: ["engineering"], ro: "Proiectare și inginerie", ru: "Проектирование и инжиниринг" },
        { key: "materials", cats: ["materials"], ro: "Materiale (toate materialele incluse)", ru: "Материалы (все материалы включены)" },
        { key: "works", cats: ["civil", "electrical"], ro: "Lucrări de construcție și montaj", ru: "Строительные и монтажные работы" },
        { key: "logistics", cats: ["logistics"], ro: "Transport, livrare și logistică", ru: "Транспорт, доставка и логистика" },
        { key: "commissioning", cats: ["commissioning"], ro: "Punere în funcțiune", ru: "Пусконаладка" },
        { key: "grid", cats: ["grid"], ro: "Darea în exploatare și autorizări", ru: "Сдача в эксплуатацию и разрешения" }
    ];

    const T = {
        ro: {
            kicker: "OFERTĂ COMERCIALĂ", sub: "pentru implementarea proiectului energetic",
            no: "Nr. ofertă", date: "Data emiterii", valid: "Valabilă până la", days: "zile calendaristice",
            client: "CLIENT", name: "Nume", place: "Locație", type: "Tip proiect", voltage: "Nivel de racordare",
            tech: "PARAMETRI TEHNICI",
            pv: "Putere instalată PV", panels: "Panouri fotovoltaice", yield: "Producție estimată", perYear: "kWh/an",
            bess: "Capacitate BESS", pcs: "Putere BESS (PCS)", autonomy: "Autonomie la putere nominală", hours: "ore",
            goal: "Destinație BESS",
            cols: ["Nr.", "Denumire", "Cantitate", "Unitate", "Preț unitar", "Valoare", "TVA %", "TVA", "Total cu TVA"],
            subtotal: "Total fără TVA", vat: "TVA totală", vatNa: "TVA (neaplicabilă)", total: "Total cu TVA", totalNoVat: "Total",
            optional: "Opțional", battery: "Acumulator", powerIncrease: "Serviciu de majorare a puterii", pricePerKw: "Preț per kW cu TVA",
            note: "NOTĂ",
            n1: "Oferta comercială este valabilă timp de {days} zile calendaristice de la data emiterii.",
            n2: "Prețurile sunt exprimate în {cur}, {vat}.", vatIn: "cu TVA inclus", vatOut: "fără TVA",
            nFx: "Curs BNM: 1 EUR = {fx} MDL ({date}).",
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
            kicker: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", sub: "на реализацию энергетического проекта",
            no: "№ предложения", date: "Дата", valid: "Действует до", days: "календарных дней",
            client: "КЛИЕНТ", name: "Название", place: "Место", type: "Тип проекта", voltage: "Напряжение подключения",
            tech: "ТЕХНИЧЕСКИЕ ПАРАМЕТРЫ",
            pv: "Мощность СЭС", panels: "Солнечные панели", yield: "Ожидаемая выработка", perYear: "кВт·ч/год",
            bess: "Ёмкость BESS", pcs: "Мощность BESS (PCS)", autonomy: "Время работы на полной мощности", hours: "ч",
            goal: "Назначение BESS",
            cols: ["№", "Наименование", "Кол-во", "Ед.", "Цена за ед.", "Сумма", "TVA %", "TVA", "Итого с TVA"],
            subtotal: "Итого без TVA", vat: "TVA", vatNa: "TVA (не применяется)", total: "Итого с TVA", totalNoVat: "Итого",
            optional: "Опционально", battery: "Аккумулятор", powerIncrease: "Услуга по увеличению мощности", pricePerKw: "Цена за киловатт с TVA",
            note: "ПРИМЕЧАНИЕ",
            n1: "Предложение действует {days} календарных дней с даты выдачи.",
            n2: "Цены указаны в {cur}, {vat}.", vatIn: "с TVA", vatOut: "без TVA",
            nFx: "Курс BNM: 1 EUR = {fx} MDL ({date}).",
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

    // Порядок оборудования в оффере: СЭС → BESS → СН. Первое совпадение задаёт место.
    const EQ_ORDER = [
        [/curent operativ|\brpa\b|protecție/i, 10], [/panou/i, 0], [/invertor/i, 1], [/structur|fixare|montare/i, 2],
        [/container|bess|acumulator|dulap/i, 3], [/pcs|conversie|skid/i, 4], [/ems|controler|limitare/i, 5],
        [/transformator de putere/i, 6], [/post de transformare|celule/i, 7], [/transformator de curent/i, 8], [/scada/i, 9]
    ];
    function eqRank(name) {
        const hit = EQ_ORDER.find(([re]) => re.test(name || ""));
        return hit ? hit[1] : 99;
    }

    function unitLabel(u, lang) {
        if (lang === "ru") return ({ buc: "шт", set: "компл", lot: "компл", kWh: "кВт·ч", kWp: "кВтп", kW: "кВт", m: "м", ore: "ч" })[u] || u;
        return u;
    }

    function powerTitle(info) {
        const parts = [];
        if (info.pvKwp > 0 && info.product !== "bess") {
            parts.push(info.pvKwp >= 1000 ? `${qtyFmt(info.pvKwp / 1000)} MWp` : `${qtyFmt(info.pvKwp)} kWp`);
        }
        if (info.bessKwh > 0 && info.product !== "pv") {
            const kw = info.bessKw >= 1000 ? `${qtyFmt(info.bessKw / 1000)} MW` : `${qtyFmt(info.bessKw)} kW`;
            const kwh = info.bessKwh >= 1000 ? `${qtyFmt(info.bessKwh / 1000)} MWh` : `${qtyFmt(info.bessKwh)} kWh`;
            parts.push(`BESS ${kw} / ${kwh}`);
        }
        return parts.join(" + ") || "Proiect energetic";
    }

    // state: { result, info, meta }; opts: { lang, logo, draft, now, currency, fx, fxDate, editable, number }
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
        const number = opts.number || offerNumber(meta, now);
        const vatOn = result.vatEnabled;
        const ed = opts.editable ? ' contenteditable="true" class="offer-editable"' : "";
        const edc = cls => opts.editable ? ` contenteditable="true" class="offer-editable ${cls}"` : ` class="${cls}"`;

        const station = t.stations[info.product] || t.stations.pv_bess;
        const voltLabel = info.voltage === "0.4" ? "0,4 kV" : `${info.voltage} kV`;

        const tech = [];
        if (info.pvKwp > 0 && info.product !== "bess") {
            tech.push([t.pv, `${qtyFmt(info.pvKwp)} kWp`]);
            if (info.panels) tech.push([t.panels, `${qtyFmt(info.panels)} ${unitLabel("buc", lang)}`]);
            if (info.pvAnnualKwh) tech.push([t.yield, `≈ ${qtyFmt(info.pvAnnualKwh)} ${t.perYear}`]);
        }
        if (info.bessKwh > 0 && info.product !== "pv") {
            tech.push([t.bess, `${qtyFmt(info.bessKwh)} kWh`]);
            tech.push([t.pcs, `${qtyFmt(info.bessKw)} kW`]);
            if (info.hours) tech.push([t.autonomy, `≈ ${qtyFmt(info.hours)} ${t.hours}`]);
            const goal = meta.goal && GOALS[lang][meta.goal];
            if (goal) tech.push([t.goal, goal]);
        }
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
        const equipment = live.filter(i => i.category === "main-equipment").sort((a, b) => eqRank(a.name) - eqRank(b.name));
        let body = equipment.map(i => row(
            lang === "ru" ? i.nameRu || i.name : i.name,
            qtyFmt(i.quantity), unitLabel(i.unit || "buc", lang),
            m(i.sell), m(i.totalSell), i.vatPct || 0, m(i.vatAmount), m(i.totalWithVat)
        )).join("");
        GROUPS.forEach(g => {
            const its = live.filter(i => g.cats.includes(i.category));
            if (!its.length) return;
            const net = its.reduce((s, i) => s + i.totalSell, 0);
            const vat = its.reduce((s, i) => s + i.vatAmount, 0);
            const gross = its.reduce((s, i) => s + i.totalWithVat, 0);
            body += row(g[lang], "—", unitLabel("lot", lang), "—", m(net), net ? vat / net * 100 : 0, m(vat), m(gross));
        });
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
        body += optionRow(t.battery, batteryItems);
        if (powerItem) body += optionRow(t.powerIncrease, [powerItem]);
        const head = t.cols.map((c, i) => `<th class="${["c-n", "c-name", "c-qty", "c-unit", "c-price", "c-net", "c-vatp", "c-vat", "c-total"][i]}">${esc(c)}</th>`).join("");

        const notes = [
            t.n1.replace("{days}", days),
            t.n2.replace("{cur}", cur).replace("{vat}", vatOn ? t.vatIn : t.vatOut) + (eur ? " " + t.nFx.replace("{fx}", String(opts.fx).replace(".", ",")).replace("{date}", opts.fxDate || "") : ""),
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
      <div${ed}><span class="contact-symbol">✉</span> office@optisolar.md</div>
      <div${ed}><span class="contact-symbol">◎</span> www.optisolar.md</div>
    </div>
  </header>
  <section class="offer-title-block">
    <div class="offer-kicker">${esc(t.kicker)}</div>
    <h1${ed}>${esc(powerTitle(info))}</h1>
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
    </section>
    <section class="offer-info-card">
      <h3><span>⚙</span> ${esc(t.tech)}</h3>
      ${tech.map(p => line(p[0], p[1])).join("") || line("—", "—")}
    </section>
  </div>
  <div class="offer-table-wrap">
    <table class="offer-pricing-table">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </div>
  <div class="offer-summary-wrap">
    <div class="offer-summary">
      <div><span>${esc(t.subtotal)}</span><strong>${m(result.commercialPrice)} ${cur}</strong></div>
      <div><span>${esc(vatOn ? t.vat : t.vatNa)}</span><strong>${m(result.vatAmount)} ${cur}</strong></div>
      <div class="offer-summary-grand"><span>${esc(vatOn ? t.total : t.totalNoVat)}</span><strong>${m(result.priceWithVat)} ${cur}</strong></div>
      ${info.pvKwp > 0 && info.product !== "bess" ? `<div class="offer-summary-perkw"><span>${esc(t.pricePerKw)}</span><strong>${m(result.priceWithVat / info.pvKwp)} ${cur}/kWp</strong></div>` : ""}
    </div>
  </div>
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
        ${line(t.email, "office@optisolar.md")}
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
  <footer class="offer-document-footer"><span>OPTISOLAR · renewed energy</span><span>www.optisolar.md</span></footer>
</article>`;
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
            const breaks = Array.from(root.querySelectorAll("tr, .offer-brand-header, .offer-title-block, .offer-document-meta, .offer-info-grid, .offer-summary-wrap, .offer-note-card, .offer-contact-card, .offer-bottom-grid"))
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

    async function deliver(blob, filename) {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: filename });
                return "shared";
            } catch (e) {
                if (e && e.name === "AbortError") return "cancelled";
            }
        }
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

    window.EPC_OFFER = { render, toCanvas, pdfFromCanvas, a4Pages, pageImage, phoneSize, A4, deliver, offerNumber, money, powerTitle, GROUPS };
})();
