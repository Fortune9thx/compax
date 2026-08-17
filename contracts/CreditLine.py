# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass


def _sanitize(s: str, max_len: int = 500) -> str:
    for ch in ("{", "}", "[", "]", "`", '"', "#"):
        s = s.replace(ch, "")
    s = s.replace("\\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return s[:max_len].strip()


class CreditLine(gl.Contract):
    """
    Collateralized credit lines. A borrower posts collateral and states their
    purpose in natural language; an intelligent contract reasons the maximum
    loan-to-value and interest rate the collateral actually supports. Any
    lender can then fund the line with their own capital, which is
    immediately disbursed to the borrower - this is a genuine two-sided
    market, not a pool the platform has to seed itself, unlike a
    single-sided lending pool with no funding source.

    On default, the lender stakes a claim with evidence; the borrower can
    rebut; resolve_default has five validators weigh both sides plus live
    market context and decide how the collateral actually splits between
    them, rather than a rigid all-or-nothing liquidation.
    """

    lines: TreeMap[str, str]
    line_counter: u256
    _owner: str

    def __init__(self) -> None:
        self.lines = TreeMap[str, str]()
        self.line_counter = u256(0)
        self._owner = str(gl.message.sender_address)

    # ── open & fund ────────────────────────────────────────────────

    @gl.public.write.payable
    def open_line(self, purpose: str) -> str:
        """Borrower posts collateral (gl.message.value) and states their
        purpose; the contract reasons the terms this collateral supports."""
        collateral = int(gl.message.value)
        if collateral <= 0:
            raise gl.vm.UserError("collateral must be positive")
        purpose = _sanitize(purpose, 500)
        if not purpose:
            raise gl.vm.UserError("purpose is required")

        borrower = str(gl.message.sender_address)
        line_id = f"LINE-{int(self.line_counter)}"
        self.line_counter = u256(int(self.line_counter) + 1)

        # GenVM forbids more than one non-deterministic block reachable from
        # the same write method, and requires the leader function to be a
        # named def, not an inline lambda - so the live fetch and the
        # reasoning happen inside this single named function.
        def _fetch_and_set_terms() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            market_data = r.body.decode("utf-8")[:400]

            return (
                f"You are setting terms for a collateralized credit line on "
                f"COMPAX. A borrower has posted {collateral} cGEN in collateral "
                f"and stated their purpose.\n"
                f"[PURPOSE]\n{purpose}\n"
                f"[COLLATERAL]\n{collateral} cGEN\n"
                f"[LIVE MARKET CONTEXT]\n{market_data}\n"
                f"[TASK]\nDecide the maximum loan amount this collateral "
                f"supports (an over-collateralized loan - typically 40-80% of "
                f"the collateral value depending on how risky the stated "
                f"purpose and current market conditions are) and an interest "
                f"rate.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"max_loan_amount\": <int 1 to {collateral}>, '
                f'\"interest_rate_bps\": <int 100-3000>, '
                f'\"reasoning\": \"<2-3 sentences citing the purpose and market data>\"}}'
            )

        result_str = gl.eq_principle.prompt_non_comparative(
            _fetch_and_set_terms,
            task="Set collateralized credit terms from a borrower's collateral and stated purpose",
            criteria=(
                f"max_loan_amount is an integer between 1 and {collateral}, always "
                f"less than the full collateral (over-collateralized). "
                f"interest_rate_bps is an integer between 100 and 3000. "
                f"reasoning explicitly references the stated purpose and the live market data."
            ),
        )
        try:
            parsed = json.loads(result_str)
            max_loan = max(1, min(collateral, int(parsed.get("max_loan_amount", collateral // 2))))
            rate_bps = max(100, min(3000, int(parsed.get("interest_rate_bps", 800))))
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 400)
        except Exception:
            max_loan = collateral // 2
            rate_bps = 800
            reasoning = "Unable to parse terms; defaulted to 50% LTV at 8% interest."

        line = json.dumps({
            "id": line_id,
            "borrower": borrower,
            "collateral_amount": collateral,
            "purpose": purpose,
            "max_loan_amount": max_loan,
            "interest_rate_bps": rate_bps,
            "ai_terms_reasoning": reasoning,
            "status": "open",
            "lender": "",
            "loan_amount": 0,
            "default_evidence": "",
            "borrower_rebuttal": "",
            "collateral_to_lender": 0,
            "collateral_to_borrower": 0,
            "ai_reasoning": "",
            "created_at": "",
            "resolved_at": "",
        })
        self.lines[line_id] = line
        return line_id

    @gl.public.write.payable
    def fund_line(self, line_id: str) -> str:
        """Any lender funds the line with their own capital (gl.message.value,
        must not exceed the AI-set max_loan_amount) - disbursed to the
        borrower immediately."""
        line_id = _sanitize(line_id, 20)
        if line_id not in self.lines:
            raise gl.vm.UserError("line_not_found")
        l = json.loads(self.lines[line_id])
        if l["status"] != "open":
            raise gl.vm.UserError("line_not_open")

        loan_amount = int(gl.message.value)
        if loan_amount <= 0:
            raise gl.vm.UserError("loan amount must be positive")
        if loan_amount > l["max_loan_amount"]:
            raise gl.vm.UserError(f"exceeds_max_loan_amount: {l['max_loan_amount']}")

        lender = str(gl.message.sender_address)
        if lender.lower() == l["borrower"].lower():
            raise gl.vm.UserError("borrower cannot fund their own line")

        # CEI: record state before disbursing to the borrower
        l["status"] = "funded"
        l["lender"] = lender
        l["loan_amount"] = loan_amount
        self.lines[line_id] = json.dumps(l)

        _Recipient(Address(l["borrower"])).emit_transfer(value=u256(loan_amount))
        return "funded"

    @gl.public.write.payable
    def repay(self, line_id: str) -> str:
        """Borrower repays principal + interest; lender is paid, and the
        FULL collateral returns to the borrower."""
        line_id = _sanitize(line_id, 20)
        if line_id not in self.lines:
            raise gl.vm.UserError("line_not_found")
        l = json.loads(self.lines[line_id])
        if l["status"] != "funded":
            raise gl.vm.UserError("line_not_active")
        sender = str(gl.message.sender_address)
        if sender.lower() != l["borrower"].lower():
            raise gl.vm.UserError("unauthorized: only the borrower can repay")

        owed = l["loan_amount"] + (l["loan_amount"] * l["interest_rate_bps"]) // 10000
        repay_value = int(gl.message.value)
        if repay_value < owed:
            raise gl.vm.UserError(f"insufficient_repayment: expected {owed} cGEN (principal + interest)")

        # CEI: record state before external transfers
        l["status"] = "repaid"
        self.lines[line_id] = json.dumps(l)

        _Recipient(Address(l["lender"])).emit_transfer(value=u256(repay_value))
        _Recipient(Address(l["borrower"])).emit_transfer(value=u256(l["collateral_amount"]))
        return "repaid"

    # ── default → dispute → resolve ────────────────────────────────

    @gl.public.write
    def claim_default(self, line_id: str, evidence: str) -> str:
        line_id = _sanitize(line_id, 20)
        if line_id not in self.lines:
            raise gl.vm.UserError("line_not_found")
        l = json.loads(self.lines[line_id])
        if l["status"] != "funded":
            raise gl.vm.UserError("line_not_active")
        sender = str(gl.message.sender_address)
        if sender.lower() != l["lender"].lower():
            raise gl.vm.UserError("unauthorized: only the lender can claim default")

        evidence = _sanitize(evidence, 600)
        if not evidence:
            raise gl.vm.UserError("evidence is required")

        l["status"] = "default_claimed"
        l["default_evidence"] = evidence
        self.lines[line_id] = json.dumps(l)
        return "default_claimed"

    @gl.public.write
    def dispute_default(self, line_id: str, rebuttal: str) -> str:
        line_id = _sanitize(line_id, 20)
        if line_id not in self.lines:
            raise gl.vm.UserError("line_not_found")
        l = json.loads(self.lines[line_id])
        if l["status"] != "default_claimed":
            raise gl.vm.UserError("nothing_to_dispute")
        sender = str(gl.message.sender_address)
        if sender.lower() != l["borrower"].lower():
            raise gl.vm.UserError("unauthorized: only the borrower can dispute")

        rebuttal = _sanitize(rebuttal, 600)
        if not rebuttal:
            raise gl.vm.UserError("rebuttal is required")

        l["status"] = "disputed"
        l["borrower_rebuttal"] = rebuttal
        self.lines[line_id] = json.dumps(l)
        return "disputed"

    @gl.public.write
    def resolve_default(self, line_id: str) -> str:
        """Five validators weigh the lender's default evidence, any borrower
        rebuttal, and live market context to decide how the collateral
        actually splits - not a rigid all-or-nothing liquidation."""
        line_id = _sanitize(line_id, 20)
        if line_id not in self.lines:
            raise gl.vm.UserError("line_not_found")
        l = json.loads(self.lines[line_id])
        if l["status"] not in ("default_claimed", "disputed"):
            raise gl.vm.UserError("nothing_to_resolve")

        collateral = l["collateral_amount"]
        loan_amount = l["loan_amount"]
        purpose = l["purpose"]
        default_evidence = l["default_evidence"]
        rebuttal = l["borrower_rebuttal"] or "The borrower did not submit a rebuttal."

        # GenVM forbids more than one non-deterministic block reachable from
        # the same write method, and requires the leader function to be a
        # named def, not an inline lambda - so the live fetch and the
        # reasoning happen inside this single named function.
        def _fetch_and_adjudicate() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            market_data = r.body.decode("utf-8")[:400]

            return (
                f"You are adjudicating a contested default on a collateralized "
                f"credit line on COMPAX.\n"
                f"[ORIGINAL PURPOSE]\n{purpose}\n"
                f"[LOAN AMOUNT]\n{loan_amount} cGEN | [COLLATERAL]\n{collateral} cGEN\n"
                f"[LENDER'S DEFAULT CLAIM]\n{default_evidence}\n"
                f"[BORROWER'S REBUTTAL]\n{rebuttal}\n"
                f"[LIVE MARKET CONTEXT]\n{market_data}\n"
                f"[TASK]\nDecide how the {collateral} cGEN collateral splits "
                f"between the lender and the borrower. A clear, undisputed "
                f"default should favor the lender (up to the full collateral, "
                f"covering the loan and a penalty). A weak claim or credible "
                f"rebuttal should return more to the borrower. The two amounts "
                f"must sum to exactly {collateral}.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"collateral_to_lender\": <int 0 to {collateral}>, '
                f'\"collateral_to_borrower\": <int 0 to {collateral}>, '
                f'\"reasoning\": \"<2-4 sentences citing the claim, the rebuttal, and market context>\"}}'
            )

        result_str = gl.eq_principle.prompt_non_comparative(
            _fetch_and_adjudicate,
            task="Adjudicate a contested credit default and split the collateral",
            criteria=(
                f"collateral_to_lender and collateral_to_borrower are both non-negative "
                f"integers that sum to exactly {collateral}. reasoning explicitly weighs "
                f"the lender's claim against the borrower's rebuttal."
            ),
        )
        try:
            parsed = json.loads(result_str)
            to_lender = max(0, min(collateral, int(parsed.get("collateral_to_lender", collateral))))
            to_borrower = collateral - to_lender
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 600)
        except Exception:
            to_lender = collateral
            to_borrower = 0
            reasoning = "Unable to parse adjudication result; defaulting to full collateral to lender."

        # CEI: record state before external transfers
        l["status"] = "resolved"
        l["collateral_to_lender"] = to_lender
        l["collateral_to_borrower"] = to_borrower
        l["ai_reasoning"] = reasoning
        self.lines[line_id] = json.dumps(l)

        if to_lender > 0:
            _Recipient(Address(l["lender"])).emit_transfer(value=u256(to_lender))
        if to_borrower > 0:
            _Recipient(Address(l["borrower"])).emit_transfer(value=u256(to_borrower))
        return "resolved"

    # ── views ────────────────────────────────────────────────────────

    @gl.public.view
    def get_line(self, line_id: str) -> dict:
        if line_id not in self.lines:
            return {}
        return json.loads(self.lines[line_id])

    @gl.public.view
    def get_all_lines(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        for i, v in enumerate(self.lines.values()):
            if i < offset:
                continue
            if len(result) >= limit:
                break
            result.append(json.loads(v))
        return result

    @gl.public.view
    def get_line_count(self) -> int:
        return int(self.line_counter)
