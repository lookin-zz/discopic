/**
 * Arbitrage Calculation Logic
 * Analyzes quotes and calculates arbitrage opportunities
 */

const Arbitrage = {
    /**
     * Calculate arbitrage opportunities from quotes
     * @param {Array} quotes - Array of quote objects from CoinAPI
     * @param {Object} fees - Object mapping exchange IDs to fee percentages
     * @param {Number} minProfit - Minimum profit threshold
     * @returns {Array} - Array of arbitrage opportunity objects
     */
    calculateOpportunities(quotes, fees, minProfit = 0.5) {
        const opportunities = [];

        // Group quotes by trading pair
        const quotesByPair = this.groupByPair(quotes);

        // For each trading pair, find arbitrage opportunities
        for (const [pair, pairQuotes] of Object.entries(quotesByPair)) {
            if (pairQuotes.length < 2) continue; // Need at least 2 exchanges

            // Find all possible arbitrage combinations
            for (let i = 0; i < pairQuotes.length; i++) {
                for (let j = 0; j < pairQuotes.length; j++) {
                    if (i === j) continue;

                    const buyExchange = pairQuotes[i];
                    const sellExchange = pairQuotes[j];

                    // Buy at ask price on one exchange, sell at bid price on another
                    const buyPrice = buyExchange.ask;
                    const sellPrice = sellExchange.bid;

                    // Skip if sell price is not higher than buy price
                    if (sellPrice <= buyPrice) continue;

                    // Calculate fees
                    const buyFee = fees[buyExchange.exchange] || 0.1;
                    const sellFee = fees[sellExchange.exchange] || 0.1;
                    const totalFee = buyFee + sellFee;

                    // Calculate profit
                    const grossProfit = ((sellPrice - buyPrice) / buyPrice) * 100;
                    const netProfit = grossProfit - totalFee;

                    // Only include if meets minimum profit threshold
                    if (netProfit >= minProfit) {
                        opportunities.push({
                            pair: pair,
                            buyExchange: buyExchange.exchange,
                            buyPrice: buyPrice,
                            sellExchange: sellExchange.exchange,
                            sellPrice: sellPrice,
                            spread: sellPrice - buyPrice,
                            grossProfit: grossProfit,
                            netProfit: netProfit,
                            buyFee: buyFee,
                            sellFee: sellFee,
                            totalFee: totalFee,
                            volume: Math.min(buyExchange.askVolume, sellExchange.bidVolume),
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        }

        // Sort by net profit (highest first)
        return opportunities.sort((a, b) => b.netProfit - a.netProfit);
    },

    /**
     * Group quotes by trading pair
     */
    groupByPair(quotes) {
        const grouped = {};

        for (const quote of quotes) {
            if (!grouped[quote.pair]) {
                grouped[quote.pair] = [];
            }
            grouped[quote.pair].push(quote);
        }

        return grouped;
    },

    /**
     * Filter opportunities by trading pair
     */
    filterByPair(opportunities, pair) {
        if (!pair || pair === 'all') {
            return opportunities;
        }
        return opportunities.filter(opp => opp.pair === pair);
    },

    /**
     * Filter opportunities by minimum profit
     */
    filterByMinProfit(opportunities, minProfit) {
        return opportunities.filter(opp => opp.netProfit >= minProfit);
    },

    /**
     * Sort opportunities
     */
    sort(opportunities, sortBy) {
        const sorted = [...opportunities];

        switch (sortBy) {
            case 'profit':
                return sorted.sort((a, b) => b.netProfit - a.netProfit);
            case 'pair':
                return sorted.sort((a, b) => a.pair.localeCompare(b.pair));
            case 'spread':
                return sorted.sort((a, b) => b.spread - a.spread);
            default:
                return sorted;
        }
    },

    /**
     * Get summary statistics
     */
    getStats(opportunities) {
        if (opportunities.length === 0) {
            return {
                count: 0,
                avgProfit: 0,
                maxProfit: 0,
                totalVolume: 0
            };
        }

        const profits = opportunities.map(opp => opp.netProfit);
        const volumes = opportunities.map(opp => opp.volume);

        return {
            count: opportunities.length,
            avgProfit: profits.reduce((a, b) => a + b, 0) / profits.length,
            maxProfit: Math.max(...profits),
            totalVolume: volumes.reduce((a, b) => a + b, 0)
        };
    },

    /**
     * Format price for display
     */
    formatPrice(price) {
        if (price >= 1000) {
            return price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        } else if (price >= 1) {
            return price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            });
        } else {
            return price.toLocaleString('en-US', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
            });
        }
    },

    /**
     * Format percentage for display
     */
    formatPercent(percent) {
        return percent.toFixed(2) + '%';
    },

    /**
     * Get profit class for styling
     */
    getProfitClass(profit) {
        if (profit >= 1) return 'profit-positive';
        if (profit >= 0) return 'profit-neutral';
        return 'profit-negative';
    },

    /**
     * Calculate potential profit amount
     * @param {Object} opportunity - Arbitrage opportunity
     * @param {Number} investmentAmount - Amount to invest in base currency
     * @returns {Object} - Profit breakdown
     */
    calculateProfitAmount(opportunity, investmentAmount) {
        const buyAmount = investmentAmount / opportunity.buyPrice;
        const buyFeeAmount = (buyAmount * opportunity.buyFee) / 100;
        const netBuyAmount = buyAmount - buyFeeAmount;

        const sellValue = netBuyAmount * opportunity.sellPrice;
        const sellFeeAmount = (sellValue * opportunity.sellFee) / 100;
        const netSellValue = sellValue - sellFeeAmount;

        const profit = netSellValue - investmentAmount;
        const profitPercent = (profit / investmentAmount) * 100;

        return {
            investmentAmount,
            buyAmount,
            buyFeeAmount,
            netBuyAmount,
            sellValue,
            sellFeeAmount,
            netSellValue,
            profit,
            profitPercent
        };
    },

    /**
     * Validate opportunity (check if still valid)
     */
    isValid(opportunity, maxAge = 60000) {
        const age = Date.now() - new Date(opportunity.timestamp).getTime();
        return age < maxAge && opportunity.netProfit > 0;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Arbitrage;
}
