// =========================================
// СИНХРОНИЗАЦИЯ — облачное хранилище Telegram (CloudStorage).
// Хранилище привязано к аккаунту Telegram и к этому боту: у каждого, кто открыл
// калькулятор, свои проекты, одинаковые на iPhone, Mac и Android.
// Своего сервера не нужно. Вне Telegram синхронизации нет.
// Лимиты Telegram: ключ до 128 символов [A-Za-z0-9_-], значение до 4096 символов,
// до 1024 ключей. Поэтому запись сжимается и режется на части:
// ключ «вид + id _ номер части _ всего частей», например p1760450000000_0_1.
// =========================================

(function () {
    "use strict";

    const CHUNK = 4000;
    const TIMEOUT = 10000;
    const BATCH = 50;

    // ---------- сжатие: текст → deflate → base64url ----------
    function b64url(bytes) {
        let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    function unb64url(s) {
        const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
        return Uint8Array.from(bin, c => c.charCodeAt(0));
    }
    const pipe = (bytes, stream) => new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(b => new Uint8Array(b));
    async function pack(text) {
        const bytes = new TextEncoder().encode(text);
        if (typeof CompressionStream === "function") {
            try { return "z." + b64url(await pipe(bytes, new CompressionStream("deflate-raw"))); } catch (_) { /* без сжатия */ }
        }
        return "j." + b64url(bytes);
    }
    async function unpack(packed) {
        let bytes = unb64url(packed.slice(2));
        if (packed[0] === "z") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
        return new TextDecoder().decode(bytes);
    }

    // ---------- CloudStorage ----------
    const app = () => window.Telegram && window.Telegram.WebApp;
    function available() {
        const tg = app();
        return Boolean(window.EPC_OFFER && window.EPC_OFFER.inTelegram() && tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast("6.9"));
    }

    // Колбэки CloudStorage → Promise. Если клиент Telegram молчит — ошибка по таймауту.
    function call(method, ...args) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Telegram не ответил")), TIMEOUT);
            try {
                app().CloudStorage[method](...args, (err, res) => {
                    clearTimeout(timer);
                    if (err) reject(new Error(String(err))); else resolve(res);
                });
            } catch (e) {
                clearTimeout(timer);
                reject(e);
            }
        });
    }

    // Ключи → записи { kind, id, keys[] }; берём только записи, где на месте все части
    function records(keys) {
        const map = new Map();
        (keys || []).forEach(k => {
            const m = /^([a-z])(\d+)_(\d+)_(\d+)$/.exec(k);
            if (!m) return;
            const name = `${m[1]}${m[2]}_${m[4]}`;
            const r = map.get(name) || { kind: m[1], id: Number(m[2]), n: Number(m[4]), keys: [] };
            r.keys[Number(m[3])] = k;
            map.set(name, r);
        });
        return [...map.values()].filter(r => r.keys.length === r.n && r.keys.every(Boolean));
    }

    async function listRecords(kind) {
        return records(await call("getKeys")).filter(r => r.kind === kind);
    }

    async function readRecords(list) {
        const keys = list.flatMap(r => r.keys);
        const values = {};
        for (let i = 0; i < keys.length; i += BATCH) Object.assign(values, await call("getItems", keys.slice(i, i + BATCH)));
        const out = [];
        for (const r of list) {
            try {
                out.push({ r, data: JSON.parse(await unpack(r.keys.map(k => values[k] || "").join(""))) });
            } catch (e) {
                console.warn("Повреждённая запись в облаке пропущена", r.keys, e);
            }
        }
        return out;
    }

    async function writeRecord(kind, id, value) {
        const packed = await pack(JSON.stringify(value));
        const parts = [];
        for (let i = 0; i < packed.length; i += CHUNK) parts.push(packed.slice(i, i + CHUNK));
        for (let i = 0; i < parts.length; i++) await call("setItem", `${kind}${id}_${i}_${parts.length}`, parts[i]);
    }

    const removeKeys = keys => keys.length ? call("removeItems", keys) : Promise.resolve(true);
    const strip = ({ synced, ...p }) => p;

    // ---------- проекты ----------
    // Облако — главное, локальный список — копия для работы без связи.
    // synced: true — проект уже был в облаке; если его там нет, его удалили на другом устройстве.
    // Меняет флаг synced у отправленных проектов прямо в local: при ошибке на полпути
    // вызывающий сохраняет local, и отправленное повторно не уходит.
    async function syncProjects(local, deleted) {
        const cloud = await listRecords("p");
        const del = new Set(deleted);
        await removeKeys(cloud.filter(r => del.has(r.id)).flatMap(r => r.keys)); // удалено без связи
        const live = cloud.filter(r => !del.has(r.id));
        const ids = new Set(live.map(r => r.id));
        let uploaded = 0;
        for (const p of local) {
            if (p.synced || ids.has(p.id) || del.has(p.id)) continue;
            await writeRecord("p", p.id, strip(p));
            p.synced = true;
            ids.add(p.id);
            uploaded++;
        }
        const have = new Set(local.map(p => p.id));
        const added = (await readRecords(live.filter(r => !have.has(r.id))))
            .filter(({ r, data }) => data && data.id === r.id && data.state && typeof data.state === "object")
            .map(({ data }) => ({ ...data, synced: true }));
        const kept = local.filter(p => ids.has(p.id) || (!p.synced && !del.has(p.id)));
        const list = [...kept, ...added].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
        return { list, uploaded, downloaded: added.length, removed: local.length - kept.length };
    }

    // ---------- правки ставок и база ставок ----------
    // Одна запись на вид: «r<время правки>_…» — правки ставок, «b<время загрузки>_…» — база ставок.
    // Побеждает более поздняя; старые версии удаляются.
    // localAt = 1 — правки были до синхронизации, время неизвестно: уступают облаку.
    async function syncLatest(kind, value, localAt) {
        const cloud = (await listRecords(kind)).sort((a, b) => b.id - a.id);
        const cloudAt = cloud.length ? cloud[0].id : 0;
        if (cloudAt > localAt) {
            const [got] = await readRecords([cloud[0]]);
            if (got && got.data && typeof got.data === "object" && !Array.isArray(got.data)) return { action: "download", overrides: got.data, at: cloudAt };
            return { action: "none" };
        }
        if (localAt > cloudAt && value) {
            const at = localAt === 1 ? Date.now() : localAt;
            await writeRecord(kind, at, value);
            await removeKeys(cloud.flatMap(r => r.keys));
            return { action: "upload", at };
        }
        return { action: "none" };
    }
    const syncRates = (overrides, localAt) => syncLatest("r", overrides, localAt);
    const syncBase = (base, localAt) => syncLatest("b", base, localAt);

    window.EPC_SYNC = { available, pack, unpack, syncProjects, syncRates, syncBase };
})();
