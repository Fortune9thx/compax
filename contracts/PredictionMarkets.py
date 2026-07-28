# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
    return s[:max_len].strip()


class PredictionMarkets(gl.Contract):
    markets: TreeMap[str, str]
    stakes: TreeMap[str, str]
    market_counter: u256
    total_volume: u256
    _owner: str

    def __init__(self) -> None:
        self.markets = TreeMap[str, str]()
        self.stakes = TreeMap[str, str]()
        self.market_counter = u256(0)
        self.total_volume = u256(0)
        self._owner = str(gl.message.sender_address)

    @gl.public.write
    def create_market(self, question: str, resolution_date: str) -> str:
        # Input sanitization (C2/L1 fix)
        question = _sanitize(question, 400)
        resolution_date = _sanitize(resolution_date, 20)
        if not question:
            raise gl.vm.UserError("question is required")
        if not resolution_date:
            raise gl.vm.UserError("resolution_date is required")

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
        market_id = _sanitize(market_id, 20)
        sender = str(gl.message.sender_address)
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("stake amount must be positive")
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            raise gl.vm.UserError("market_not_active")
        position = position.lower().strip()
        if position not in ("yes", "no"):
            raise gl.vm.UserError("position must be 'yes' or 'no'")

        stake_key = f"{market_id}_{sender}"
        if stake_key in self.stakes:
            existing = json.loads(self.stakes[stake_key])
            if existing["position"] != position:
                raise gl.vm.UserError("cannot_change_position")
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
        market_id = _sanitize(market_id, 20)
        # Only creator or contract owner can resolve (H2-equivalent fix)
        caller = str(gl.message.sender_address)
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            raise gl.vm.UserError("market_already_resolved")
        if caller != m["creator"] and caller != self._owner:
            raise gl.vm.UserError("only_creator_or_owner_can_resolve")

        _question = m["question"]
        _date = m["resolution_date"]
        _yes = m["total_yes"]
        _no = m["total_no"]

        # Fetch real-world data to ground the resolution (GenLayer thesis)
        def _fetch_market_context() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:600]

        market_context = gl.eq_principle.strict_eq(_fetch_market_context)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Resolve this prediction market using your knowledge and current market data.\n"
                f"[MARKET]\nQuestion: {_question}\nResolution Date: {_date}\n"
                f"Total YES staked: {_yes} cGEN | Total NO staked: {_no} cGEN\n"
                f"[LIVE MARKET DATA — CoinGecko]\n{market_context}\n"
                f"[TASK]\nDetermine whether the question resolves YES or NO.\n"
                f"Base your decision on factual knowledge and the live market data where relevant.\n"
                f"Return ONLY valid JSON:\n"
                f'{{\"outcome\": \"yes\" or \"no\", \"reasoning\": \"<2-3 sentences citing evidence>\"}}'
            ),
            task="Resolve a binary prediction market using knowledge and live market data",
            criteria=(
                "outcome is exactly the string 'yes' or 'no'. "
                "reasoning cites factual evidence or market data supporting the decision. "
                "Decision is logically consistent with the question and available data."
            ),
        )

        try:
            parsed = json.loads(result_str)
            outcome = str(parsed.get("outcome", "no")).lower().strip()
            if outcome not in ("yes", "no"):
                outcome = "no"
            reasoning = str(parsed.get("reasoning", ""))[:600]
        except Exception:
            outcome = "no"
            reasoning = "Unable to determine outcome from available data."

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
