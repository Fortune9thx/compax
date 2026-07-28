# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    s = s.replace("{", "").replace("}", "").replace("```", "").replace("\\n", " ")
    return s[:max_len].strip()


class LendingMarket(gl.Contract):
    loans: TreeMap[str, str]
    loan_counter: u256
    total_borrowed: u256
    total_repaid: u256
    _owner: str

    def __init__(self) -> None:
        self.loans = TreeMap[str, str]()
        self.loan_counter = u256(0)
        self.total_borrowed = u256(0)
        self.total_repaid = u256(0)
        self._owner = str(gl.message.sender_address)

    @gl.public.write
    def request_loan(self, amount: u256, duration_days: u256, purpose: str, description: str) -> str:
        # Input validation + prompt injection prevention (C2/L1 fix)
        purpose = _sanitize(purpose, 200)
        description = _sanitize(description, 400)
        if not purpose:
            raise gl.vm.UserError("purpose is required")
        _amount = int(amount)
        _days = int(duration_days)
        if _amount <= 0:
            raise gl.vm.UserError("amount must be positive")
        if _days <= 0 or _days > 3650:
            raise gl.vm.UserError("duration_days must be 1–3650")

        borrower = str(gl.message.sender_address)
        loan_id = f"LOAN-{int(self.loan_counter)}"
        self.loan_counter = u256(int(self.loan_counter) + 1)

        # Multi-source rate context — mitigates single oracle risk (H4 fix)
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
                f"Evaluate this DeFi loan request using live market conditions.\n"
                f"[LOAN REQUEST]\n"
                f"Amount: {_amount} cGEN | Duration: {_days} days\n"
                f"Purpose: {purpose}\nDescription: {description}\n"
                f"[LIVE MARKET DATA — CoinGecko]\n{market_data}\n"
                f"[MARKET SENTIMENT — Fear & Greed]\n{sentiment_data}\n"
                f"[TASK]\nDecide loan approval, appropriate interest rate, and risk score.\n"
                f"Consider: market volatility, loan purpose, duration relative to current conditions.\n"
                f"Return ONLY valid JSON:\n"
                f'{{\"approved\": <true|false>, \"rate_bps\": <int 300-2000>, '
                f'"risk_score\": <int 0-100>, \"reasoning\": \"<2-3 sentences citing market data>\"}}'
            ),
            task="Evaluate DeFi loan request and set rate using live multi-source market data",
            criteria=(
                "approved is boolean. rate_bps is integer 300–2000. risk_score is integer 0–100. "
                "reasoning explicitly references live market or sentiment data. "
                "Higher market volatility and fear scores justify higher rates."
            ),
        )

        try:
            parsed = json.loads(result_str)
            approved = bool(parsed.get("approved", False))
            rate_bps = max(300, min(2000, int(parsed.get("rate_bps", 1000))))
            risk_score = max(0, min(100, int(parsed.get("risk_score", 50))))
            reasoning = str(parsed.get("reasoning", ""))[:500]
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
            "market_context": market_data[:300],
            "requested_at": "",
            "due_at": "",
        })
        self.loans[loan_id] = loan
        if approved:
            self.total_borrowed = u256(int(self.total_borrowed) + _amount)
        return loan_id

    @gl.public.write.payable
    def repay_loan(self, loan_id: str) -> str:
        loan_id = _sanitize(loan_id, 20)
        sender = str(gl.message.sender_address)
        if loan_id not in self.loans:
            raise gl.vm.UserError("loan_not_found")
        l = json.loads(self.loans[loan_id])
        if l["borrower"] != sender:
            raise gl.vm.UserError("unauthorized: only borrower can repay")
        if l["status"] != "approved":
            raise gl.vm.UserError("loan_not_active")
        # Enforce actual repayment amount (M1 fix)
        repay_value = int(gl.message.value)
        if repay_value < l["amount"]:
            raise gl.vm.UserError(f"insufficient_repayment: expected {l['amount']} cGEN")
        # CEI: update state before any external interactions
        l["status"] = "repaid"
        self.loans[loan_id] = json.dumps(l)
        self.total_repaid = u256(int(self.total_repaid) + repay_value)
        return "repaid"

    @gl.public.view
    def get_loan(self, loan_id: str) -> dict:
        if loan_id not in self.loans:
            return {}
        return json.loads(self.loans[loan_id])

    @gl.public.view
    def get_all_loans(self) -> list:
        return [json.loads(v) for v in self.loans.values()]

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
