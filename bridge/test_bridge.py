"""Bridge tests with a fake MetaTrader5 module (no terminal needed).

    pip install -r requirements-dev.txt
    pytest
"""

import sys
import types
from types import SimpleNamespace as NS

import pytest

# ---------------------------------------------------------------- fake MetaTrader5

fake = types.ModuleType("MetaTrader5")
fake.ORDER_TYPE_BUY, fake.ORDER_TYPE_SELL = 0, 1
fake.POSITION_TYPE_BUY, fake.POSITION_TYPE_SELL = 0, 1
fake.TRADE_ACTION_DEAL = 1
fake.ORDER_TIME_GTC = 0
fake.ORDER_FILLING_FOK, fake.ORDER_FILLING_IOC, fake.ORDER_FILLING_RETURN = 0, 1, 2
fake.SYMBOL_FILLING_FOK, fake.SYMBOL_FILLING_IOC = 1, 2
fake.TRADE_RETCODE_DONE = 10009
fake.ACCOUNT_TRADE_MODE_DEMO = 0


class State:
    def reset(self):
        self.terminal = NS(connected=True, trade_allowed=True)
        self.account = NS(login=1, server="Demo", currency="USD", balance=10_000.0, equity=10_000.0, trade_allowed=True, trade_mode=0)
        # EURUSD-like: 1 lot loses $10 per pip (0.0001)
        self.symbols = {
            "EURUSD": NS(digits=5, point=0.00001, trade_stops_level=10, trade_tick_size=0.00001, trade_tick_value=1.0,
                         volume_min=0.01, volume_max=50.0, volume_step=0.01, filling_mode=2),
        }
        self.ticks = {"EURUSD": NS(bid=1.10000, ask=1.10010, time=0)}
        self.sent = []
        self.order_result = NS(retcode=10009, order=555, deal=777, price=1.10010, volume=0.5, comment="done")
        self.positions = []


S = State()
fake.initialize = lambda: True
fake.last_error = lambda: (1, "err")
fake.terminal_info = lambda: S.terminal
fake.account_info = lambda: S.account
fake.symbol_select = lambda name, enable: name in S.symbols
fake.symbol_info = lambda name: S.symbols.get(name)
fake.symbol_info_tick = lambda name: S.ticks.get(name)
fake.order_calc_profit = lambda order_type, symbol, volume, price, close: (close - price) / 0.00001 * 1.0 * volume * (1 if order_type == 0 else -1)


def _order_send(request):
    S.sent.append(request)
    return S.order_result


fake.order_send = _order_send
fake.positions_get = lambda ticket=None: [p for p in S.positions if ticket is None or p.ticket == ticket]
sys.modules["MetaTrader5"] = fake

import mt5_bridge  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

TOKEN = "test-token"
CONFIG = {**mt5_bridge.DEFAULT_CONFIG, "token": TOKEN, "allowed_origins": ["http://localhost:3000"]}


@pytest.fixture(autouse=True)
def reset():
    S.reset()


@pytest.fixture
def client():
    c = TestClient(mt5_bridge.create_app(CONFIG))
    c.headers["X-Bridge-Token"] = TOKEN
    return c


# ---------------------------------------------------------------- auth / status


def test_rejects_missing_or_wrong_token():
    c = TestClient(mt5_bridge.create_app(CONFIG))
    assert c.get("/status").status_code == 401
    assert c.get("/status", headers={"X-Bridge-Token": "nope"}).status_code == 401
    assert c.post("/trade", json={}).status_code in (401, 422)


def test_status_offline_when_terminal_down(client, monkeypatch):
    monkeypatch.setattr(fake, "terminal_info", lambda: None)
    monkeypatch.setattr(fake, "initialize", lambda: False)
    assert client.get("/status").status_code == 503


def test_status_ok(client):
    body = client.get("/status").json()
    assert body["connected"] and body["trade_allowed"] and body["account"]["demo"]


def test_cors_only_allows_configured_origin(client):
    pre = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-bridge-token"}
    ok = client.options("/trade", headers={"Origin": "http://localhost:3000", **pre})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    bad = client.options("/trade", headers={"Origin": "https://evil.example", **pre})
    assert "access-control-allow-origin" not in bad.headers


def test_private_network_preflight(client):
    # What Chrome sends before an HTTPS page calls the localhost bridge.
    r = client.options(
        "/status",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET",
                 "Access-Control-Request-Headers": "x-bridge-token",
                 "Access-Control-Request-Private-Network": "true"},
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-private-network") == "true"
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ---------------------------------------------------------------- preview / sizing


def test_preview_sizes_by_risk(client):
    # buy at ask 1.10010, SL 20 pips below → $200 per lot; 1% of 10k = $100 → 0.5 lots
    r = client.post("/preview", json={"symbol": "EURUSD", "side": "buy", "sl": 1.09810, "tp": 1.10410, "risk_pct": 1})
    assert r.status_code == 200, r.text
    assert r.json()["lots"] == 0.5
    assert r.json()["risk_money"] == 100.0


def test_preview_rejects_wrong_side_stops(client):
    r = client.post("/preview", json={"symbol": "EURUSD", "side": "buy", "sl": 1.1050, "tp": 1.1100, "risk_pct": 1})
    assert r.status_code == 422


def test_preview_rejects_risk_above_cap(client):
    r = client.post("/preview", json={"symbol": "EURUSD", "side": "buy", "sl": 1.0981, "tp": 1.1041, "risk_pct": 5})
    assert r.status_code == 422


def test_preview_rejects_poor_rr(client):
    r = client.post("/preview", json={"symbol": "EURUSD", "side": "buy", "sl": 1.0981, "tp": 1.1006, "risk_pct": 1})
    assert r.status_code == 422 and "Risk:reward" in r.json()["detail"]


def test_unknown_symbol_is_404_not_500(client):
    r = client.post("/preview", json={"symbol": "XAUUSD", "side": "buy", "sl": 1, "tp": 3, "risk_pct": 1})
    assert r.status_code == 404 and "symbol_map" in r.json()["detail"]


def test_symbol_map_is_applied(client):
    S.symbols["EURUSD.m"] = S.symbols.pop("EURUSD")
    S.ticks["EURUSD.m"] = S.ticks.pop("EURUSD")
    c = TestClient(mt5_bridge.create_app({**CONFIG, "symbol_map": {"EURUSD": "EURUSD.m"}}))
    r = c.get("/quote/EURUSD", headers={"X-Bridge-Token": TOKEN})
    assert r.status_code == 200 and r.json()["broker_symbol"] == "EURUSD.m"


# ---------------------------------------------------------------- trade / close


def test_trade_success_uses_supported_filling(client):
    r = client.post("/trade", json={"symbol": "EURUSD", "side": "buy", "sl": 1.09810, "tp": 1.10410, "lots": 0.5})
    assert r.status_code == 200, r.text
    assert r.json()["ticket"] == 555
    assert S.sent[0]["type_filling"] == fake.ORDER_FILLING_IOC  # symbol supports IOC only
    assert S.sent[0]["sl"] == 1.09810


def test_rejected_order_is_an_error_not_success(client):
    S.order_result = NS(retcode=10019, order=0, deal=0, price=0, volume=0, comment="No money")
    r = client.post("/trade", json={"symbol": "EURUSD", "side": "buy", "sl": 1.09810, "tp": 1.10410, "lots": 0.5})
    assert r.status_code == 422 and "No money" in r.json()["detail"]


def test_order_send_none_is_502(client, monkeypatch):
    monkeypatch.setattr(fake, "order_send", lambda req: None)
    r = client.post("/trade", json={"symbol": "EURUSD", "side": "buy", "sl": 1.09810, "tp": 1.10410, "lots": 0.5})
    assert r.status_code == 502


def test_trade_rejects_lots_over_risk_cap(client):
    # 20-pip stop, 2% cap of 10k = $200 → max 1 lot; 3 lots must be refused before sending
    r = client.post("/trade", json={"symbol": "EURUSD", "side": "buy", "sl": 1.09810, "tp": 1.10410, "lots": 3})
    assert r.status_code == 422 and not S.sent


def test_positions_filtered_by_magic_and_close(client):
    S.positions = [
        NS(ticket=1, magic=234000, symbol="EURUSD", type=0, volume=0.5, price_open=1.1, price_current=1.1001, sl=1.09, tp=1.12, profit=5.0, time=0),
        NS(ticket=2, magic=999, symbol="EURUSD", type=0, volume=1, price_open=1.1, price_current=1.1, sl=0, tp=0, profit=0, time=0),
    ]
    tickets = [p["ticket"] for p in client.get("/positions").json()["positions"]]
    assert tickets == [1]
    assert client.post("/close/2").status_code == 403
    r = client.post("/close/1")
    assert r.status_code == 200
    assert S.sent[-1]["position"] == 1 and S.sent[-1]["type"] == fake.ORDER_TYPE_SELL


def test_round_to_step():
    assert mt5_bridge.round_to_step(0.5049, 0.01) == 0.5
    assert mt5_bridge.round_to_step(1.29, 0.1) == 1.2
    assert mt5_bridge.round_to_step(3.7, 1) == 3


def test_load_config_creates_token(tmp_path):
    path = tmp_path / "cfg.json"
    cfg, created = mt5_bridge.load_config(path)
    assert created and len(cfg["token"]) > 20 and path.exists()
    cfg2, created2 = mt5_bridge.load_config(path)
    assert not created2 and cfg2["token"] == cfg["token"]
