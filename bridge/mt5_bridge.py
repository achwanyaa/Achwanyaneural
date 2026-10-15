"""AchwanyaNeural MT5 bridge.

A small local HTTP API that lets the AchwanyaNeural web app read your MetaTrader 5
account and place/close trades. It only listens on 127.0.0.1, only answers the
browser origins listed in bridge_config.json, and every request must carry the
token from that file.

    pip install -r requirements.txt
    python mt5_bridge.py              # first run creates bridge_config.json and prints the token
    python mt5_bridge.py --show-token

Test on a demo account first.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import secrets
from pathlib import Path
from typing import Any, Literal

import MetaTrader5 as mt5
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

CONFIG_PATH = Path(__file__).with_name("bridge_config.json")

DEFAULT_CONFIG: dict[str, Any] = {
    "token": "",
    "port": 18765,
    # Add your deployed site, e.g. "https://achwanyaneural.vercel.app"
    "allowed_origins": ["http://localhost:3000"],
    # App symbol -> broker symbol, for brokers with suffixes, e.g. {"XAUUSD": "XAUUSD.m", "NAS100": "USTEC"}
    "symbol_map": {},
    "magic": 234000,
    "max_risk_pct": 2.0,
    "min_rr": 1.0,
    "deviation_points": 20,
}

SYMBOL_RE = re.compile(r"^[A-Za-z0-9._#-]{1,32}$")


def load_config(path: Path = CONFIG_PATH) -> tuple[dict[str, Any], bool]:
    """Load config, creating it (with a fresh token) on first run. Returns (config, created)."""
    created = False
    data: dict[str, Any] = {}
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    config = {**DEFAULT_CONFIG, **data}
    if not config["token"]:
        config["token"] = secrets.token_urlsafe(32)
        created = True
    if created or not path.exists():
        path.write_text(json.dumps(config, indent=2), encoding="utf-8")
    return config, created


# ---------------------------------------------------------------- request models


class PreviewRequest(BaseModel):
    symbol: str
    side: Literal["buy", "sell"]
    sl: float = Field(gt=0)
    tp: float = Field(gt=0)
    risk_pct: float = Field(gt=0)


class TradeRequest(BaseModel):
    symbol: str
    side: Literal["buy", "sell"]
    sl: float = Field(gt=0)
    tp: float = Field(gt=0)
    lots: float = Field(gt=0)


# ---------------------------------------------------------------- MT5 helpers


def _fail(status: int, detail: str) -> HTTPException:
    return HTTPException(status_code=status, detail=detail)


def ensure_connected() -> Any:
    """Return terminal_info, (re)initialising the MT5 connection if needed."""
    info = mt5.terminal_info()
    if info is None:
        if not mt5.initialize():
            raise _fail(503, f"MetaTrader 5 is not running or not logged in ({mt5.last_error()})")
        info = mt5.terminal_info()
        if info is None:
            raise _fail(503, "MetaTrader 5 terminal is not available")
    return info


def account() -> Any:
    ensure_connected()
    acc = mt5.account_info()
    if acc is None:
        raise _fail(503, "No MT5 account is logged in")
    return acc


def round_to_step(value: float, step: float) -> float:
    """Floor to the volume step, keeping the step's decimal places."""
    if step <= 0:
        return value
    decimals = max(0, -int(math.floor(math.log10(step)))) if step < 1 else 0
    return round(math.floor(value / step + 1e-9) * step, decimals)


def filling_mode(info: Any) -> int:
    """Pick an order filling mode the symbol supports."""
    fok = getattr(mt5, "SYMBOL_FILLING_FOK", 1)
    ioc = getattr(mt5, "SYMBOL_FILLING_IOC", 2)
    if info.filling_mode & fok:
        return mt5.ORDER_FILLING_FOK
    if info.filling_mode & ioc:
        return mt5.ORDER_FILLING_IOC
    return mt5.ORDER_FILLING_RETURN


def check_levels(side: str, price: float, sl: float, tp: float, info: Any, min_rr: float) -> None:
    """Reject stops on the wrong side of the live price, too close for the broker, or poor R:R."""
    if side == "buy" and not (sl < price < tp):
        raise _fail(422, f"For a buy at {price}, stop loss must be below and take profit above the price")
    if side == "sell" and not (tp < price < sl):
        raise _fail(422, f"For a sell at {price}, stop loss must be above and take profit below the price")
    min_dist = info.trade_stops_level * info.point
    if abs(price - sl) < min_dist or abs(tp - price) < min_dist:
        raise _fail(422, f"Stops must be at least {min_dist} away from the price (broker stops level)")
    rr = abs(tp - price) / abs(price - sl)
    if rr < min_rr:
        raise _fail(422, f"Risk:reward at the current price is 1:{rr:.2f}, below the 1:{min_rr} minimum")


def loss_per_lot(side: str, symbol: str, price: float, sl: float, info: Any) -> float:
    """Account-currency loss for 1.0 lot if the stop is hit."""
    order_type = mt5.ORDER_TYPE_BUY if side == "buy" else mt5.ORDER_TYPE_SELL
    profit = mt5.order_calc_profit(order_type, symbol, 1.0, price, sl)
    if profit is not None:
        return abs(profit)
    if info.trade_tick_size <= 0:
        raise _fail(502, "Cannot compute risk: broker reports no tick size for this symbol")
    return abs(price - sl) / info.trade_tick_size * info.trade_tick_value


# ---------------------------------------------------------------- app


def create_app(config: dict[str, Any]) -> FastAPI:
    app = FastAPI(title="AchwanyaNeural MT5 bridge", docs_url=None, redoc_url=None)
    symbol_map: dict[str, str] = config["symbol_map"]
    reverse_map = {broker: app_sym for app_sym, broker in symbol_map.items()}

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config["allowed_origins"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Bridge-Token"],
        # Chrome's Private Network Access preflight, sent when an HTTPS site calls localhost.
        allow_private_network=True,
    )

    def require_token(x_bridge_token: str = Header(default="")) -> None:
        if not secrets.compare_digest(x_bridge_token.encode(), config["token"].encode()):
            raise _fail(401, "Missing or wrong bridge token")

    def resolve(app_symbol: str) -> tuple[str, Any]:
        if not SYMBOL_RE.match(app_symbol):
            raise _fail(400, "Invalid symbol")
        ensure_connected()
        broker = symbol_map.get(app_symbol, app_symbol)
        if not mt5.symbol_select(broker, True):
            raise _fail(404, f"Symbol {broker} not found at your broker. Map it in bridge_config.json → symbol_map.")
        info = mt5.symbol_info(broker)
        if info is None:
            raise _fail(404, f"No symbol info for {broker}")
        return broker, info

    def tick(broker: str) -> Any:
        t = mt5.symbol_info_tick(broker)
        if t is None or not t.bid or not t.ask:
            raise _fail(503, f"No live price for {broker} (market closed?)")
        return t

    auth = [Depends(require_token)]

    @app.get("/status", dependencies=auth)
    def status() -> dict[str, Any]:
        info = ensure_connected()
        acc = account()
        return {
            "connected": bool(info.connected),
            "trade_allowed": bool(info.trade_allowed and acc.trade_allowed),
            "account": {
                "login": acc.login,
                "server": acc.server,
                "currency": acc.currency,
                "balance": acc.balance,
                "equity": acc.equity,
                "demo": acc.trade_mode == getattr(mt5, "ACCOUNT_TRADE_MODE_DEMO", 0),
            },
            "max_risk_pct": config["max_risk_pct"],
        }

    @app.get("/quote/{symbol}", dependencies=auth)
    def quote(symbol: str) -> dict[str, Any]:
        broker, info = resolve(symbol)
        t = tick(broker)
        return {"symbol": symbol, "broker_symbol": broker, "bid": t.bid, "ask": t.ask, "digits": info.digits, "time": t.time}

    @app.post("/preview", dependencies=auth)
    def preview(req: PreviewRequest) -> dict[str, Any]:
        if req.risk_pct > config["max_risk_pct"]:
            raise _fail(422, f"Risk {req.risk_pct}% exceeds the bridge maximum of {config['max_risk_pct']}%")
        broker, info = resolve(req.symbol)
        t = tick(broker)
        price = t.ask if req.side == "buy" else t.bid
        check_levels(req.side, price, req.sl, req.tp, info, config["min_rr"])
        acc = account()
        risk_money = acc.balance * req.risk_pct / 100
        per_lot = loss_per_lot(req.side, broker, price, req.sl, info)
        lots = min(round_to_step(risk_money / per_lot, info.volume_step), info.volume_max)
        if lots < info.volume_min:
            raise _fail(
                422,
                f"Stop is too wide for {req.risk_pct}% risk: the minimum {info.volume_min} lots would risk "
                f"{per_lot * info.volume_min:.2f} {acc.currency}",
            )
        return {
            "broker_symbol": broker,
            "price": price,
            "lots": lots,
            "risk_money": round(per_lot * lots, 2),
            "reward_money": round(per_lot * lots * abs(req.tp - price) / abs(price - req.sl), 2),
            "currency": acc.currency,
            "digits": info.digits,
        }

    @app.post("/trade", dependencies=auth)
    def trade(req: TradeRequest) -> dict[str, Any]:
        broker, info = resolve(req.symbol)
        t = tick(broker)
        price = t.ask if req.side == "buy" else t.bid
        check_levels(req.side, price, req.sl, req.tp, info, config["min_rr"])
        lots = round_to_step(req.lots, info.volume_step)
        if not (info.volume_min <= lots <= info.volume_max):
            raise _fail(422, f"Lot size {req.lots} is outside the broker range {info.volume_min}–{info.volume_max}")
        acc = account()
        risk_money = loss_per_lot(req.side, broker, price, req.sl, info) * lots
        max_money = acc.balance * config["max_risk_pct"] / 100
        if risk_money > max_money * 1.05:  # small tolerance for price movement since the preview
            raise _fail(422, f"This trade would risk {risk_money:.2f} {acc.currency}, over the {config['max_risk_pct']}% cap")

        result = mt5.order_send(
            {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": broker,
                "volume": lots,
                "type": mt5.ORDER_TYPE_BUY if req.side == "buy" else mt5.ORDER_TYPE_SELL,
                "price": price,
                "sl": req.sl,
                "tp": req.tp,
                "deviation": config["deviation_points"],
                "magic": config["magic"],
                "comment": "AchwanyaNeural",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode(info),
            }
        )
        if result is None:
            raise _fail(502, f"MT5 did not accept the request ({mt5.last_error()})")
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise _fail(422, f"Order rejected by MT5: {result.comment} (retcode {result.retcode})")
        return {"ticket": result.order, "deal": result.deal, "price": result.price, "lots": result.volume}

    @app.get("/positions", dependencies=auth)
    def positions() -> dict[str, Any]:
        ensure_connected()
        rows = mt5.positions_get() or ()
        out = []
        for p in rows:
            if p.magic != config["magic"]:
                continue
            out.append(
                {
                    "ticket": p.ticket,
                    "symbol": reverse_map.get(p.symbol, p.symbol),
                    "broker_symbol": p.symbol,
                    "side": "buy" if p.type == mt5.POSITION_TYPE_BUY else "sell",
                    "lots": p.volume,
                    "open_price": p.price_open,
                    "current_price": p.price_current,
                    "sl": p.sl,
                    "tp": p.tp,
                    "profit": p.profit,
                    "time": p.time,
                }
            )
        return {"positions": out}

    @app.post("/close/{ticket}", dependencies=auth)
    def close(ticket: int) -> dict[str, Any]:
        ensure_connected()
        found = mt5.positions_get(ticket=ticket)
        if not found:
            raise _fail(404, f"Position {ticket} not found (already closed?)")
        p = found[0]
        if p.magic != config["magic"]:
            raise _fail(403, "That position was not opened by AchwanyaNeural")
        info = mt5.symbol_info(p.symbol)
        t = tick(p.symbol)
        is_buy = p.type == mt5.POSITION_TYPE_BUY
        result = mt5.order_send(
            {
                "action": mt5.TRADE_ACTION_DEAL,
                "symbol": p.symbol,
                "volume": p.volume,
                "type": mt5.ORDER_TYPE_SELL if is_buy else mt5.ORDER_TYPE_BUY,
                "position": p.ticket,
                "price": t.bid if is_buy else t.ask,
                "deviation": config["deviation_points"],
                "magic": config["magic"],
                "comment": "AchwanyaNeural close",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling_mode(info),
            }
        )
        if result is None:
            raise _fail(502, f"MT5 did not accept the close request ({mt5.last_error()})")
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise _fail(422, f"Close rejected by MT5: {result.comment} (retcode {result.retcode})")
        return {"closed": p.ticket, "price": result.price}

    return app


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--show-token", action="store_true", help="print the bridge token and exit")
    args = parser.parse_args()

    config, created = load_config()
    if args.show_token:
        print(config["token"])
        return
    if created:
        print("Created bridge_config.json with a new token. Paste it into the app's MT5 tab:\n")
        print(f"    {config['token']}\n")
    print(f"Allowed origins: {', '.join(config['allowed_origins'])}")
    print("(Add your deployed site URL to allowed_origins in bridge_config.json if it's missing.)")
    if not mt5.initialize():
        print(f"Warning: could not connect to MetaTrader 5 yet ({mt5.last_error()}). Start MT5 and log in.")

    import uvicorn

    uvicorn.run(create_app(config), host="127.0.0.1", port=int(config["port"]))


if __name__ == "__main__":
    main()
