/**
 * Configuration Management
 * Handles saving/loading settings from localStorage
 */

const Config = {
    // Default configuration
    defaults: {
        apiKey: '',
        refreshInterval: 30,
        defaultMinProfit: 0.5,
        autoRefresh: false,
        fees: {
            BINANCE: 0.1,
            COINBASE: 0.6,
            KRAKEN: 0.26,
            BITFINEX: 0.2,
            BITSTAMP: 0.25
        },
        pairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'],
        exchanges: ['BINANCE', 'COINBASE', 'KRAKEN', 'BITFINEX']
    },

    // Storage key
    storageKey: 'discopic_config',

    /**
     * Load configuration from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const config = JSON.parse(stored);
                return { ...this.defaults, ...config };
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
        return { ...this.defaults };
    },

    /**
     * Save configuration to localStorage
     */
    save(config) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    },

    /**
     * Get specific config value
     */
    get(key) {
        const config = this.load();
        return config[key];
    },

    /**
     * Set specific config value
     */
    set(key, value) {
        const config = this.load();
        config[key] = value;
        return this.save(config);
    },

    /**
     * Reset to defaults
     */
    reset() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error resetting config:', error);
            return false;
        }
    },

    /**
     * Get API key
     */
    getApiKey() {
        return this.get('apiKey');
    },

    /**
     * Check if API key is configured
     */
    hasApiKey() {
        const apiKey = this.getApiKey();
        return apiKey && apiKey.trim().length > 0;
    },

    /**
     * Get fee for specific exchange
     */
    getFee(exchangeId) {
        const fees = this.get('fees');
        return fees[exchangeId] || 0.1; // Default to 0.1% if not found
    },

    /**
     * Get all configured trading pairs
     */
    getPairs() {
        return this.get('pairs') || this.defaults.pairs;
    },

    /**
     * Get all configured exchanges
     */
    getExchanges() {
        return this.get('exchanges') || this.defaults.exchanges;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}
