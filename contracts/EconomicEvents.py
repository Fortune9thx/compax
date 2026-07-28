# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
    return s[:max_len].strip()


class EconomicEvents(gl.Contract):
    events: TreeMap[str, str]
    active_event_id: str
    has_active_event: bool
    event_counter: u256
    _owner: str

    def __init__(self) -> None:
        self.events = TreeMap[str, str]()
        self.active_event_id = ""
        self.has_active_event = False
        self.event_counter = u256(0)
        self._owner = str(gl.message.sender_address)

    def _only_owner(self) -> None:
        if str(gl.message.sender_address) != self._owner:
            raise gl.vm.UserError("only_owner_can_trigger_or_resolve_events")

    @gl.public.write
    def trigger_event(self, event_type: str, name: str, description: str) -> str:
        # Owner-only — prevents permissionless spam (H1 fix)
        self._only_owner()

        # Input sanitization (C2/L1 fix)
        event_type = _sanitize(event_type, 50)
        name = _sanitize(name, 100)
        description = _sanitize(description, 400)
        if not name or not description:
            raise gl.vm.UserError("name and description are required")

        valid_types = ("rate_change", "liquidity_crisis", "market_rally", "regulatory",
                       "protocol_upgrade", "macro", "sentiment_shift", "other")
        if event_type not in valid_types:
            event_type = "other"

        event_id = f"EVT-{int(self.event_counter)}"
        self.event_counter = u256(int(self.event_counter) + 1)

        # Fetch real market data to ground event analysis (GenLayer thesis)
        def _fetch_market() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:600]

        def _fetch_sentiment() -> str:
            r = gl.nondet.web.get("https://api.alternative.me/fng/?limit=1")
            return r.body.decode("utf-8")[:250]

        market_data = gl.eq_principle.strict_eq(_fetch_market)
        sentiment_data = gl.eq_principle.strict_eq(_fetch_sentiment)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"An economic event has been triggered in a DeFi ecosystem.\n"
                f"[EVENT]\nType: {event_type} | Name: {name}\nDescription: {description}\n"
                f"[LIVE MARKET DATA — CoinGecko]\n{market_data}\n"
                f"[LIVE SENTIMENT — Fear & Greed]\n{sentiment_data}\n"
                f"[TASK]\nAnalyze the event severity and provide actionable vault guidance.\n"
                f"Return ONLY valid JSON:\n"
                f'{{\"severity\": <int 1-10>, '
                f'"impact\": \"<2-3 sentences of actionable rebalancing guidance referencing live data>\"}}'
            ),
            task="Analyze DeFi economic event severity and impact using live market data",
            criteria=(
                "severity is integer 1–10 reflecting real market conditions. "
                "impact provides actionable vault rebalancing guidance. "
                "Both must reference the live market data or sentiment index."
            ),
        )

        try:
            parsed = json.loads(result_str)
            severity = max(1, min(10, int(parsed.get("severity", 5))))
            impact = str(parsed.get("impact", "Monitor market conditions carefully."))[:500]
        except Exception:
            severity = 5
            impact = "Monitor market conditions carefully."

        event = json.dumps({
            "id": event_id,
            "event_type": event_type,
            "name": name,
            "description": description,
            "impact": impact,
            "severity": severity,
            "market_snapshot": market_data[:300],
            "sentiment_snapshot": sentiment_data[:150],
            "triggered_at": "",
            "triggered_by": str(gl.message.sender_address),
            "is_active": True,
        })
        self.events[event_id] = event
        self.active_event_id = event_id
        self.has_active_event = True
        return event_id

    @gl.public.write
    def resolve_event(self, event_id: str) -> str:
        # Owner-only resolution — prevents silent collapse by third parties (H2 fix)
        self._only_owner()
        event_id = _sanitize(event_id, 20)
        if event_id not in self.events:
            raise gl.vm.UserError("event_not_found")
        ev = json.loads(self.events[event_id])
        if not ev["is_active"]:
            raise gl.vm.UserError("event_already_resolved")
        ev["is_active"] = False
        self.events[event_id] = json.dumps(ev)
        if self.active_event_id == event_id:
            self.has_active_event = False
            self.active_event_id = ""
        return "resolved"

    @gl.public.view
    def get_active_event(self) -> dict:
        if not self.has_active_event or not self.active_event_id:
            return {}
        if self.active_event_id not in self.events:
            return {}
        return json.loads(self.events[self.active_event_id])

    @gl.public.view
    def get_all_events(self) -> list:
        return [json.loads(v) for v in self.events.values()]

    @gl.public.view
    def has_active(self) -> bool:
        return self.has_active_event

    @gl.public.view
    def get_event_count(self) -> int:
        return int(self.event_counter)
