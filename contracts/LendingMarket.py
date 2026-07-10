# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


class LendingMarket(gl.Contract):
    loans: TreeMap[str, str]         # loan_id → JSON
    loan_counter: u256
    total_borrowed: u256
    total_repaid: u256

    def __init__(self) -> None:
        self.loans = TreeMap[str, str]()
        self.loan_counter = u256(0)
        self.total_borrowed = u256(0)
        self.total_repaid = u256(0)

    @gl.public.write
    def request_loan(self, amount: u256, duration_days: u256, purpose: str, description: str) -> str:
        borrower = str(gl.message.sender_address)
        loan_id = f"LOAN-{int(self.loan_counter)}"
        self.loan_counter = u256(int(self.loan_counter) + 1)

        _amount = int(amount)
        _days = int(duration_days)
        _purpose = purpose
        _desc = description

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Evaluate this DeFi loan request:\n"
                f"Amount: {_amount} cGEN\nDuration: {_days} days\n"
                f"Purpose: {_purpose}\nDescription: {_desc}\n\n"
                f"Return only JSON: {{\"approved\": true/false, \"rate_bps\": <int 300-2000>, "
                f"\"risk_score\": <int 0-100>, \"reasoning\": \"<2-3 sentences>\"}}"
            ),
            task="Evaluate a DeFi loan request and determine approval, interest rate, and risk score",
            criteria="Decision is reasonable for the stated purpose and amount. rate_bps 300-2000. risk_score 0-100.",
        )

        try:
            parsed = json.loads(result_str)
            approved = bool(parsed.get("approved", False))
            rate_bps = max(300, min(2000, int(parsed.get("rate_bps", 1000))))
            risk_score = max(0, min(100, int(parsed.get("risk_score", 50))))
            reasoning = str(parsed.get("reasoning", ""))
        except Exception:
            approved = False
            rate_bps = 1000
            risk_score = 50
            reasoning = "Unable to evaluate request."

        status = "approved" if approved else "rejected"
        loan = json.dumps({
            "id": loan_id,
            "borrower": borrower,
            "amount": _amount if approved else 0,
            "interest_rate_bps": rate_bps,
            "duration_days": _days,
            "purpose": purpose,
            "description": description,
            "status": status,
            "ai_reasoning": reasoning,
            "risk_score": risk_score,
            "requested_at": "",
            "due_at": "",
        })
        self.loans[loan_id] = loan
        if approved:
            self.total_borrowed = u256(int(self.total_borrowed) + _amount)
        return loan_id

    @gl.public.write.payable
    def repay_loan(self, loan_id: str) -> str:
        sender = str(gl.message.sender_address)
        if loan_id not in self.loans:
            return "not_found"
        l = json.loads(self.loans[loan_id])
        if l["borrower"] != sender:
            return "unauthorized"
        if l["status"] != "approved":
            return "not_active"
        l["status"] = "repaid"
        self.loans[loan_id] = json.dumps(l)
        self.total_repaid = u256(int(self.total_repaid) + int(gl.message.value))
        return "repaid"

    @gl.public.view
    def get_loan(self, loan_id: str) -> dict:
        if loan_id not in self.loans:
            return {}
        return json.loads(self.loans[loan_id])

    @gl.public.view
    def get_all_active_loans(self) -> list:
        result = []
        for v in self.loans.values():
            l = json.loads(v)
            if l["status"] == "approved":
                result.append(l)
        return result

    @gl.public.view
    def get_total_borrowed(self) -> int:
        return int(self.total_borrowed)

    @gl.public.view
    def get_loan_count(self) -> int:
        return int(self.loan_counter)
