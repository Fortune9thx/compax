# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


def _sanitize(s: str, max_len: int = 300) -> str:
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
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

    # Score-recording methods — restricted to trusted callers only (C1 fix)
    @gl.public.write
    def record_loan_repayment(self, borrower: str, on_time: bool) -> str:
        self._only_trusted()
        borrower = _sanitize(borrower, 42)
        if on_time:
            self._add_score(borrower, 50, "loan", "Loan repaid on time")
        else:
            self._add_score(borrower, -100, "loan", "Loan repaid late or defaulted")
        return "recorded"

    @gl.public.write
    def record_funding_repayment(self, applicant: str, success: bool) -> str:
        self._only_trusted()
        applicant = _sanitize(applicant, 42)
        if success:
            self._add_score(applicant, 80, "funding", "Builder project delivered successfully")
        else:
            self._add_score(applicant, -150, "funding", "Builder project failed to deliver")
        return "recorded"

    @gl.public.write
    def record_prediction_outcome(self, user: str, correct: bool) -> str:
        self._only_trusted()
        user = _sanitize(user, 42)
        if correct:
            self._add_score(user, 30, "prediction", "Prediction resolved correctly")
        else:
            self._add_score(user, -10, "prediction", "Prediction resolved incorrectly")
        return "recorded"

    @gl.public.write
    def record_vault_performance(self, owner: str, yield_positive: bool) -> str:
        self._only_trusted()
        owner = _sanitize(owner, 42)
        if yield_positive:
            self._add_score(owner, 20, "vault", "Vault generated positive yield")
        else:
            self._add_score(owner, -5, "vault", "Vault yield below target")
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
    def get_history(self, address: str) -> list:
        if address not in self.history_counts:
            return []
        count = int(self.history_counts[address])
        result = []
        for i in range(count):
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
