/**
 * Main Application
 * Handles UI interactions and coordinates between modules
 */

class DiscoPicApp {
    constructor() {
        // State
        this.opportunities = [];
        this.filteredOpportunities = [];
        this.isLoading = false;
        this.autoRefreshInterval = null;

        // DOM elements
        this.elements = {
            // Buttons
            settingsBtn: document.getElementById('settingsBtn'),
            demoBtn: document.getElementById('demoBtn'),
            refreshBtn: document.getElementById('refreshBtn'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            cancelSettingsBtn: document.getElementById('cancelSettingsBtn'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),

            // Status bar
            statusText: document.getElementById('statusText'),
            lastUpdateText: document.getElementById('lastUpdateText'),
            opportunityCount: document.getElementById('opportunityCount'),
            autoRefreshToggle: document.getElementById('autoRefreshToggle'),

            // Filters
            pairFilter: document.getElementById('pairFilter'),
            minProfitFilter: document.getElementById('minProfitFilter'),
            sortBy: document.getElementById('sortBy'),

            // Table
            arbitrageTableBody: document.getElementById('arbitrageTableBody'),

            // Modal
            settingsModal: document.getElementById('settingsModal'),

            // Settings inputs
            apiKeyInput: document.getElementById('apiKeyInput'),
            refreshInterval: document.getElementById('refreshInterval'),
            defaultMinProfit: document.getElementById('defaultMinProfit'),
            feeBinance: document.getElementById('feeBinance'),
            feeCoinbase: document.getElementById('feeCoinbase'),
            feeKraken: document.getElementById('feeKraken'),
            feeBitfinex: document.getElementById('feeBitfinex'),
            pairCheckboxes: document.querySelectorAll('.pair-checkbox'),

            // Messages
            loadingIndicator: document.getElementById('loadingIndicator'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText')
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        // Load configuration
        this.config = Config.load();

        // Bind event listeners
        this.bindEvents();

        // Load settings into UI
        this.loadSettingsToUI();

        // Check if API key is configured
        if (!Config.hasApiKey()) {
            this.showError('Please configure your API key in settings to start monitoring.');
            this.openSettings();
        } else {
            this.updateStatus('Ready to monitor');
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Settings modal
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.elements.cancelSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());

        // Click overlay to close modal
        this.elements.settingsModal.querySelector('.modal-overlay').addEventListener('click', () => this.closeSettings());

        // Demo mode
        this.elements.demoBtn.addEventListener('click', () => this.loadDemoData());

        // Refresh
        this.elements.refreshBtn.addEventListener('click', () => this.refresh());

        // Auto-refresh toggle
        this.elements.autoRefreshToggle.addEventListener('change', (e) => this.toggleAutoRefresh(e.target.checked));

        // Filters
        this.elements.pairFilter.addEventListener('change', () => this.applyFilters());
        this.elements.minProfitFilter.addEventListener('input', () => this.applyFilters());
        this.elements.sortBy.addEventListener('change', () => this.applyFilters());
    }

    /**
     * Open settings modal
     */
    openSettings() {
        this.loadSettingsToUI();
        this.elements.settingsModal.classList.remove('hidden');
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }

    /**
     * Load current settings into UI
     */
    loadSettingsToUI() {
        const config = Config.load();

        this.elements.apiKeyInput.value = config.apiKey || '';
        this.elements.refreshInterval.value = config.refreshInterval || 30;
        this.elements.defaultMinProfit.value = config.defaultMinProfit || 0.5;
        this.elements.minProfitFilter.value = config.defaultMinProfit || 0.5;

        // Load fees
        this.elements.feeBinance.value = config.fees.BINANCE || 0.1;
        this.elements.feeCoinbase.value = config.fees.COINBASE || 0.6;
        this.elements.feeKraken.value = config.fees.KRAKEN || 0.26;
        this.elements.feeBitfinex.value = config.fees.BITFINEX || 0.2;

        // Load selected pairs
        this.elements.pairCheckboxes.forEach(checkbox => {
            checkbox.checked = config.pairs.includes(checkbox.value);
        });
    }

    /**
     * Save settings from UI
     */
    saveSettings() {
        const selectedPairs = Array.from(this.elements.pairCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        if (selectedPairs.length === 0) {
            this.showError('Please select at least one trading pair.');
            return;
        }

        const config = {
            apiKey: this.elements.apiKeyInput.value.trim(),
            refreshInterval: parseInt(this.elements.refreshInterval.value),
            defaultMinProfit: parseFloat(this.elements.defaultMinProfit.value),
            autoRefresh: this.elements.autoRefreshToggle.checked,
            fees: {
                BINANCE: parseFloat(this.elements.feeBinance.value),
                COINBASE: parseFloat(this.elements.feeCoinbase.value),
                KRAKEN: parseFloat(this.elements.feeKraken.value),
                BITFINEX: parseFloat(this.elements.feeBitfinex.value)
            },
            pairs: selectedPairs,
            exchanges: Config.defaults.exchanges
        };

        if (Config.save(config)) {
            this.config = config;
            this.elements.minProfitFilter.value = config.defaultMinProfit;
            this.closeSettings();
            this.updateStatus('Settings saved');

            // Restart auto-refresh if enabled
            if (this.elements.autoRefreshToggle.checked) {
                this.startAutoRefresh();
            }
        } else {
            this.showError('Failed to save settings.');
        }
    }

    /**
     * Refresh data
     */
    async refresh() {
        if (this.isLoading) {
            return;
        }

        if (!Config.hasApiKey()) {
            this.showError('Please configure your API key in settings.');
            this.openSettings();
            return;
        }

        this.isLoading = true;
        this.updateStatus('Fetching market data...');
        this.showLoading(true);
        this.hideError();

        try {
            const apiKey = Config.getApiKey();
            const pairs = Config.getPairs();
            const exchanges = Config.getExchanges();
            const fees = Config.get('fees');

            // Fetch all quotes
            const quotes = await CoinAPI.getAllQuotes(pairs, exchanges, apiKey);

            if (quotes.length === 0) {
                this.showError('No market data available. Please check your configuration.');
                this.updateStatus('No data');
                this.opportunities = [];
            } else {
                // Calculate arbitrage opportunities
                const minProfit = parseFloat(this.elements.minProfitFilter.value) || 0;
                this.opportunities = Arbitrage.calculateOpportunities(quotes, fees, minProfit);

                // Update UI
                this.applyFilters();
                this.updateLastUpdate();
                this.updateStatus(`Found ${this.opportunities.length} opportunities`);
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            this.showError(error.message);
            this.updateStatus('Error');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Load demo data (for testing without API key)
     */
    loadDemoData() {
        this.updateStatus('Loading demo data...');
        this.hideError();

        // Generate realistic mock quotes
        const mockQuotes = [
            // BTC/USDT
            { exchange: 'BINANCE', pair: 'BTC/USDT', ask: 42150.50, bid: 42148.20, askVolume: 2.5, bidVolume: 3.1 },
            { exchange: 'COINBASE', pair: 'BTC/USDT', ask: 42195.75, bid: 42193.40, askVolume: 1.8, bidVolume: 2.2 },
            { exchange: 'KRAKEN', pair: 'BTC/USDT', ask: 42168.30, bid: 42166.10, askVolume: 3.2, bidVolume: 2.9 },
            { exchange: 'BITFINEX', pair: 'BTC/USDT', ask: 42180.90, bid: 42178.50, askVolume: 2.1, bidVolume: 2.5 },

            // ETH/USDT
            { exchange: 'BINANCE', pair: 'ETH/USDT', ask: 2245.80, bid: 2245.20, askVolume: 15.5, bidVolume: 18.2 },
            { exchange: 'COINBASE', pair: 'ETH/USDT', ask: 2252.30, bid: 2251.70, askVolume: 12.3, bidVolume: 14.7 },
            { exchange: 'KRAKEN', pair: 'ETH/USDT', ask: 2248.60, bid: 2248.00, askVolume: 16.8, bidVolume: 15.1 },
            { exchange: 'BITFINEX', pair: 'ETH/USDT', ask: 2250.40, bid: 2249.80, askVolume: 13.2, bidVolume: 16.5 },

            // BNB/USDT
            { exchange: 'BINANCE', pair: 'BNB/USDT', ask: 312.45, bid: 312.20, askVolume: 45.2, bidVolume: 52.8 },
            { exchange: 'COINBASE', pair: 'BNB/USDT', ask: 314.60, bid: 314.35, askVolume: 38.5, bidVolume: 41.2 },
            { exchange: 'KRAKEN', pair: 'BNB/USDT', ask: 313.20, bid: 312.95, askVolume: 42.1, bidVolume: 48.6 },
            { exchange: 'BITFINEX', pair: 'BNB/USDT', ask: 313.85, bid: 313.60, askVolume: 39.7, bidVolume: 44.3 }
        ];

        const fees = Config.get('fees');
        const minProfit = parseFloat(this.elements.minProfitFilter.value) || 0;

        // Calculate arbitrage opportunities from mock data
        this.opportunities = Arbitrage.calculateOpportunities(mockQuotes, fees, minProfit);

        // Update UI
        this.applyFilters();
        this.updateLastUpdate();
        this.updateStatus(`Demo Mode - Found ${this.opportunities.length} opportunities`);
    }

    /**
     * Apply filters and update table
     */
    applyFilters() {
        const pairFilter = this.elements.pairFilter.value;
        const minProfit = parseFloat(this.elements.minProfitFilter.value) || 0;
        const sortBy = this.elements.sortBy.value;

        // Filter
        let filtered = Arbitrage.filterByPair(this.opportunities, pairFilter);
        filtered = Arbitrage.filterByMinProfit(filtered, minProfit);

        // Sort
        filtered = Arbitrage.sort(filtered, sortBy);

        this.filteredOpportunities = filtered;
        this.updateTable();
        this.updateOpportunityCount();
    }

    /**
     * Update the arbitrage table
     */
    updateTable() {
        const tbody = this.elements.arbitrageTableBody;

        if (this.filteredOpportunities.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="9">
                        <div class="empty-message">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 6v6l4 2"></path>
                            </svg>
                            <p>No arbitrage opportunities found</p>
                            <p class="empty-hint">Try adjusting your filters or refresh the data</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredOpportunities.map(opp => `
            <tr>
                <td><span class="pair-name">${opp.pair}</span></td>
                <td><span class="exchange-name">${opp.buyExchange}</span></td>
                <td><span class="price">$${Arbitrage.formatPrice(opp.buyPrice)}</span></td>
                <td><span class="exchange-name">${opp.sellExchange}</span></td>
                <td><span class="price">$${Arbitrage.formatPrice(opp.sellPrice)}</span></td>
                <td><span class="spread">$${Arbitrage.formatPrice(opp.spread)}</span></td>
                <td><span class="profit ${Arbitrage.getProfitClass(opp.grossProfit)}">${Arbitrage.formatPercent(opp.grossProfit)}</span></td>
                <td><span class="profit ${Arbitrage.getProfitClass(opp.netProfit)}">${Arbitrage.formatPercent(opp.netProfit)}</span></td>
                <td>
                    <button class="action-btn" onclick="app.viewDetails('${opp.pair}', '${opp.buyExchange}', '${opp.sellExchange}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * View opportunity details
     */
    viewDetails(pair, buyExchange, sellExchange) {
        const opp = this.filteredOpportunities.find(
            o => o.pair === pair && o.buyExchange === buyExchange && o.sellExchange === sellExchange
        );

        if (opp) {
            const details = Arbitrage.calculateProfitAmount(opp, 1000);
            alert(`
Arbitrage Opportunity Details
================================

Trading Pair: ${opp.pair}
Buy on: ${opp.buyExchange} @ $${Arbitrage.formatPrice(opp.buyPrice)}
Sell on: ${opp.sellExchange} @ $${Arbitrage.formatPrice(opp.sellPrice)}

Price Spread: $${Arbitrage.formatPrice(opp.spread)}
Gross Profit: ${Arbitrage.formatPercent(opp.grossProfit)}
Net Profit: ${Arbitrage.formatPercent(opp.netProfit)}

Example with $1,000 investment:
- Buy ${details.buyAmount.toFixed(8)} ${pair.split('/')[0]}
- Buy Fee: $${details.buyFeeAmount.toFixed(2)}
- Sell Value: $${details.sellValue.toFixed(2)}
- Sell Fee: $${details.sellFeeAmount.toFixed(2)}
- Net Profit: $${details.profit.toFixed(2)} (${Arbitrage.formatPercent(details.profitPercent)})

Note: This does not account for transfer fees, slippage, or execution time.
            `);
        }
    }

    /**
     * Toggle auto-refresh
     */
    toggleAutoRefresh(enabled) {
        if (enabled) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval

        const interval = (Config.get('refreshInterval') || 30) * 1000;
        this.autoRefreshInterval = setInterval(() => {
            this.refresh();
        }, interval);

        // Initial refresh
        this.refresh();
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * Update status text
     */
    updateStatus(text) {
        this.elements.statusText.textContent = text;
    }

    /**
     * Update last update time
     */
    updateLastUpdate() {
        const now = new Date().toLocaleTimeString();
        this.elements.lastUpdateText.textContent = now;
    }

    /**
     * Update opportunity count
     */
    updateOpportunityCount() {
        this.elements.opportunityCount.textContent = this.filteredOpportunities.length;
    }

    /**
     * Show/hide loading indicator
     */
    showLoading(show) {
        if (show) {
            this.elements.loadingIndicator.classList.remove('hidden');
        } else {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
    }

    /**
     * Hide error message
     */
    hideError() {
        this.elements.errorMessage.classList.add('hidden');
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DiscoPicApp();
});
