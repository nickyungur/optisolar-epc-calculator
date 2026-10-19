// =========================================
// ГЕНЕРАТОР ПОЗИЦИЙ — калькулятор v2
// Вход: сегмент, продукт, кВтп, кВт, кВт·ч, напряжение, расстояния.
// Выход: позиции в формате движка calculator.js (category, name, unit,
// quantity, cost — MDL без TVA за единицу, coefficient, vatPct) + пометки.
// Движок calculateProject не меняется.
// =========================================

(function () {
    "use strict";

    function rb() {
        return window.RATEBOOK_ACTIVE || window.RATEBOOK;
    }

    function vatDivisor(rate) {
        if (rate.vat === "incl") return 1 + rb().vatPct / 100;
        if (rate.vat === "incl21") return 1.21;
        return 1;
    }

    // Цена ставки за единицу в MDL без TVA. kw — для ставок вида {base, perKw}.
    function netMdl(rateId, kw) {
        const rate = rb().rates[rateId];
        if (!rate) throw new Error("Нет ставки " + rateId);
        let price = rate.price;
        if (price && typeof price === "object") {
            price = Number(price.base || 0) + Number(price.perKw || 0) * Number(kw || 0);
        }
        const fx = Number(rb().fx[rate.cur] || 1);
        return Number(price) * fx / vatDivisor(rate);
    }

    function pickStd(sizes, value) {
        for (const size of sizes) {
            if (size >= value) return size;
        }
        return sizes[sizes.length - 1];
    }

    function round2(x) {
        return Math.round(x * 100) / 100;
    }

    function fmtKw(kw) {
        return kw >= 1000 ? `${round2(kw / 1000)} MW` : `${round2(kw)} kW`;
    }

    function fmtKwh(kwh) {
        return kwh >= 1000 ? `${round2(kwh / 1000)} MWh` : `${round2(kwh)} kWh`;
    }

    function parseRateDate(text) {
        const m = String(text || "").match(/(\d{2})\.(\d{4})/);
        if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 15);
        const y = String(text || "").match(/(\d{4})/);
        if (y) return new Date(Number(y[1]), 5, 30);
        return null;
    }

    const IMPORTED = new Set(["pv_module_wp", "inv_ongrid", "inv_hybrid", "bat_lv_kwh", "ci_cabinet", "container_kwh", "pcs_kw", "ems_ci", "mount_roof_kwp", "mount_ground_kwp"]);

    // Блок оффера (section): pv — солнечная станция, bess — аккумулятор / BESS.
    // Ставки, которые бывают только у накопителя, — в блоке BESS. Общие работы (проект, сдача,
    // линия и оборудование СН) — в блоке СЭС: блок BESS показывает, сколько добавляет батарея.
    const BESS_RATES = new Set(["foundation_design", "foundation_design_small", "bat_lv_kwh", "ci_cabinet", "ems_ci", "container_kwh", "pcs_kw",
        "ac_dc_home_bess", "grounding_cab", "fire_post", "dc_cable_185", "lug_185", "small_mat_mwh", "lightning_set", "lv_cable_m", "corrugated_90",
        "foundation_m3", "geodesy", "site_m2", "gravel_t", "crane_h", "crane_km", "crane_cw", "lowboy_km",
        "home_bess_install", "cabinet_install", "bess_install_mwh", "lv_cable_lay_m", "bess_comm_ci", "ecology"]);

    // =========================================
    // ПОДБОР ОБОРУДОВАНИЯ ПО МОДЕЛЯМ (RATEBOOK.equipment; цены — из файла импорта)
    // Инвертор, аккумулятор и аксессуары — самый дешёвый подходящий вариант
    // по уровню цены RATEBOOK.equipmentLevel; бренд и модели можно выбрать вручную.
    // Модели куплены в Молдове — в «импорт и таможня» не входят.
    // =========================================
    const BRAND_FAMS = { auto: ["luna", "lv", "hv", "grid"], huawei: ["luna", "grid"], solis: ["lv", "hv"], market: [] };
    // Инвертор может быть до 5% меньше расчётной мощности (панели ÷ 1,15): перегруз DC/AC до ≈ 1,2
    const KW_TOL = 0.95;

    function eqAll() {
        return Object.entries(rb().equipment || {}).map(([id, e]) => ({ id, ...e }));
    }

    function eqGet(id) {
        const e = (rb().equipment || {})[id];
        return e ? { id, ...e } : null;
    }

    // Цена модели за шт в MDL без TVA по выбранному уровню; 0 — цены нет
    function eqNet(e, raw) {
        const lvl = rb().equipmentLevel || "angro";
        const p = e.price;
        const v = raw != null ? raw : (p && typeof p === "object" ? Number(p[lvl] ?? p.angro) : Number(p));
        if (!(v > 0)) return 0;
        const fx = Number(rb().fx[e.cur || "MDL"] || 1);
        return v * fx / (e.vat === "excl" ? 1 : 1 + rb().vatPct / 100);
    }

    function eqLabel(e) {
        return `${e.brand} ${e.model}`;
    }

    // Модули поровну по стойкам; у LUNA цена модуля ниже, когда в стойке их больше
    function stackSplit(n, perStack) {
        const stacks = Math.max(1, Math.ceil(n / perStack - 1e-9));
        const sizes = [];
        for (let s = 0; s < stacks; s++) sizes.push(Math.floor(n / stacks) + (s < n % stacks ? 1 : 0));
        return sizes;
    }

    // Батарея семейства на ёмкость kwh: [{e, n, unitCost}], ёмкость, цена
    function batterySet(fam, kwh, phases, choiceId) {
        const all = eqAll().filter(e => e.fam === fam && eqNet(e) > 0);
        if (fam === "luna") {
            const mod = all.find(e => e.kind === "bat");
            const pm = all.find(e => e.kind === "batpm");
            const guard = all.find(e => e.kind === "guard" && e.phases === (phases === 1 ? 1 : 3));
            if (!mod || !pm) return null;
            const n = Math.max(1, Math.ceil(kwh / mod.kwh - 1e-9));
            const sizes = stackSplit(n, mod.perStack || 3);
            const disc = eqNet(mod, mod.stackDiscount || 0);
            const modCost = sizes.reduce((s, k) => s + k * (eqNet(mod) - disc * (k - 1)), 0);
            const parts = [{ e: mod, n, unitCost: modCost / n }, { e: pm, n: sizes.length }];
            if (guard) parts.push({ e: guard, n: 1 });
            return { fam, parts, kwh: n * mod.kwh, stacks: sizes.length, cost: parts.reduce((s, p) => s + p.n * (p.unitCost ?? eqNet(p.e)), 0) };
        }
        if (fam === "lv") {
            let best = null;
            all.filter(e => e.kind === "bat" && (!choiceId || e.id === choiceId)).forEach(e => {
                const n = Math.max(1, Math.ceil(kwh / e.kwh - 1e-9));
                const cost = n * eqNet(e);
                if (!best || cost < best.cost - 0.5 || (Math.abs(cost - best.cost) <= 0.5 && n < best.parts[0].n)) {
                    best = { fam, parts: [{ e, n }], kwh: n * e.kwh, stacks: n, cost };
                }
            });
            return best;
        }
        if (fam === "hv") {
            const mod = all.find(e => e.kind === "bat");
            const bdu = all.find(e => e.kind === "batpm");
            if (!mod || !bdu) return null;
            const n = Math.max(mod.minPerStack || 1, Math.ceil(kwh / mod.kwh - 1e-9));
            const stacks = Math.ceil(n / (mod.perStack || 15) - 1e-9);
            const parts = [{ e: mod, n }, { e: bdu, n: stacks }];
            return { fam, parts, kwh: n * mod.kwh, stacks, cost: parts.reduce((s, p) => s + p.n * eqNet(p.e), 0) };
        }
        return null;
    }

    // Инверторы на мощность need: один тип × n или крупный × k + один меньший того же бренда (не меньше 1/5 крупного).
    // Сравнение: цена + 4% за каждый лишний инвертор (монтаж, защита, кабели) → меньше запас.
    function inverterCombo(cands, need, maxUnits) {
        let best = null;
        const consider = parts => {
            const cost = parts.reduce((s, p) => s + p.n * eqNet(p.e), 0);
            const kw = parts.reduce((s, p) => s + p.n * p.e.kw, 0);
            const units = parts.reduce((s, p) => s + p.n, 0);
            if (kw + 1e-9 < need * KW_TOL || units > maxUnits) return;
            const rank = cost * (1 + 0.04 * (units - 1));
            if (!best || rank < best.rank - 0.5 || (Math.abs(rank - best.rank) <= 0.5 && kw < best.kw)) {
                best = { parts, cost, kw, units, rank };
            }
        };
        cands.forEach(a => {
            const n = Math.max(1, Math.ceil(need * KW_TOL / a.kw - 1e-9));
            consider([{ e: a, n }]);
            for (let k = 1; k < n; k++) {
                const rest = need * KW_TOL - k * a.kw;
                cands.forEach(b => { if (b.id !== a.id && b.kw < a.kw && b.kw >= a.kw / 5 && b.brand === a.brand && b.kw + 1e-9 >= rest) consider([{ e: a, n: k }, { e: b, n: 1 }]); });
            }
        });
        return best;
    }

    // p: {seg, hasPv, hasBess, pvAcKw, homeKw, bessKw, bessKwh, phases, brand, invChoice, batChoice, smallBiz, cabinetCost}
    // → {hybInv, battery, pvInv, topology, family, invOptions, batOptions, warnings}
    //   hybInv — гибридный инвертор с батареей (дом; малый BESS бизнеса), pvInv — сетевые инверторы СЭС
    function selectEquipment(p) {
        const out = { hybInv: null, battery: null, pvInv: null, topology: null, family: "", invOptions: [], batOptions: [], warnings: [] };
        const brand = BRAND_FAMS[p.brand] ? p.brand : "auto";
        const fams = BRAND_FAMS[brand];
        if (!fams.length || !Object.keys(rb().equipment || {}).length) return out;
        const phases = p.seg === "home" && Number(p.phases) === 1 ? 1 : 3;
        const inv = eqAll().filter(e => e.kind === "inv" && eqNet(e) > 0 && fams.includes(e.fam) && e.phases === phases);
        // выбор вручную действует, только если модель подходит к этому расчёту (бренд, фазы)
        let chosenInv = p.invChoice ? eqGet(p.invChoice) : null;
        let chosenBat = p.batChoice && p.batChoice !== "cabinet" ? eqGet(p.batChoice) : null;
        if (chosenInv && !inv.some(e => e.id === chosenInv.id)) { chosenInv = null; out.ignoredInv = true; }
        if (chosenBat && !fams.includes(chosenBat.fam)) { chosenBat = null; out.ignoredBat = true; }
        const one = e => ({ parts: [{ e, n: 1 }], kw: e.kw, units: 1, cost: eqNet(e) });
        const tag = x => `${Math.round(x).toLocaleString("ru-RU")} MDL без TVA`;

        // ---------- гибрид с батареей: дом с батареей или малый BESS бизнеса (0,4 кВ, до 50 кВт) ----------
        const homeBess = p.seg === "home" && p.hasBess;
        const bizSmall = p.seg === "biz" && p.hasBess && p.smallBiz;
        let pvOnHybrid = false;
        if (homeBess || bizSmall) {
            const famList = (homeBess ? ["luna", "lv"] : ["hv"]).filter(f => fams.includes(f));
            const hybChoice = chosenInv && famList.includes(chosenInv.fam) ? chosenInv : null;
            const hybBat = chosenBat && famList.includes(chosenBat.fam) ? chosenBat : null;
            if (homeBess && chosenInv && !hybChoice) { out.ignoredInv = true; chosenInv = null; }
            if (chosenBat && !hybBat) { out.ignoredBat = true; chosenBat = null; }
            const variants = [];
            famList.forEach(fam => {
                const cands = inv.filter(e => e.fam === fam);
                // у бизнеса СЭС садится на гибрид, если влезает; иначе у неё свои сетевые инверторы
                const maxKw = Math.max(0, ...cands.map(e => e.kw));
                const need = homeBess ? p.homeKw : (Math.max(p.bessKw, p.pvAcKw) <= maxKw ? Math.max(p.bessKw, p.pvAcKw) : p.bessKw);
                const fit = cands.filter(e => e.kw + 1e-9 >= need * KW_TOL);
                out.invOptions.push(...fit);
                const pick = hybChoice && hybChoice.fam === fam ? hybChoice : fit.slice().sort((a, b) => eqNet(a) - eqNet(b))[0];
                if (!pick) return;
                const bat = batterySet(fam, p.bessKwh, phases, hybBat && hybBat.fam === fam ? hybBat.id : "");
                if (!bat) return;
                variants.push({ fam, need, inv: one(pick), bat, cost: eqNet(pick) + bat.cost });
                if (fam === "lv") eqAll().filter(e => e.fam === "lv" && e.kind === "bat" && eqNet(e) > 0)
                    .forEach(e => out.batOptions.push({ id: e.id, label: `${eqLabel(e)} ${e.kwh} кВт·ч · ${tag(eqNet(e))}` }));
                else {
                    const mod = bat.parts[0].e;
                    out.batOptions.push({ id: mod.id, label: `${eqLabel(mod)} — модули по ${String(mod.kwh).replace(".", ",")} кВт·ч · ${tag(eqNet(mod))}` });
                }
            });
            if (bizSmall) out.batOptions.push({ id: "cabinet", label: "Шкаф BESS C&I 100 кВт / 215 кВт·ч (рыночная ставка)" });
            let v = null;
            if (hybChoice) v = variants.find(x => x.fam === hybChoice.fam) || null;
            if (!v && hybBat) v = variants.find(x => x.fam === hybBat.fam) || null;
            if (!v) v = variants.slice().sort((a, b) => a.cost - b.cost)[0] || null;
            // бизнес: шкаф по рыночной ставке, если выбран вручную или если он дешевле
            if (bizSmall && p.batChoice === "cabinet" && !hybChoice) v = null;
            if (v && bizSmall && !hybChoice && !hybBat && brand === "auto" && v.cost > p.cabinetCost) v = null;
            if (v) {
                out.hybInv = v.inv;
                out.battery = v.bat;
                out.family = v.fam;
                out.topology = homeBess ? "home" : "hv";
                pvOnHybrid = homeBess || v.need >= p.pvAcKw;
                out.pvOnHybrid = pvOnHybrid && p.hasPv;
                const ie = v.inv.parts[0].e;
                if (ie.kw + 1e-9 < v.need * KW_TOL) out.warnings.push(`Инвертор ${eqLabel(ie)} — ${ie.kw} кВт, а нужно ≈ ${round2(v.need)} кВт.`);
                if (hybBat && hybBat.fam !== v.fam) out.warnings.push(`${eqLabel(hybBat)} не подходит к ${eqLabel(ie)} — батарея подобрана автоматически.`);
                if (v.fam === "luna" && v.bat.stacks > 2) out.warnings.push(`LUNA2000: ${v.bat.stacks} стойки на один инвертор — сверить с Huawei.`);
                if (v.fam === "hv") out.warnings.push("Dyness STACK280: 3–15 модулей на один SBDU 200 — по данным магазинов, сверить с даташитом и поставщиком.");
            } else if (homeBess) {
                out.warnings.push(`В прайсе нет гибридного инвертора (${phases === 1 ? "1 фаза" : "3 фазы"}) от ${round2(p.homeKw)} кВт с батареей — посчитано по рыночной ставке.`);
            }
        }

        // ---------- сетевые инверторы СЭС ----------
        if (p.hasPv && p.pvAcKw > 0 && !pvOnHybrid && !(homeBess && !out.hybInv)) {
            const pvChoice = !out.hybInv && chosenInv ? chosenInv : null;
            if (!out.hybInv) out.invOptions = inv.slice();
            if (pvChoice) {
                const n = Math.max(1, Math.ceil(p.pvAcKw * KW_TOL / pvChoice.kw - 1e-9));
                out.pvInv = { parts: [{ e: pvChoice, n }], kw: n * pvChoice.kw, units: n, cost: n * eqNet(pvChoice) };
            } else {
                // дому — один инвертор, если такой есть
                out.pvInv = p.seg === "home" ? (inverterCombo(inv, p.pvAcKw, 1) || inverterCombo(inv, p.pvAcKw, 3)) : inverterCombo(inv, p.pvAcKw, 999);
            }
            if (out.pvInv && !out.family) out.family = out.pvInv.parts[0].e.fam;
        }
        out.invOptions = uniq(out.invOptions);
        // выбранная модель не попала в расчёт — интерфейс сбросит выбор на «Авто»
        const used = (c, id) => !!c && c.parts.some(x => x.e.id === id);
        if (chosenInv && !used(out.hybInv, chosenInv.id) && !used(out.pvInv, chosenInv.id)) out.ignoredInv = true;
        if (chosenBat && !used(out.battery, chosenBat.id)) out.ignoredBat = true;
        return out;
    }

    function uniq(list) {
        const seen = new Set();
        return list.filter(e => !seen.has(e.id) && seen.add(e.id)).sort((a, b) => a.kw - b.kw || eqNet(a) - eqNet(b));
    }

    function generate(input) {
        const book = rb();
        const N = book.norms;
        const seg = input.segment === "home" ? "home" : "biz";
        const product = input.product || "pv_bess";
        const pvKwp = Math.max(0, Number(input.pvKwp) || 0);
        const requestedInverterKw = Math.max(0, Number(input.inverterKw) || 0);
        const bessKwh = Math.max(0, Number(input.bessKwh) || 0);
        const enteredBessKw = Math.max(0, Number(input.bessKw) || 0);
        const homeInverterSizes = [3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50];
        const homeAutoKw = Math.max(requestedInverterKw || bessKwh / 2, product !== "bess" && pvKwp > 0 ? (requestedInverterKw || pvKwp / 1.15) : 0);
        const bessKw = seg === "home" && product !== "pv"
            ? pickStd(homeInverterSizes, homeAutoKw)
            : enteredBessKw;
        const hasPv = product !== "bess" && pvKwp > 0;
        const defSec = hasPv ? "pv" : "bess";
        const hasBess = product !== "pv" && bessKwh > 0 && bessKw > 0;
        let voltage = String(input.voltage || "0.4");
        if (seg === "home") voltage = "0.4";
        const mv = voltage !== "0.4";
        const distanceKm = Math.max(0, Number(input.distanceKm) || 0);
        const cableLvM = Math.max(0, Number(input.cableLvM) || 0);
        const cableMvM = mv ? Math.max(0, Number(input.cableMvM) || 0) : 0;
        const mount = input.mount === "ground" ? "ground" : "roof";

        const items = [];
        const warnings = [];
        const info = {};
        const phases = seg === "home" && String(input.phases) === "1" ? 1 : 3;

        // ---------- Подбор моделей из прайса ----------
        const pvAcNeed = hasPv ? (requestedInverterKw || pvKwp / 1.15) : 0;
        const cabUnits = Math.max(Math.ceil(bessKwh / N.cabinetKwh - 1e-9), Math.ceil(bessKw / N.cabinetKw - 1e-9), 1);
        const importK = 1 + (Number(book.rates.import_pct && book.rates.import_pct.price) || 0) / 100;
        const sel = selectEquipment({
            seg, hasPv, hasBess, pvAcKw: pvAcNeed, homeKw: homeAutoKw, bessKw, bessKwh, phases,
            brand: input.eqBrand || "auto", invChoice: input.eqInverter || "", batChoice: input.eqBattery || "",
            smallBiz: seg === "biz" && bessKw <= 50 && bessKwh <= 215 && !(mv && bessKwh >= N.containerFromKwh),
            cabinetCost: (cabUnits * netMdl("ci_cabinet") + netMdl("ems_ci")) * importK
        });
        sel.warnings.forEach(w => warnings.push(w));

        function addEq(e, quantity, opts = {}) {
            const qty = Number(quantity);
            if (!(qty > 0)) return null;
            const level = (book.equipmentLevels || {})[book.equipmentLevel || "angro"] || "";
            const item = {
                category: "main-equipment",
                name: e.ro,
                nameRu: e.ru,
                unit: "buc",
                quantity: round2(qty),
                cost: round2(opts.unitCost != null ? opts.unitCost : eqNet(e)),
                coefficient: book.coefficients[seg]["main-equipment"] ?? 1.2,
                vatPct: book.vatPct,
                rateId: "eq:" + e.id,
                status: e.status || "opt",
                src: `${e.src} · ${level}`,
                date: e.date,
                auto: true,
                bessPart: !!opts.bessPart,
                section: opts.section || (opts.bessPart ? "bess" : defSec)
            };
            items.push(item);
            return item;
        }
        const addCombo = (combo, section) => combo.parts.forEach(x => addEq(x.e, x.n, { section }));
        const addBattery = bat => bat.parts.forEach(x => addEq(x.e, x.n, { unitCost: x.unitCost, bessPart: true }));

        function add(rateId, quantity, opts = {}) {
            const qty = Number(quantity);
            if (!(qty > 0)) return null;
            const rate = book.rates[rateId];
            const unitCost = opts.unitCost != null ? opts.unitCost : netMdl(rateId, opts.kw);
            const item = {
                category: rate.cat,
                name: opts.name || rate.ro,
                nameRu: opts.nameRu || rate.ru,
                unit: opts.unit || rate.unit,
                quantity: round2(qty),
                cost: round2(unitCost),
                coefficient: book.coefficients[seg][rate.cat] ?? 1.2,
                vatPct: book.vatPct,
                rateId,
                status: rate.status,
                src: rate.src,
                date: rate.date,
                auto: true,
                section: opts.section || (BESS_RATES.has(rateId) ? "bess" : defSec)
            };
            items.push(item);
            return item;
        }

        // ---------- Топология BESS ----------
        let topology = null;
        let units = 0;
        if (hasBess) {
            if (seg === "home") topology = "home";
            else if (sel.topology === "hv") topology = "hv";
            else if (mv && bessKwh >= N.containerFromKwh) topology = "container";
            else topology = "cabinet";

            const hours = bessKwh / bessKw;
            info.hours = round2(hours);
            if (hours < 0.5 || hours > 6) {
                warnings.push(`Ёмкость/мощность = ${round2(hours)} ч — обычно 1–4 ч. Проверь кВт и кВт·ч.`);
            }
            if (seg === "biz" && !mv && bessKwh >= N.containerFromKwh) {
                warnings.push("Больше 2 МВт·ч на 0,4 кВ — посчитано шкафами. Для такой ёмкости обычно нужно подключение на 10 кВ.");
            }
        }
        if (seg === "home") {
            if (pvKwp > 10) warnings.push("Дому разрешено до 10 кВт выдачи в сеть (playbook §6). Больше — только без выдачи или на бизнес.");
            if (bessKw > 30 || bessKwh > 60 || pvKwp > 30) warnings.push("Для дома система крупная — проверь сегмент «Бизнес».");
        }
        if (seg === "biz" && !mv && Math.max(bessKw, pvKwp) > 1000) {
            warnings.push("Больше 1 МВт на 0,4 кВ — обычно нужно подключение на 10 кВ.");
        }

        // ---------- Проектирование ----------
        const kwMax = Math.max(bessKw, pvKwp);
        if (seg === "home") add("design_home", 1);
        else if (mv) add("design_mv", 1, { kw: kwMax });
        else add("design_biz_lv", 1, { kw: kwMax });

        const cells = voltage === "35" ? 2 : 0;
        if (cells) add("design_rza_cell", cells);
        if (topology === "container") add("foundation_design", 1);
        if (topology === "cabinet") add("foundation_design_small", 1);

        // ---------- Оборудование СЭС ----------
        let pvAcKw = 0;
        let hybridAdded = false;
        if (hasPv) {
            const panels = Math.ceil(pvKwp * 1000 / N.panelWp);
            add("pv_module_wp", panels, {
                unitCost: netMdl("pv_module_wp") * N.panelWp,
                unit: "buc",
                name: `Panou fotovoltaic TOPCon ${N.panelWp} Wp (Tier 1)`,
                nameRu: `Панель PV TOPCon ${N.panelWp} Вт`
            });
            info.panels = panels;
            info.pvAnnualKwh = Math.round(pvKwp * N.yieldKwhPerKwp);
            pvAcKw = requestedInverterKw || pvKwp / 1.15;

            if (sel.hybInv && sel.pvOnHybrid) {
                addCombo(sel.hybInv);
                hybridAdded = true;
                info.inverterKw = sel.hybInv.kw;
            } else if (sel.pvInv) {
                addCombo(sel.pvInv);
                info.inverterKw = sel.pvInv.kw;
            } else if (seg === "home" && hasBess) {
                const invKw = pickStd([3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50], Math.max(bessKw, pvAcKw));
                add("inv_hybrid", 1, { kw: invKw, name: `Invertor hibrid ${invKw} kW`, nameRu: `Гибридный инвертор ${invKw} кВт` });
                hybridAdded = true;
                info.inverterKw = invKw;
            } else {
                const sizes = [3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 100];
                const n = pvAcKw <= 100 ? 1 : Math.ceil(pvAcKw / 100);
                const unitKw = pickStd(sizes, pvAcKw / n);
                add("inv_ongrid", n, { kw: unitKw, name: `Invertor on-grid ${unitKw} kW`, nameRu: `Сетевой инвертор ${unitKw} кВт` });
                info.inverterKw = unitKw * n;
            }
            add(mount === "ground" ? "mount_ground_kwp" : "mount_roof_kwp", pvKwp);
        }

        // ---------- Оборудование BESS ----------
        let containers = 0;
        if (hasBess) {
            if ((topology === "home" || topology === "hv") && sel.battery) {
                if (!hybridAdded) {
                    addCombo(sel.hybInv, "bess");
                    if (topology === "home") info.inverterKw = sel.hybInv.kw;
                }
                addBattery(sel.battery);
                info.bessKwhInstalled = round2(sel.battery.kwh);
                if (topology === "hv") info.bessKwInstalled = sel.hybInv.kw;
            } else if (topology === "home") {
                if (!hybridAdded) {
                    const invKw = pickStd([3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50], bessKw);
                    add("inv_hybrid", 1, { kw: invKw, name: `Invertor hibrid ${invKw} kW`, nameRu: `Гибридный инвертор ${invKw} кВт`, section: "bess" });
                    info.inverterKw = invKw;
                }
                add("bat_lv_kwh", bessKwh);
                info.bessKwhInstalled = round2(bessKwh);
            } else if (topology === "cabinet") {
                units = Math.max(Math.ceil(bessKwh / N.cabinetKwh - 1e-9), Math.ceil(bessKw / N.cabinetKw - 1e-9));
                add("ci_cabinet", units, {
                    name: `Dulap BESS C&I ${N.cabinetKw} kW / ${N.cabinetKwh} kWh (LFP, PCS integrat)`,
                    nameRu: `Шкаф BESS ${N.cabinetKw} кВт / ${N.cabinetKwh} кВт·ч`
                });
                add("ems_ci", 1);
                info.bessKwhInstalled = units * N.cabinetKwh;
                info.bessKwInstalled = units * N.cabinetKw;
            } else if (topology === "container") {
                containers = Math.ceil(bessKwh / N.containerKwh - 1e-9);
                const kwhInst = Math.ceil(bessKwh / 100 - 1e-9) * 100;
                add("container_kwh", kwhInst, {
                    name: `Containere BESS LFP (bloc DC), ${containers} buc., ${round2(kwhInst / 1000)} MWh`,
                    nameRu: `Контейнеры BESS: ${containers} шт, ${round2(kwhInst / 1000)} МВт·ч`
                });
                add("pcs_kw", bessKw);
                add("ems_ci", 1, { name: "Sistem EMS (management energetic)", nameRu: "Система EMS" });
                info.bessKwhInstalled = kwhInst;
            }
            info.usableKwh = Math.round((info.bessKwhInstalled || bessKwh) * N.usableShare);
            info.topology = topology;
            info.units = topology === "container" ? containers : units;
        }
        // Huawei: счётчик для ограничения выдачи; у LUNA с SmartGuard (EMMA) он уже есть
        const huaweiInv = [sel.pvInv, sel.hybInv].filter(Boolean).flatMap(c => c.parts).filter(x => x.e.brand === "Huawei");
        const huaweiKw = huaweiInv.reduce((s, x) => s + x.n * x.e.kw, 0);
        const emma = sel.family === "luna" && topology === "home" && !!sel.battery;
        if (input.zeroExport && topology !== "cabinet" && topology !== "container" && !emma) {
            const meter = huaweiKw > 0 && phases === 3 && !mv ? eqGet(huaweiKw > 170 ? "hw-meter-hw" : "hw-meter") : null;
            if (meter && eqNet(meter) > 0) addEq(meter, 1);
            else add("zero_export_kit", 1);
        }
        if (seg === "biz" && huaweiInv.length) {
            const invUnits = huaweiInv.reduce((s, x) => s + x.n, 0);
            const logger = eqGet("hw-logger"), dongle = eqGet("hw-dongle");
            if (invUnits >= 2 && logger && eqNet(logger) > 0) addEq(logger, 1);
            else if (invUnits === 1 && huaweiInv[0].e.fam === "grid" && dongle && eqNet(dongle) > 0) addEq(dongle, 1);
        }

        // ---------- Оборудование СН ----------
        let trafos = 0;
        let tsn = false;
        if (mv) {
            const kvaNeed = Math.max(bessKw, pvAcKw);
            const maxUnit = 5000;
            trafos = Math.max(1, Math.ceil(kvaNeed / maxUnit - 1e-9));
            const kva = pickStd(N.transformerSizes, kvaNeed / trafos);
            const lv = topology === "container" ? "0,69" : "0,4";
            add("trafo_800", trafos, {
                unitCost: netMdl("trafo_800") * Math.pow(kva / 800, N.trafoScaleExp),
                name: `Transformator de putere ${kva} kVA ${voltage}/${lv} kV`,
                nameRu: `Трансформатор ${kva} кВА ${voltage}/${lv} кВ`
            });
            add("ktp_800", 1, {
                unitCost: netMdl("ktp_800") * Math.pow((kva * trafos) / 800, 0.5) * (voltage === "10" ? 0.75 : 1),
                name: `Post de transformare / celule MT ${voltage} kV`,
                nameRu: `КТП / ячейки СН ${voltage} кВ`
            });
            info.kva = kva;
            info.trafos = trafos;
            if (topology === "container") {
                const tsnKva = pickStd(N.transformerSizes, bessKwh / 1000 * N.tsnKvaPerMwh);
                add("ktp_800", 1, {
                    unitCost: (netMdl("ktp_800") + netMdl("trafo_800")) * Math.pow(tsnKva / 800, 0.6),
                    name: `Post de transformare servicii proprii ${tsnKva} kVA`,
                    nameRu: `КТП собственных нужд ${tsnKva} кВА`,
                    section: "bess"
                });
                tsn = true;
            }
            add("ct_meter", 3);
            if (cells) {
                add("rza_terminal", cells);
                add("shot", 1);
            }
            if (Math.max(bessKw, pvKwp) >= 1000) add("scada_iec104", 1);
        }

        // ---------- Материалы ----------
        if (seg === "home") {
            if (hasPv) add("ac_dc_home_kwp", pvKwp);
            if (hasBess) add("ac_dc_home_bess", 1);
        } else if (hasPv) {
            add("ac_dc_biz_kwp", pvKwp);
        }
        const runs = topology === "cabinet" ? Math.max(1, Math.ceil(bessKw / 150 - 1e-9)) : topology === "hv" ? 1 : 0;
        if (topology === "hv") {
            add("grounding_cab", 1, { name: "Buclă de împământare invertor și baterii", nameRu: "Контур заземления инвертора и батарей" });
            if (cableLvM > 0) {
                add("lv_cable_m", cableLvM, { nameRu: `Кабель НН (1 линия × ${cableLvM} м)` });
                add("corrugated_90", cableLvM);
            }
            add("fire_post", 1);
        }
        if (topology === "cabinet") {
            add("grounding_cab", units);
            if (cableLvM > 0) {
                add("lv_cable_m", cableLvM * runs, { nameRu: `Кабель НН Al 4×240 (${runs} линии × ${cableLvM} м)` });
                add("corrugated_90", cableLvM * runs);
            }
            add("fire_post", Math.max(1, Math.ceil(units / N.unitsPerFirePost - 1e-9)));
        }
        if (topology === "container") {
            const mwh = bessKwh / 1000;
            add("dc_cable_185", Math.ceil(mwh * N.dcCableMPerMwh / 10) * 10);
            add("lug_185", Math.max(12, Math.ceil(mwh * N.lugsPerMwh)));
            add("small_mat_mwh", mwh);
            add("fire_post", Math.max(1, Math.ceil((containers + trafos) / N.unitsPerFirePost - 1e-9)));
            add("lightning_set", Math.max(1, Math.ceil(mwh / N.mwhPerLightningSet - 1e-9)));
        }
        let joints = 0;
        if (mv && cableMvM > 0) {
            add("mv_cable_m", cableMvM);
            add("mv_termination", 2);
            add("cable_slab", Math.ceil(cableMvM / 0.6));
            add("warning_tape", Math.ceil(cableMvM / 100));
            joints = cableMvM > 500 ? Math.ceil(cableMvM / 500) - 1 : 0;
        }

        // ---------- СМР ----------
        if (topology === "cabinet") {
            add("foundation_m3", units * N.concreteM3PerCabinet);
            if (cableLvM > 0) add("trench_m", cableLvM, { section: "bess" });
        }
        if (topology === "hv" && cableLvM > 0) add("trench_m", cableLvM, { section: "bess" });
        if (topology === "container") {
            const mwh = bessKwh / 1000;
            add("geodesy", 1);
            add("foundation_m3", Math.ceil(mwh * N.concreteM3PerMwh));
            const area = Math.ceil(mwh * N.siteM2PerMwh);
            add("site_m2", area);
            add("gravel_t", Math.ceil(area * N.gravelTPerM2));
            info.siteM2 = area;
        }
        if (mv && cableMvM > 0) add("trench_m", cableMvM, { nameRu: "Траншея под кабель СН", section: defSec });

        // ---------- Логистика ----------
        // импорт и таможня — отдельно по блокам СЭС и BESS
        ["pv", "bess"].forEach(section => {
            const importedCost = items.filter(i => IMPORTED.has(i.rateId) && i.section === section).reduce((s, i) => s + i.quantity * i.cost, 0);
            if (seg === "biz" && importedCost > 0) {
                const pct = Number(book.rates.import_pct.price) || 0;
                // у блока BESS своё название: ручная правка позиции привязана к названию
                const bess = section === "bess" && hasPv;
                add("import_pct", 1, {
                    unitCost: importedCost * pct / 100, unit: "lot", section,
                    name: bess ? `${book.rates.import_pct.ro} (BESS)` : undefined,
                    nameRu: `Доставка импорта и таможня (${pct}% от оборудования${bess ? " BESS" : ""})`
                });
            }
        });
        if (topology === "cabinet") {
            add("manip_trip", Math.max(1, Math.ceil(units / N.cabinetsPerTrip - 1e-9)), { section: "bess" });
        } else if (topology === "hv") {
            add("manip_trip", 1, { section: "bess", name: "Transport cu manipulator: invertor și baterii (cursă)", nameRu: "Манипулятор: инвертор и батареи, рейс" });
            if (hasPv) add("manip_trip", Math.max(1, Math.ceil(pvKwp / 250 - 1e-9)), { section: "pv" });
        } else if (seg === "biz" && hasPv && topology !== "container") {
            add("manip_trip", Math.max(1, Math.ceil(pvKwp / 250 - 1e-9)));
        }
        if (topology === "container") {
            const heavy = containers + trafos + (tsn ? 1 : 0);
            add("crane_h", Math.max(N.craneMinHours, Math.ceil(heavy * N.craneHoursPerUnit)));
            if (distanceKm > 0) add("crane_km", distanceKm * 2);
            add("crane_cw", 1);
            add("lowboy_km", (distanceKm + N.portKm) * heavy, { nameRu: `Трал: ${heavy} рейсов × ${distanceKm + N.portKm} км` });
        }

        // ---------- Электромонтаж ----------
        if (hasPv) add(seg === "home" ? "pv_install_home" : "pv_install_biz", pvKwp);
        if (topology === "home") add("home_bess_install", 1);
        if (topology === "hv") {
            add("cabinet_install", 1, { name: "Montaj și conectare invertor hibrid și baterii HV", nameRu: "Монтаж и подключение гибридного инвертора и батарей HV" });
            if (cableLvM > 0) add("lv_cable_lay_m", cableLvM);
        }
        if (topology === "cabinet") {
            add("cabinet_install", units);
            if (cableLvM > 0) add("lv_cable_lay_m", cableLvM * runs);
        }
        if (topology === "container") add("bess_install_mwh", bessKwh / 1000);
        if (mv) {
            if (cableMvM > 0) add("mv_cable_lay_m", cableMvM);
            if (joints) add("mv_joint", joints);
            add("trafo_install", trafos + (tsn ? 1 : 0));
            if (cells) add("metering_scada_cell", cells);
        }

        // ---------- Пусконаладка ----------
        if (topology === "cabinet" || topology === "container" || topology === "hv") add("bess_comm_ci", 1, { kw: bessKw });
        if (mv) {
            add("mv_tests", 1);
            add("mv_connect", 1);
            const pTot = Math.max(bessKw, pvKwp);
            add("isee_tests_15mw", 1, { unitCost: Math.max(30000, netMdl("isee_tests_15mw") * Math.sqrt(pTot / 15000)) });
            if (cells) {
                add("rza_comm_cell", cells);
                add("shot_comm", 1);
            }
        }

        // ---------- Сдача ----------
        if (seg === "home") add("dare_home", 1);
        else if (mv) add("dare_mv", 1);
        else add("dare_biz", 1);
        if (topology === "container") add("ecology", 1);

        // ---------- Пометки о ставках ----------
        const total = items.reduce((s, i) => s + i.quantity * i.cost, 0) || 1;
        const est = items.filter(i => i.status === "est");
        const estShare = est.reduce((s, i) => s + i.quantity * i.cost, 0) / total * 100;
        if (est.length) {
            warnings.push(`${est.length} поз. по оценке (≈${Math.round(estShare)}% себестоимости) — заменить котировками.`);
        }
        const now = new Date();
        const stale = items.filter(i => {
            const d = parseRateDate(i.date);
            return d && (now - d) / 86400000 > book.staleDays;
        });
        if (stale.length) warnings.push(`Ставок старше ${book.staleDays} дней: ${stale.length} — обновить цены.`);

        // в заголовке и цене за кВт·ч — установленная ёмкость (модули, шкафы), а не запрошенная
        const kwhOffered = hasBess ? round2(info.bessKwhInstalled || bessKwh) : bessKwh;
        info.title = systemTitle({ seg, product, hasPv, hasBess, pvKwp, bessKw, bessKwh: kwhOffered, voltage });
        info.voltage = voltage;
        info.segment = seg;
        info.product = product;
        info.pvKwp = pvKwp;
        info.bessKw = topology === "home" ? (info.inverterKw || bessKw) : bessKw;
        info.bessKwh = kwhOffered;
        info.bessKwhRequested = bessKwh;
        info.estShare = Math.round(estShare);
        info.phases = phases;
        const opt = e => ({ id: e.id, label: `${eqLabel(e)} · ${e.kw} кВт · ${Math.round(eqNet(e)).toLocaleString("ru-RU")} MDL без TVA` });
        const usedInv = sel.hybInv || sel.pvInv;
        const lbl = parts => parts.map(x => `${x.n > 1 ? x.n + " × " : ""}${eqLabel(x.e)}`).join(" + ");
        info.equip = {
            family: sel.family,
            inverter: usedInv ? lbl(usedInv.parts) : "",
            pvInverter: sel.hybInv && sel.pvInv ? lbl(sel.pvInv.parts) : "",
            battery: sel.battery ? lbl(sel.battery.parts) + ` = ${String(round2(sel.battery.kwh)).replace(".", ",")} кВт·ч` : "",
            invOptions: sel.invOptions.map(opt),
            batOptions: sel.batOptions,
            level: (book.equipmentLevels || {})[book.equipmentLevel || "angro"] || "",
            source: book.equipmentSource || "прайс дистрибьютора",
            pricesLoaded: eqAll().some(e => eqNet(e) > 0),
            ignoredInv: !!sel.ignoredInv,
            ignoredBat: !!sel.ignoredBat
        };

        return { items, warnings, info };
    }

    function systemTitle(p) {
        const parts = [];
        if (p.hasPv) parts.push(`${fmtKw(p.pvKwp).replace("kW", "kWp")}`);
        if (p.hasBess) parts.push(`BESS ${fmtKw(p.bessKw)} / ${fmtKwh(p.bessKwh)}`);
        return parts.join(" + ") || "—";
    }

    window.EPC_GENERATOR = { generate, netMdl, fmtKw, fmtKwh, parseRateDate, eqNet, eqGet, eqAll };
})();
