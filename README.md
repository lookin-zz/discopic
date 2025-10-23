# Discopic - Crypto Arbitrage Monitor

A real-time cryptocurrency arbitrage opportunity monitor powered by CoinAPI. Track price differences across multiple exchanges and identify profitable trading opportunities.

## Features

- **Real-time Price Monitoring**: Fetch live cryptocurrency prices from multiple exchanges
- **Arbitrage Detection**: Automatically calculate price differences and potential profit opportunities
- **Multi-Exchange Support**: Monitor Binance, Coinbase, Kraken, and other major exchanges
- **Customizable Alerts**: Set minimum profit thresholds to filter opportunities
- **Fee Calculations**: Factor in trading fees for accurate profit estimates
- **Responsive Dashboard**: Clean, modern UI that works on desktop and mobile

## Getting Started

### Prerequisites

1. Get a free API key from [CoinAPI.io](https://www.coinapi.io/)
   - Sign up for a free account
   - Free tier includes 100 requests per day
   - Copy your API key

### Usage

1. Open the dashboard at: `https://lookin-zz.github.io/discopic/`
2. Click the Settings icon to open configuration
3. Enter your CoinAPI key
4. Configure trading fees for each exchange (optional)
5. Set your minimum profit threshold
6. Click "Start Monitoring" to begin

## How It Works

### Arbitrage Calculation

The monitor compares prices across exchanges for the same trading pair:

```
Buy Price = Lowest ask price across all exchanges
Sell Price = Highest bid price across all exchanges

Gross Profit = (Sell Price - Buy Price) / Buy Price * 100%
Net Profit = Gross Profit - (Buy Fee + Sell Fee)
```

### Example

- **BTC/USDT** on Binance: $42,000
- **BTC/USDT** on Coinbase: $42,500
- **Potential Profit**: ~1.19% (before fees)

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Your CoinAPI.io API key | Required |
| Refresh Interval | Auto-refresh frequency (seconds) | 30 |
| Min Profit % | Minimum profit to display | 0.5% |
| Trading Fees | Fee per exchange (%) | 0.1% |
| Trading Pairs | Crypto pairs to monitor | BTC/USDT, ETH/USDT, etc. |

## Supported Exchanges

- Binance
- Coinbase Pro
- Kraken
- Bitfinex
- Bitstamp
- And more...

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **API**: CoinAPI.io REST API
- **Hosting**: GitHub Pages
- **Storage**: Browser LocalStorage for settings

## API Rate Limits

CoinAPI free tier limits:
- **100 requests/day**
- The app implements smart caching to stay within limits
- Recommended refresh interval: 30-60 seconds

## Development

### File Structure

```
discopic/
├── index.html              # Main dashboard
├── css/
│   └── style.css          # Styling
├── js/
│   ├── api.js             # CoinAPI integration
│   ├── arbitrage.js       # Calculation logic
│   ├── config.js          # Configuration management
│   └── app.js             # Main application
└── README.md              # This file
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/lookin-zz/discopic.git
cd discopic

# Open in browser (requires a simple HTTP server)
python3 -m http.server 8000
# Navigate to http://localhost:8000
```

## Security Notes

- API keys are stored in browser LocalStorage only
- Never commit API keys to the repository
- Keys are not transmitted anywhere except to CoinAPI
- Use read-only API keys when possible

## Limitations

- Requires manual execution of trades
- Does not account for:
  - Order book depth
  - Withdrawal fees
  - Transfer times between exchanges
  - Slippage
- Price data may have slight delays

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use and modify as needed.

## Disclaimer

This tool is for informational purposes only. Cryptocurrency trading carries risk. Always do your own research and never invest more than you can afford to lose. The arbitrage opportunities shown may not be executable in practice due to various factors.

## Support

For issues or questions, please open an issue on GitHub.

---

**Happy Trading!** 🚀
