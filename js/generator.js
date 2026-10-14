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
        const homeAutoKw = Math.max(requestedInverterKw || bessKwh / 2, pvKwp > 0 ? (requestedInverterKw || pvKwp / 1.15) : 0);
        const bessKw = seg === "home" && product !== "pv"
            ? pickStd(homeInverterSizes, homeAutoKw)
            : enteredBessKw;
        const hasPv = product !== "bess" && pvKwp > 0;
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
                auto: true
            };
            items.push(item);
            return item;
        }

        // ---------- Топология BESS ----------
        let topology = null;
        let units = 0;
        if (hasBess) {
            if (seg === "home") topology = "home";
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

            if (seg === "home" && hasBess) {
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
            if (topology === "home") {
                if (!hybridAdded) {
                    const invKw = pickStd([3, 5, 6, 8, 10, 12, 15, 20, 25, 30, 50], bessKw);
                    add("inv_hybrid", 1, { kw: invKw, name: `Invertor hibrid ${invKw} kW`, nameRu: `Гибридный инвертор ${invKw} кВт` });
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
        if (input.zeroExport && topology !== "cabinet" && topology !== "container") {
            add("zero_export_kit", 1);
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
                    nameRu: `КТП собственных нужд ${tsnKva} кВА`
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
        const runs = topology === "cabinet" ? Math.max(1, Math.ceil(bessKw / 150 - 1e-9)) : 0;
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
            if (cableLvM > 0) add("trench_m", cableLvM);
        }
        if (topology === "container") {
            const mwh = bessKwh / 1000;
            add("geodesy", 1);
            add("foundation_m3", Math.ceil(mwh * N.concreteM3PerMwh));
            const area = Math.ceil(mwh * N.siteM2PerMwh);
            add("site_m2", area);
            add("gravel_t", Math.ceil(area * N.gravelTPerM2));
            info.siteM2 = area;
        }
        if (mv && cableMvM > 0) add("trench_m", cableMvM, { nameRu: "Траншея под кабель СН" });

        // ---------- Логистика ----------
        const importedCost = items.filter(i => IMPORTED.has(i.rateId)).reduce((s, i) => s + i.quantity * i.cost, 0);
        if (seg === "biz" && importedCost > 0) {
            const pct = Number(book.rates.import_pct.price) || 0;
            add("import_pct", 1, { unitCost: importedCost * pct / 100, unit: "lot", nameRu: `Доставка импорта и таможня (${pct}% от оборудования)` });
        }
        if (topology === "cabinet") {
            add("manip_trip", Math.max(1, Math.ceil(units / N.cabinetsPerTrip - 1e-9)));
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
        if (topology === "cabinet" || topology === "container") add("bess_comm_ci", 1, { kw: bessKw });
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

        info.title = systemTitle({ seg, product, hasPv, hasBess, pvKwp, bessKw, bessKwh, voltage });
        info.voltage = voltage;
        info.segment = seg;
        info.product = product;
        info.pvKwp = pvKwp;
        info.bessKw = topology === "home" ? (info.inverterKw || bessKw) : bessKw;
        info.bessKwh = bessKwh;
        info.estShare = Math.round(estShare);

        return { items, warnings, info };
    }

    function systemTitle(p) {
        const parts = [];
        if (p.hasPv) parts.push(`${fmtKw(p.pvKwp).replace("kW", "kWp")}`);
        if (p.hasBess) parts.push(`BESS ${fmtKw(p.bessKw)} / ${fmtKwh(p.bessKwh)}`);
        return parts.join(" + ") || "—";
    }

    window.EPC_GENERATOR = { generate, netMdl, fmtKw, fmtKwh, parseRateDate };
})();
