# Neural Trading Terminal

A sophisticated AI-powered trading terminal with real-time chart analysis and MetaTrader 5 integration.

## Features

- 🤖 **AI-Powered Analysis**: Advanced trading analysis using Claude (Anthropic) API with ICT/SMC concepts
- 📊 **Real-time Charts**: Interactive candlestick charts with volume indicators
- 🎯 **Signal Generation**: Automated trading signals with entry, SL, TP levels
- 🔗 **MT5 Integration**: Live trade execution via Python bridge
- 💼 **Multi-Asset Support**: Forex, Gold, Crypto, and Indices
- 🎨 **Professional UI**: Dark-themed interface optimized for traders

## Live Demo

🚀 **Deployed on Vercel**: [https://achwanyaneural.vercel.app](https://achwanyaneural.vercel.app)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/achwanyaa/Achwanyaneural.git
cd Achwanyaneural
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
# Add your Anthropic API key to .env.local
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Live Trading Setup

### Prerequisites
- MetaTrader 5 installed
- Python 3.7+

### MT5 Bridge Setup

1. **Install Python dependencies**:
```bash
pip install fastapi uvicorn MetaTrader5
```

2. **Run the MT5 bridge**:
```bash
python mt5_bridge.py
```

3. **Test connection** in the terminal's MT5 tab

### Environment Variables

```env
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main application page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   └── components/
│       ├── Toolbar.tsx       # Top navigation bar
│       ├── TradingChart.tsx  # Chart visualization
│       ├── AIAnalyst.tsx     # AI chat interface
│       └── RightPanel.tsx    # Signals, positions, MT5 settings
├── mt5_bridge.py             # Python MT5 integration
├── package.json
├── vercel.json              # Vercel deployment config
└── README.md
```

## Deployment on Vercel

1. **Connect GitHub Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**:
   - Add `NEXT_PUBLIC_ANTHROPIC_API_KEY` in Vercel settings
   - Set your Anthropic API key

3. **Deploy**:
   - Vercel will automatically build and deploy
   - Your app will be live at `https://your-project.vercel.app`

## Usage

### Basic Analysis
1. Select your trading symbol (XAUUSD, EURUSD, etc.)
2. Choose timeframe (5M, 15M, 30M, 1H, 2H)
3. Ask the AI analyst: *"Analyze the current chart and give me a trade setup"*

### Live Trading
1. Set up MT5 bridge (see above)
2. Get a trading signal from AI analysis
3. Click "Place Trade" in the Signal tab
4. Monitor positions in the Trades tab

## API Integration

The terminal uses:
- **Anthropic Claude** for AI analysis
- **MetaTrader 5** for live trading
- **FastAPI** for the MT5 bridge

## Supported Assets

- **Forex**: XAUUSD, EURUSD, GBPUSD, USDJPY
- **Crypto**: BTCUSD
- **Indices**: NAS100, US30

## Technical Details

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom trading theme
- **Charts**: Custom SVG-based charting engine
- **Real-time**: WebSocket simulation for price updates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your trading needs.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the MT5 bridge logs for connection problems

---

**⚠️ Risk Warning**: Trading involves substantial risk. This tool is for educational and analysis purposes only. Always do your own research before making trading decisions.
