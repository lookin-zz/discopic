/**
 * CoinAPI Integration
 * Handles all API communication with CoinAPI.io
 */

const CoinAPI = {
    baseUrl: 'https://rest.coinapi.io/v1',

    // Exchange ID mapping (CoinAPI uses specific IDs)
    exchangeMap: {
        'BINANCE': 'BINANCE',
        'COINBASE': 'COINBASE',
        'KRAKEN': 'KRAKEN',
        'BITFINEX': 'BITFINEX',
        'BITSTAMP': 'BITSTAMP'
    },

    // Cache for API responses
    cache: new Map(),
    cacheDuration: 10000, // 10 seconds

    /**
     * Make API request to CoinAPI
     */
    async request(endpoint, apiKey) {
        const url = `${this.baseUrl}${endpoint}`;

        // Check cache first
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'X-CoinAPI-Key': apiKey
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your settings.');
                } else if (response.status === 429) {
                    throw new Error('API rate limit exceeded. Please wait before trying again.');
                } else if (response.status === 550) {
                    throw new Error('No data available for this request.');
                }
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the response
            this.cache.set(url, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    /**
     * Convert pair format (BTC/USDT -> BTC_USDT)
     */
    formatPair(pair) {
        return pair.replace('/', '_');
    },

    /**
     * Get current price for a specific exchange and pair
     */
    async getCurrentPrice(exchangeId, pair, apiKey) {
        const formattedPair = this.formatPair(pair);
        const symbolId = `${exchangeId}_SPOT_${formattedPair}`;

        try {
            const endpoint = `/exchangerate/${pair.split('/')[0]}/${pair.split('/')[1]}?invert=false`;
            const data = await this.request(endpoint, apiKey);
            return data.rate;
        } catch (error) {
            console.error(`Error fetching price for ${symbolId}:`, error);
            return null;
        }
    },

    /**
     * Get orderbook for specific exchange and pair
     */
    async getOrderbook(exchangeId, pair, apiKey) {
        const formattedPair = this.formatPair(pair);
        const symbolId = `${exchangeId}_SPOT_${formattedPair}`;

        try {
            const endpoint = `/orderbooks/${symbolId}/current`;
            const data = await this.request(endpoint, apiKey);

            if (data && data.asks && data.bids) {
                return {
                    ask: data.asks[0]?.price || null, // Lowest ask (sell price)
                    bid: data.bids[0]?.price || null, // Highest bid (buy price)
                    askVolume: data.asks[0]?.size || 0,
                    bidVolume: data.bids[0]?.size || 0
                };
            }
            return null;
        } catch (error) {
            console.error(`Error fetching orderbook for ${symbolId}:`, error);
            return null;
        }
    },

    /**
     * Get quotes for all exchanges for a specific pair
     * This is the main method for arbitrage detection
     */
    async getQuotesForPair(pair, exchanges, apiKey) {
        const quotes = [];

        // Fetch quotes from all exchanges in parallel
        const promises = exchanges.map(async (exchangeId) => {
            try {
                const orderbook = await this.getOrderbook(exchangeId, pair, apiKey);

                if (orderbook && orderbook.ask && orderbook.bid) {
                    return {
                        exchange: exchangeId,
                        pair: pair,
                        ask: orderbook.ask,
                        bid: orderbook.bid,
                        askVolume: orderbook.askVolume,
                        bidVolume: orderbook.bidVolume,
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (error) {
                console.error(`Error fetching quote for ${exchangeId} ${pair}:`, error);
            }
            return null;
        });

        const results = await Promise.all(promises);
        return results.filter(quote => quote !== null);
    },

    /**
     * Get quotes for all pairs and exchanges
     */
    async getAllQuotes(pairs, exchanges, apiKey) {
        const allQuotes = [];

        for (const pair of pairs) {
            try {
                const quotes = await this.getQuotesForPair(pair, exchanges, apiKey);
                allQuotes.push(...quotes);

                // Add small delay between pairs to avoid rate limiting
                await this.delay(100);
            } catch (error) {
                console.error(`Error fetching quotes for ${pair}:`, error);
            }
        }

        return allQuotes;
    },

    /**
     * Utility: delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    },

    /**
     * Test API key validity
     */
    async testApiKey(apiKey) {
        try {
            await this.request('/exchangerate/BTC/USD', apiKey);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoinAPI;
}
