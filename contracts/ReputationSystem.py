# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class ReputationSystem(gl.Contract):
    scores: TreeMap[str, str]        # address → JSON score
    history: TreeMap[str, str]       # address_seq → JSON event
    history_counts: TreeMap[str, str] # address → count (stored as str)
    faucet_claims: TreeMap[str, str]  # address → "claimed"

    def __init__(self) -> None:
        self.scores = TreeMap[str, str]()
        self.history = TreeMap[str, str]()
        self.history_counts = TreeMap[str, str]()
        self.faucet_claims = TreeMap[str, str]()

    def _ensure_score(self, address: str) -> dict:
        if address not in self.scores:
            s = {"address": address, "total_score": 500, "loan_score": 0,
                 "funding_score": 0, "prediction_score": 0, "vault_score": 0, "total_actions": 0}
            self.scores[address] = json.dumps(s)
            return s
        return json.loads(self.scores[address])

    def _add_score(self, address: str, delta: int, category: str, reason: str) -> None:
        s = self._ensure_score(address)
        s["total_score"] = max(0, s["total_score"] + delta)
        if category == "loan":
            s["loan_score"] = max(0, s["loan_score"] + delta)
        elif category == "funding":
            s["funding_score"] = max(0, s["funding_score"] + delta)
        elif category == "prediction":
            s["prediction_score"] = max(0, s["prediction_score"] + delta)
        elif category == "vault":
            s["vault_score"] = max(0, s["vault_score"] + delta)
        s["total_actions"] = s["total_actions"] + 1
        self.scores[address] = json.dumps(s)

        count = int(self.history_counts[address]) if address in self.history_counts else 0
        ev = json.dumps({"action": category, "delta": delta, "reason": reason, "timestamp": ""})
        self.history[f"{address}_{count}"] = ev
        self.history_counts[address] = str(count + 1)

    @gl.public.write
    def record_loan_repayment(self, borrower: str, on_time: bool) -> str:
        if on_time:
            self._add_score(borrower, 50, "loan", "Loan repaid on time")
        else:
            self._add_score(borrower, -100, "loan", "Loan repaid late or defaulted")
        return "recorded"

    @gl.public.write
    def record_funding_repayment(self, applicant: str, success: bool) -> str:
        if success:
            self._add_score(applicant, 80, "funding", "Builder project delivered successfully")
        else:
            self._add_score(applicant, -150, "funding", "Builder project failed to deliver")
        return "recorded"

    @gl.public.write
    def record_prediction_outcome(self, user: str, correct: bool) -> str:
        if correct:
            self._add_score(user, 30, "prediction", "Prediction resolved correctly")
        else:
            self._add_score(user, -10, "prediction", "Prediction resolved incorrectly")
        return "recorded"

    @gl.public.write
    def record_vault_performance(self, owner: str, yield_positive: bool) -> str:
        if yield_positive:
            self._add_score(owner, 20, "vault", "Vault generated positive yield")
        else:
            self._add_score(owner, -5, "vault", "Vault yield below target")
        return "recorded"

    @gl.public.write
    def claim_cgen(self) -> str:
        sender = str(gl.message.sender_address)
        if sender in self.faucet_claims:
            return "already_claimed_today"
        self.faucet_claims[sender] = "claimed"
        self._ensure_score(sender)
        return "claimed:100"

    @gl.public.view
    def get_score(self, address: str) -> dict:
        if address not in self.scores:
            return {"address": address, "total_score": 500, "loan_score": 0,
                    "funding_score": 0, "prediction_score": 0, "vault_score": 0, "total_actions": 0}
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
