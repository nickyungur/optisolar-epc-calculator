// =========================================
// EPC CALCULATOR — CALCULATION ENGINE
// =========================================


// -----------------------------------------
// Безопасное преобразование в число
// -----------------------------------------

function toNumber(value) {
    const normalized = typeof value === "string" ? value.trim().replace(/,/g, ".") : value;
    const number = Number(normalized);

    if (Number.isFinite(number)) {
        return number;
    }

    return 0;
}


// -----------------------------------------
// Расчёт одной позиции
// -----------------------------------------

function calculateItem(item) {

    const quantity = toNumber(item.quantity);
    const cost = toNumber(item.cost);
    const coefficient = toNumber(item.coefficient ?? window.EPC_DATA?.defaultCoefficient ?? 1.20);
    const sell = cost * coefficient;

    const totalCost = quantity * cost;
    const totalSell = quantity * sell;

    return {
        ...item,
        quantity,
        cost,
        coefficient,
        sell,
        totalCost,
        totalSell
    };
}


// -----------------------------------------
// Расчёт всего проекта
// -----------------------------------------

function calculateProject(items, settings = {}) {

    const indirectPct = toNumber(settings.indirectPct);
    const riskPct = toNumber(settings.riskPct);
    const vatEnabled = settings.vatEnabled !== false;
    const vatPct = vatEnabled ? Math.max(0, toNumber(settings.vatPct ?? 20)) : 0;

    // -------------------------------------
    // Суммируем позиции
    // -------------------------------------

    const calculatedItems = items.map(item => {
        const calculated = calculateItem(item);
        const lineVatPct = vatEnabled ? Math.max(0, toNumber(item.vatPct ?? vatPct)) : 0;
        const lineVatAmount = calculated.totalSell * lineVatPct / 100;
        return { ...calculated, vatPct: lineVatPct, vatAmount: lineVatAmount, totalWithVat: calculated.totalSell + lineVatAmount };
    });

    const totalCost = calculatedItems.reduce(
        (sum, item) => sum + item.totalCost,
        0
    );

    const rawSell = calculatedItems.reduce(
        (sum, item) => sum + item.totalSell,
        0
    );


    // -------------------------------------
    // Indirect costs
    // -------------------------------------

    const indirectCost =
        totalCost * indirectPct / 100;


    // -------------------------------------
    // Risk reserve
    // -------------------------------------

    const riskBase =
        totalCost + indirectCost;

    const riskCost =
        riskBase * riskPct / 100;


    // -------------------------------------
    // Базовая стоимость проекта
    // -------------------------------------

    const projectCost =
        totalCost +
        indirectCost +
        riskCost;


    // -------------------------------------
    // Commercial price = sum of line selling prices
    // Each line selling price is cost × coefficient.
    // Indirect costs and risk are deducted from profit,
    // not added a second time to the client offer total.
    // -------------------------------------

    const commercialPrice = rawSell; // commercial price before VAT
    const vatAmount = calculatedItems.reduce((sum, item) => sum + item.vatAmount, 0);
    const priceWithVat = commercialPrice + vatAmount;


    // -------------------------------------
    // Profit
    // -------------------------------------

    const profit =
        commercialPrice - projectCost;


    // -------------------------------------
    // Фактическая маржа
    // -------------------------------------

    let effectiveMargin = 0;

    if (commercialPrice > 0) {

        effectiveMargin =
            profit /
            commercialPrice *
            100;

    }


    return {

        items: calculatedItems,

        totalCost,

        indirectPct,
        indirectCost,

        riskPct,
        riskCost,

        projectCost,

        rawSell,

        commercialPrice,
        vatEnabled,
        vatPct,
        vatAmount,
        priceWithVat,

        profit,

        effectiveMargin

    };
}


// -----------------------------------------
// Форматирование денег
// -----------------------------------------

function formatMoney(
    value,
    currency = "EUR"
) {

    const number = toNumber(value);

    const currencyConfig =
        window.EPC_DATA?.currencies?.find(
            item => item.id === currency
        );


    const symbol =
        currencyConfig?.symbol || currency;


    const formatted =
        new Intl.NumberFormat(
            "ru-RU",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ).format(number);


    return `${symbol} ${formatted}`;
}


// -----------------------------------------
// Форматирование процентов
// -----------------------------------------

function formatPercent(value) {

    return `${toNumber(value).toFixed(1)}%`;

}


// -----------------------------------------
// Создание пустой позиции
// -----------------------------------------

function createEmptyItem() {

    return {

        category:
            window.EPC_DATA?.costCategories?.[0]?.id
            || "engineering",

        name: "",

        unit: "lot",

        quantity: 1,

        cost: 0,

        coefficient: window.EPC_DATA?.defaultCoefficient ?? 1.20

    };

}


// -----------------------------------------
// Копирование позиции
// -----------------------------------------

function cloneItem(item) {

    return {
        category: item.category,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        cost: item.cost,
        coefficient: item.coefficient ?? window.EPC_DATA?.defaultCoefficient ?? 1.20
    };

}


// -----------------------------------------
// Расчёт прибыли отдельной позиции
// -----------------------------------------

function calculateItemProfit(item) {

    const calculated =
        calculateItem(item);


    return {

        ...calculated,

        profit:
            calculated.totalSell -
            calculated.totalCost

    };

}


// -----------------------------------------
// Экспорт
// -----------------------------------------

window.EPC_CALCULATOR = {

    toNumber,

    calculateItem,

    calculateProject,

    formatMoney,

    formatPercent,

    createEmptyItem,

    cloneItem,

    calculateItemProfit

};