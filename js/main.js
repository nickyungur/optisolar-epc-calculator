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
    const KEY_PROJECTS_DEL = "epc2_projects_deleted"; // удалены без связи — убрать из облака
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
                tg.MainButton.onClick(() => $("btnSave").click());
            }
        } catch (_) { /* вне Telegram */ }
    }

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
        pvKwp: 0, inverterKw: 0, pricePerKwp: 0, pricePerKwpCurrency: "MDL", powerIncreasePrice: 0, roofType: "", roofMaterial: "", bessKw: 500, bessKwh: 1000, distanceKm: 50, cableLvM: 50, cableMvM: 300, zeroExport: false,
        client: "", location: "", leadId: "", goal: "", validDays: 7, managerPhone: "",
        indirect: null, risk: null, vatEnabled: true, currency: "MDL",
        edits: {}, extra: []
    };
    let state = { ...defaults, ...load(KEY_STATE, {}) };
    let last = null;

    const $ = id => document.getElementById(id);
    const num = v => {
        const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
    };
    // ---------- валюта показа: MDL или EUR по курсу BNM из ставок ----------
    // Внутри всё считается в MDL; EUR — только пересчёт на экране и в оффере.
    const eurRate = () => Number(window.RATEBOOK_ACTIVE.fx.EUR) || 1;
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
        if (["segment", "product", "voltage"].includes(name)) state.edits = {};
        recalc();
    }));

    // ---------- поля ----------
    const NUM_FIELDS = ["pvKwp", "inverterKw", "pricePerKwp", "powerIncreasePrice", "bessKw", "bessKwh", "distanceKm", "cableLvM", "cableMvM", "validDays", "indirect", "risk"];
    const TEXT_FIELDS = ["client", "location", "leadId", "goal", "managerPhone"];
    NUM_FIELDS.forEach(id => $(id).addEventListener("input", () => {
        const v = num($(id).value);
        $(id).classList.toggle("bad", $(id).value.trim() !== "" && Number.isNaN(v));
        if (!Number.isNaN(v)) {
            state[id] = v;
            if (["pvKwp", "inverterKw", "bessKw", "bessKwh"].includes(id)) state.edits = {};
            recalc();
        }
    }));
    TEXT_FIELDS.forEach(id => $(id).addEventListener("input", () => { state[id] = $(id).value; persist(); renderOffer(); }));
    $("zeroExport").addEventListener("change", () => { state.zeroExport = $("zeroExport").checked; recalc(); });
    $("vatEnabled").addEventListener("change", () => { state.vatEnabled = $("vatEnabled").checked; recalc(); });
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
        ["segment", "product", "voltage", "mount", "lang", "currency"].forEach(n => setChips(n, state[n]));
        NUM_FIELDS.forEach(id => { $(id).value = state[id] ?? ""; });
        $("roofType").value = state.roofType || "";
        $("roofMaterial").value = state.roofMaterial || "";
        $("pricePerKwpCurrency").value = state.pricePerKwpCurrency || "MDL";
        TEXT_FIELDS.forEach(id => { $(id).value = state[id] ?? ""; });
        $("zeroExport").checked = !!state.zeroExport;
        $("vatEnabled").checked = state.vatEnabled !== false;
        const fin = window.RATEBOOK_ACTIVE.financial;
        if (state.indirect == null) $("indirect").value = fin.indirect;
        if (state.risk == null) $("risk").value = fin.risk;
    }

    function updateVisibility() {
        const hasPv = state.product !== "bess";
        const hasBess = state.product !== "pv";
        const biz = state.segment === "biz";
        const home = state.segment === "home";
        const mv = biz && state.voltage !== "0.4";
        document.querySelectorAll("[data-show]").forEach(el => {
            const k = el.dataset.show;
            const show = k === "pv" ? hasPv : k === "inverter" ? (hasPv || (home && hasBess)) : k === "bess" ? hasBess : k === "bess-power" ? (hasBess && biz) : k === "biz" ? biz : k === "mv" ? mv : k === "zero" ? (hasPv && !(biz && hasBess)) : k === "home-roof" ? (home && hasPv) : true;
            el.hidden = !show;
        });
    }

    function persist() {
        save(KEY_STATE, state);
    }

    // ---------- расчёт ----------
    function itemKey(it) {
        return `${it.rateId || "x"}|${it.name}`;
    }

    function isOptionalItem(it) {
        return /^(bat_lv_kwh|ci_cabinet|container_kwh|pcs_kw|ems_ci|ac_dc_home_bess|home_bess_install|cabinet_install|bess_install_mwh|bess_comm_ci|grounding_cab|lv_cable_m|corrugated_90|fire_post|dc_cable_185|lug_185|small_mat_mwh|geodesy|site_m2|gravel_t|crane_h|crane_km|crane_cw|lowboy_km)$/.test(it.rateId || "") || /увеличени[ея] мощности|majorare.*putere/i.test(`${it.name || ""} ${it.nameRu || ""}`);
    }

    function buildItems() {
        const gen = GEN.generate(state);
        // _key — ключ правки по исходному названию генератора: после переименования правки не теряются
        const items = gen.items.map(it => {
            const key = itemKey(it);
            const e = state.edits[key];
            return e ? { ...it, ...e, edited: true, _key: key } : { ...it, _key: key };
        }).filter(it => !it.removed);
        (state.extra || []).forEach(x => items.push({ ...x, edited: true, status: x.status || "opt" }));
        const coreItems = items.filter(it => !isOptionalItem(it));
        const targetPrice = (Number(state.pricePerKwp) || 0) * (state.pricePerKwpCurrency === "EUR" ? eurRate() : 1);
        if (targetPrice > 0 && state.product !== "bess" && gen.info.pvKwp > 0) {
            const currentSell = coreItems.reduce((sum, item) => sum + item.quantity * item.cost * item.coefficient, 0);
            if (currentSell > 0) {
                const factor = targetPrice * gen.info.pvKwp / currentSell;
                coreItems.forEach(item => { item.coefficient *= factor; });
            }
        }
        items.forEach(it => { it.optional = isOptionalItem(it); });
        const order = Array.isArray(state.itemOrder) ? state.itemOrder : [];
        const rank = new Map(order.map((key, i) => [key, i]));
        items.sort((a, b) => (rank.get(a.extraId || a._key || itemKey(a)) ?? 1e9) - (rank.get(b.extraId || b._key || itemKey(b)) ?? 1e9));
        return { gen, items };
    }

    function recalc() {
        updateVisibility();
        const { gen, items } = buildItems();
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
        last = { gen, items: [...result.items, ...optionalResult.items], optionalItems: optionalResult.items, result, info: gen.info };
        renderTotals();
        renderItems();
        renderOffer();
        persist();
    }

    function renderTotals() {
        const { result, gen, info } = last;
        const c = curName();
        const rb = window.RATEBOOK_ACTIVE;
        $("fxHint").textContent = `Курс BNM ${rb.fx.date}: 1 EUR = ${String(rb.fx.EUR).replace(".", ",")} MDL`;
        $("sumGross").textContent = fmt0(cv(result.priceWithVat)) + " " + c;
        $("sumNet").textContent = fmt0(cv(result.commercialPrice)) + " " + c;
        $("sumCost").textContent = fmt0(cv(result.projectCost)) + " " + c;
        $("sumProfit").textContent = fmt0(cv(result.profit)) + " " + c;
        $("sumMargin").textContent = result.effectiveMargin.toFixed(1).replace(".", ",") + "%";
        const m = result.effectiveMargin;
        $("marginPill").textContent = "маржа " + m.toFixed(1).replace(".", ",") + "%";
        $("marginPill").className = "pill " + (m < 0 ? "bad" : m < 8 ? "warn" : "ok");
        const per = [];
        if (info.bessKwh > 0 && state.product !== "pv") per.push(`${fmt0(cv(result.commercialPrice / info.bessKwh))} ${c}/кВт·ч без TVA`);
        if (info.pvKwp > 0 && state.product !== "bess") per.push(`${fmt0(cv(result.commercialPrice / info.pvKwp))} ${c}/кВтп без TVA (солнечная станция)`);
        $("perUnit").textContent = per.join(" · ");
        const pvPrice = $("pvKwPrice");
        if (info.pvKwp > 0 && state.product !== "bess") {
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
        if (Object.keys(state.edits).length || (state.extra || []).length) w.push("Есть ручные правки позиций.");
        $("warnings").innerHTML = w.map(x => `<li>${escapeHtml(x)}</li>`).join("");
        const open = !$("sumDetails").hidden;
        $("btnDetails").textContent = (w.length ? `⚠ ${w.length} · ` : "") + (open ? "Свернуть ▾" : "Подробнее ▴");
    }

    function escapeHtml(v) {
        return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    // Название позиции — на языке оффера: то, что видишь здесь, попадёт в оффер.
    function itemName(it) {
        return state.lang === "ru" ? (it.nameRu || it.name) : it.name;
    }

    function renderItems() {
        const { result } = last;
        const c = curName();
        const labels = window.RATEBOOK_ACTIVE.statusLabels;
        const byCat = {};
        last.items.forEach((it, idx) => { const group = it.optional ? "optional" : it.category; (byCat[group] = byCat[group] || []).push({ it, idx }); });
        const categories = [...CAT_ORDER.filter(cat => byCat[cat]), ...(byCat.optional ? ["optional"] : [])];
        const html = categories.map(cat => {
            const rows = byCat[cat];
            const sum = rows.reduce((s, r) => s + r.it.totalSell, 0);
            const title = cat === "optional" ? "Опционально" : CAT_RU[cat];
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
        state.itemOrder = keys;
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
        if (it.extraId) {
            const x = state.extra.find(y => y.extraId === it.extraId);
            if (x) x[field] = v;
        } else {
            state.edits[it._key] = { ...(state.edits[it._key] || {}), [field]: v };
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
        if (it.extraId) state.extra = state.extra.filter(y => y.extraId !== it.extraId);
        else state.edits[it._key] = { ...(state.edits[it._key] || {}), removed: true };
        recalc();
    });
    $("btnDetails").addEventListener("click", () => {
        $("sumDetails").hidden = !$("sumDetails").hidden;
        renderTotals();
    });
    $("btnResetItems").addEventListener("click", () => { state.edits = {}; state.extra = []; recalc(); });
    // ---------- новая позиция: из ставок или своя ----------
    function rateLabel(r) {
        const p = r.price && typeof r.price === "object"
            ? `${r.price.base} + ${r.price.perKw}/кВт ${r.cur}`
            : `${r.price} ${r.cur}/${r.unit}`;
        return `${r.ru} — ${p}`;
    }

    function openAddPanel() {
        const rb = window.RATEBOOK_ACTIVE;
        const groups = {};
        Object.entries(rb.rates).forEach(([id, r]) => { (groups[r.cat] = groups[r.cat] || []).push([id, r]); });
        $("addRate").innerHTML = '<option value="">— своя позиция —</option>' + CAT_ORDER.filter(c => groups[c]).map(c =>
            `<optgroup label="${CAT_RU[c]}">${groups[c].map(([id, r]) => `<option value="${id}">${escapeHtml(rateLabel(r))}</option>`).join("")}</optgroup>`).join("");
        $("addCat").innerHTML = CAT_ORDER.map(c => `<option value="${c}">${CAT_RU[c]}</option>`).join("");
        $("addCat").value = "materials";
        $("addVat").innerHTML = vatOptions(rb.vatPct);
        $("addCostLabel").textContent = `Цена, ${curName()} без TVA`;
        ["addName", "addCost", "addKw"].forEach(id => { $(id).value = ""; $(id).classList.remove("bad"); });
        $("addQty").value = "1";
        $("addUnit").value = "buc";
        $("addKwBox").hidden = true;
        $("addHint").textContent = "Выбери ставку — название, раздел, единица и цена подставятся. Или заполни свою позицию.";
        $("addPanel").hidden = false;
        $("addRate").focus();
    }

    function addRateCost() {
        const id = $("addRate").value;
        if (!id) return;
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
        const r = rb.rates[id];
        const obj = r.price && typeof r.price === "object";
        $("addName").value = state.lang === "ru" ? r.ru : r.ro;
        $("addCat").value = r.cat;
        $("addUnit").value = r.unit;
        $("addKwBox").hidden = !obj;
        if (obj && !$("addKw").value) $("addKw").value = state.product === "pv" ? state.pvKwp : state.bessKw || state.pvKwp || 0;
        addRateCost();
        const vat = r.vat === "excl" ? "без TVA" : "с TVA";
        $("addHint").textContent = `${rb.statusLabels[r.status]} · ${r.src} · ${r.date} · в базе ${r.cur} ${vat}, здесь — ${curName()} без TVA по курсу BNM.`;
    });
    $("addKw").addEventListener("input", addRateCost);
    $("btnAddItem").addEventListener("click", () => {
        if ($("addPanel").hidden) openAddPanel();
        else $("addPanel").hidden = true;
    });
    $("btnAddCancel").addEventListener("click", () => { $("addPanel").hidden = true; });
    $("btnAddConfirm").addEventListener("click", () => {
        const id = $("addRate").value;
        const r = id ? window.RATEBOOK_ACTIVE.rates[id] : null;
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
        state.extra = state.extra || [];
        state.extra.push({
            extraId: "x" + Date.now(), category: cat,
            // введённое название — на языке оффера; второй язык берём из ставки, если её не переименовали
            name: state.lang === "ru" ? (r ? r.ro : name) : name,
            nameRu: state.lang === "ru" ? name : (r && name === r.ro ? r.ru : name),
            unit: $("addUnit").value.trim() || "buc", quantity: qty, cost,
            coefficient: window.RATEBOOK_ACTIVE.coefficients[state.segment === "home" ? "home" : "biz"][cat] || 1.2,
            vatPct, rateId: id || undefined,
            status: r ? r.status : "opt", src: r ? r.src : "Вручную", date: r ? r.date : ""
        });
        $("addPanel").hidden = true;
        recalc();
    });

    // ---------- оффер ----------
    function offerState() {
        // Панели считаем по позициям: генератор не знает о замене панелей вручную.
        const panels = last.items
            .filter(i => !i.removed && i.unit === "buc" && (i.rateId === "pv_module_wp" || /^panou/i.test(i.name || "")))
            .reduce((s, i) => s + Number(i.quantity || 0), 0);
        return {
            result: { ...last.result, optionalItems: last.optionalItems },
            info: { ...last.info, panels: panels || last.info.panels },
            meta: {
                client: state.client, location: state.location, leadId: state.leadId, goal: state.goal,
                validDays: state.validDays || 7, manager: "Nikita Ungureanu", managerRole: "Project Manager",
                managerPhone: state.managerPhone,
                roofType: state.segment === "home" && state.product !== "bess" ? state.roofType : "",
                roofMaterial: state.segment === "home" && state.product !== "bess" ? state.roofMaterial : ""
            }
        };
    }

    function offerOpts(extra) {
        const rb = window.RATEBOOK_ACTIVE;
        return { lang: state.lang, logo: LOGO, currency: state.currency, fx: rb.fx.EUR, fxDate: rb.fx.date, ...extra };
    }

    // Оффер всегда виден в конце страницы и собирается заново при каждом пересчёте.
    function renderOffer() {
        if (!last) return;
        $("offerDoc").innerHTML = OFFER.render(offerState(), offerOpts({ editable: true }));
    }


    function fileBase() {
        const id = state.leadId ? state.leadId.replace(/[^\w-]/g, "") + "_" : "";
        const d = new Date();
        const p = n => String(n).padStart(2, "0");
        return `OptiSolar_oferta_${id}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
    }

    // Выгружается тот оффер, что на странице, вместе с ручными правками текста.
    function offerClone(format) {
        const doc = $("offerDoc").querySelector(".offer-document").cloneNode(true);
        doc.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
        doc.classList.add(format === "a4" ? "offer-a4" : "offer-narrow");
        return doc;
    }

    // ---------- просмотр перед сохранением ----------
    // В окне — ровно то, что попадёт в файл: тот же холст и та же разбивка по листам.
    const preview = { format: "a4", canvas: null, busy: false };

    function pdfReady() {
        if (window.html2canvas && window.jspdf) return true;
        $("previewBody").innerHTML = '<p class="pv-msg">Нет библиотек PDF — нужен интернет.</p>';
        return false;
    }

    async function showPreview(format) {
        preview.format = format === "mobile" ? "mobile" : "a4";
        preview.canvas = null;
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
            const canvas = await OFFER.toCanvas(offerClone(wanted), wanted === "a4" ? 794 : 430);
            if (preview.format !== wanted) return; // пока готовили, переключили формат
            preview.canvas = canvas;
            if (wanted === "a4") {
                const { A4 } = OFFER;
                const pages = OFFER.a4Pages(canvas);
                body.innerHTML = pages.map((p, i) => `
                  <div class="pv-page">
                    <img src="${OFFER.pageImage(canvas, p, 0.85)}" alt="Лист ${i + 1}"
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
        preview.canvas = null;
    }

    async function savePreview(kind) {
        const status = $("previewStatus");
        if (!preview.canvas) { status.textContent = "Просмотр ещё готовится."; return; }
        try {
            let blob, name;
            if (kind === "png") {
                blob = await new Promise(r => preview.canvas.toBlob(r, "image/png"));
                name = fileBase() + "_tel.png";
            } else {
                blob = OFFER.pdfFromCanvas(preview.canvas, preview.format).output("blob");
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
        const doc = $("offerDoc").querySelector(".offer-document");
        const offer = doc ? doc.cloneNode(true) : null;
        if (offer) offer.querySelectorAll("img").forEach(img => img.removeAttribute("src")); // логотип есть и в браузере
        const job = SYNC.pack(JSON.stringify({ v: 1, state, rb: rbOverrides, offer: offer ? offer.outerHTML : "" }));
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
    const OFFER_ATTRS = new Set(["class", "lang", "contenteditable", "alt", "aria-hidden"]);
    function cleanOffer(html) {
        const tpl = document.createElement("template");
        tpl.innerHTML = html;
        const root = tpl.content.firstElementChild;
        if (!root || !root.classList.contains("offer-document")) return null;
        root.querySelectorAll("*").forEach(el => {
            const logo = el.tagName === "IMG" && /\boffer-(watermark|brand-logo)\b/.test(el.className);
            if (!OFFER_TAGS.has(el.tagName) || (el.tagName === "IMG" && !logo)) { el.remove(); return; }
            Array.from(el.attributes).forEach(a => { if (!OFFER_ATTRS.has(a.name)) el.removeAttribute(a.name); });
            if (logo) el.setAttribute("src", LOGO);
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
            fillForm();
            recalc();
            const offer = data.offer ? cleanOffer(data.offer) : null;
            if (offer) $("offerDoc").replaceChildren(offer);
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
        const est = items.filter(i => i.status === "est");
        const lines = [
            `Расчёт ${info.title} — ${state.client || "клиент"}${state.location ? ", " + state.location : ""}${state.leadId ? " (" + state.leadId + ")" : ""}`,
            `Сегмент: ${state.segment === "home" ? "дом" : "бизнес"}, подключение ${info.voltage === "0.4" ? "0,4" : info.voltage} кВ`,
            "",
            `Цена с TVA: ${fmt0(result.priceWithVat)} MDL (≈ ${fmt0(result.priceWithVat / eurRate())} EUR)`,
            `Цена без TVA: ${fmt0(result.commercialPrice)} MDL (≈ ${fmt0(result.commercialPrice / eurRate())} EUR)`,
            `Себестоимость (с косвенными ${result.indirectPct}% и риском ${result.riskPct}%): ${fmt0(result.projectCost)} MDL`,
            `Прибыль: ${fmt0(result.profit)} MDL, маржа ${result.effectiveMargin.toFixed(1)}%`,
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
                save(KEY_PROJECTS, [...fresh, ...r.list].filter(p => !delNow.has(p.id)));
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

    function saveProject() {
        const list = load(KEY_PROJECTS, []);
        const name = `${state.leadId || ""} ${state.client || "Без имени"} — ${last.info.title}`.trim();
        list.unshift({ id: Date.now(), savedAt: new Date().toISOString(), name, price: Math.round(last.result.priceWithVat), state: JSON.parse(JSON.stringify(state)) });
        if (save(KEY_PROJECTS, CLOUD ? list : list.slice(0, 100))) {
            $("exportStatus").textContent = CLOUD ? "Проект сохранён, отправляю в облако Telegram: " + name : "Проект сохранён в этом браузере: " + name;
            renderProjects();
            syncNow().then(() => {
                if (!CLOUD) return;
                $("exportStatus").textContent = cloud.error
                    ? `Проект сохранён на этом устройстве, в облако пока не ушёл (${cloud.error}). Уйдёт при следующей синхронизации.`
                    : "Проект сохранён и виден на всех ваших устройствах в Telegram: " + name;
            });
        } else {
            $("exportStatus").textContent = "Не удалось сохранить проект в этом браузере. Откройте приложение по опубликованной HTTPS-ссылке и проверьте, что хранилище браузера доступно.";
        }
        if (tg?.HapticFeedback) { try { tg.HapticFeedback.notificationOccurred("success"); } catch (_) {} }
    }
    $("btnSave").addEventListener("click", saveProject);

    function renderProjects() {
        const list = load(KEY_PROJECTS, []);
        $("projectsList").innerHTML = list.length ? list.map(p => `
          <div class="proj" data-id="${p.id}">
            <div><b>${escapeHtml(p.name)}</b><br><span class="hint">${new Date(p.savedAt).toLocaleString("ru-RU")} · ${fmt0(p.price)} MDL с TVA${CLOUD && !p.synced ? " · пока только на этом устройстве" : ""}</span></div>
            <div class="buttons small"><button type="button" class="btn" data-act="open">Открыть</button><button type="button" class="btn" data-act="del">Удалить</button></div>
          </div>`).join("") : '<p class="hint">Пока пусто.</p>';
        renderSyncInfo();
    }
    $("projectsList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const id = Number(btn.closest(".proj").dataset.id);
        let list = load(KEY_PROJECTS, []);
        if (btn.dataset.act === "open") {
            const p = list.find(x => x.id === id);
            if (!p) return;
            state = { ...defaults, ...p.state };
            fillForm();
            recalc();
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
        const station = state.product === "pv" ? (state.zeroExport ? "zero-export" : "solar-pv") : state.product === "bess" ? "bess" : (state.zeroExport ? "solar-bess-zero" : "hybrid-bess");
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
        if (!confirm("Сбросить все ручные изменения ставок к базе?")) return;
        rbOverrides = {};
        saveRates();
        applyRatebook();
        recalc();
        renderRates();
    });
    $("btnRatesExport").addEventListener("click", () => {
        OFFER.deliver(new Blob([JSON.stringify(window.RATEBOOK_ACTIVE, null, 2)], { type: "application/json" }), `ratebook_${new Date().toISOString().slice(0, 10)}.json`);
    });
    $("btnRatesImport").addEventListener("click", () => $("ratesFile").click());
    $("ratesFile").addEventListener("change", async () => {
        const f = $("ratesFile").files[0];
        if (!f) return;
        try {
            const data = JSON.parse(await f.text());
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

    // ---------- старт ----------
    fillForm();
    recalc();
    syncTelegramControls();
    takeHandoff();
    window.addEventListener("hashchange", takeHandoff); // ссылка пришла во вкладку, где калькулятор уже открыт
    syncNow();
})();
