# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


def _sanitize(s: str, max_len: int = 500) -> str:
    for ch in ("{", "}", "[", "]", "`", '"', "#"):
        s = s.replace(ch, "")
    s = s.replace("\\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return s[:max_len].strip()


class ReputationRegistry(gl.Contract):
    """
    PULL-based reputation. Cross-contract WRITE calls (gl.get_contract_at(addr)
    .emit(on=...).method(args)) were pilot-tested on Bradbury and confirmed to
    silently no-op — the caller's tx accepts, the callee's state never changes.
    Cross-contract READS (gl.get_contract_at(addr).view().method(args)) were
    separately pilot-tested and confirmed to work correctly.

    So instead of an adjudicating contract pushing a reputation update inline
    during its own resolve() call, ReputationRegistry itself PULLS the outcome:
    a party to a resolved instrument (or a registered keeper, on their behalf)
    calls record_from_escrow/record_from_prediction/record_from_credit here,
    passing the source contract's address and the instrument's id. This
    contract reads that instrument's finalized state directly via .view(),
    verifies it's actually resolved, and only then applies a reasoned delta.

    Security: `trusted_sources` restricts which contract addresses this
    registry will trust the *shape and finality* of state from — without it,
    anyone could deploy a fake contract mimicking get_escrow()'s return shape
    with status="resolved" to fabricate reputation. Only the owner registers
    trusted sources, after deploying and verifying the real adjudicator
    contracts. `claimed` prevents claiming the same resolved instrument twice.
    """

    scores: TreeMap[str, str]
    history: TreeMap[str, str]
    history_counts: TreeMap[str, str]
    trusted_sources: TreeMap[str, str]   # lowercased address -> "escrow"|"prediction"|"credit"|"revoked"
    keepers: TreeMap[str, str]           # lowercased address -> "active"|"revoked"
    claimed: TreeMap[str, str]           # dedupe key -> "claimed"
    _owner: str

    def __init__(self) -> None:
        self.scores = TreeMap[str, str]()
        self.history = TreeMap[str, str]()
        self.history_counts = TreeMap[str, str]()
        self.trusted_sources = TreeMap[str, str]()
        self.keepers = TreeMap[str, str]()
        self.claimed = TreeMap[str, str]()
        self._owner = str(gl.message.sender_address)

    # ── access control ────────────────────────────────────────────────

    def _only_owner(self) -> None:
        if str(gl.message.sender_address) != self._owner:
            raise gl.vm.UserError("unauthorized: owner only")

    def _is_keeper(self, address: str) -> bool:
        a = address.lower()
        return a in self.keepers and self.keepers[a] == "active"

    def _is_trusted_source(self, address: str, category: str) -> bool:
        a = address.lower()
        return a in self.trusted_sources and self.trusted_sources[a] == category

    def _require_party_or_operator(self, caller: str, parties: tuple) -> None:
        if caller in parties:
            return
        if caller == self._owner or self._is_keeper(caller):
            return
        raise gl.vm.UserError("unauthorized: must be a party to the instrument, the owner, or a registered keeper")

    # ── admin: trusted sources + keepers ────────────────────────────────

    @gl.public.write
    def add_trusted_source(self, address: str, category: str) -> str:
        """Owner registers a deployed adjudicator contract (EscrowAdjudicator,
        PredictionMarket, or CreditLine) as a trusted source of finalized
        outcome data, after verifying it onchain post-deploy."""
        self._only_owner()
        addr = _sanitize(address, 64).lower()
        cat = _sanitize(category, 20).lower()
        if not addr:
            raise gl.vm.UserError("address required")
        if cat not in ("escrow", "prediction", "credit"):
            raise gl.vm.UserError("category must be escrow, prediction, or credit")
        self.trusted_sources[addr] = cat
        return "added"

    @gl.public.write
    def remove_trusted_source(self, address: str) -> str:
        self._only_owner()
        addr = _sanitize(address, 64).lower()
        if addr in self.trusted_sources:
            self.trusted_sources[addr] = "revoked"
        return "removed"

    @gl.public.view
    def is_trusted_source(self, address: str, category: str) -> bool:
        return self._is_trusted_source(address, category)

    @gl.public.write
    def add_keeper(self, address: str) -> str:
        self._only_owner()
        addr = _sanitize(address, 64).lower()
        if not addr:
            raise gl.vm.UserError("address required")
        self.keepers[addr] = "active"
        return "added"

    @gl.public.write
    def remove_keeper(self, address: str) -> str:
        self._only_owner()
        addr = _sanitize(address, 64).lower()
        if addr in self.keepers:
            self.keepers[addr] = "revoked"
        return "removed"

    @gl.public.view
    def is_keeper(self, address: str) -> bool:
        return self._is_keeper(address)

    # ── scoring internals ────────────────────────────────────────────

    def _ensure_score(self, address: str) -> dict:
        if address not in self.scores:
            s = {
                "address": address,
                "total_score": 500,
                "escrow_score": 0,
                "prediction_score": 0,
                "credit_score": 0,
                "total_actions": 0,
            }
            self.scores[address] = json.dumps(s)
            return s
        return json.loads(self.scores[address])

    def _reasoned_delta(self, category: str, outcome: str, context: str, lo: int, hi: int, default: int) -> tuple:
        ctx = context if context else "no additional context provided"
        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"You are updating a user's onchain reputation after a {category} "
                f"adjudication outcome on COMPAX, an autonomous capital-adjudication "
                f"platform.\n"
                f"Outcome: {outcome}\n"
                f"Context: {ctx}\n"
                f"[TASK]\nAssign a reputation delta as an integer between {lo} and {hi} "
                f"that reflects the severity of this specific outcome — a clean, prompt "
                f"fulfillment deserves more than a barely-adequate one; a clear, "
                f"malicious-looking default deserves a harsher penalty than a "
                f"borderline dispute.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"delta\": <int>, \"reason\": \"<one concise sentence>\"}}'
            ),
            task="Assign a reputation score delta for an adjudicated capital outcome",
            criteria=(
                f"delta is an integer between {lo} and {hi} inclusive. "
                f"reason is a single concise sentence explicitly citing the context given."
            ),
        )
        try:
            parsed = json.loads(result_str)
            delta = max(lo, min(hi, int(parsed.get("delta", default))))
            reason = _sanitize(str(parsed.get("reason", outcome)), 200)
        except Exception:
            delta, reason = default, outcome
        return delta, reason

    def _apply_delta(self, address: str, delta: int, category: str, reason: str) -> None:
        s = self._ensure_score(address)
        s["total_score"] = max(0, s["total_score"] + delta)
        key = f"{category}_score"
        s[key] = s.get(key, 0) + delta
        s["total_actions"] = s["total_actions"] + 1
        self.scores[address] = json.dumps(s)

        count = int(self.history_counts[address]) if address in self.history_counts else 0
        ev = json.dumps({"category": category, "delta": delta, "reason": reason, "timestamp": ""})
        self.history[f"{address}_{count}"] = ev
        self.history_counts[address] = str(count + 1)

    # ── pull-based outcome recording ────────────────────────────────

    @gl.public.write
    def record_from_escrow(self, escrow_address: str, escrow_id: str) -> str:
        """Reads a resolved escrow from `escrow_address` (must be a registered
        trusted 'escrow' source) and scores the provider based on the real
        onchain outcome. Callable by the escrow's funder, its provider, the
        registry owner, or a registered keeper."""
        addr = _sanitize(escrow_address, 64)
        eid = _sanitize(escrow_id, 20)
        if not self._is_trusted_source(addr, "escrow"):
            raise gl.vm.UserError("escrow_address is not a registered trusted escrow source")

        claim_key = f"escrow_{addr.lower()}_{eid}"
        if claim_key in self.claimed:
            raise gl.vm.UserError("already_claimed")

        escrow = gl.get_contract_at(Address(addr)).view().get_escrow(eid)
        if not escrow:
            raise gl.vm.UserError("escrow_not_found")
        if escrow.get("status") != "resolved":
            raise gl.vm.UserError("escrow_not_resolved")

        funder = str(escrow.get("funder", ""))
        provider = str(escrow.get("provider", ""))
        caller = str(gl.message.sender_address)
        self._require_party_or_operator(caller, (funder, provider))

        outcome = str(escrow.get("outcome", ""))
        amount = int(escrow.get("amount", 0))
        released = int(escrow.get("released_amount", 0))
        reasoning = _sanitize(str(escrow.get("ai_reasoning", "")), 300)
        context = f"Outcome: {outcome}. Released {released} of {amount} locked. Adjudicator reasoning: {reasoning}"

        if outcome == "full_release":
            delta, reason = self._reasoned_delta("escrow", "success criteria fully satisfied, full release", context, 20, 100, 50)
        elif outcome == "partial":
            delta, reason = self._reasoned_delta("escrow", "success criteria partially satisfied, partial release", context, -10, 40, 10)
        else:
            delta, reason = self._reasoned_delta("escrow", "success criteria not satisfied, clawback to funder", context, -150, -10, -80)

        self._apply_delta(provider, delta, "escrow", reason)
        self.claimed[claim_key] = "claimed"
        return "recorded"

    @gl.public.write
    def record_from_prediction(self, market_address: str, market_id: str, user_address: str) -> str:
        """Reads a resolved market from `market_address` (must be a registered
        trusted 'prediction' source), reads `user_address`'s stake on it, and
        scores them based on whether their staked position matched the real
        onchain outcome. Callable by that user, the owner, or a keeper."""
        addr = _sanitize(market_address, 64)
        mid = _sanitize(market_id, 20)
        user = _sanitize(user_address, 42)
        caller = str(gl.message.sender_address)
        self._require_party_or_operator(caller, (user,))

        if not self._is_trusted_source(addr, "prediction"):
            raise gl.vm.UserError("market_address is not a registered trusted prediction source")

        claim_key = f"prediction_{addr.lower()}_{mid}_{user.lower()}"
        if claim_key in self.claimed:
            raise gl.vm.UserError("already_claimed")

        market = gl.get_contract_at(Address(addr)).view().get_market(mid)
        if not market:
            raise gl.vm.UserError("market_not_found")
        if market.get("status") != "resolved":
            raise gl.vm.UserError("market_not_resolved")

        stake = gl.get_contract_at(Address(addr)).view().get_user_stake(mid, user)
        if not stake or not stake.get("position"):
            raise gl.vm.UserError("no_stake_found_for_user")

        outcome = str(market.get("outcome", ""))
        position = str(stake.get("position", ""))
        correct = position == outcome
        reasoning = _sanitize(str(market.get("resolution_reasoning", "")), 300)
        context = f"Question: {market.get('question', '')}. Staked: {position}. Resolved: {outcome}. Reasoning: {reasoning}"

        if correct:
            delta, reason = self._reasoned_delta("prediction", "staked position matched the resolved outcome", context, 5, 60, 25)
        else:
            delta, reason = self._reasoned_delta("prediction", "staked position did not match the resolved outcome", context, -30, -5, -15)

        self._apply_delta(user, delta, "prediction", reason)
        self.claimed[claim_key] = "claimed"
        return "recorded"

    @gl.public.write
    def record_from_credit(self, credit_address: str, line_id: str) -> str:
        """Reads a finalized credit line from `credit_address` (must be a
        registered trusted 'credit' source) and scores the borrower based on
        the real onchain outcome (repaid vs. defaulted). Callable by the
        borrower, the owner, or a keeper."""
        addr = _sanitize(credit_address, 64)
        lid = _sanitize(line_id, 20)
        if not self._is_trusted_source(addr, "credit"):
            raise gl.vm.UserError("credit_address is not a registered trusted credit source")

        claim_key = f"credit_{addr.lower()}_{lid}"
        if claim_key in self.claimed:
            raise gl.vm.UserError("already_claimed")

        line = gl.get_contract_at(Address(addr)).view().get_line(lid)
        if not line:
            raise gl.vm.UserError("credit_line_not_found")
        status = str(line.get("status", ""))
        # "repaid" = borrower paid in full. "resolved" = a contested default was
        # adjudicated by resolve_default(), which splits collateral between lender
        # and borrower (see CreditLine.resolve_default). Both are final states.
        if status not in ("repaid", "resolved"):
            raise gl.vm.UserError("credit_line_not_finalized")

        borrower = str(line.get("borrower", ""))
        caller = str(gl.message.sender_address)
        self._require_party_or_operator(caller, (borrower,))

        reasoning = _sanitize(str(line.get("ai_reasoning", "")), 300)
        collateral_amount = int(line.get("collateral_amount", 0))
        collateral_to_lender = int(line.get("collateral_to_lender", 0))
        collateral_to_borrower = int(line.get("collateral_to_borrower", 0))
        context = (
            f"Status: {status}. Collateral: {collateral_amount}, "
            f"{collateral_to_lender} to lender / {collateral_to_borrower} to borrower on adjudication. "
            f"Adjudicator reasoning: {reasoning}"
        )

        if status == "repaid":
            delta, reason = self._reasoned_delta("credit", "credit obligation fully repaid", context, 10, 80, 35)
        elif collateral_amount > 0 and collateral_to_borrower >= collateral_amount:
            # adjudicated fully in the borrower's favor — treat like a clean resolution, not a penalty
            delta, reason = self._reasoned_delta("credit", "contested default adjudicated in borrower's favor", context, -10, 30, 5)
        else:
            delta, reason = self._reasoned_delta("credit", "contested default adjudicated against borrower, collateral claimed", context, -200, -20, -100)

        self._apply_delta(borrower, delta, "credit", reason)
        self.claimed[claim_key] = "claimed"
        return "recorded"

    # ── views ────────────────────────────────────────────────────────

    @gl.public.view
    def get_score(self, address: str) -> dict:
        if address not in self.scores:
            return {
                "address": address,
                "total_score": 500,
                "escrow_score": 0,
                "prediction_score": 0,
                "credit_score": 0,
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
    def is_claimed(self, claim_key: str) -> bool:
        return claim_key in self.claimed
