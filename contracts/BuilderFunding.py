# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class BuilderFunding(gl.Contract):
    projects: TreeMap[str, str]     # project_id → JSON
    project_counter: u256
    total_allocated: u256

    def __init__(self) -> None:
        self.projects = TreeMap[str, str]()
        self.project_counter = u256(0)
        self.total_allocated = u256(0)

    @gl.public.write
    def submit_project(self, name: str, description: str, funding_requested: u256,
                       expected_outcome: str, timeline_weeks: u256) -> str:
        applicant = str(gl.message.sender_address)
        project_id = f"PROJ-{int(self.project_counter)}"
        self.project_counter = u256(int(self.project_counter) + 1)

        _name = name
        _desc = description
        _requested = int(funding_requested)
        _outcome = expected_outcome
        _weeks = int(timeline_weeks)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Evaluate this builder funding request for a DeFi ecosystem:\n"
                f"Project: {_name}\nDescription: {_desc}\n"
                f"Funding Requested: {_requested} cGEN\nExpected Outcome: {_outcome}\n"
                f"Timeline: {_weeks} weeks\n\n"
                f"Return only JSON: {{\"decision\": \"funded|partial|rejected\", "
                f"\"allocated\": <int 0-{_requested}>, \"reasoning\": \"<2-3 sentences>\", "
                f"\"conditions\": \"<string or empty>\"}}"
            ),
            task="Evaluate a builder project funding request in a DeFi ecosystem",
            criteria="decision is funded/partial/rejected. allocated is 0 to requested. reasoning is professional.",
        )

        try:
            parsed = json.loads(result_str)
            decision = str(parsed.get("decision", "rejected"))
            if decision not in ("funded", "partial", "rejected"):
                decision = "rejected"
            allocated = max(0, min(_requested, int(parsed.get("allocated", 0))))
            reasoning = str(parsed.get("reasoning", ""))
            conditions = str(parsed.get("conditions", ""))
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
        sender = str(gl.message.sender_address)
        if project_id not in self.projects:
            return "not_found"
        p = json.loads(self.projects[project_id])
        if p["applicant"] != sender:
            return "unauthorized"
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
