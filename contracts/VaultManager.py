# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    """Strip prompt-injection chars and cap length."""
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
    return s[:max_len].strip()


class VaultManager(gl.Contract):
    vaults: TreeMap[str, str]
    rebalance_history: TreeMap[str, str]
    rebalance_counts: TreeMap[str, str]
    depositor_balances: TreeMap[str, str]
    vault_counter: u256
    _owner: str

    def __init__(self) -> None:
        self.vaults = TreeMap[str, str]()
        self.rebalance_history = TreeMap[str, str]()
        self.rebalance_counts = TreeMap[str, str]()
        self.depositor_balances = TreeMap[str, str]()
        self.vault_counter = u256(0)
        self._owner = str(gl.message.sender_address)

    def _default_allocation(self, strategy: str) -> tuple:
        if strategy == "conservative":
            return (50, 40, 0, 10)
        elif strategy == "growth":
            return (20, 20, 20, 40)
        elif strategy == "balanced":
            return (30, 30, 10, 30)
        else:
            return (25, 25, 25, 25)

    @gl.public.write
    def create_vault(self, name: str, strategy: str, objective: str,
                     risk_tolerance: u256, personality: str) -> str:
        # Input validation
        name = _sanitize(name, 80)
        strategy = _sanitize(strategy, 30)
        objective = _sanitize(objective, 400)
        personality = _sanitize(personality, 50)
        if not name:
            raise gl.vm.UserError("name is required")
        valid_strategies = ("conservative", "growth", "balanced", "institutional")
        if strategy not in valid_strategies:
            strategy = "balanced"
        risk = max(1, min(10, int(risk_tolerance)))

        owner = str(gl.message.sender_address)
        vault_id = f"VAULT-{int(self.vault_counter)}"
        self.vault_counter = u256(int(self.vault_counter) + 1)

        lending, staking, predictions, builders = self._default_allocation(strategy)
        vault = json.dumps({
            "id": vault_id,
            "name": name,
            "owner": owner,
            "strategy": strategy,
            "objective": objective,
            "risk_tolerance": risk,
            "treasury": 0,
            "allocation_lending": lending,
            "allocation_staking": staking,
            "allocation_predictions": predictions,
            "allocation_builders": builders,
            "last_rebalance": "",
            "last_rebalance_reason": "Initial allocation set at vault creation.",
            "total_yield": 0,
            "personality": personality,
            "created_at": "",
            "deposit_count": 0,
        })
        self.vaults[vault_id] = vault
        return vault_id

    @gl.public.write.payable
    def deposit(self, vault_id: str) -> str:
        vault_id = _sanitize(vault_id, 20)
        depositor = str(gl.message.sender_address)
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("deposit amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        v["treasury"] = v["treasury"] + amount
        v["deposit_count"] = v["deposit_count"] + 1
        self.vaults[vault_id] = json.dumps(v)
        bal_key = f"{vault_id}_{depositor}"
        current = int(self.depositor_balances[bal_key]) if bal_key in self.depositor_balances else 0
        self.depositor_balances[bal_key] = str(current + amount)
        return "deposited"

    @gl.public.write
    def withdraw(self, vault_id: str, amount: u256) -> str:
        vault_id = _sanitize(vault_id, 20)
        sender = str(gl.message.sender_address)
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError("withdraw amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        bal_key = f"{vault_id}_{sender}"
        balance = int(self.depositor_balances[bal_key]) if bal_key in self.depositor_balances else 0
        if amt > balance:
            raise gl.vm.UserError("insufficient_balance")
        if amt > v["treasury"]:
            raise gl.vm.UserError("insufficient_treasury")
        # CEI: update state before external call
        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)
        self.depositor_balances[bal_key] = str(balance - amt)
        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return "withdrawn"

    @gl.public.write
    def rebalance_vault(self, vault_id: str, event_context: str) -> str:
        vault_id = _sanitize(vault_id, 20)
        # Only vault owner can trigger rebalance (H3 fix)
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        if str(gl.message.sender_address) != v["owner"]:
            raise gl.vm.UserError("only_vault_owner_can_rebalance")

        # Sanitize caller-supplied event context (prompt injection fix — H3/C2)
        event_context = _sanitize(event_context, 300) if event_context else "No active economic event."

        _name = v["name"]
        _obj = v["objective"]
        _risk = v["risk_tolerance"]
        _strat = v["strategy"]
        _pers = v["personality"]
        _lending = v["allocation_lending"]
        _staking = v["allocation_staking"]
        _pred = v["allocation_predictions"]
        _build = v["allocation_builders"]
        _treasury = v["treasury"]

        # Multi-source market data fetch — mitigates single-oracle risk (H4 fix)
        def _fetch_coingecko() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum,usd-coin&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:800]

        def _fetch_fear_greed() -> str:
            r = gl.nondet.web.get("https://api.alternative.me/fng/?limit=1")
            return r.body.decode("utf-8")[:300]

        market_prices = gl.eq_principle.strict_eq(_fetch_coingecko)
        market_sentiment = gl.eq_principle.strict_eq(_fetch_fear_greed)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"You are an AI vault council making a capital reallocation decision.\n"
                f"[VAULT]\nName: {_name} | Strategy: {_strat} | Personality: {_pers}\n"
                f"Objective: {_obj}\nRisk Tolerance: {_risk}/10 | Treasury: {_treasury} cGEN\n"
                f"Current Allocation: Lending={_lending}% Staking={_staking}% "
                f"Predictions={_pred}% Builders={_build}%\n"
                f"[CONTEXT]\nEconomic Event: {event_context}\n"
                f"[LIVE MARKET DATA — CoinGecko]\n{market_prices}\n"
                f"[LIVE SENTIMENT — Fear & Greed Index]\n{market_sentiment}\n"
                f"[TASK]\nDecide optimal allocation using live data. All four values must sum to 100.\n"
                f"Return ONLY valid JSON with no extra text:\n"
                f'{{\"lending\": <int>, \"staking\": <int>, \"predictions\": <int>, '
                f'"builders\": <int>, \"reason\": \"<2-3 sentences citing specific market data>\"}}'
            ),
            task="Determine optimal DeFi capital allocation using multi-source live market data",
            criteria=(
                "All four percentages are non-negative integers summing to exactly 100. "
                "Reason explicitly cites live market data or sentiment index. "
                "Allocation reflects the vault strategy and risk tolerance."
            ),
        )

        try:
            parsed = json.loads(result_str)
            nl = max(0, int(parsed.get("lending", _lending)))
            ns = max(0, int(parsed.get("staking", _staking)))
            np_ = max(0, int(parsed.get("predictions", _pred)))
            nb = max(0, int(parsed.get("builders", _build)))
            reason = str(parsed.get("reason", ""))[:600]
            total = nl + ns + np_ + nb
            if total != 100 and total > 0:
                nl = round(nl * 100 / total)
                ns = round(ns * 100 / total)
                np_ = round(np_ * 100 / total)
                nb = 100 - nl - ns - np_
        except Exception:
            nl, ns, np_, nb = _lending, _staking, _pred, _build
            reason = "Rebalance parsing failed; maintaining current allocation."

        count = int(self.rebalance_counts[vault_id]) if vault_id in self.rebalance_counts else 0
        rec = json.dumps({
            "vault_id": vault_id,
            "old_lending": _lending, "old_staking": _staking,
            "old_predictions": _pred, "old_builders": _build,
            "new_lending": nl, "new_staking": ns,
            "new_predictions": np_, "new_builders": nb,
            "reason": reason,
            "event_context": event_context,
            "market_snapshot": market_prices[:400],
            "sentiment_snapshot": market_sentiment[:200],
            "timestamp": "",
        })
        self.rebalance_history[f"{vault_id}_{count}"] = rec
        self.rebalance_counts[vault_id] = str(count + 1)

        v["allocation_lending"] = nl
        v["allocation_staking"] = ns
        v["allocation_predictions"] = np_
        v["allocation_builders"] = nb
        v["last_rebalance_reason"] = reason
        self.vaults[vault_id] = json.dumps(v)
        return reason

    @gl.public.view
    def get_vault(self, vault_id: str) -> dict:
        if vault_id not in self.vaults:
            return {}
        return json.loads(self.vaults[vault_id])

    @gl.public.view
    def get_all_vaults(self) -> list:
        return [json.loads(v) for v in self.vaults.values()]

    @gl.public.view
    def get_total_tvl(self) -> int:
        total = 0
        for v in self.vaults.values():
            total += json.loads(v)["treasury"]
        return total

    @gl.public.view
    def get_active_vault_count(self) -> int:
        return int(self.vault_counter)

    @gl.public.view
    def get_rebalance_history(self, vault_id: str) -> list:
        if vault_id not in self.rebalance_counts:
            return []
        count = int(self.rebalance_counts[vault_id])
        result = []
        for i in range(count):
            key = f"{vault_id}_{i}"
            if key in self.rebalance_history:
                result.append(json.loads(self.rebalance_history[key]))
        return result

    @gl.public.view
    def get_depositor_balance(self, vault_id: str, address: str) -> int:
        key = f"{vault_id}_{address}"
        if key not in self.depositor_balances:
            return 0
        return int(self.depositor_balances[key])
