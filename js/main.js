// =========================================
// КАЛЬКУЛЯТОР v2 — интерфейс
// =========================================

(function () {
    "use strict";

    const CALC = window.EPC_CALCULATOR;
    const GEN = window.EPC_GENERATOR;
    const OFFER = window.EPC_OFFER;
    const SYNC = window.EPC_SYNC;
    const DEFAULT_RB = JSON.parse(JSON.stringify(window.RATEBOOK));
    const KEY_RB = "epc2_ratebook";
    const KEY_RB_AT = "epc2_ratebook_at";           // когда правили ставки — для синхронизации
    const KEY_STATE = "epc2_state";
    const KEY_PROJECTS = "epc2_projects";
    const KEY_FX = "epc2_fx_bnm";                    // последний курс BNM из fx.json
    const KEY_PROJECTS_DEL = "epc2_projects_deleted"; // удалены без связи — убрать из облака
    const KEY_CLEAN = "epc2_state_saved";            // расчёт на момент сохранения или открытия — есть ли несохранённые правки
    const LOGO = window.OPTISOLAR_LOGO || "img/optisolar-logo.png";
    const headerLogo = document.querySelector(".bar-logo");
    if (headerLogo) headerLogo.src = LOGO;

    const CAT_RU = {
        "engineering": "Проектирование",
        "main-equipment": "Основное оборудование",
        "materials": "Материалы",
        "civil": "Строительные работы",
        "logistics": "Техника и логистика",
        "electrical": "Электромонтаж",
        "commissioning": "Пусконаладка и испытания",
        "grid": "Сдача и разрешения"
    };
    const CAT_ORDER = Object.keys(CAT_RU);

    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg) {
        try {
            tg.ready();
            tg.expand();
            if (tg.setHeaderColor) tg.setHeaderColor("secondary_bg_color");
            if (tg.setBackgroundColor) tg.setBackgroundColor("bg_color");
            if (tg.MainButton) {
                tg.MainButton.setText("Сохранить проект");
                tg.MainButton.onClick(() => { hideKeyboard(); $("btnSave").click(); });
            }
            // свайп вниз по странице не сворачивает окно — закрытие кнопкой ✕
            if (tg.isVersionAtLeast && tg.isVersionAtLeast("7.7")) tg.disableVerticalSwipes();
        } catch (_) { /* вне Telegram */ }
    }

    // Телефон: тап мимо поля убирает клавиатуру (iOS сама её не прячет). Прокрутка — не тап.
    const TYPING = "input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select, [contenteditable]";
    function hideKeyboard() {
        const a = document.activeElement;
        if (a && a.matches && a.matches(TYPING)) a.blur();
    }
    let tapFrom = null;
    document.addEventListener("touchstart", e => {
        const t = e.touches[0];
        tapFrom = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    document.addEventListener("touchend", e => {
        const t = e.changedTouches[0], from = tapFrom;
        tapFrom = null;
        if (!from || Math.abs(t.clientX - from.x) + Math.abs(t.clientY - from.y) > 10) return;
        const el = e.target;
        if (!el.closest || el.closest(TYPING)) return;
        const lab = el.closest("label");
        if (lab && lab.control && lab.control.matches(TYPING)) return;
        hideKeyboard();
    }, { passive: true });

    // ---------- хранилище ----------
    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (_) {
            return fallback;
        }
    }
    function save(key, value) {
        try {
            const raw = JSON.stringify(value);
            localStorage.setItem(key, raw);
            return localStorage.getItem(key) === raw;
        } catch (_) { return false; }
    }

    function deepMerge(base, over) {
        if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over;
        const out = Array.isArray(base) ? base.slice() : { ...base };
        Object.keys(over).forEach(k => {
            out[k] = (base && typeof base[k] === "object" && !Array.isArray(base[k]) && base[k] !== null)
                ? deepMerge(base[k], over[k]) : over[k];
        });
        return out;
    }

    let rbOverrides = load(KEY_RB, {});
    function applyRatebook() {
        window.RATEBOOK_ACTIVE = deepMerge(DEFAULT_RB, rbOverrides);
    }
    applyRatebook();

    // ---------- состояние ----------
    const defaults = {
        segment: "biz", product: "bess", voltage: "0.4", mount: "roof", lang: "ro",
        phases: "3", eqBrand: "auto", eqInverter: "", eqBattery: "",   // подбор моделей из прайса (generator.js)
        pvKwp: 0, inverterKw: 0, pricePerKwp: 0, pricePerKwpCurrency: "MDL", powerIncreasePrice: 0, roofType: "", roofMaterial: "", bessKw: 500, bessKwh: 1000, distanceKm: 50, cableLvM: 50, cableMvM: 300, zeroExport: false,
        client: "", location: "", leadId: "", goal: "", validDays: 7, managerPhone: "",
        indirect: null, risk: null, vatEnabled: true, currency: "MDL",
        edits: {}, extra: [],
        references: null,   // id объектов с фото в оффере (js/references.js); null — все
        // листы бизнеса с накопителем: СЭС + варианты BESS, у каждого свои позиции, правки и итог
        bessVariants: null, bessCur: "", sheet: "pv", pvInOffer: true,
        bessPrice: 0, bessPriceUnit: "kw", bessPriceCurrency: "MDL",   // цена BESS без TVA: подгоняет позиции накопителя
        manual: false,      // позиции импортированы из calc-input.json — генератор не добавляет свои
        fxManual: null,     // курс EUR вручную на дату оффера: { EUR, iso }; на другой день не действует
        projectId: null     // открытый сохранённый проект (pid): «Сохранить проект» обновляет его; null — новый
    };
    let state = { ...defaults, ...load(KEY_STATE, {}) };
    let last = null;

    const $ = id => document.getElementById(id);
    const num = v => {
        const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    };
    // ---------- курс EUR на дату оффера ----------
    // Официальный курс BNM на сегодня раз в день кладёт в репозиторий задание GitHub
    // (.github/workflows/fx-bnm.yml → fx.json). По нему — пересчёт в EUR на экране и в оффере и приписка
    // «Curs BNM … (дата)». На сегодня курс можно поправить руками (шаг ④).
    // Себестоимость позиций в EUR/USD считается по курсам из «Ставок» — их меняют только вручную.
    // Внутри всё считается в MDL.
    const FX_URLS = ["https://raw.githubusercontent.com/nickyungur/optisolar-epc-calculator/main/fx.json", "fx.json"];
    let fxBnm = load(KEY_FX, null);
    function todayIso() {
        const d = new Date();
        const p = n => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
    function isoToRo(iso) {
        const [y, m, d] = String(iso).split("-");
        return `${d}.${m}.${y}`;
    }
    function offerFx() {
        const m = state.fxManual;
        if (m && m.iso === todayIso() && Number(m.EUR) > 0) return { rate: Number(m.EUR), date: isoToRo(m.iso), iso: m.iso, src: "manual" };
        if (fxBnm && Number(fxBnm.EUR) > 0) return { rate: Number(fxBnm.EUR), date: fxBnm.date, iso: fxBnm.iso, src: "BNM" };
        const rb = window.RATEBOOK_ACTIVE.fx;
        return { rate: Number(rb.EUR) || 1, date: rb.date, iso: "", src: "ratebook" };
    }
    // true — курс изменился и расчёт надо перерисовать
    async function loadBnmFx() {
        for (const url of FX_URLS) {
            try {
                const r = await fetch(url, { cache: "no-store" });
                if (!r.ok) continue;
                const d = await r.json();
                if (!d || !(Number(d.EUR) > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d.iso || "")) continue;
                if (fxBnm && fxBnm.iso > d.iso) return false; // не откатываться на старый курс
                const changed = !fxBnm || fxBnm.iso !== d.iso || Number(fxBnm.EUR) !== Number(d.EUR);
                fxBnm = { src: "BNM", date: d.date || isoToRo(d.iso), iso: d.iso, EUR: Number(d.EUR) };
                save(KEY_FX, fxBnm);
                return changed;
            } catch (_) { /* нет сети — остаётся последний известный курс */ }
        }
        return false;
    }
    const eurRate = () => offerFx().rate;
    const isEur = () => state.currency === "EUR";
    const cv = x => isEur() ? x / eurRate() : x;
    const curName = () => isEur() ? "EUR" : "MDL";
    const fmt = x => OFFER.money(x).replace(/\.00$/, "");
    const fmt0 = x => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(x)).replace(/ /g, " ");

    // ---------- вкладки ----------
    function syncTelegramControls(tab = document.querySelector(".tab.active")?.dataset.tab || "calc") {
        if (!tg) return;
        try {
            if (tg.MainButton) tab === "calc" ? tg.MainButton.show() : tg.MainButton.hide();
            if (tg.BackButton) tab === "calc" ? tg.BackButton.hide() : tg.BackButton.show();
        } catch (_) { /* отдельные методы могут отсутствовать в старых клиентах */ }
    }
    if (tg?.BackButton) tg.BackButton.onClick(() => {
        const openModal = document.querySelector(".modal:not([hidden])");
        if (openModal) { openModal.hidden = true; return; }
        document.querySelector('.tab[data-tab="calc"]').click();
    });
    document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b === btn));
        document.querySelectorAll(".tabpane").forEach(p => p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab));
        syncTelegramControls(btn.dataset.tab);
        if (btn.dataset.tab === "rates") renderRates();
        if (btn.dataset.tab === "projects") { renderProjects(); syncNow(); }
    }));

    // ---------- чипы ----------
    function setChips(name, value) {
        document.querySelectorAll(`.chips[data-name="${name}"] button`).forEach(b => b.classList.toggle("on", b.dataset.value === value));
    }
    document.querySelectorAll(".chips").forEach(group => group.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const name = group.dataset.name;
        if (name === "previewFormat") { showPreview(btn.dataset.value); return; }
        state[name] = btn.dataset.value;
        setChips(name, btn.dataset.value);
        if (name === "segment" && state.segment === "home") state.voltage = "0.4";
        if (["segment", "product", "voltage"].includes(name)) { state.edits = {}; (state.bessVariants || []).forEach(v => { v.edits = {}; }); }
        if (["segment", "product", "phases"].includes(name)) { state.eqInverter = ""; state.eqBattery = ""; }
        recalc();
    }));

    // ---------- поля ----------
    const NUM_FIELDS = ["pvKwp", "inverterKw", "pricePerKwp", "powerIncreasePrice", "bessKw", "bessKwh", "bessPrice", "distanceKm", "cableLvM", "cableMvM", "validDays", "indirect", "risk"];
    const TEXT_FIELDS = ["client", "location", "leadId", "goal", "managerPhone"];
    NUM_FIELDS.forEach(id => $(id).addEventListener("input", () => {
        const v = num($(id).value);
        $(id).classList.toggle("bad", $(id).value.trim() !== "" && Number.isNaN(v));
        if (!Number.isNaN(v)) {
            state[id] = v;
            if (sheetsMode() && VAR_FIELDS.includes(id)) {
                const cur = curVariant();
                cur[id] = v;
                if (id !== "bessPrice") cur.edits = {};
            } else if (id === "bessPrice") {
                // цена не сбрасывает правки строк
            } else if (["pvKwp", "inverterKw", "bessKw", "bessKwh"].includes(id)) state.edits = {};
            recalc();
        }
    }));
    TEXT_FIELDS.forEach(id => $(id).addEventListener("input", () => { state[id] = $(id).value; persist(); renderOffer(); }));
    $("zeroExport").addEventListener("change", () => { state.zeroExport = $("zeroExport").checked; recalc(); });
    // Оборудование: бренд сбрасывает выбор моделей; правки строк не сбрасываются
    $("eqBrand").addEventListener("change", () => { const st = eqStore(); st.eqBrand = $("eqBrand").value; st.eqInverter = ""; st.eqBattery = ""; recalc(); });
    $("eqInverter").addEventListener("change", () => { eqStore().eqInverter = $("eqInverter").value; recalc(); });
    $("eqBattery").addEventListener("change", () => { eqStore().eqBattery = $("eqBattery").value; recalc(); });
    $("vatEnabled").addEventListener("change", () => { state.vatEnabled = $("vatEnabled").checked; recalc(); });
    // единица и валюта цены BESS — у текущего варианта, если листы
    ["bessPriceUnit", "bessPriceCurrency"].forEach(id => $(id).addEventListener("change", () => {
        state[id] = $(id).value;
        if (sheetsMode()) curVariant()[id] = $(id).value;
        recalc();
    }));
    $("pricePerKwpCurrency").addEventListener("change", () => {
        state.pricePerKwpCurrency = $("pricePerKwpCurrency").value === "EUR" ? "EUR" : "MDL";
        recalc();
    });
    ["roofType", "roofMaterial"].forEach(id => $(id).addEventListener("change", () => {
        state[id] = $(id).value;
        persist();
        renderOffer();
    }));

    function fillForm() {
        ["segment", "product", "voltage", "mount", "lang", "currency", "phases"].forEach(n => setChips(n, state[n]));
        $("eqBrand").value = state.eqBrand || "auto";
        NUM_FIELDS.forEach(id => { $(id).value = state[id] ?? ""; });
        $("roofType").value = state.roofType || "";
        $("roofMaterial").value = state.roofMaterial || "";
        $("pricePerKwpCurrency").value = state.pricePerKwpCurrency || "MDL";
        $("bessPriceUnit").value = state.bessPriceUnit === "kwh" ? "kwh" : "kw";
        $("bessPriceCurrency").value = state.bessPriceCurrency === "EUR" ? "EUR" : "MDL";
        TEXT_FIELDS.forEach(id => { $(id).value = state[id] ?? ""; });
        $("zeroExport").checked = !!state.zeroExport;
        $("vatEnabled").checked = state.vatEnabled !== false;
        const fin = window.RATEBOOK_ACTIVE.financial;
        if (state.indirect == null) $("indirect").value = fin.indirect;
        if (state.risk == null) $("risk").value = fin.risk;
        renderRefsPick();
    }

    function updateVisibility() {
        const hasPv = state.product !== "bess";
        const hasBess = state.product !== "pv";
        const biz = state.segment === "biz";
        const home = state.segment === "home";
        const mv = biz && state.voltage !== "0.4";
        document.querySelectorAll("[data-show]").forEach(el => {
            const k = el.dataset.show;
            const show = k === "equip" ? !state.manual : k === "home" ? home : k === "pv" ? hasPv : k === "inverter" ? (hasPv || (home && hasBess)) : k === "bess" ? hasBess : k === "bess-power" ? (hasBess && biz) : k === "biz" ? biz : k === "mv" ? mv : k === "zero" ? (hasPv && !(biz && hasBess)) : k === "home-roof" ? (home && hasPv) : true;
            el.hidden = !show;
        });
    }

    function persist() {
        save(KEY_STATE, state);
        renderProjState();
    }

    // ---------- расчёт ----------
    function itemKey(it) {
        return `${it.rateId || "x"}|${it.name}`;
    }

    // Опция ниже итога — только услуга увеличения мощности. Аккумулятор с 2026-10-19 — блок B оффера
    // со своим итогом и ценой за кВт·ч и кВт (запрос пользователя), у дома и у бизнеса.
    function isOptionalItem(it) {
        return /увеличени[ея] мощности|majorare.*putere/i.test(`${it.name || ""} ${it.nameRu || ""}`);
    }

    // Два блока (СЭС и аккумулятор), если в расчёте есть позиции обоих
    function hasTwoBlocks(items) {
        return items.some(i => i.section === "pv" && !i.optional) && items.some(i => i.section === "bess" && !i.optional);
    }
    function blockSums(items, section) {
        const its = items.filter(i => i.section === section && !i.optional);
        return { net: its.reduce((s, i) => s + i.totalSell, 0), gross: its.reduce((s, i) => s + i.totalWithVat, 0) };
    }
    const bessBlockName = () => state.segment === "home" ? "Аккумулятор" : "BESS";

    // ---------- листы: СЭС и варианты BESS (бизнес с накопителем, 2026-10-19) ----------
    // Каждый лист — отдельный полный оффер со своими позициями, правками и итогом (с проектом и сдачей).
    // Варианты BESS — со своими кВт, кВт·ч и оборудованием; цена СЭС от них не зависит.
    // Галочка «в оффере» — какие листы попадут в итоговый документ. Дом — один лист (блоки A/B),
    // расчёт от Claude — как пришёл.
    const MAX_VARIANTS = 5;
    // поля шага ①, которые у каждого варианта BESS свои (в state — значения текущего варианта)
    const VAR_FIELDS = ["bessKw", "bessKwh", "bessPrice", "bessPriceUnit", "bessPriceCurrency"];
    const sheetsMode = () => !state.manual && state.segment === "biz" && state.product !== "pv";
    function newVariant(id, from) {
        return {
            id, bessKw: from.bessKw, bessKwh: from.bessKwh, eqBrand: from.eqBrand || "auto",
            bessPrice: from.bessPrice || 0, bessPriceUnit: from.bessPriceUnit || "kw", bessPriceCurrency: from.bessPriceCurrency || "MDL",
            eqInverter: from === state ? "" : from.eqInverter || "", eqBattery: from.eqBattery || "",
            edits: {}, extra: [], itemOrder: [], inOffer: true
        };
    }
    function ensureVariants() {
        if (Array.isArray(state.bessVariants) && state.bessVariants.length) return;
        // первый вариант — из полей шага ①; правки и добавленные позиции BESS прежних проектов — сюда же
        const v = newVariant("b1", state);
        v.edits = { ...(state.edits || {}) };
        v.extra = (state.extra || []).filter(x => x.section === "bess");
        state.extra = (state.extra || []).filter(x => x.section !== "bess");
        state.bessVariants = [v];
        state.bessCur = "b1";
    }
    function sheetIds() {
        return [...(state.product === "pv_bess" ? ["pv"] : []), ...state.bessVariants.map(v => v.id)];
    }
    function activeSheet() {
        if (!sheetsMode()) return "main";
        ensureVariants();
        const ids = sheetIds();
        return ids.includes(state.sheet) ? state.sheet : ids[0];
    }
    const isBessSheet = id => id !== "pv" && id !== "main";
    function curVariant() {
        ensureVariants();
        return state.bessVariants.find(v => v.id === state.bessCur) || state.bessVariants[0];
    }
    // где лежат правки, добавленные позиции и порядок строк листа
    function store(sheet) {
        return isBessSheet(sheet) ? (state.bessVariants.find(v => v.id === sheet) || state) : state;
    }
    const S = () => store(activeSheet());
    const eqStore = () => S();
    function sheetName(id) {
        if (id === "pv") return "СЭС";
        if (!isBessSheet(id)) return "";
        const i = state.bessVariants.findIndex(v => v.id === id);
        return state.bessVariants.length > 1 ? `BESS ${i + 1}` : "BESS";
    }
    const sheetInOffer = id => id === "pv" ? state.pvInOffer !== false : isBessSheet(id) ? store(id).inOffer !== false : true;
    function genInput(sheet) {
        if (sheet === "pv") return { ...state, product: "pv" };
        if (!isBessSheet(sheet)) return state;
        const v = store(sheet);
        return { ...state, product: "bess", inverterKw: 0, zeroExport: false, bessKw: v.bessKw, bessKwh: v.bessKwh, eqBrand: v.eqBrand || "auto", eqInverter: v.eqInverter || "", eqBattery: v.eqBattery || "" };
    }
    // Переключение листа: поля «BESS, кВт / кВт·ч» показывают вариант этого листа
    function selectSheet(id) {
        state.sheet = id;
        if (isBessSheet(id)) {
            const v = store(id);
            state.bessCur = id;
            VAR_FIELDS.forEach(f => { state[f] = v[f] ?? defaults[f]; $(f).value = state[f] ?? ""; });
        }
        recalc();
    }

    function buildItems(sheet) {
        const gen = GEN.generate(genInput(sheet));
        const st = store(sheet);
        const edits = st.edits || {};
        // мощности не заданы (новый проект) — позиций нет: проект и сдача появятся вместе с кВтп или кВт·ч
        const noPower = !(gen.info.pvKwp > 0) && !(gen.info.bessKw > 0) && !(gen.info.bessKwh > 0);
        // _key — ключ правки по исходному названию генератора: после переименования правки не теряются
        const items = (state.manual || noPower ? [] : gen.items).map(it => {
            const key = itemKey(it);
            const e = edits[key];
            return e ? { ...it, ...e, edited: true, _key: key } : { ...it, _key: key };
        }).filter(it => !it.removed);
        (st.extra || []).forEach(x => items.push({ ...x, edited: true, status: x.status || "opt" }));
        // бюджет «цена за кВтп» — только на позиции СЭС; блок аккумулятора не масштабируется
        const coreItems = items.filter(it => !isOptionalItem(it) && it.section !== "bess");
        // цена BESS без TVA (за кВт или кВт·ч): позиции накопителя подгоняются так же, как СЭС под цену за кВтп
        const bt = isBessSheet(sheet) ? store(sheet) : state;
        const bessTarget = (Number(bt.bessPrice) || 0) * (bt.bessPriceCurrency === "EUR" ? eurRate() : 1);
        const bessBase = bt.bessPriceUnit === "kwh" ? gen.info.bessKwh : gen.info.bessKw;
        if (bessTarget > 0 && bessBase > 0 && state.product !== "pv") {
            const bessItems = items.filter(it => !isOptionalItem(it) && it.section === "bess");
            const sell = bessItems.reduce((sum, item) => sum + item.quantity * item.cost * item.coefficient, 0);
            if (sell > 0) {
                const factor = bessTarget * bessBase / sell;
                bessItems.forEach(item => { item.coefficient *= factor; });
            }
        }
        const targetPrice = (Number(state.pricePerKwp) || 0) * (state.pricePerKwpCurrency === "EUR" ? eurRate() : 1);
        if (targetPrice > 0 && state.product !== "bess" && gen.info.pvKwp > 0) {
            const currentSell = coreItems.reduce((sum, item) => sum + item.quantity * item.cost * item.coefficient, 0);
            if (currentSell > 0) {
                const factor = targetPrice * gen.info.pvKwp / currentSell;
                coreItems.forEach(item => { item.coefficient *= factor; });
            }
        }
        items.forEach(it => { it.optional = isOptionalItem(it); });
        const order = Array.isArray(st.itemOrder) ? st.itemOrder : [];
        const rank = new Map(order.map((key, i) => [key, i]));
        items.sort((a, b) => (rank.get(a.extraId || a._key || itemKey(a)) ?? 1e9) - (rank.get(b.extraId || b._key || itemKey(b)) ?? 1e9));
        return { gen, items };
    }

    function computeSheet(sheet) {
        const { gen, items } = buildItems(sheet);
        const fin = window.RATEBOOK_ACTIVE.financial;
        const settings = {
            indirectPct: state.indirect ?? fin.indirect,
            riskPct: state.risk ?? fin.risk,
            vatEnabled: state.vatEnabled !== false,
            vatPct: window.RATEBOOK_ACTIVE.vatPct
        };
        const coreItems = items.filter(it => !it.optional);
        const optionalItems = items.filter(it => it.optional);
        if (gen.info.pvKwp > 0 && Number(state.powerIncreasePrice) > 0) {
            const rate = Number(window.RATEBOOK_ACTIVE.vatPct) || 0;
            const price = Number(state.powerIncreasePrice);
            optionalItems.push({ name: "Услуга по увеличению мощности", nameRu: "Услуга по увеличению мощности", category: "grid", unit: "lot", quantity: 1, cost: price, coefficient: 1, vatPct: settings.vatEnabled ? rate : 0, status: "opt", _key: "optional-power-increase", optional: true });
        }
        const result = CALC.calculateProject(coreItems, settings);
        const optionalResult = CALC.calculateProject(optionalItems, { ...settings, indirectPct: 0, riskPct: 0 });
        return { sheet, name: sheetName(sheet), inOffer: sheetInOffer(sheet), gen, items: [...result.items, ...optionalResult.items], optionalItems: optionalResult.items, result, info: gen.info };
    }

    function recalc() {
        updateVisibility();
        const active = activeSheet();
        const sheets = (sheetsMode() ? sheetIds() : ["main"]).map(computeSheet);
        last = sheets.find(x => x.sheet === active) || sheets[0];
        last.sheets = sheets;
        renderSheets();
        renderTotals();
        renderEquip();
        renderItems();
        renderOffer();
        persist();
    }

    function renderTotals() {
        const { result, gen, info } = last;
        const c = curName();
        const rb = window.RATEBOOK_ACTIVE;
        renderFx();
        $("sumGross").textContent = fmt0(cv(result.priceWithVat)) + " " + c;
        $("sumLabel").textContent = last.name ? `Итого с TVA · лист ${last.name}` : "Итого с TVA";
        $("sumNet").textContent = fmt0(cv(result.commercialPrice)) + " " + c;
        $("sumCost").textContent = fmt0(cv(result.projectCost)) + " " + c;
        $("sumProfit").textContent = fmt0(cv(result.profit)) + " " + c;
        $("sumMargin").textContent = result.effectiveMargin.toFixed(1).replace(".", ",") + "%";
        const m = result.effectiveMargin;
        $("marginPill").textContent = "маржа " + m.toFixed(1).replace(".", ",") + "%";
        $("marginPill").className = "pill " + (m < 0 ? "bad" : m < 8 ? "warn" : "ok");
        const per = [];
        const two = hasTwoBlocks(last.items);
        if (two) {
            const pv = blockSums(result.items, "pv"), bs = blockSums(result.items, "bess");
            per.push(`A · СЭС: ${fmt0(cv(pv.gross))} ${c} с TVA`, `B · ${bessBlockName()}: ${fmt0(cv(bs.gross))} ${c} с TVA`);
        } else {
            if (info.bessKwh > 0 && !(info.pvKwp > 0)) per.push(`${fmt0(cv(result.commercialPrice / info.bessKwh))} ${c}/кВт·ч без TVA`);
            if (info.pvKwp > 0) per.push(`${fmt0(cv(result.commercialPrice / info.pvKwp))} ${c}/кВтп без TVA (солнечная станция)`);
        }
        if (last.sheets.length > 1) per.unshift("Листы: " + last.sheets.map(x => `${x.name} ${fmt0(cv(x.result.priceWithVat))} ${c}${x.inOffer ? "" : " (не в оффере)"}`).join(" · "));
        $("perUnit").textContent = per.join(" · ");
        const pvPrice = $("pvKwPrice");
        if (two) {
            // цена за единицу — отдельно по блокам, как в оффере
            const pv = blockSums(result.items, "pv"), bs = blockSums(result.items, "bess");
            const line = (label, s, per, unit) => per > 0
                ? `${label}: ${fmt0(cv(s.net / per))} ${c}/${unit} без TVA / ${fmt0(cv(s.gross / per))} ${c}/${unit} с TVA` : "";
            pvPrice.hidden = false;
            pvPrice.innerHTML = [
                line("<b>A · СЭС, за 1 кВтп</b>", pv, info.pvKwp, "кВтп"),
                line(`<b>B · ${bessBlockName()}, за 1 кВт·ч</b>`, bs, info.bessKwh, "кВт·ч"),
                line(`<b>B · ${bessBlockName()}, за 1 кВт</b>`, bs, info.bessKw, "кВт")
            ].filter(Boolean).join("<br>");
        } else if (isBessSheet(last.sheet) && info.bessKwh > 0) {
            const line = (label, per, unit) => per > 0
                ? `<b>${label}</b>: ${fmt0(cv(result.commercialPrice / per))} ${c}/${unit} без TVA / ${fmt0(cv(result.priceWithVat / per))} ${c}/${unit} с TVA` : "";
            pvPrice.hidden = false;
            pvPrice.innerHTML = [line(`${last.name}, за 1 кВт·ч`, info.bessKwh, "кВт·ч"), line(`${last.name}, за 1 кВт`, info.bessKw, "кВт")].filter(Boolean).join("<br>");
        } else if (info.pvKwp > 0 && state.product !== "bess") {
            const mdlNet = result.commercialPrice / info.pvKwp;
            const mdlGross = result.priceWithVat / info.pvKwp;
            const eurNet = mdlNet / eurRate();
            const eurGross = mdlGross / eurRate();
            pvPrice.hidden = false;
            pvPrice.innerHTML = `<b>Цена за 1 кВтп (вся система):</b> MDL ${fmt0(mdlNet)} без TVA / ${fmt0(mdlGross)} с TVA · EUR ${fmt(eurNet)} без TVA / ${fmt(eurGross)} с TVA`;
        } else {
            pvPrice.hidden = true;
            pvPrice.textContent = "";
        }
        const w = gen.warnings.slice();
        if (Object.keys(S().edits || {}).length || (S().extra || []).length) w.push("Есть ручные правки позиций.");
        $("warnings").innerHTML = w.map(x => `<li>${escapeHtml(x)}</li>`).join("");
        const open = !$("sumDetails").hidden;
        $("btnDetails").textContent = (w.length ? `⚠ ${w.length} · ` : "") + (open ? "Свернуть ▾" : "Подробнее ▴");
    }

    // ---------- панель листов (шаг ③) ----------
    function renderSheets() {
        const bar = $("sheetsBar");
        const lblKw = document.querySelector('label[for="bessKw"]'), lblKwh = document.querySelector('label[for="bessKwh"]');
        if (!sheetsMode()) {
            bar.hidden = true;
            bar.innerHTML = "";
            lblKw.textContent = "BESS, кВт";
            lblKwh.textContent = "BESS, кВт·ч";
            document.querySelector('label[for="bessPrice"]').textContent = state.segment === "home" ? "Цена аккумулятора без TVA" : "Цена BESS без TVA";
            return;
        }
        // поля «BESS, кВт / кВт·ч» всегда показывают текущий вариант (после смены сегмента там могли остаться другие числа)
        const cur = curVariant();
        VAR_FIELDS.map(f => [f, cur[f] ?? defaults[f]]).forEach(([id, v]) => {
            if (state[id] === v) return;
            state[id] = v;
            if (document.activeElement !== $(id)) $(id).value = v ?? "";
        });
        const vName = sheetName(cur.id);
        lblKw.textContent = `${vName}, кВт`;
        lblKwh.textContent = `${vName}, кВт·ч`;
        document.querySelector('label[for="bessPrice"]').textContent = `Цена ${vName} без TVA`;
        const c = curName();
        const act = last.sheet;
        const canAdd = state.bessVariants.length < MAX_VARIANTS;
        const canDelete = isBessSheet(act) && state.bessVariants.length > 1;
        bar.hidden = false;
        bar.innerHTML = `<div class="sheet-tabs">${last.sheets.map(x => `
            <button type="button" class="sheet-tab${x.sheet === act ? " on" : ""}${x.inOffer ? "" : " off"}" data-sheet="${x.sheet}">
              <b>${escapeHtml(x.name)}</b><small>${fmt0(cv(x.result.priceWithVat))} ${c}${x.inOffer ? "" : " · не в оффере"}</small>
            </button>`).join("")}
            ${canAdd ? '<button type="button" class="sheet-tab sheet-add" data-act="add">+ Вариант BESS</button>' : ""}
          </div>
          <div class="sheet-tools">
            <label class="check"><input type="checkbox" data-act="in-offer"${last.inOffer ? " checked" : ""}> Лист «${escapeHtml(last.name)}» в оффере</label>
            ${canDelete ? '<button type="button" class="btn" data-act="delete">Удалить лист</button>' : ""}
          </div>`;
    }
    $("sheetsBar").addEventListener("click", e => {
        const tab = e.target.closest("[data-sheet]");
        if (tab) { selectSheet(tab.dataset.sheet); return; }
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        if (btn.dataset.act === "add" && state.bessVariants.length < MAX_VARIANTS) {
            // новый вариант — с параметрами текущего, позиции считаются заново
            const n = Math.max(0, ...state.bessVariants.map(v => Number(String(v.id).slice(1)) || 0)) + 1;
            state.bessVariants.push(newVariant("b" + n, curVariant()));
            selectSheet("b" + n);
        }
        if (btn.dataset.act === "delete") {
            const id = activeSheet();
            if (!isBessSheet(id) || state.bessVariants.length < 2) return;
            if (!confirm(`Удалить лист «${sheetName(id)}» вместе с его правками?`)) return;
            state.bessVariants = state.bessVariants.filter(v => v.id !== id);
            const v = state.bessVariants[0];
            state.bessCur = v.id;
            VAR_FIELDS.forEach(f => { state[f] = v[f] ?? defaults[f]; $(f).value = state[f] ?? ""; });
            selectSheet(state.product === "pv_bess" ? "pv" : v.id);
        }
    });
    $("sheetsBar").addEventListener("change", e => {
        if (!e.target.matches('[data-act="in-offer"]')) return;
        const id = activeSheet();
        if (id === "pv") state.pvInOffer = e.target.checked;
        else store(id).inOffer = e.target.checked;
        recalc();
    });

    // ---------- оборудование по моделям ----------
    function renderEquip() {
        const eq = last.info.equip || {};
        // модель, выбранная для другого расчёта (бренд, фазы, семейство), не применилась — сбрасываем выбор
        const st = eqStore();
        if (eq.ignoredInv) st.eqInverter = "";
        if (eq.ignoredBat) st.eqBattery = "";
        $("eqBrand").value = st.eqBrand || "auto";
        $("eqTitle").textContent = last.name ? `Оборудование — лист ${last.name}` : "Оборудование";
        const fill = (id, list, value, autoText) => {
            const opts = list.slice();
            // выбранная вручную модель остаётся в списке, даже если по мощности уже не подходит
            if (value && value !== "cabinet" && !opts.some(o => o.id === value)) {
                const e = GEN.eqGet(value);
                if (e) opts.unshift({ id: value, label: `${e.brand} ${e.model} · ${e.kw || e.kwh} ${e.kw ? "кВт" : "кВт·ч"}` });
            }
            $(id).innerHTML = `<option value="">${escapeHtml(autoText)}</option>` +
                opts.map(o => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`).join("");
            $(id).value = opts.some(o => o.id === value) ? value : "";
        };
        const market = st.eqBrand === "market";
        fill("eqInverter", market ? [] : eq.invOptions || [], st.eqInverter,
            eq.inverter ? `Авто: ${eq.inverter}` : "Авто: рыночная ставка");
        fill("eqBattery", market ? [] : eq.batOptions || [], st.eqBattery,
            eq.battery ? `Авто: ${eq.battery}` : "Авто: рыночная ставка");
        $("eqInverterBox").hidden = market || !(eq.inverter || (eq.invOptions || []).length);
        $("eqBatteryBox").hidden = market || !(eq.battery || (eq.batOptions || []).length);
        const parts = [];
        if (eq.inverter) parts.push(`инвертор ${eq.inverter}`);
        if (eq.pvInverter) parts.push(`СЭС ${eq.pvInverter}`);
        if (eq.battery) parts.push(`батарея ${eq.battery}`);
        $("eqHint").textContent = !eq.pricesLoaded
            ? "Цены моделей не загружены — позиции по рыночным ставкам. Загрузить: «Ставки» → «Импорт», файл цен оборудования."
            : parts.length
                ? `Подобрано: ${parts.join(" · ")}. ${eq.source}, уровень ${eq.level}.`
                : "Модели не подобраны — позиции по рыночным ставкам.";
    }

    function escapeHtml(v) {
        return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Название позиции — на языке оффера: то, что видишь здесь, попадёт в оффер.
    function itemName(it) {
        return state.lang === "ru" ? (it.nameRu || it.name) : it.name;
    }

    // ---------- замена позиции из базы (список в каждой строке шага ③) ----------
    // Варианты — ставки того же раздела, у оборудования ещё модели из прайса (с ценой).
    // Выбор меняет название, единицу, цену и источник строки; количество, коэффициент и TVA остаются.
    function rateKw(id, it) {
        const info = last.info;
        if (/^inv_/.test(id)) return (info.inverterKw || info.bessKw || 0) / Math.max(1, Number(it.quantity) || 1);
        return Math.max(info.pvKwp || 0, info.bessKw || 0);
    }
    function dbRef(value, it) {
        const rb = window.RATEBOOK_ACTIVE;
        const r2 = x => Math.round(x * 100) / 100;
        if (value.startsWith("e:")) {
            const e = GEN.eqGet(value.slice(2));
            if (!e || !(GEN.eqNet(e) > 0)) return null;
            const level = (rb.equipmentLevels || {})[rb.equipmentLevel] || "";
            return { name: e.ro, nameRu: e.ru, unit: "buc", cost: r2(GEN.eqNet(e)), rateId: "eq:" + e.id, status: e.status || "opt", src: `${e.src} · ${level}`, date: e.date, category: "main-equipment" };
        }
        if (value.startsWith("r:")) {
            const id = value.slice(2), r = rb.rates[id];
            if (!r) return null;
            let cost = GEN.netMdl(id, rateKw(id, it)), unit = r.unit;
            if (unit === "Wp") { cost *= rb.norms.panelWp; unit = "buc"; } // панель — за штуку
            return { name: r.ro, nameRu: r.ru, unit, cost: r2(cost), rateId: id, status: r.status, src: r.src, date: r.date, category: r.cat };
        }
        return null;
    }
    function dbValue(it) {
        const id = it.rateId || "";
        if (id.startsWith("eq:")) return "e:" + id.slice(3);
        return window.RATEBOOK_ACTIVE.rates[id] ? "r:" + id : "";
    }
    // Список вариантов раздела — один раз на отрисовку
    function dbGroups(cat, it) {
        const rb = window.RATEBOOK_ACTIVE;
        const c = curName();
        const groups = [];
        if (cat === "main-equipment") {
            const brands = {};
            GEN.eqAll().filter(e => GEN.eqNet(e) > 0).forEach(e => { (brands[e.brand] = brands[e.brand] || []).push(e); });
            Object.keys(brands).forEach(b => groups.push({ label: `Модели ${b}`, opts: brands[b].map(e => ({
                value: "e:" + e.id,
                label: `${e.brand} ${e.model}${e.kw ? " · " + e.kw + " кВт" : e.kwh ? " · " + String(e.kwh).replace(".", ",") + " кВт·ч" : ""} — ${fmt0(cv(GEN.eqNet(e)))} ${c}`
            })) }));
        }
        const rates = Object.entries(rb.rates).filter(([, r]) => r.cat === cat).map(([id, r]) => {
            const obj = r.price && typeof r.price === "object";
            const per = r.unit === "Wp" ? "шт" : r.unit;
            const net = GEN.netMdl(id, obj ? rateKw(id, it) : 0) * (r.unit === "Wp" ? rb.norms.panelWp : 1);
            return { value: "r:" + id, label: `${r.ru} — ${fmt0(cv(net))} ${c}${obj ? "" : "/" + per}` };
        });
        if (rates.length) groups.push({ label: "Ставки", opts: rates });
        return groups;
    }
    function dbSelect(it, cache) {
        const cat = it.category;
        if (!cache[cat]) cache[cat] = dbGroups(cat, it);
        const value = dbValue(it);
        const known = cache[cat].some(g => g.opts.some(o => o.value === value));
        return `<select data-f="ref" aria-label="Заменить из базы">${known ? "" : '<option value="" selected>⇄ Заменить из базы…</option>'}${cache[cat].map(g =>
            `<optgroup label="${escapeHtml(g.label)}">${g.opts.map(o => `<option value="${escapeHtml(o.value)}"${o.value === value ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</optgroup>`).join("")}</select>`;
    }
    function replaceFromDb(it, value) {
        const ref = dbRef(value, it);
        if (!ref) return;
        if (ref.category !== it.category) delete ref.category;
        if ((ref.category || it.category) === "electrical") ref.vatPct = 0; // монтаж всегда без TVA
        const st = S();
        if (it.extraId) {
            const x = (st.extra || []).find(y => y.extraId === it.extraId);
            if (x) Object.assign(x, ref);
        } else {
            st.edits = st.edits || {};
            st.edits[it._key] = { ...(st.edits[it._key] || {}), ...ref };
        }
        recalc();
    }

    function renderItems() {
        const { result } = last;
        const dbCache = {};
        const c = curName();
        const labels = window.RATEBOOK_ACTIVE.statusLabels;
        const byCat = {};
        // при двух блоках позиции аккумулятора — отдельными группами «Аккумулятор · …» (блок B оффера)
        const two = hasTwoBlocks(last.items);
        last.items.forEach((it, idx) => {
            const group = it.optional ? "optional" : (two && it.section === "bess" ? "bess|" : "") + it.category;
            (byCat[group] = byCat[group] || []).push({ it, idx });
        });
        const categories = [...CAT_ORDER.filter(cat => byCat[cat]), ...CAT_ORDER.map(cat => "bess|" + cat).filter(cat => byCat[cat]), ...(byCat.optional ? ["optional"] : [])];
        const html = categories.map(cat => {
            const rows = byCat[cat];
            const sum = rows.reduce((s, r) => s + r.it.totalSell, 0);
            const title = cat === "optional" ? "Опционально" : cat.startsWith("bess|") ? `${bessBlockName()} · ${CAT_RU[cat.slice(5)]}` : (two ? "СЭС · " : "") + CAT_RU[cat];
            return `<details class="grp" open>
              <summary><span class="grp-name">${title}</span><span class="grp-n">${rows.length}</span><b>${fmt0(cv(sum))} ${c}</b></summary>
              ${rows.map(({ it, idx }) => {
                const src = last.items[idx];
                const st = it.status || "opt";
                const tip = [labels[st] || "Вручную", it.src, it.date, state.lang === "ro" && it.nameRu && it.nameRu !== it.name ? "RU: " + it.nameRu : ""].filter(Boolean).join(" · ");
                return `
              <div class="irow st-${st}${it.edited ? " edited" : ""}" data-idx="${idx}" data-order-key="${escapeHtml(it.extraId || it._key || itemKey(it))}" draggable="true">
                <div class="irow-top">
                  <button type="button" class="drag-handle" title="Перетащить позицию" aria-label="Перетащить позицию">↕</button>
                  <textarea class="nm" data-f="name" rows="1" title="${escapeHtml(tip)}" aria-label="Название позиции">${escapeHtml(itemName(it))}</textarea>
                  <div class="isum">${fmt0(cv(it.totalSell))}<small>${result.vatEnabled ? (it.vatPct ? "с TVA " + fmt0(cv(it.totalWithVat)) : "без TVA") : ""}</small></div>
                  <button type="button" class="x" title="Убрать позицию">×</button>
                </div>
                <div class="irow-ref">${it.optional && !it.rateId ? "" : dbSelect(it, dbCache)}</div>
                <div class="irow-f">
                  <label><span>Кол.<i> · ${escapeHtml(it.unit)}</i></span><input data-f="quantity" inputmode="decimal" value="${numIn(it.quantity)}"><em>${escapeHtml(it.unit)}</em></label>
                  <label class="w-cost"><span>Цена<i> · ${c}</i></span><input data-f="cost" inputmode="decimal" value="${numIn(cv(it.cost))}"><em>${c}</em></label>
                  <label><span>Коэф.</span><input data-f="coefficient" inputmode="decimal" value="${it.coefficient}"></label>
                  <label><span>TVA</span><select data-f="vatPct">${vatOptions(src.vatPct)}</select></label>
                </div>
              </div>`;
              }).join("")}
            </details>`;
        }).join("");
        $("items").innerHTML = html || '<p class="hint">Нет позиций — задай мощность или ёмкость в шаге 1.</p>';
        $("items").querySelectorAll("textarea.nm").forEach(fitName);
    }

    let draggedItem = null;
    $("items").addEventListener("dragstart", e => {
        const row = e.target.closest(".irow");
        if (!row) return;
        draggedItem = row.dataset.orderKey;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", draggedItem);
    });
    $("items").addEventListener("dragend", e => { e.target.closest(".irow")?.classList.remove("dragging"); draggedItem = null; });
    $("items").addEventListener("dragover", e => { if (e.target.closest(".irow") && draggedItem) e.preventDefault(); });
    $("items").addEventListener("drop", e => {
        const target = e.target.closest(".irow");
        if (!target || !draggedItem) return;
        e.preventDefault();
        const targetKey = target.dataset.orderKey;
        if (targetKey === draggedItem) return;
        const keys = last.items.map(it => it.extraId || it._key || itemKey(it));
        const from = keys.indexOf(draggedItem), to = keys.indexOf(targetKey);
        if (from < 0 || to < 0) return;
        keys.splice(to, 0, keys.splice(from, 1)[0]);
        S().itemOrder = keys;
        recalc();
    });

    // Поле названия растёт по тексту, чтобы длинное название было видно целиком
    function fitName(el) {
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    }

    // Число в поле: тысячи через пробел, до 2 знаков после точки (num() пробелы понимает)
    function numIn(x) {
        const n = Math.round(Number(x) * 100) / 100;
        const [i, d] = String(Math.abs(n)).split(".");
        return (n < 0 ? "-" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (d ? "." + d : "");
    }

    // TVA строки: ставка проекта или 0 (и текущая, если она другая)
    function vatOptions(current) {
        const base = window.RATEBOOK_ACTIVE.vatPct;
        const cur = Number(current ?? base);
        const rates = [base, 0];
        if (!rates.includes(cur)) rates.push(cur);
        return rates.map(r => `<option value="${r}"${r === cur ? " selected" : ""}>${r}%</option>`).join("");
    }

    $("items").addEventListener("change", e => {
        const input = e.target.closest("[data-f]");
        if (!input) return;
        const it = last.items[Number(input.closest(".irow").dataset.idx)];
        const f = input.dataset.f;
        if (f === "ref") { replaceFromDb(it, input.value); return; }
        let v;
        if (f === "name") {
            v = input.value.trim();
            if (!v) { input.value = itemName(it); return; }
        } else {
            v = num(input.value);
            if (Number.isNaN(v)) { input.classList.add("bad"); return; }
            if (f === "cost" && isEur()) v = Math.round(v * eurRate() * 100) / 100;
        }
        // название правим на языке оффера: RO → name, RU → nameRu
        const field = f === "name" && state.lang === "ru" ? "nameRu" : f;
        const st = S();
        if (it.extraId) {
            const x = (st.extra || []).find(y => y.extraId === it.extraId);
            if (x) x[field] = v;
        } else {
            st.edits = st.edits || {};
            st.edits[it._key] = { ...(st.edits[it._key] || {}), [field]: v };
        }
        recalc();
    });
    // Enter в поле — сразу применить
    $("items").addEventListener("keydown", e => {
        if (e.key === "Enter" && e.target.matches("[data-f]")) { e.preventDefault(); e.target.blur(); }
    });
    $("items").addEventListener("input", e => { if (e.target.matches("textarea.nm")) fitName(e.target); });
    // высоту названий пересчитываем при открытии раздела и смене ширины экрана
    $("items").addEventListener("toggle", e => e.target.querySelectorAll("textarea.nm").forEach(fitName), true);
    window.addEventListener("resize", () => document.querySelectorAll("#items textarea.nm").forEach(fitName));
    $("items").addEventListener("click", e => {
        const btn = e.target.closest("button.x");
        if (!btn) return;
        const it = last.items[Number(btn.closest(".irow").dataset.idx)];
        const st = S();
        if (it.extraId) st.extra = (st.extra || []).filter(y => y.extraId !== it.extraId);
        else { st.edits = st.edits || {}; st.edits[it._key] = { ...(st.edits[it._key] || {}), removed: true }; }
        recalc();
    });
    $("btnDetails").addEventListener("click", () => {
        $("sumDetails").hidden = !$("sumDetails").hidden;
        renderTotals();
    });
    $("btnResetItems").addEventListener("click", () => {
        if (state.manual) { state.edits = {}; state.extra = []; state.manual = false; }
        else { const st = S(); st.edits = {}; st.extra = []; }
        recalc();
    });
    // ---------- новая позиция: из ставок или своя ----------
    function rateLabel(r) {
        const p = r.price && typeof r.price === "object"
            ? `${r.price.base} + ${r.price.perKw}/кВт ${r.cur}`
            : `${r.price} ${r.cur}/${r.unit}`;
        return `${r.ru} — ${p}`;
    }

    // Ставка или модель из прайса (значение «eq:<id>»)
    function refById(id) {
        if (!id) return null;
        if (id.startsWith("eq:")) {
            const e = GEN.eqGet(id.slice(3));
            return e ? { ru: e.ru, ro: e.ro, cat: "main-equipment", unit: "buc", status: e.status || "opt", src: e.src, date: e.date, eq: e } : null;
        }
        return window.RATEBOOK_ACTIVE.rates[id] || null;
    }

    function openAddPanel() {
        const rb = window.RATEBOOK_ACTIVE;
        const groups = {};
        Object.entries(rb.rates).forEach(([id, r]) => { (groups[r.cat] = groups[r.cat] || []).push([id, r]); });
        const brands = {};
        GEN.eqAll().filter(e => GEN.eqNet(e) > 0).forEach(e => { (brands[e.brand] = brands[e.brand] || []).push(e); });
        $("addRate").innerHTML = '<option value="">— своя позиция —</option>' +
            Object.keys(brands).map(b => `<optgroup label="${escapeHtml(b)} — прайс">${brands[b].map(e =>
                `<option value="eq:${escapeHtml(e.id)}">${escapeHtml(`${e.ru} — ${fmt0(cv(GEN.eqNet(e)))} ${curName()} без TVA`)}</option>`).join("")}</optgroup>`).join("") +
            CAT_ORDER.filter(c => groups[c]).map(c =>
            `<optgroup label="${CAT_RU[c]}">${groups[c].map(([id, r]) => `<option value="${id}">${escapeHtml(rateLabel(r))}</option>`).join("")}</optgroup>`).join("");
        $("addCat").innerHTML = CAT_ORDER.map(c => `<option value="${c}">${CAT_RU[c]}</option>`).join("");
        $("addCat").value = "materials";
        $("addVat").innerHTML = vatOptions(rb.vatPct);
        $("addVat").value = String(rb.vatPct);
        $("addCostLabel").textContent = `Цена, ${curName()} без TVA`;
        ["addName", "addCost", "addKw"].forEach(id => { $(id).value = ""; $(id).classList.remove("bad"); });
        $("addQty").value = "1";
        $("addUnit").value = "buc";
        $("addKwBox").hidden = true;
        $("addSectionBox").hidden = state.product !== "pv_bess" || sheetsMode();
        $("addSection").value = "pv";
        $("addHint").textContent = "Выбери ставку — название, раздел, единица и цена подставятся. Или заполни свою позицию.";
        $("addPanel").hidden = false;
        $("addRate").focus();
    }

    function addRateCost() {
        const id = $("addRate").value;
        if (!id) return;
        const ref = refById(id);
        if (ref && ref.eq) { $("addCost").value = Math.round(cv(GEN.eqNet(ref.eq)) * 100) / 100; return; }
        const r = window.RATEBOOK_ACTIVE.rates[id];
        const obj = r.price && typeof r.price === "object";
        const kw = num($("addKw").value);
        $("addCost").value = Math.round(cv(GEN.netMdl(id, obj && !Number.isNaN(kw) ? kw : 0)) * 100) / 100;
    }

    $("addRate").addEventListener("change", () => {
        const id = $("addRate").value;
        const rb = window.RATEBOOK_ACTIVE;
        if (!id) {
            $("addKwBox").hidden = true;
            $("addHint").textContent = "Своя позиция: название, раздел, единица и цена — вручную.";
            return;
        }
        const r = refById(id);
        if (r.eq) {
            if (["bat", "batpm", "guard"].includes(r.eq.kind)) $("addSection").value = "bess";
            $("addName").value = state.lang === "ru" ? r.ru : r.ro;
            $("addCat").value = r.cat;
            $("addVat").value = r.cat === "electrical" ? "0" : String(rb.vatPct);
            $("addUnit").value = r.unit;
            $("addKwBox").hidden = true;
            addRateCost();
            $("addHint").textContent = `${rb.statusLabels[r.status] || ""} · ${r.src} · уровень ${(rb.equipmentLevels || {})[rb.equipmentLevel] || ""} · в прайсе MDL с TVA, здесь — ${curName()} без TVA.`;
            return;
        }
        const obj = r.price && typeof r.price === "object";
        $("addName").value = state.lang === "ru" ? r.ru : r.ro;
        $("addCat").value = r.cat;
        $("addVat").value = r.cat === "electrical" ? "0" : String(rb.vatPct);
        $("addUnit").value = r.unit;
        $("addKwBox").hidden = !obj;
        if (obj && !$("addKw").value) $("addKw").value = state.product === "pv" ? state.pvKwp : state.bessKw || state.pvKwp || 0;
        addRateCost();
        const vat = r.vat === "excl" ? "без TVA" : "с TVA";
        $("addHint").textContent = `${rb.statusLabels[r.status]} · ${r.src} · ${r.date} · в базе ${r.cur} ${vat}, здесь — ${curName()} без TVA по курсу BNM.`;
    });
    $("addKw").addEventListener("input", addRateCost);
    // электромонтаж — всегда без TVA (правило 2026-10-19)
    $("addCat").addEventListener("change", () => { $("addVat").value = $("addCat").value === "electrical" ? "0" : String(window.RATEBOOK_ACTIVE.vatPct); });
    $("btnAddItem").addEventListener("click", () => {
        if ($("addPanel").hidden) openAddPanel();
        else $("addPanel").hidden = true;
    });
    $("btnAddCancel").addEventListener("click", () => { $("addPanel").hidden = true; });
    $("btnAddConfirm").addEventListener("click", () => {
        const id = $("addRate").value;
        const r = refById(id);
        const name = $("addName").value.trim();
        const qty = num($("addQty").value);
        let cost = num($("addCost").value);
        const vatPct = num($("addVat").value);
        if (!Number.isNaN(cost) && isEur()) cost = Math.round(cost * eurRate() * 100) / 100;
        $("addName").classList.toggle("bad", !name);
        $("addQty").classList.toggle("bad", Number.isNaN(qty) || qty <= 0);
        $("addCost").classList.toggle("bad", Number.isNaN(cost));
        if (!name || Number.isNaN(qty) || qty <= 0 || Number.isNaN(cost)) return;
        const cat = $("addCat").value;
        const st = S();
        st.extra = st.extra || [];
        st.extra.push({
            extraId: "x" + Date.now(), category: cat,
            // введённое название — на языке оффера; второй язык берём из ставки, если её не переименовали
            name: state.lang === "ru" ? (r ? r.ro : name) : name,
            nameRu: state.lang === "ru" ? name : (r && name === r.ro ? r.ru : name),
            unit: $("addUnit").value.trim() || "buc", quantity: qty, cost,
            coefficient: window.RATEBOOK_ACTIVE.coefficients[state.segment === "home" ? "home" : "biz"][cat] || 1.2,
            vatPct, rateId: id || undefined,
            section: sheetsMode() ? (isBessSheet(activeSheet()) ? "bess" : "pv") : state.product === "pv_bess" ? $("addSection").value : state.product === "bess" ? "bess" : "pv",
            status: r ? r.status : "opt", src: r ? r.src : "Вручную", date: r ? r.date : ""
        });
        $("addPanel").hidden = true;
        recalc();
    });

    // ---------- оффер ----------
    function offerState(sh = last) {
        // Панели считаем по позициям: генератор не знает о замене панелей вручную.
        const panels = sh.items
            .filter(i => !i.removed && i.unit === "buc" && (i.rateId === "pv_module_wp" || /^panou/i.test(i.name || "")))
            .reduce((s, i) => s + Number(i.quantity || 0), 0);
        return {
            result: { ...sh.result, optionalItems: sh.optionalItems },
            info: { ...sh.info, panels: panels || sh.info.panels },
            meta: {
                client: state.client, location: state.location, leadId: state.leadId, goal: state.goal,
                validDays: state.validDays || 7, manager: "Nikita Ungureanu", managerRole: "Project Manager",
                managerPhone: state.managerPhone,
                acKw: !isBessSheet(sh.sheet) && Number(state.inverterKw) > 0 ? Number(state.inverterKw) : 0,
                roofType: state.segment === "home" && state.product !== "bess" ? state.roofType : "",
                roofMaterial: state.segment === "home" && state.product !== "bess" ? state.roofMaterial : ""
            }
        };
    }

    function offerOpts(extra) {
        const fx = offerFx();
        return { lang: state.lang, logo: LOGO, currency: state.currency, fx: fx.rate, fxDate: fx.date, fxSrc: fx.src, references: chosenReferences(), ...extra };
    }

    // Курс EUR в шаге ④ и в плашке итога
    function renderFx() {
        const fx = offerFx();
        const rate = String(fx.rate).replace(".", ",");
        const src = fx.src === "manual" ? "вручную" : fx.src === "BNM" ? "BNM" : "из «Ставок»";
        $("fxHint").textContent = `Курс EUR ${src} на ${fx.date}: 1 EUR = ${rate} MDL`;
        if (document.activeElement !== $("fxEur")) $("fxEur").value = rate;
        $("btnFxBnm").hidden = fx.src !== "manual";
        $("fxSrc").textContent = fx.src === "manual" ? `Вручную на ${fx.date}. Завтра снова возьмётся курс BNM.`
            : fx.src === "BNM" && fx.iso !== todayIso() ? `Курс BNM за ${fx.date}: сегодняшний ещё не загрузился (нужен интернет).`
            : fx.src === "BNM" ? `Официальный курс BNM на ${fx.date}. Он и попадёт в оффер в EUR.`
            : `Курс BNM не загрузился — взят курс из «Ставок» (${fx.date}).`;
    }

    $("fxEur").addEventListener("change", () => {
        const v = num($("fxEur").value);
        if (!(v > 0)) { $("fxEur").classList.add("bad"); return; }
        $("fxEur").classList.remove("bad");
        state.fxManual = { EUR: v, iso: todayIso() };
        recalc();
    });
    $("btnFxBnm").addEventListener("click", async () => {
        state.fxManual = null;
        await loadBnmFx();
        recalc();
    });

    // ---------- реализованные объекты в оффере ----------
    const REFERENCES = Array.isArray(window.EPC_REFERENCES) ? window.EPC_REFERENCES : [];
    function chosenReferences() {
        return Array.isArray(state.references) ? state.references : REFERENCES.map(r => r.id);
    }
    function renderRefsPick() {
        const box = $("refsPick");
        if (!box) return;
        const on = chosenReferences();
        box.innerHTML = REFERENCES.map(r => `<label><input type="checkbox" value="${escapeHtml(r.id)}"${on.includes(r.id) ? " checked" : ""}> ${escapeHtml(r.title)}</label>`).join("")
            || '<span class="hint">Нет объектов в js/references.js</span>';
    }
    $("refsPick").addEventListener("change", () => {
        state.references = Array.from($("refsPick").querySelectorAll("input:checked")).map(b => b.value);
        persist();
        renderOffer();
    });

    // Оффер всегда виден в конце страницы и собирается заново при каждом пересчёте.
    // Листы с галочкой «в оффере» — отдельными офферами друг под другом (в PDF A4 — каждый с новой страницы);
    // фото объектов — под последним листом.
    function renderOffer() {
        if (!last) return;
        const list = (last.sheets || [last]).filter(x => x.inOffer !== false);
        if (!list.length) { $("offerDoc").innerHTML = '<p class="hint">Ни один лист не отмечен «в оффере» — отметь в шаге ③.</p>'; return; }
        const bessCount = list.filter(x => isBessSheet(x.sheet)).length;
        let b = 0;
        $("offerDoc").innerHTML = list.map((x, i) => OFFER.render(offerState(x), offerOpts({
            editable: true,
            numberSuffix: list.length > 1 ? String(i + 1) : "",
            variant: isBessSheet(x.sheet) && bessCount > 1 ? ++b : 0,
            references: i === list.length - 1 ? chosenReferences() : []
        }))).join("");
    }


    function fileBase() {
        const id = state.leadId ? state.leadId.replace(/[^\w-]/g, "") + "_" : "";
        const d = new Date();
        const p = n => String(n).padStart(2, "0");
        return `OptiSolar_oferta_${id}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    }

    // Выгружается тот оффер, что на странице, вместе с ручными правками текста; каждый лист — отдельно.
    function offerClones(format) {
        return Array.from($("offerDoc").querySelectorAll(".offer-document")).map(el => {
            const doc = el.cloneNode(true);
            doc.querySelectorAll("[contenteditable]").forEach(x => x.removeAttribute("contenteditable"));
            doc.classList.add(format === "a4" ? "offer-a4" : "offer-narrow");
            return doc;
        });
    }

    // ---------- просмотр перед сохранением ----------
    // В окне — ровно то, что попадёт в файл: тот же холст и та же разбивка по листам.
    const preview = { format: "a4", canvases: null, busy: false };

    function pdfReady() {
        if (window.html2canvas && window.jspdf) return true;
        $("previewBody").innerHTML = '<p class="pv-msg">Нет библиотек PDF — нужен интернет.</p>';
        return false;
    }

    async function showPreview(format) {
        preview.format = format === "mobile" ? "mobile" : "a4";
        preview.canvases = null;
        setChips("previewFormat", preview.format);
        $("previewStatus").textContent = "";
        $("btnPreviewPng").hidden = preview.format !== "mobile";
        const body = $("previewBody");
        body.className = "preview-body pv-" + preview.format;
        body.innerHTML = '<p class="pv-msg">Готовлю просмотр…</p>';
        $("previewInfo").textContent = "";
        if (!pdfReady()) return;
        const wanted = preview.format;
        try {
            const clones = offerClones(wanted);
            if (!clones.length) { body.innerHTML = '<p class="pv-msg">Ни один лист не отмечен «в оффере».</p>'; return; }
            const canvases = [];
            for (const node of clones) canvases.push(await OFFER.toCanvas(node, wanted === "a4" ? 794 : 430));
            if (preview.format !== wanted) return; // пока готовили, переключили формат
            // A4: каждый лист оффера с новой страницы; телефон — листы друг под другом
            preview.canvases = wanted === "a4" ? canvases : [OFFER.stackCanvases(canvases)];
            const canvas = preview.canvases[0];
            if (wanted === "a4") {
                const { A4 } = OFFER;
                const pages = canvases.flatMap(cnv => OFFER.a4Pages(cnv).map(pg => ({ ...pg, cnv })));
                body.innerHTML = pages.map((p, i) => `
                  <div class="pv-page">
                    <img src="${OFFER.pageImage(p.cnv, p, 0.85)}" alt="Лист ${i + 1}"
                         style="left:${p.x / A4.w * 100}%;top:${p.top / A4.h * 100}%;width:${p.w / A4.w * 100}%;height:${p.hMm / A4.h * 100}%">
                    <span class="pv-no">${i + 1} / ${pages.length}</span>
                  </div>`).join("");
                $("previewInfo").textContent = `A4 · ${pages.length} ${pages.length === 1 ? "лист" : pages.length < 5 ? "листа" : "листов"}`;
            } else {
                const size = OFFER.phoneSize(canvas);
                body.innerHTML = `<div class="pv-phone"><img src="${canvas.toDataURL("image/jpeg", 0.85)}" alt="Оффер для телефона"></div>`;
                $("previewInfo").textContent = `Телефон · одна страница ${Math.round(size.w)} × ${Math.round(size.h)} мм`;
            }
        } catch (err) {
            console.error(err);
            body.innerHTML = `<p class="pv-msg">Не получилось: ${escapeHtml(err.message)}</p>`;
        }
    }

    function openPreview(format) {
        $("previewModal").hidden = false;
        document.body.classList.add("no-scroll");
        showPreview(format);
        prepareHandoff();
    }

    function closePreview() {
        $("previewModal").hidden = true;
        document.body.classList.remove("no-scroll");
        preview.canvases = null;
    }

    async function savePreview(kind) {
        const status = $("previewStatus");
        if (!preview.canvases) { status.textContent = "Просмотр ещё готовится."; return; }
        try {
            let blob, name;
            if (kind === "png") {
                blob = await new Promise(r => preview.canvases[0].toBlob(r, "image/png"));
                name = fileBase() + "_tel.png";
            } else {
                blob = OFFER.pdfFromCanvases(preview.canvases, preview.format).output("blob");
                name = fileBase() + (preview.format === "a4" ? "_A4.pdf" : "_tel.pdf");
            }
            const how = await OFFER.deliver(blob, name, kind === "share" ? "share" : "download");
            status.textContent = how === "shared" ? "PDF передан в меню «Поделиться». На iPhone выберите Viber, WhatsApp или «Сохранить в Файлы»." : how === "cancelled" ? "Отменено." : how === "telegram-unavailable" ? `Telegram не даёт сохранить файл. Нажмите «${$("btnOpenBrowser").textContent}»: там этот же расчёт, PDF скачивается и отправляется.` : kind === "share" ? `PDF скачан (${name}). Прикрепите его в Telegram через скрепку.` : `Файл скачан: ${name}`;
            $("exportStatus").textContent = status.textContent;
        } catch (err) {
            console.error(err);
            status.textContent = "Не получилось: " + err.message;
        }
    }

    // ---------- Telegram: PDF через внешний браузер ----------
    // В Telegram файл не скачивается, а «Поделиться» с файлом есть не во всех клиентах.
    // Тогда калькулятор открывается в Safari/Chrome с этим же расчётом и оффером
    // (с ручными правками). Всё лежит в адресе после «#» — на сервер это не уходит.
    const IN_TG = OFFER.inTelegram();
    const HANDOFF = "#open=";
    let handoffPacked = null;

    // Ссылку собираем заранее: openLink Telegram выполняет только сразу после нажатия.
    function prepareHandoff() {
        handoffPacked = null;
        if (!IN_TG) return;
        const offers = Array.from($("offerDoc").querySelectorAll(".offer-document")).map(doc => {
            const offer = doc.cloneNode(true);
            offer.querySelectorAll("img").forEach(img => img.removeAttribute("src")); // логотип есть и в браузере
            return offer.outerHTML;
        });
        const job = SYNC.pack(JSON.stringify({ v: 1, state, rb: rbOverrides, fx: fxBnm, offer: offers[0] || "", offers }));
        prepareHandoff.job = job;
        job.then(p => { if (prepareHandoff.job === job) handoffPacked = p; })
            .catch(err => { $("previewStatus").textContent = "Не получилось подготовить ссылку: " + err.message; });
    }

    function openInBrowser() {
        const status = $("previewStatus");
        if (!handoffPacked) { status.textContent = "Ещё готовлю ссылку — нажмите через секунду."; return; }
        const url = location.origin + location.pathname + location.search + HANDOFF + preview.format + "." + handoffPacked;
        try {
            // try_browser — открыть именно Safari, а не встроенный браузер Telegram
            tg.openLink(url, tg.platform === "ios" ? { try_browser: "safari" } : undefined);
            status.textContent = "Открываю браузер с этим расчётом. Там нажмите «Поделиться PDF» или «Скачать PDF».";
        } catch (err) {
            status.textContent = "Не получилось открыть браузер: " + err.message;
        }
    }

    // Принимаем оффер только из своих тегов и без атрибутов-скриптов: ссылку мог собрать кто угодно.
    const OFFER_TAGS = new Set(["ARTICLE", "HEADER", "FOOTER", "SECTION", "DIV", "SPAN", "STRONG", "SMALL", "B", "I", "BR", "H1", "H3", "P", "OL", "LI", "IMG", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
    const OFFER_ATTRS = new Set(["class", "lang", "contenteditable", "alt", "aria-hidden", "data-ref"]);
    function cleanOffer(html) {
        const tpl = document.createElement("template");
        tpl.innerHTML = html;
        const root = tpl.content.firstElementChild;
        if (!root || !root.classList.contains("offer-document")) return null;
        root.querySelectorAll("*").forEach(el => {
            const logo = el.tagName === "IMG" && /\boffer-(watermark|brand-logo)\b/.test(el.className);
            // фото объекта — только из своего списка, адрес берём из js/references.js
            const ref = el.tagName === "IMG" && el.classList.contains("offer-reference-img") ? REFERENCES.find(r => r.id === el.getAttribute("data-ref")) : null;
            if (!OFFER_TAGS.has(el.tagName) || (el.tagName === "IMG" && !logo && !ref)) { el.remove(); return; }
            Array.from(el.attributes).forEach(a => { if (!OFFER_ATTRS.has(a.name)) el.removeAttribute(a.name); });
            if (logo) el.setAttribute("src", LOGO);
            if (ref) el.setAttribute("src", ref.photo);
        });
        Array.from(root.attributes).forEach(a => { if (!OFFER_ATTRS.has(a.name)) root.removeAttribute(a.name); });
        return root;
    }

    async function takeHandoff() {
        const m = location.hash.match(/^#open=(a4|mobile)\.([zj]\.[\w-]+)$/);
        if (!m) return;
        history.replaceState(null, "", location.pathname + location.search);
        try {
            const data = JSON.parse(await SYNC.unpack(m[2]));
            if (!data || data.v !== 1 || !data.state || typeof data.state !== "object") throw new Error("ссылка повреждена");
            state = { ...defaults, ...data.state };
            // ставки из Telegram — только на этот расчёт, базу ставок браузера не переписываем
            if (data.rb && typeof data.rb === "object" && !Array.isArray(data.rb)) { rbOverrides = data.rb; applyRatebook(); }
            // курс — тот же, что был в Telegram при сборке оффера
            if (data.fx && Number(data.fx.EUR) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(data.fx.iso || "")) fxBnm = data.fx;
            fillForm();
            recalc();
            const list = (Array.isArray(data.offers) ? data.offers : [data.offer]).filter(Boolean).map(cleanOffer).filter(Boolean);
            if (list.length) $("offerDoc").replaceChildren(...list);
            openPreview(m[1]);
            $("previewStatus").textContent = "Расчёт из Telegram. «Поделиться PDF» → Viber, WhatsApp или «Сохранить в Файлы».";
        } catch (err) {
            console.error(err);
            $("exportStatus").textContent = "Не удалось открыть расчёт из Telegram: " + err.message;
        }
    }

    if (IN_TG) {
        // «Скачать» и «Печать» в Telegram не работают — оставляем «Поделиться» и внешний браузер
        $("btnPreviewPdf").hidden = true;
        $("btnSharePdf").classList.add("primary");
        $("btnOpenBrowser").hidden = false;
        $("btnOpenBrowser").textContent = tg.platform === "ios" ? "Открыть в Safari" : "Открыть в браузере";
        $("btnOpenBrowser").addEventListener("click", openInBrowser);
        document.querySelectorAll('[data-export="print"]').forEach(b => { b.hidden = true; });
    }

    document.querySelectorAll("[data-preview]").forEach(b => b.addEventListener("click", () => openPreview(b.dataset.preview)));
    document.querySelectorAll("[data-export]").forEach(b => b.addEventListener("click", () => { if (b.dataset.export === "print") window.print(); }));
    $("btnPreviewPdf").addEventListener("click", () => savePreview("pdf"));
    $("btnSharePdf").addEventListener("click", () => savePreview("share"));
    $("btnPreviewPng").addEventListener("click", () => savePreview("png"));
    $("btnClosePreview").addEventListener("click", closePreview);
    $("previewModal").addEventListener("click", e => { if (e.target === $("previewModal")) closePreview(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("previewModal").hidden) closePreview(); });

    // ---------- записка для КД ----------
    function noteText() {
        const { result, info, items } = last;
        const sheetLines = last.sheets.length > 1 ? ["Листы (каждый — отдельный оффер):", ...last.sheets.map(x => {
            const r = x.result, inf = x.info;
            const per = inf.pvKwp > 0 ? `${fmt0(r.commercialPrice / inf.pvKwp)} MDL/кВтп` : inf.bessKwh > 0 ? `${fmt0(r.commercialPrice / inf.bessKwh)} MDL/кВт·ч` : "";
            return `- ${x.name}${x.inOffer ? "" : " (не в оффере)"}: ${inf.title}, ${fmt0(r.priceWithVat)} MDL с TVA, маржа ${r.effectiveMargin.toFixed(1)}%${per ? ", " + per + " без TVA" : ""}`;
        }), "", `Ниже — лист ${last.name}:`] : [];
        const est = items.filter(i => i.status === "est");
        const lines = [
            ...sheetLines,
            `Расчёт ${info.title} — ${state.client || "клиент"}${state.location ? ", " + state.location : ""}${state.leadId ? " (" + state.leadId + ")" : ""}`,
            `Сегмент: ${state.segment === "home" ? "дом" : "бизнес"}, подключение ${info.voltage === "0.4" ? "0,4" : info.voltage} кВ`,
            ...(info.equip && (info.equip.inverter || info.equip.battery) ? [`Оборудование: ${[info.equip.inverter, info.equip.pvInverter, info.equip.battery].filter(Boolean).join(" · ")} (${info.equip.source}, ${info.equip.level})`] : []),
            "",
            `Цена с TVA: ${fmt0(result.priceWithVat)} MDL (≈ ${fmt0(result.priceWithVat / eurRate())} EUR)`,
            `Цена без TVA: ${fmt0(result.commercialPrice)} MDL (≈ ${fmt0(result.commercialPrice / eurRate())} EUR)`,
            `Себестоимость (с косвенными ${result.indirectPct}% и риском ${result.riskPct}%): ${fmt0(result.projectCost)} MDL`,
            `Прибыль: ${fmt0(result.profit)} MDL, маржа ${result.effectiveMargin.toFixed(1)}%`,
            ...(hasTwoBlocks(items) ? (() => {
                const pv = blockSums(result.items, "pv"), bs = blockSums(result.items, "bess");
                const u = (x, per) => per > 0 ? fmt0(x / per) : "—";
                return ["",
                    `A · СЭС: ${fmt0(pv.gross)} MDL с TVA (${u(pv.net, info.pvKwp)} MDL/кВтп без TVA)`,
                    `B · ${bessBlockName()}: ${fmt0(bs.gross)} MDL с TVA (${u(bs.net, info.bessKwh)} MDL/кВт·ч, ${u(bs.net, info.bessKw)} MDL/кВт без TVA)`];
            })() : []),
            "",
            "По разделам (продажа без TVA):"
        ];
        CAT_ORDER.forEach(c => {
            const s = result.items.filter(i => i.category === c).reduce((a, i) => a + i.totalSell, 0);
            if (s) lines.push(`- ${CAT_RU[c]}: ${fmt0(s)}`);
        });
        if (est.length) {
            lines.push("", `По оценке (нужны котировки), ${est.length} поз.:`);
            est.forEach(i => lines.push(`- ${i.nameRu || i.name}: ${fmt0(i.quantity * i.cost)} себест.`));
        }
        if (last.gen.warnings.length) {
            lines.push("", "Предупреждения:");
            last.gen.warnings.forEach(w => lines.push("- " + w));
        }
        lines.push("", "Цена ориентировочная, окончательная — после выезда на объект.");
        return lines.join("\n");
    }
    $("btnNote").addEventListener("click", () => { $("noteText").value = noteText(); $("noteModal").hidden = false; });
    $("btnCloseNote").addEventListener("click", () => { $("noteModal").hidden = true; });
    $("btnCopyNote").addEventListener("click", async () => {
        try { await navigator.clipboard.writeText($("noteText").value); $("btnCopyNote").textContent = "Скопировано"; }
        catch (_) { $("noteText").select(); document.execCommand("copy"); $("btnCopyNote").textContent = "Скопировано"; }
        setTimeout(() => { $("btnCopyNote").textContent = "Копировать"; }, 1500);
    });

    // ---------- проекты ----------
    // В Telegram проекты и правки ставок синхронизируются через облако аккаунта (sync.js),
    // вне Telegram — только в этом браузере.
    const CLOUD = SYNC.available();
    const cloud = { busy: null, again: false, at: null, error: "" };

    // Один проход синхронизации за раз; запрос во время прохода — ещё один проход после него.
    function syncNow() {
        if (!CLOUD) return Promise.resolve();
        if (cloud.busy) { cloud.again = true; return cloud.busy; }
        cloud.busy = (async () => {
            renderSyncInfo("Синхронизация…");
            const local = load(KEY_PROJECTS, []);
            const deleted = load(KEY_PROJECTS_DEL, []);
            const rbAt = Number(load(KEY_RB_AT, 0)) || (Object.keys(rbOverrides).length ? 1 : 0);
            try {
                const r = await SYNC.syncProjects(local, deleted);
                // пока шла синхронизация, могли сохранить или удалить проект — не теряем это
                const delNow = new Set(load(KEY_PROJECTS_DEL, []).filter(id => !deleted.includes(id)));
                const fresh = load(KEY_PROJECTS, []).filter(p => !p.synced && !r.list.some(x => x.id === p.id));
                // один проект — одна запись: если его сохранили на двух устройствах, остаётся последняя,
                // остальные уходят из облака следующим проходом
                const pids = new Set();
                const merged = [...fresh, ...r.list].filter(p => !delNow.has(p.id))
                    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
                    .filter(p => {
                        if (!pids.has(projectKey(p))) { pids.add(projectKey(p)); return true; }
                        delNow.add(p.id);
                        cloud.again = true;
                        return false;
                    });
                save(KEY_PROJECTS, merged);
                save(KEY_PROJECTS_DEL, [...delNow]);
                const rr = await SYNC.syncRates(rbOverrides, rbAt);
                if (rr.action === "upload") save(KEY_RB_AT, rr.at);
                if (rr.action === "download" && (Number(load(KEY_RB_AT, 0)) || 0) <= rbAt) {
                    if (rbAt === 1) save(KEY_RB + "_backup", rbOverrides); // свои правки до первой синхронизации — копия на всякий случай
                    rbOverrides = rr.overrides;
                    save(KEY_RB, rbOverrides);
                    save(KEY_RB_AT, rr.at);
                    applyRatebook();
                    recalc();
                    if ($("tab-rates").classList.contains("active")) renderRates();
                }
                cloud.at = new Date();
                cloud.error = "";
            } catch (err) {
                console.error(err);
                const sent = new Set(local.filter(p => p.synced).map(p => p.id)); // успели отправить до ошибки
                save(KEY_PROJECTS, load(KEY_PROJECTS, []).map(p => sent.has(p.id) ? { ...p, synced: true } : p));
                cloud.error = err.message || String(err);
            } finally {
                cloud.busy = null;
            }
            takeRemoteUpdate();
            renderProjects();
            if (cloud.again) { cloud.again = false; return syncNow(); }
        })();
        return cloud.busy;
    }

    function renderSyncInfo(text) {
        if (!CLOUD) return;
        const t = cloud.at ? cloud.at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "";
        $("syncInfo").textContent = text || (cloud.error
            ? `Нет связи с облаком Telegram (${cloud.error}). Проекты сохранены на этом устройстве и уйдут в облако при следующей синхронизации.`
            : cloud.at ? `Синхронизировано в ${t}.` : "");
        $("syncInfo").classList.toggle("bad-text", !!cloud.error && !text);
    }

    // У проекта два номера: id — запись (в облаке ключ p<id>_…), pid — сам проект, не меняется.
    // Сохранение открытого проекта заменяет его запись новой с тем же pid, а старая удаляется
    // из облака тем же путём, что и «Удалить», — на других устройствах проект тоже обновится.
    const projectKey = p => p.pid || p.id;   // у проектов до 2026-10-29 pid нет
    const openProject = list => state.projectId ? list.find(p => projectKey(p) === state.projectId) : null;
    // KEY_CLEAN: { rev — запись, которая открыта в форме; json — расчёт на момент открытия или сохранения }
    const clean = () => load(KEY_CLEAN, {});
    const unsaved = () => JSON.stringify(state) !== clean().json;
    function markClean(rev) { save(KEY_CLEAN, { rev: rev || null, json: JSON.stringify(state) }); renderProjState(); }

    function loadProject(p) {
        state = { ...defaults, ...p.state, projectId: projectKey(p) };
        fillForm();
        recalc();
        markClean(p.id);
    }
    // Открытый проект пересохранили на другом устройстве: своих правок нет — открыть новую версию,
    // есть — оставить их и предупредить в строке проекта
    function takeRemoteUpdate() {
        const p = openProject(load(KEY_PROJECTS, []));
        const c = clean();
        if (!p || !c.rev || p.id === c.rev || unsaved()) return;
        loadProject(p);
        $("exportStatus").textContent = "Проект обновлён с другого устройства: " + p.name;
    }

    function saveProject(asCopy) {
        if (!last) return;
        const list = load(KEY_PROJECTS, []);
        const old = asCopy ? null : openProject(list);
        const name = `${state.leadId || ""} ${state.client || "Без имени"} — ${last.info.title}`.trim();
        const id = Math.max(Date.now(), ...list.map(p => p.id + 1));
        state.projectId = old ? projectKey(old) : id;
        const entry = { id, pid: state.projectId, savedAt: new Date().toISOString(), name, price: Math.round(last.result.priceWithVat), state: JSON.parse(JSON.stringify(state)) };
        const next = [entry, ...list.filter(p => p !== old)];
        if (save(KEY_PROJECTS, CLOUD ? next : next.slice(0, 100))) {
            // старая запись — на удаление из облака, даже если ещё не ушла туда: синхронизация могла её как раз отправлять
            if (CLOUD && old) save(KEY_PROJECTS_DEL, [...load(KEY_PROJECTS_DEL, []), old.id]);
            persist();
            markClean(id);
            const done = old ? "Проект обновлён" : "Проект сохранён";
            $("exportStatus").textContent = CLOUD ? `${done}, отправляю в облако Telegram: ${name}` : `${done} в этом браузере: ${name}`;
            renderProjects();
            syncNow().then(() => {
                if (!CLOUD) return;
                $("exportStatus").textContent = cloud.error
                    ? `${done} на этом устройстве, в облако пока не ушёл (${cloud.error}). Уйдёт при следующей синхронизации.`
                    : `${done} и виден на всех ваших устройствах в Telegram: ${name}`;
            });
        } else {
            state.projectId = old ? projectKey(old) : null;
            $("exportStatus").textContent = "Не удалось сохранить проект в этом браузере. Откройте приложение по опубликованной HTTPS-ссылке и проверьте, что хранилище браузера доступно.";
        }
        if (tg?.HapticFeedback) { try { tg.HapticFeedback.notificationOccurred("success"); } catch (_) {} }
    }
    $("btnSave").addEventListener("click", () => saveProject(false));
    $("btnSaveCopy").addEventListener("click", () => saveProject(true));

    // Новый проект — с нуля: мощности и цены 0, клиента нет, правок и листов нет.
    // Остаются только выбор системы и личные настройки (язык, телефон, валюты).
    function newProject() {
        if (unsaved() && !confirm("Начать новый проект с нуля? Несохранённые изменения текущего расчёта пропадут.")) return;
        const prev = state;
        const keep = ["segment", "product", "voltage", "mount", "phases", "lang", "managerPhone", "currency", "pricePerKwpCurrency", "bessPriceUnit", "bessPriceCurrency"];
        state = { ...defaults, bessKw: 0, bessKwh: 0 };
        keep.forEach(k => { state[k] = prev[k] ?? defaults[k]; });
        fillForm();
        recalc();
        markClean(null);
        $("exportStatus").textContent = "";
        document.querySelector('.tab[data-tab="calc"]').click();
        window.scrollTo(0, 0);
    }
    document.querySelectorAll("[data-new-project]").forEach(b => b.addEventListener("click", newProject));

    // Строка над шагом ①: какой проект открыт и сохранены ли правки
    function renderProjState() {
        const p = openProject(load(KEY_PROJECTS, []));
        const c = clean();
        const note = !unsaved() ? "сохранён"
            : c.rev && p && p.id !== c.rev ? "изменён на другом устройстве; «Сохранить проект» заменит ту версию этой"
            : "есть несохранённые изменения";
        $("projState").innerHTML = p
            ? `Проект: <b>${escapeHtml(p.name)}</b> · ${note}`
            : "Новый проект — «Сохранить проект» добавит его в список";
        $("btnSaveCopy").hidden = !p;
    }

    function renderProjects() {
        const list = load(KEY_PROJECTS, []);
        $("projectsList").innerHTML = list.length ? list.map(p => `
          <div class="proj${projectKey(p) === state.projectId ? " open" : ""}" data-id="${p.id}">
            <div><b>${escapeHtml(p.name)}</b><br><span class="hint">${new Date(p.savedAt).toLocaleString("ru-RU")} · ${fmt0(p.price)} MDL с TVA${CLOUD && !p.synced ? " · пока только на этом устройстве" : ""}</span></div>
            <div class="buttons small"><button type="button" class="btn" data-act="open">Открыть</button><button type="button" class="btn" data-act="del">Удалить</button></div>
          </div>`).join("") : '<p class="hint">Пока пусто.</p>';
        renderSyncInfo();
        renderProjState();
    }
    $("projectsList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = Number(btn.closest(".proj").dataset.id);
        let list = load(KEY_PROJECTS, []);
        if (btn.dataset.act === "open") {
            const p = list.find(x => x.id === id);
            if (!p) return;
            loadProject(p);
            document.querySelector('.tab[data-tab="calc"]').click();
        } else if (confirm(CLOUD ? "Удалить проект? Он пропадёт на всех ваших устройствах." : "Удалить проект из списка?")) {
            const p = list.find(x => x.id === id);
            list = list.filter(x => x.id !== id);
            save(KEY_PROJECTS, list);
            if (CLOUD && p && p.synced) save(KEY_PROJECTS_DEL, [...load(KEY_PROJECTS_DEL, []), id]);
            renderProjects();
            syncNow();
        }
    });

    if (CLOUD) {
        $("projectsHint").textContent = "Проекты и правки ставок хранятся в облаке вашего аккаунта Telegram и одинаковые на iPhone, Mac и Android.";
        $("btnSync").hidden = false;
        $("btnSync").addEventListener("click", () => syncNow());
        // вернулись в приложение — подтянуть то, что сохранили на другом устройстве
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
    }

    // calc-input.json для tools/calc.py
    $("btnExportInput").addEventListener("click", () => {
        const { items, info } = last;
        const fin = window.RATEBOOK_ACTIVE.financial;
        // в режиме листов выгружается активный лист: СЭС или вариант BESS
        const product = last.sheet === "pv" ? "pv" : isBessSheet(last.sheet) ? "bess" : state.product;
        const station = product === "pv" ? (state.zeroExport ? "zero-export" : "solar-pv") : product === "bess" ? "bess" : (state.zeroExport ? "solar-bess-zero" : "hybrid-bess");
        const out = {
            lead_id: state.leadId || "", name: info.title, client: state.client, location: state.location, goal: state.goal || undefined,
            station, voltage: info.voltage, currency: "MDL",
            technical: { pvPower: info.pvKwp || null, bessCapacityKwh: info.bessKwh || null, pcsPowerKw: info.bessKw || null },
            financial: { indirect: state.indirect ?? fin.indirect, risk: state.risk ?? fin.risk, defaultCoefficient: 1.2, vatEnabled: state.vatEnabled !== false, vatPct: window.RATEBOOK_ACTIVE.vatPct },
            items: items.map(i => ({ category: i.category, name: i.name, unit: i.unit, quantity: i.quantity, cost: i.cost, coefficient: i.coefficient, vatPct: i.vatPct })),
            note: `Калькулятор v2, база ставок ${window.RATEBOOK_ACTIVE.version}; позиций по оценке: ${items.filter(i => i.status === "est").length}`
        };
        OFFER.deliver(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }), "calc-input.json");
    });

    // ---------- ставки ----------
    // Правка ставок помечается временем и через 1,5 с после последнего изменения уходит в облако.
    function saveRates() {
        save(KEY_RB, rbOverrides);
        if (!CLOUD) return;
        save(KEY_RB_AT, Date.now());
        clearTimeout(saveRates.timer);
        saveRates.timer = setTimeout(syncNow, 1500);
    }

    function setOverride(path, value) {
        let o = rbOverrides;
        for (let i = 0; i < path.length - 1; i++) { o[path[i]] = o[path[i]] || {}; o = o[path[i]]; }
        o[path[path.length - 1]] = value;
        saveRates();
        applyRatebook();
        recalc();
    }

    function renderRates() {
        const rb = window.RATEBOOK_ACTIVE;
        $("fxInfo").textContent = `Курсы BNM на ${rb.fx.date}. Себестоимость в MDL без TVA пересчитывается по ним.`;
        $("fxFields").innerHTML = ["EUR", "USD", "RON", "UAH"].map(c => `<div class="field"><label>${c} → MDL</label><input data-fx="${c}" inputmode="decimal" value="${rb.fx[c]}"></div>`).join("");
        $("coefTable").innerHTML = `<table class="coef"><thead><tr><th></th><th>Дом</th><th>Бизнес</th></tr></thead><tbody>${CAT_ORDER.map(c => `<tr><td>${CAT_RU[c]}</td><td><input data-coef="home|${c}" inputmode="decimal" value="${rb.coefficients.home[c]}"></td><td><input data-coef="biz|${c}" inputmode="decimal" value="${rb.coefficients.biz[c]}"></td></tr>`).join("")}</tbody></table>`;
        const q = ($("rateFilter").value || "").toLowerCase();
        const groups = {};
        Object.entries(rb.rates).forEach(([id, r]) => {
            if (q && !(`${r.ru} ${r.ro} ${r.src}`.toLowerCase().includes(q))) return;
            (groups[r.cat] = groups[r.cat] || []).push([id, r]);
        });
        renderEquipRates(q);
        $("ratesList").innerHTML = CAT_ORDER.filter(c => groups[c]).map(c => `<details class="cat" ${q ? "open" : ""}><summary><span>${CAT_RU[c]}</span><b>${groups[c].length}</b></summary>${groups[c].map(([id, r]) => {
            const obj = r.price && typeof r.price === "object";
            const vat = r.vat === "excl" ? "без TVA" : r.vat === "incl21" ? "с TVA 21%" : "с TVA";
            const net = obj ? null : GEN.netMdl(id);
            return `<div class="rate" data-id="${id}">
              <div class="item-name"><span class="badge ${r.status}">${rb.statusLabels[r.status]}</span> ${escapeHtml(r.ru)}</div>
              <div class="item-fields">
                ${obj ? `<label>База<input data-p="base" inputmode="decimal" value="${r.price.base}"></label><label>за кВт<input data-p="perKw" inputmode="decimal" value="${r.price.perKw}"></label>`
                      : `<label>Цена<input data-p="price" inputmode="decimal" value="${r.price}"></label>`}
                <label>Валюта<select data-p="cur">${["MDL", "EUR", "USD", "RON", "UAH"].map(x => `<option${x === r.cur ? " selected" : ""}>${x}</option>`).join("")}</select></label>
                <label>Статус<select data-p="status">${Object.entries(rb.statusLabels).map(([k, v]) => `<option value="${k}"${k === r.status ? " selected" : ""}>${v}</option>`).join("")}</select></label>
              </div>
              <div class="hint">${escapeHtml(r.unit)} · ${vat} · ${escapeHtml(r.date)}${net != null ? ` · ≈ ${fmt(net)} MDL без TVA` : ""}<br>${escapeHtml(r.src)}</div>
            </div>`;
        }).join("")}</details>`).join("");
    }

    function renderEquipRates(q) {
        const rb = window.RATEBOOK_ACTIVE;
        const levels = rb.equipmentLevels || {};
        const loaded = GEN.eqAll().some(e => GEN.eqNet(e) > 0);
        $("eqInfo").textContent = loaded
            ? `${rb.equipmentSource || "Прайс дистрибьютора"}, MDL с TVA. По этим моделям калькулятор подбирает инвертор, аккумулятор, счётчик и мониторинг. В расчёт идёт выбранный уровень, без TVA.`
            : "Цены не загружены: «Импорт» выше → файл цен оборудования. Цены хранятся в облаке Telegram, в публичном файле их нет. Можно вписать цену вручную.";
        $("eqLevel").innerHTML = Object.entries(levels).map(([k, v]) => `<option value="${k}"${k === rb.equipmentLevel ? " selected" : ""}>${v}</option>`).join("");
        const opened = new Set([...$("eqList").querySelectorAll("details[open]")].map(d => d.dataset.brand));
        const brands = {};
        GEN.eqAll().forEach(e => {
            if (q && !(`${e.ru} ${e.ro} ${e.brand} ${e.model}`.toLowerCase().includes(q))) return;
            (brands[e.brand] = brands[e.brand] || []).push(e);
        });
        $("eqList").innerHTML = Object.keys(brands).map(b => `<details class="cat" data-brand="${escapeHtml(b)}" ${q || opened.has(b) ? "open" : ""}><summary><span>${escapeHtml(b)}</span><b>${brands[b].length}</b></summary>${brands[b].map(e => `
            <div class="rate" data-eq="${escapeHtml(e.id)}">
              <div class="item-name"><span class="badge ${e.status || "opt"}">${rb.statusLabels[e.status || "opt"]}</span> ${escapeHtml(e.ru)}</div>
              <div class="item-fields">
                ${Object.entries(levels).map(([k, v]) => `<label>${v}${k === rb.equipmentLevel ? " ✓" : ""}<input data-lvl="${k}" inputmode="decimal" value="${e.price[k] ?? ""}"></label>`).join("")}
              </div>
              <div class="hint">MDL с TVA · в расчёте ≈ ${fmt(GEN.eqNet(e))} MDL без TVA · гарантия ${e.warranty} ${e.warranty < 5 ? "года" : "лет"}${e.edited ? " · изменено вручную " + escapeHtml(e.edited) : ""}<br>${escapeHtml(e.src)}</div>
            </div>`).join("")}</details>`).join("");
    }
    $("eqLevel").addEventListener("change", () => { setOverride(["equipmentLevel"], $("eqLevel").value); renderRates(); });
    $("eqList").addEventListener("change", e => {
        const el = e.target.closest("[data-lvl]");
        if (!el) return;
        const id = el.closest(".rate").dataset.eq;
        const v = num(el.value);
        if (Number.isNaN(v) || v < 0) { el.classList.add("bad"); return; }
        setOverride(["equipment", id, "price", el.dataset.lvl], v);
        setOverride(["equipment", id, "edited"], new Date().toLocaleDateString("ru-RU"));
        renderRates();
    });

    $("rateFilter").addEventListener("input", renderRates);
    $("fxFields").addEventListener("change", e => {
        const c = e.target.dataset.fx; const v = num(e.target.value);
        if (c && !Number.isNaN(v) && v > 0) { setOverride(["fx", c], v); setOverride(["fx", "date"], "вручную"); renderRates(); }
    });
    $("coefTable").addEventListener("change", e => {
        const k = e.target.dataset.coef; const v = num(e.target.value);
        if (k && !Number.isNaN(v) && v > 0) { const [seg, cat] = k.split("|"); setOverride(["coefficients", seg, cat], v); }
    });
    $("ratesList").addEventListener("change", e => {
        const el = e.target.closest("[data-p]");
        if (!el) return;
        const id = el.closest(".rate").dataset.id;
        const p = el.dataset.p;
        const today = new Date();
        const stamp = `${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;
        if (p === "cur" || p === "status") {
            setOverride(["rates", id, p], el.value);
        } else {
            const v = num(el.value);
            if (Number.isNaN(v)) { el.classList.add("bad"); return; }
            if (p === "price") setOverride(["rates", id, "price"], v);
            else setOverride(["rates", id, "price", p], v);
            setOverride(["rates", id, "date"], stamp);
            setOverride(["rates", id, "src"], "Изменено вручную " + today.toLocaleDateString("ru-RU"));
        }
        renderRates();
    });
    $("btnRatesReset").addEventListener("click", () => {
        if (!confirm("Сбросить все ручные изменения ставок к базе? Цены оборудования по моделям останутся.")) return;
        const keep = {};
        ["equipment", "equipmentLevel", "equipmentSource"].forEach(k => { if (rbOverrides[k] !== undefined) keep[k] = rbOverrides[k]; });
        rbOverrides = keep;
        saveRates();
        applyRatebook();
        recalc();
        renderRates();
    });
    $("btnRatesExport").addEventListener("click", () => {
        OFFER.deliver(new Blob([JSON.stringify(window.RATEBOOK_ACTIVE, null, 2)], { type: "application/json" }), `ratebook_${new Date().toISOString().slice(0, 10)}.json`);
    });
    // Файл цен оборудования (optisolar-equipment-prices/1): цены моделей добавляются к правкам ставок,
    // остальные правки не трогаются. Хранятся в облаке Telegram, в публичном ratebook.js их нет.
    const EQ_PRICES = "optisolar-equipment-prices/1";
    function importEquipmentPrices(data) {
        const known = DEFAULT_RB.equipment || {};
        const n = v => (v === null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
        const eq = {};
        Object.entries(data.equipment || {}).forEach(([id, x]) => {
            if (!known[id] || !x || typeof x !== "object") return;
            const p = x.price || {};
            eq[id] = { price: { angro: n(p.angro), installer: n(p.installer), retail: n(p.retail) } };
            if (typeof x.src === "string") eq[id].src = x.src.slice(0, 200);
            if (n(x.stackDiscount) != null) eq[id].stackDiscount = n(x.stackDiscount);
        });
        const count = Object.keys(eq).length;
        if (!count) throw new Error("в файле нет цен моделей");
        const extra = { equipment: eq };
        if ((DEFAULT_RB.equipmentLevels || {})[data.equipmentLevel]) extra.equipmentLevel = data.equipmentLevel;
        if (typeof data.equipmentSource === "string") extra.equipmentSource = data.equipmentSource.slice(0, 120);
        rbOverrides = deepMerge(rbOverrides, extra);
        saveRates();
        applyRatebook();
        recalc();
        renderRates();
        const word = count % 10 === 1 && count % 100 !== 11 ? "модель" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? "модели" : "моделей";
        return `Цены оборудования загружены: ${count} ${word}${extra.equipmentSource ? " (" + extra.equipmentSource + ")" : ""}. ` +
            (CLOUD ? "Они сохранятся в облаке Telegram и появятся на других устройствах." : "Они сохранены в этом браузере.");
    }

    $("btnRatesImport").addEventListener("click", () => $("ratesFile").click());
    $("ratesFile").addEventListener("change", async () => {
        const f = $("ratesFile").files[0];
        if (!f) return;
        try {
            const data = JSON.parse(await f.text());
            $("ratesFile").value = "";
            if (data && data.type === EQ_PRICES) { alert(importEquipmentPrices(data)); return; }
            if (!data.rates || !data.fx) throw new Error("это не база ставок");
            rbOverrides = data;
            saveRates();
            applyRatebook();
            recalc();
            renderRates();
        } catch (err) {
            alert("Не удалось загрузить: " + err.message);
        }
    });

    // ---------- расчёт от Claude: calc-input.json (tools/calc.py) ----------
    // Позиции берутся как есть (генератор выключен), цены — в MDL по курсу из ставок.
    function importCalcInput(data) {
        const inp = data && data.input && Array.isArray(data.input.items) ? data.input : data;
        if (!inp || !Array.isArray(inp.items) || !inp.items.length) throw new Error("в расчёте нет позиций");
        const st = String(inp.station || "solar-pv");
        const product = st === "bess" ? "bess" : /bess/.test(st) ? "pv_bess" : "pv";
        const tech = inp.technical || {};
        const n = v => (v === null || v === undefined || v === "" ? 0 : Number(v) || 0);
        const fin = inp.financial || {};
        const k = inp.currency === "EUR" ? eurRate() : 1;
        const extra = inp.items.map((it, i) => ({
            extraId: "imp" + Date.now().toString(36) + i,
            name: String(it.name || ""), nameRu: String(it.nameRu || it.name || ""),
            category: CAT_RU[it.category] ? it.category : "materials",
            // блок оффера: pv — солнечная станция, bess — накопитель (оффер делится на два блока)
            section: it.section === "pv" || it.section === "bess" ? it.section : "",
            unit: String(it.unit || "lot"),
            quantity: n(it.quantity), cost: n(it.cost) * k,
            coefficient: it.coefficient != null ? n(it.coefficient) : (n(fin.defaultCoefficient) || 1.2),
            vatPct: it.vatPct != null ? n(it.vatPct) : (Number(window.RATEBOOK_ACTIVE.vatPct) || 20),
            status: "opt", src: "Расчёт Claude (calc-input.json)"
        }));
        state = {
            ...defaults,
            lang: state.lang, managerPhone: state.managerPhone || (inp.contact && inp.contact.phone) || "",
            segment: inp.segment === "home" ? "home" : "biz", product,
            voltage: String(inp.voltage || "0.4"),
            zeroExport: /zero/.test(st),
            pvKwp: n(tech.pvPower), inverterKw: n(tech.inverterPower),
            bessKwh: n(tech.bessCapacityKwh) || n(tech.bessCapacity) * 1000,
            bessKw: n(tech.pcsPowerKw) || n(tech.pcsPower) * 1000,
            client: inp.client || "", location: inp.location || "", leadId: inp.lead_id || "", goal: inp.goal || "",
            indirect: fin.indirect != null ? n(fin.indirect) : null, risk: fin.risk != null ? n(fin.risk) : null,
            vatEnabled: fin.vatEnabled !== false,
            currency: inp.currency === "EUR" ? "EUR" : "MDL",
            references: Array.isArray(inp.references) ? inp.references : null,
            manual: true, edits: {}, extra, itemOrder: extra.map(x => x.extraId)
        };
        fillForm();
        recalc();
        document.querySelector('.tab[data-tab="calc"]').click();
        return `${state.client || "Расчёт"} — ${last.info.title}`;
    }

    // Текст: JSON, ссылка/код #project=…, сжатый код z.… / j.… или base64url JSON
    async function parseImport(text) {
        let s = String(text || "").trim();
        if (!s) throw new Error("пусто");
        if (s[0] === "{") return JSON.parse(s);
        const m = s.match(/#project=([\w.-]+)/);
        if (m) s = m[1];
        if (/^[zj]\.[\w-]+$/.test(s)) return JSON.parse(await SYNC.unpack(s));
        const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    }

    async function runImport(getText) {
        const status = $("importStatus");
        try {
            const data = await parseImport(await getText());
            if (data && data.type === EQ_PRICES) {
                status.textContent = importEquipmentPrices(data);
                return true;
            }
            const title = importCalcInput(data);
            status.textContent = "";
            $("exportStatus").textContent = "Открыт расчёт: " + title + ". Проверьте позиции и нажмите «Сохранить проект».";
            return true;
        } catch (err) {
            console.error(err);
            status.textContent = "Не получилось открыть расчёт: " + err.message;
            $("exportStatus").textContent = status.textContent;
            return false;
        }
    }
    $("btnImportText").addEventListener("click", async () => {
        if (await runImport(() => $("importText").value)) $("importText").value = "";
    });
    $("importFile").addEventListener("change", async e => {
        const file = e.target.files && e.target.files[0];
        if (file) await runImport(() => file.text());
        e.target.value = "";
    });
    async function takeProject() {
        if (!/^#project=/.test(location.hash)) return;
        const hash = location.hash;
        history.replaceState(null, "", location.pathname + location.search);
        await runImport(() => hash);
    }

    // ---------- старт ----------
    fillForm();
    recalc();
    // курс BNM на сегодня: сразу при открытии и при возврате в приложение, если он не сегодняшний
    loadBnmFx().then(changed => { if (changed) recalc(); });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && (!fxBnm || fxBnm.iso !== todayIso())) loadBnmFx().then(changed => { if (changed) recalc(); });
    });
    syncTelegramControls();
    takeHandoff();
    takeProject();
    window.addEventListener("hashchange", takeHandoff); // ссылка пришла во вкладку, где калькулятор уже открыт
    window.addEventListener("hashchange", takeProject);
    syncNow();
})();
