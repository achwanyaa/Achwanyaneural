# pip install fastapi uvicorn MetaTrader5
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import MetaTrader5 as mt5, uvicorn

app = FastAPI()
app.add_middleware(CORSMiddleware,
  allow_origins=["*"],
  allow_methods=["*"],
  allow_headers=["*"])

mt5.initialize()

@app.get("/status")
def status():
  info = mt5.terminal_info()
  return {"ok": info is not None}

@app.post("/trade")
def trade(b: dict):
  t = (mt5.ORDER_TYPE_BUY
       if b["dir"]=="buy"
       else mt5.ORDER_TYPE_SELL)
  tick = mt5.symbol_info_tick(b["sym"])
  price = tick.ask if b["dir"]=="buy" else tick.bid
  r = mt5.order_send({
    "action": mt5.TRADE_ACTION_DEAL,
    "symbol": b["sym"],
    "volume": b.get("vol", 0.01),
    "type": t, "price": price,
    "sl": b.get("sl"), "tp": b.get("tp"),
    "deviation": 20, "magic": 234000,
    "comment": "NeuralBot",
    "type_time": mt5.ORDER_TIME_GTC,
    "type_filling": mt5.ORDER_FILLING_IOC,
  })
  return {"ticket": r.order, "retcode": r.retcode}

if __name__ == "__main__":
  uvicorn.run(app, host="0.0.0.0", port=8000)
