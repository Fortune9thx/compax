# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class VaultManager(gl.Contract):
    vaults: TreeMap[str, str]           # vault_id → JSON
    rebalance_history: TreeMap[str, str] # vault_id_seq → JSON
    rebalance_counts: TreeMap[str, str]  # vault_id → count str
    depositor_balances: TreeMap[str, str] # vault_id_address → amount str
    vault_counter: u256

    def __init__(self) -> None:
        self.vaults = TreeMap[str, str]()
        self.rebalance_history = TreeMap[str, str]()
        self.rebalance_counts = TreeMap[str, str]()
        self.depositor_balances = TreeMap[str, str]()
        self.vault_counter = u256(0)

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
            "risk_tolerance": int(risk_tolerance),
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
        depositor = str(gl.message.sender_address)
        amount = int(gl.message.value)

        if vault_id not in self.vaults:
            return "vault_not_found"
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
        sender = str(gl.message.sender_address)
        amt = int(amount)
        if vault_id not in self.vaults:
            return "vault_not_found"
        v = json.loads(self.vaults[vault_id])
        bal_key = f"{vault_id}_{sender}"
        balance = int(self.depositor_balances[bal_key]) if bal_key in self.depositor_balances else 0
        if amt > balance:
            return "insufficient_balance"
        if amt > v["treasury"]:
            return "insufficient_treasury"
        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)
        self.depositor_balances[bal_key] = str(balance - amt)
        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return "withdrawn"

    @gl.public.write
    def rebalance_vault(self, vault_id: str, event_context: str) -> str:
        if vault_id not in self.vaults:
            return "vault_not_found"
        v = json.loads(self.vaults[vault_id])
        if not event_context:
            event_context = "No active economic event."

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
        _event = event_context

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"You are an AI vault manager making a capital reallocation decision.\n"
                f"Vault: {_name}\nStrategy: {_strat}\nPersonality: {_pers}\n"
                f"Objective: {_obj}\nRisk Tolerance: {_risk}/10\nTreasury: {_treasury} cGEN\n"
                f"Current: Lending={_lending}% Staking={_staking}% Predictions={_pred}% Builders={_build}%\n"
                f"Market Context: {_event}\n\n"
                f"Return only JSON: {{\"lending\": int, \"staking\": int, \"predictions\": int, "
                f"\"builders\": int, \"reason\": \"<2-3 sentences>\"}}"
            ),
            task="Determine optimal capital allocation percentages for an AI-managed DeFi vault",
            criteria="All four percentages are non-negative integers summing to exactly 100. Responds to active event if present.",
        )

        try:
            parsed = json.loads(result_str)
            nl = max(0, int(parsed.get("lending", _lending)))
            ns = max(0, int(parsed.get("staking", _staking)))
            np_ = max(0, int(parsed.get("predictions", _pred)))
            nb = max(0, int(parsed.get("builders", _build)))
            reason = str(parsed.get("reason", ""))
            total = nl + ns + np_ + nb
            if total != 100 and total > 0:
                nl = round(nl * 100 / total)
                ns = round(ns * 100 / total)
                np_ = round(np_ * 100 / total)
                nb = 100 - nl - ns - np_
        except Exception:
            nl, ns, np_, nb = _lending, _staking, _pred, _build
            reason = "Rebalance failed; maintaining current allocation."

        count = int(self.rebalance_counts[vault_id]) if vault_id in self.rebalance_counts else 0
        rec = json.dumps({
            "vault_id": vault_id,
            "old_lending": v["allocation_lending"], "old_staking": v["allocation_staking"],
            "old_predictions": v["allocation_predictions"], "old_builders": v["allocation_builders"],
            "new_lending": nl, "new_staking": ns, "new_predictions": np_, "new_builders": nb,
            "reason": reason, "event_context": event_context, "timestamp": "",
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
