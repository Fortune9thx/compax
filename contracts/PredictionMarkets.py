# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class PredictionMarkets(gl.Contract):
    markets: TreeMap[str, str]       # market_id → JSON
    stakes: TreeMap[str, str]        # market_id_address → JSON stake
    market_counter: u256
    total_volume: u256

    def __init__(self) -> None:
        self.markets = TreeMap[str, str]()
        self.stakes = TreeMap[str, str]()
        self.market_counter = u256(0)
        self.total_volume = u256(0)

    @gl.public.write
    def create_market(self, question: str, resolution_date: str) -> str:
        creator = str(gl.message.sender_address)
        market_id = f"MKT-{int(self.market_counter)}"
        self.market_counter = u256(int(self.market_counter) + 1)

        market = json.dumps({
            "id": market_id,
            "creator": creator,
            "question": question,
            "resolution_date": resolution_date,
            "total_yes": 0,
            "total_no": 0,
            "status": "active",
            "outcome": "",
            "created_at": "",
            "resolved_at": "",
            "resolution_reasoning": "",
        })
        self.markets[market_id] = market
        return market_id

    @gl.public.write.payable
    def stake(self, market_id: str, position: str) -> str:
        sender = str(gl.message.sender_address)
        amount = int(gl.message.value)

        if market_id not in self.markets:
            return "market_not_found"
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            return "market_not_active"
        if position not in ("yes", "no"):
            return "invalid_position"

        stake_key = f"{market_id}_{sender}"
        if stake_key in self.stakes:
            existing = json.loads(self.stakes[stake_key])
            existing["amount"] = existing["amount"] + amount
            self.stakes[stake_key] = json.dumps(existing)
        else:
            self.stakes[stake_key] = json.dumps({"position": position, "amount": amount})

        if position == "yes":
            m["total_yes"] = m["total_yes"] + amount
        else:
            m["total_no"] = m["total_no"] + amount
        self.markets[market_id] = json.dumps(m)
        self.total_volume = u256(int(self.total_volume) + amount)
        return "staked"

    @gl.public.write
    def resolve_market(self, market_id: str) -> str:
        if market_id not in self.markets:
            return "not_found"
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            return "already_resolved"

        _question = m["question"]
        _date = m["resolution_date"]
        _yes = m["total_yes"]
        _no = m["total_no"]

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Resolve this prediction market:\nQuestion: {_question}\n"
                f"Resolution Date: {_date}\nYES staked: {_yes} cGEN\nNO staked: {_no} cGEN\n\n"
                f"Return only JSON: {{\"outcome\": \"yes\" or \"no\", \"reasoning\": \"<2-3 sentences>\"}}"
            ),
            task="Resolve a binary prediction market question based on available knowledge",
            criteria="outcome is exactly 'yes' or 'no'. reasoning explains the determination.",
        )

        try:
            parsed = json.loads(result_str)
            outcome = str(parsed.get("outcome", "no"))
            if outcome not in ("yes", "no"):
                outcome = "no"
            reasoning = str(parsed.get("reasoning", ""))
        except Exception:
            outcome = "no"
            reasoning = "Unable to determine outcome."

        m["status"] = "resolved"
        m["outcome"] = outcome
        m["resolution_reasoning"] = reasoning
        self.markets[market_id] = json.dumps(m)
        return outcome

    @gl.public.view
    def get_market(self, market_id: str) -> dict:
        if market_id not in self.markets:
            return {}
        return json.loads(self.markets[market_id])

    @gl.public.view
    def get_all_markets(self) -> list:
        return [json.loads(v) for v in self.markets.values()]

    @gl.public.view
    def get_active_markets(self) -> list:
        result = []
        for v in self.markets.values():
            m = json.loads(v)
            if m["status"] == "active":
                result.append(m)
        return result

    @gl.public.view
    def get_user_stake(self, market_id: str, address: str) -> dict:
        key = f"{market_id}_{address}"
        if key not in self.stakes:
            return {}
        return json.loads(self.stakes[key])

    @gl.public.view
    def get_total_volume(self) -> int:
        return int(self.total_volume)
