# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


def _sanitize(s: str, max_len: int = 300) -> str:
    for ch in ("{", "}", "[", "]", "`", '"', "#"):
        s = s.replace(ch, "")
    s = s.replace("\\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return s[:max_len].strip()


class ReputationSystem(gl.Contract):
    scores: TreeMap[str, str]
    history: TreeMap[str, str]
    history_counts: TreeMap[str, str]
    faucet_claims: TreeMap[str, str]   # address → last_claim_timestamp (stored as str)
    trusted_callers: TreeMap[str, str] # address → "1" (authorized sibling contracts)
    _owner: str

    def __init__(self) -> None:
        self.scores = TreeMap[str, str]()
        self.history = TreeMap[str, str]()
        self.history_counts = TreeMap[str, str]()
        self.faucet_claims = TreeMap[str, str]()
        self.trusted_callers = TreeMap[str, str]()
        self._owner = str(gl.message.sender_address)

    def _only_owner(self) -> None:
        if str(gl.message.sender_address) != self._owner:
            raise gl.vm.UserError("only_owner")

    def _only_trusted(self) -> None:
        """Restrict score-writing to owner or authorized sibling contracts (C1 fix)."""
        caller = str(gl.message.sender_address)
        if caller != self._owner and caller not in self.trusted_callers:
            raise gl.vm.UserError("only_trusted_caller_can_record_scores")

    @gl.public.write
    def add_trusted_caller(self, caller_address: str) -> str:
        """Owner registers sibling contracts (LendingMarket, BuilderFunding, etc.)."""
        self._only_owner()
        caller_address = _sanitize(caller_address, 42)
        self.trusted_callers[caller_address] = "1"
        return "added"

    @gl.public.write
    def remove_trusted_caller(self, caller_address: str) -> str:
        self._only_owner()
        caller_address = _sanitize(caller_address, 42)
        if caller_address in self.trusted_callers:
            del self.trusted_callers[caller_address]
        return "removed"

    def _ensure_score(self, address: str) -> dict:
        if address not in self.scores:
            s = {
                "address": address,
                "total_score": 500,
                "loan_score": 0,
                "funding_score": 0,
                "prediction_score": 0,
                "vault_score": 0,
                "total_actions": 0,
            }
            self.scores[address] = json.dumps(s)
            return s
        return json.loads(self.scores[address])

    def _add_score(self, address: str, delta: int, category: str, reason: str) -> None:
        address = _sanitize(address, 42)
        reason = _sanitize(reason, 200)
        s = self._ensure_score(address)
        s["total_score"] = max(0, s["total_score"] + delta)
        if category == "loan":
            s["loan_score"] = s["loan_score"] + delta
        elif category == "funding":
            s["funding_score"] = s["funding_score"] + delta
        elif category == "prediction":
            s["prediction_score"] = s["prediction_score"] + delta
        elif category == "vault":
            s["vault_score"] = s["vault_score"] + delta
        s["total_actions"] = s["total_actions"] + 1
        self.scores[address] = json.dumps(s)

        count = int(self.history_counts[address]) if address in self.history_counts else 0
        ev = json.dumps({"action": category, "delta": delta, "reason": reason, "timestamp": ""})
        self.history[f"{address}_{count}"] = ev
        self.history_counts[address] = str(count + 1)

    def _reasoned_delta(self, category: str, outcome: str, context: str, lo: int, hi: int, default: int) -> tuple:
        """Weigh the reputation delta by severity/context instead of a fixed constant."""
        ctx = context if context else "no additional context provided"

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"You are updating a user's onchain reputation after a {category} action.\n"
                f"Outcome: {outcome}\n"
                f"Context: {ctx}\n"
                f"[TASK]\nAssign a reputation delta as an integer between {lo} and {hi} that reflects "
                f"the severity or quality of this specific outcome (e.g. a default after months of "
                f"non-payment is worse than a payment one day late; a project delivered far ahead of "
                f"schedule deserves more than one barely completed).\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"delta\": <int>, \"reason\": \"<one concise sentence>\"}}'
            ),
            task="Assign a reputation score delta for a financial action outcome",
            criteria=f"delta is an integer between {lo} and {hi} inclusive. reason is a single concise sentence.",
        )
        try:
            parsed = json.loads(result_str)
            delta = max(lo, min(hi, int(parsed.get("delta", default))))
            reason = _sanitize(str(parsed.get("reason", outcome)), 200)
        except Exception:
            delta, reason = default, outcome
        return delta, reason

    # Score-recording methods — restricted to trusted callers only (C1 fix)
    @gl.public.write
    def record_loan_repayment(self, borrower: str, on_time: bool, context: str = "") -> str:
        self._only_trusted()
        borrower = _sanitize(borrower, 42)
        context = _sanitize(context, 200)
        if on_time:
            delta, reason = self._reasoned_delta("loan", "repaid on time", context, 10, 80, 50)
        else:
            delta, reason = self._reasoned_delta("loan", "repaid late or defaulted", context, -150, -10, -100)
        self._add_score(borrower, delta, "loan", reason)
        return "recorded"

    @gl.public.write
    def record_funding_repayment(self, applicant: str, success: bool, context: str = "") -> str:
        self._only_trusted()
        applicant = _sanitize(applicant, 42)
        context = _sanitize(context, 200)
        if success:
            delta, reason = self._reasoned_delta("funding", "project delivered successfully", context, 20, 120, 80)
        else:
            delta, reason = self._reasoned_delta("funding", "project failed to deliver", context, -200, -20, -150)
        self._add_score(applicant, delta, "funding", reason)
        return "recorded"

    @gl.public.write
    def record_prediction_outcome(self, user: str, correct: bool, context: str = "") -> str:
        self._only_trusted()
        user = _sanitize(user, 42)
        context = _sanitize(context, 200)
        if correct:
            delta, reason = self._reasoned_delta("prediction", "resolved correctly", context, 10, 60, 30)
        else:
            delta, reason = self._reasoned_delta("prediction", "resolved incorrectly", context, -30, -5, -10)
        self._add_score(user, delta, "prediction", reason)
        return "recorded"

    @gl.public.write
    def record_vault_performance(self, owner: str, yield_positive: bool, context: str = "") -> str:
        self._only_trusted()
        owner = _sanitize(owner, 42)
        context = _sanitize(context, 200)
        if yield_positive:
            delta, reason = self._reasoned_delta("vault", "generated positive yield", context, 5, 50, 20)
        else:
            delta, reason = self._reasoned_delta("vault", "yield below target", context, -20, -1, -5)
        self._add_score(owner, delta, "vault", reason)
        return "recorded"

    @gl.public.write
    def claim_cgen(self) -> str:
        """
        One-time faucet per address. Initializes reputation strata.
        Renamed semantics from 'daily' to 'genesis claim' (M2 fix).
        """
        sender = str(gl.message.sender_address)
        if sender in self.faucet_claims:
            return "already_claimed"
        self.faucet_claims[sender] = "claimed"
        self._ensure_score(sender)
        # Record genesis action in history
        self._add_score(sender, 0, "vault", "Genesis — reputation strata initialized")
        return "claimed"

    @gl.public.view
    def get_score(self, address: str) -> dict:
        if address not in self.scores:
            return {
                "address": address,
                "total_score": 500,
                "loan_score": 0,
                "funding_score": 0,
                "prediction_score": 0,
                "vault_score": 0,
                "total_actions": 0,
            }
        return json.loads(self.scores[address])

    @gl.public.view
    def get_history(self, address: str, offset: int = 0, limit: int = 100) -> list:
        if address not in self.history_counts:
            return []
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        count = int(self.history_counts[address])
        result = []
        end = min(count, offset + limit)
        for i in range(offset, end):
            key = f"{address}_{i}"
            if key in self.history:
                result.append(json.loads(self.history[key]))
        return result

    @gl.public.view
    def can_claim_faucet(self, address: str) -> bool:
        return address not in self.faucet_claims

    @gl.public.view
    def is_trusted_caller(self, address: str) -> bool:
        return address in self.trusted_callers
