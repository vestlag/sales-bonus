/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const { discount, sale_price, quantity } = purchase;
    const discountFactor = 1 - discount / 100;
    return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов по прибыли
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

/**
 * Главная функция анализа данных продаж
 * @param data объект с коллекциями продавцов, товаров и чеков
 * @param options объект с функциями calculateRevenue и calculateBonus
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options || {};
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Отсутствуют функции для расчётов (выручка или бонус)');
    }

    // Подготовка статистики по продавцам
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.id, stat])
    );

    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Обработка чеков
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение бонусов и формирование топ-10 товаров
    sellerStats.forEach((seller, index) => {
        seller.bonus = +calculateBonus(index, sellerStats.length, seller).toFixed(2);

        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Формирование итогового отчёта
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
