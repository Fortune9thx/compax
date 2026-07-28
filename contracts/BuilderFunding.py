# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
    return s[:max_len].strip()


class BuilderFunding(gl.Contract):
    projects: TreeMap[str, str]
    project_counter: u256
    total_allocated: u256
    _owner: str

    def __init__(self) -> None:
        self.projects = TreeMap[str, str]()
        self.project_counter = u256(0)
        self.total_allocated = u256(0)
        self._owner = str(gl.message.sender_address)

    @gl.public.write
    def submit_project(self, name: str, description: str, funding_requested: u256,
                       expected_outcome: str, timeline_weeks: u256) -> str:
        # Input validation + prompt injection prevention (C2/L1 fix)
        name = _sanitize(name, 100)
        description = _sanitize(description, 400)
        expected_outcome = _sanitize(expected_outcome, 300)
        if not name or not description:
            raise gl.vm.UserError("name and description are required")
        _requested = int(funding_requested)
        _weeks = int(timeline_weeks)
        if _requested <= 0:
            raise gl.vm.UserError("funding_requested must be positive")
        if _weeks <= 0 or _weeks > 520:
            raise gl.vm.UserError("timeline_weeks must be 1–520")

        applicant = str(gl.message.sender_address)
        project_id = f"PROJ-{int(self.project_counter)}"
        self.project_counter = u256(int(self.project_counter) + 1)

        # Fetch ecosystem health context for grounded evaluation (GenLayer thesis)
        def _fetch_ecosystem_context() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:500]

        ecosystem_context = gl.eq_principle.strict_eq(_fetch_ecosystem_context)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Evaluate this builder funding proposal for a DeFi ecosystem.\n"
                f"[PROPOSAL]\n"
                f"Project: {name}\nDescription: {description}\n"
                f"Funding Requested: {_requested} cGEN\n"
                f"Expected Outcome: {expected_outcome}\nTimeline: {_weeks} weeks\n"
                f"[LIVE MARKET CONTEXT]\n{ecosystem_context}\n"
                f"[TASK]\nDecide funding outcome considering the current market environment.\n"
                f"Return ONLY valid JSON:\n"
                f'{{\"decision\": \"funded\" or \"partial\" or \"rejected\", '
                f'"allocated\": <int 0-{_requested}>, '
                f'"reasoning\": \"<2-3 sentences>\", '
                f'"conditions\": \"<conditions or empty string>\"}}'
            ),
            task="Evaluate a DeFi builder funding proposal using market context and merit",
            criteria=(
                "decision is exactly 'funded', 'partial', or 'rejected'. "
                "allocated is integer 0 to funding_requested. "
                "funded means allocated equals requested. partial means allocated is less. "
                "reasoning is professional and addresses project merit and market conditions."
            ),
        )

        try:
            parsed = json.loads(result_str)
            decision = str(parsed.get("decision", "rejected")).lower().strip()
            if decision not in ("funded", "partial", "rejected"):
                decision = "rejected"
            allocated = max(0, min(_requested, int(parsed.get("allocated", 0))))
            reasoning = str(parsed.get("reasoning", ""))[:500]
            conditions = str(parsed.get("conditions", ""))[:300]
        except Exception:
            decision = "rejected"
            allocated = 0
            reasoning = "Unable to evaluate request."
            conditions = ""

        project = json.dumps({
            "id": project_id,
            "applicant": applicant,
            "name": name,
            "description": description,
            "funding_requested": _requested,
            "funding_allocated": allocated,
            "expected_outcome": expected_outcome,
            "timeline_weeks": _weeks,
            "status": decision,
            "ai_reasoning": reasoning,
            "conditions": conditions,
            "submitted_at": "",
            "decided_at": "",
        })
        self.projects[project_id] = project
        if allocated > 0:
            self.total_allocated = u256(int(self.total_allocated) + allocated)
        return project_id

    @gl.public.write.payable
    def repay_funding(self, project_id: str) -> str:
        project_id = _sanitize(project_id, 20)
        sender = str(gl.message.sender_address)
        if project_id not in self.projects:
            raise gl.vm.UserError("project_not_found")
        p = json.loads(self.projects[project_id])
        if p["applicant"] != sender:
            raise gl.vm.UserError("unauthorized: only applicant can repay")
        if p["status"] not in ("funded", "partial"):
            raise gl.vm.UserError("project_not_in_funded_state")
        # Enforce minimum repayment (L4 fix)
        repay_value = int(gl.message.value)
        if repay_value < p["funding_allocated"]:
            raise gl.vm.UserError(f"insufficient_repayment: expected {p['funding_allocated']} cGEN")
        p["status"] = "completed"
        self.projects[project_id] = json.dumps(p)
        return "completed"

    @gl.public.view
    def get_project(self, project_id: str) -> dict:
        if project_id not in self.projects:
            return {}
        return json.loads(self.projects[project_id])

    @gl.public.view
    def get_all_projects(self) -> list:
        return [json.loads(v) for v in self.projects.values()]

    @gl.public.view
    def get_total_allocated(self) -> int:
        return int(self.total_allocated)
