# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class EconomicEvents(gl.Contract):
    events: TreeMap[str, str]       # id → JSON
    active_event_id: str
    has_active_event: bool
    event_counter: u256

    def __init__(self) -> None:
        self.events = TreeMap[str, str]()
        self.active_event_id = ""
        self.has_active_event = False
        self.event_counter = u256(0)

    @gl.public.write
    def trigger_event(self, event_type: str, name: str, description: str) -> str:
        sender = str(gl.message.sender_address)
        event_id = f"EVT-{int(self.event_counter)}"
        self.event_counter = u256(int(self.event_counter) + 1)

        _type = event_type
        _name = name
        _desc = description

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"An economic event was triggered in a DeFi ecosystem.\n"
                f"Type: {_type}\nName: {_name}\nDescription: {_desc}\n\n"
                f"Return only JSON: {{\"severity\": <int 1-10>, \"impact\": \"<2-3 sentence guidance>\"}}"
            ),
            task="Analyze economic event impact on DeFi vault capital allocation",
            criteria="severity is integer 1-10. impact is 2-3 sentences of actionable vault rebalancing guidance.",
        )

        try:
            parsed = json.loads(result_str)
            severity = max(1, min(10, int(parsed.get("severity", 5))))
            impact = str(parsed.get("impact", "Monitor market conditions carefully."))
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
            "triggered_at": "",
            "triggered_by": sender,
            "is_active": True,
        })
        self.events[event_id] = event
        self.active_event_id = event_id
        self.has_active_event = True
        return event_id

    @gl.public.write
    def resolve_event(self, event_id: str) -> str:
        if event_id not in self.events:
            return "not_found"
        ev = json.loads(self.events[event_id])
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
