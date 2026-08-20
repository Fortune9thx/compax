# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from datetime import datetime, timezone


@gl.contract_interface
class _EscrowAdjudicatorIface:
    class View:
        pass
    class Write:
        def create_escrow(self, provider: str, criteria: str, deadline: str, required_evidence_types: str, on_behalf_of: str): ...


@gl.contract_interface
class _CreditLineIface:
    class View:
        def get_line(self, line_id: str) -> dict: ...
    class Write:
        def fund_line(self, line_id: str, on_behalf_of: str): ...


@gl.contract_interface
class _PredictionMarketIface:
    class View:
        def get_market(self, market_id: str) -> dict: ...
    class Write:
        def stake(self, market_id: str, position: str, on_behalf_of: str): ...


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


def _deterministic_allowed_instruments(risk: int) -> list:
    """A vault's mandate scope is a transparent, auditable policy - not an
    LLM classification. Anyone can verify this mapping by reading this
    function; it does not require GenLayer consensus because it depends on
    no external fact and no contested judgment. See resolve_movement() below
    for where this contract's actual Intelligent Contract behavior lives:
    adjudicating whether a specific, real capital movement complied with the
    vault's natural-language objective - a genuinely contested question that
    a deterministic rule cannot answer."""
    if risk <= 3:
        return ["escrow"]
    elif risk <= 7:
        return ["escrow", "credit"]
    else:
        return ["escrow", "credit", "prediction"]


class VaultManager(gl.Contract):
    """
    Mandate vaults: multi-party capital pools where a stated natural-language
    objective governs how an owner may deploy depositors' capital.

    What is NOT an Intelligent Contract decision here: which instrument
    types a vault's risk tolerance permits. That is a deterministic,
    transparent policy (_deterministic_allowed_instruments) - it depends on
    no external fact and has no counterparty, so running it through
    five-validator LLM consensus would be decorative, not real adjudication.

    What IS the real, GenLayer-native trust problem: any depositor can
    challenge a specific capital movement the owner made, arguing it didn't
    actually serve the stated mandate. resolve_movement() then has five
    validators independently weigh the vault's original objective, the
    owner's stated justification for that specific move, the challenge, and
    live market context, and decide "compliant" or "violation" - exactly the
    same challenge -> evidence -> consensus -> reputation pattern already
    proven in EscrowAdjudicator/PredictionMarket/CreditLine, applied to
    capital stewardship instead of a single transaction.

    Depositors hold individually tracked claims (vault_deposits) and can
    reclaim their own undeployed capital via withdraw_deposit() at any time -
    the owner has no special withdrawal privilege over money they didn't
    deposit themselves. This closes what would otherwise be an unprotected
    "deposit into someone else's vault, owner keeps it" pattern.

    Custody: move_to_* funds the target instrument DIRECTLY via a
    cross-contract call carrying value (gl.get_contract_at(addr).emit(
    value=..., on='accepted').method(...)) - confirmed working on this
    GenVM build (see contracts/deploy_order.md; an earlier belief that
    cross-contract writes were broken here turned out to be a false
    negative from checking state immediately instead of waiting for the
    emitted message's own, separate follow-up transaction). The owner never
    touches the principal and cannot skip creating the instrument the
    mandate was approved for - real enforcement, not a release-and-trust
    handoff.

    on='accepted', not the "safer" on='finalized', deliberately: a
    value-carrying internal emit() with on='finalized' was empirically
    tested twice on this GenVM build and never delivered - the child
    transaction simply never appears, even after 30+ minutes (in contrast,
    the identical call with on='accepted' delivered in seconds, and
    external EOA-style payouts, which the platform forces to 'finalized',
    deliver normally - the failure is specific to internal 'finalized'
    emits with value). Accepting the documented on='accepted' tradeoff
    (the message can theoretically fire again if this transaction is
    appealed and re-executed) is safe here: every target method
    (create_escrow, fund_line, stake) is a fresh-state creation/entry call
    that transitions status away from its initial open state, so a
    duplicate delivery would hit that changed status and revert - not
    double-spend. That reverted duplicate's value is not returned to the
    sender (see contracts/deploy_order.md's note on external-message value
    loss - the same applies here), which is a real but narrow residual risk
    bounded to the rare case of an actual appeal overturning this specific
    transaction, not the normal-operation failure this design replaces.

    Every emit() records the vault owner (not this contract) as the
    counterparty of record on the target instrument, via an on_behalf_of
    parameter those contracts accept. This is required, not cosmetic: a
    plain value transfer to another Intelligent Contract - the mechanism
    every payout in this app uses (refunds, repayments, winnings) - was
    empirically confirmed on this GenVM build to silently fail to deliver
    when the recipient is an IC rather than a real EOA. If VaultManager
    itself became the funder/lender/staker of record, every return owed
    back to it would be permanently stranded with no rescue path. Recording
    the owner's real EOA instead means returns flow through the same payout
    path already proven safe for every other user.
    """

    vaults: TreeMap[str, str]
    vault_deposits: TreeMap[str, str]        # "{vault_id}_{depositor_lower}" -> {"amount": int}
    movements: TreeMap[str, str]             # "MOV-{n}" -> movement record
    movement_counter: u256
    movement_challenges: TreeMap[str, str]   # "{movement_id}_{i}" -> challenge record
    movement_challenge_counts: TreeMap[str, str]
    vault_counter: u256
    keepers: TreeMap[str, str]
    _owner: str

    def __init__(self) -> None:
        self.vaults = TreeMap[str, str]()
        self.vault_deposits = TreeMap[str, str]()
        self.movements = TreeMap[str, str]()
        self.movement_counter = u256(0)
        self.movement_challenges = TreeMap[str, str]()
        self.movement_challenge_counts = TreeMap[str, str]()
        self.vault_counter = u256(0)
        self.keepers = TreeMap[str, str]()
        self._owner = str(gl.message.sender_address)

    # ── keeper registry - triggers resolve_movement only, never moves funds ──

    def _only_owner(self) -> None:
        if str(gl.message.sender_address) != self._owner:
            raise gl.vm.UserError("unauthorized: owner only")

    def _is_keeper(self, address: str) -> bool:
        a = address.lower()
        return a in self.keepers and self.keepers[a] == "active"

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

    # ── vault creation ────────────────────────────────────────────────

    @gl.public.write
    def create_vault(self, name: str, objective: str, risk_tolerance: u256, personality: str) -> str:
        name = _sanitize(name, 80)
        objective = _sanitize(objective, 500)
        personality = _sanitize(personality, 50)
        if not name:
            raise gl.vm.UserError("name is required")
        if not objective:
            raise gl.vm.UserError("objective is required")
        risk = max(1, min(10, int(risk_tolerance)))

        owner = str(gl.message.sender_address)
        vault_id = f"VAULT-{int(self.vault_counter)}"
        self.vault_counter = u256(int(self.vault_counter) + 1)

        allowed = _deterministic_allowed_instruments(risk)
        mandate_note = (
            f"Deterministic policy, not an AI decision: risk {risk}/10 permits "
            f"{', '.join(allowed)}. Thresholds: 1-3 escrow only, 4-7 adds credit, "
            f"8-10 adds prediction. This mapping is fixed and auditable in "
            f"VaultManager.py - it does not change based on the stated objective "
            f"or personality, only risk_tolerance."
        )

        vault = json.dumps({
            "id": vault_id,
            "owner": owner,
            "name": name,
            "objective": objective,
            "risk_tolerance": risk,
            "personality": personality,
            "treasury": 0,
            "allowed_instruments": allowed,
            "mandate_reasoning": mandate_note,
            "deposit_count": 0,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        self.vaults[vault_id] = vault
        return vault_id

    # ── deposits: individually tracked, owner has no special claim ─────

    @gl.public.write.payable
    def deposit(self, vault_id: str) -> str:
        vault_id = _sanitize(vault_id, 20)
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("deposit amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        sender = str(gl.message.sender_address)

        v = json.loads(self.vaults[vault_id])
        v["treasury"] = v["treasury"] + amount
        v["deposit_count"] = v["deposit_count"] + 1
        self.vaults[vault_id] = json.dumps(v)

        key = f"{vault_id}_{sender.lower()}"
        existing = int(json.loads(self.vault_deposits[key])["amount"]) if key in self.vault_deposits else 0
        self.vault_deposits[key] = json.dumps({"amount": existing + amount})
        return "deposited"

    @gl.public.write
    def withdraw_deposit(self, vault_id: str, amount: u256) -> str:
        """Any depositor - including the owner, who is just another
        depositor of their own vault - reclaims their own undeployed
        capital. Nobody can withdraw money someone else deposited."""
        vault_id = _sanitize(vault_id, 20)
        sender = str(gl.message.sender_address)
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError("withdraw amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")

        key = f"{vault_id}_{sender.lower()}"
        if key not in self.vault_deposits:
            raise gl.vm.UserError("no_deposit_found_for_this_address")
        d = json.loads(self.vault_deposits[key])
        if amt > int(d["amount"]):
            raise gl.vm.UserError("exceeds_your_deposited_balance")

        v = json.loads(self.vaults[vault_id])
        if amt > v["treasury"]:
            raise gl.vm.UserError("insufficient_live_treasury_some_capital_is_currently_deployed")

        d["amount"] = int(d["amount"]) - amt
        self.vault_deposits[key] = json.dumps(d)
        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)

        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return "withdrawn"

    # ── capital movement: mandate-gated, justified, contestable, REAL custody ──
    #
    # Capital now funds the target instrument DIRECTLY via a cross-contract
    # call carrying value (gl.get_contract_at(...).emit(value=..., on=
    # 'finalized').method(...)) - confirmed working on this GenVM build (see
    # contracts/deploy_order.md). This replaces the earlier design, which
    # released capital to the vault owner's own wallet on the belief that
    # cross-contract writes were broken; that belief was wrong (see below),
    # and the old design left zero onchain enforcement that an owner
    # actually created the instrument they claimed to be funding.
    #
    # Every emit() below passes on_behalf_of=the vault owner's real address,
    # NOT this contract's own address. That is required, not cosmetic: a
    # plain value transfer to another Intelligent Contract (the mechanism
    # every payout in this app's other 4 contracts uses - refunds,
    # repayments, winnings) was empirically confirmed on this GenVM build to
    # silently fail to deliver when the recipient is an IC rather than a
    # real EOA - no error, no revert, the value just never arrives and isn't
    # returned either. If VaultManager itself became the funder/lender/
    # staker of record, every refund/repayment/winning owed back to it would
    # be permanently stranded in the paying contract's own balance with no
    # rescue path. Recording the owner's real EOA as the party of record
    # sidesteps that entirely - returns flow through the same payout
    # mechanism already proven safe for every other real user.
    #
    # Because emit() is asynchronous, none of these calls get a synchronous
    # result back (a created escrow id, confirmation the stake landed).
    # Parameters are pre-validated here - matching the target's own checks,
    # and pre-checking existence via .view() for credit/prediction - because
    # a value-carrying emitted call that reverts downstream does NOT return
    # its value to the sender; it is simply gone.

    def _check_mandate_and_reserve(self, vault_id: str, amount: u256, instrument: str, justification: str) -> dict:
        vault_id = _sanitize(vault_id, 20)
        sender = str(gl.message.sender_address)
        amt = int(amount)
        justification = _sanitize(justification, 400)
        if amt <= 0:
            raise gl.vm.UserError("amount must be positive")
        if not justification:
            raise gl.vm.UserError("a justification for this specific movement is required")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        if sender.lower() != v["owner"].lower():
            raise gl.vm.UserError("unauthorized: only the vault owner can move capital")
        if instrument not in v["allowed_instruments"]:
            raise gl.vm.UserError(f"mandate_violation: this vault's risk tier does not permit {instrument}")
        if amt > v["treasury"]:
            raise gl.vm.UserError("insufficient_live_treasury")

        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)
        return {"vault": v, "vault_id": vault_id, "amt": amt, "justification": justification}

    def _record_movement(
        self, vault_id: str, v: dict, instrument: str, amt: int, justification: str, target_address: str, target_ref: str
    ) -> str:
        movement_id = f"MOV-{int(self.movement_counter)}"
        self.movement_counter = u256(int(self.movement_counter) + 1)
        self.movements[movement_id] = json.dumps({
            "id": movement_id,
            "vault_id": vault_id,
            "owner": v["owner"],
            "objective": v["objective"],
            "personality": v["personality"],
            "instrument": instrument,
            "target_address": target_address,
            "target_ref": target_ref,
            "amount": amt,
            "justification": justification,
            "status": "executed",
            "outcome": "",
            "ai_reasoning": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resolved_at": "",
        })
        return movement_id

    @gl.public.write
    def move_to_escrow(
        self, vault_id: str, target_address: str, amount: u256,
        provider: str, criteria: str, deadline: str, required_evidence_types: str,
        justification: str,
    ) -> str:
        """Funds a brand-new escrow directly on EscrowAdjudicator at
        target_address, with the vault owner recorded as funder. target_ref
        is left blank on the movement record - the created escrow's id
        isn't known synchronously; it appears on EscrowAdjudicator shortly
        after, funded by this vault's owner and matching this movement's
        provider/criteria/amount."""
        provider = _sanitize(provider, 64)
        criteria = _sanitize(criteria, 800)
        deadline = _sanitize(deadline, 40)
        required_evidence_types = _sanitize(required_evidence_types, 200)
        target_address = _sanitize(target_address, 64)
        if not target_address:
            raise gl.vm.UserError("target_address is required")
        if not provider:
            raise gl.vm.UserError("provider address is required")
        if not criteria:
            raise gl.vm.UserError("success criteria is required")
        if not deadline:
            raise gl.vm.UserError("deadline is required")
        try:
            datetime.strptime(deadline, "%Y-%m-%d")
        except ValueError:
            raise gl.vm.UserError("deadline must be an ISO date, e.g. 2026-12-31")

        r = self._check_mandate_and_reserve(vault_id, amount, "escrow", justification)
        v, amt, just = r["vault"], r["amt"], r["justification"]
        if provider.lower() == v["owner"].lower():
            raise gl.vm.UserError("provider must differ from the vault owner")

        movement_id = self._record_movement(r["vault_id"], v, "escrow", amt, just, target_address, "")

        _EscrowAdjudicatorIface(Address(target_address)).emit(value=u256(amt), on="accepted").create_escrow(
            provider, criteria, deadline, required_evidence_types, v["owner"]
        )
        return movement_id

    @gl.public.write
    def move_to_credit(
        self, vault_id: str, target_address: str, line_id: str, amount: u256, justification: str,
    ) -> str:
        """Funds an EXISTING credit line at target_address as lender,
        directly, with the vault owner recorded as lender of record. Checks
        the target line via .view() first - open, amount within its
        max_loan_amount - before committing any value."""
        target_address = _sanitize(target_address, 64)
        line_id = _sanitize(line_id, 20)
        if not target_address:
            raise gl.vm.UserError("target_address is required")
        if not line_id:
            raise gl.vm.UserError("line_id is required")

        line = _CreditLineIface(Address(target_address)).view().get_line(line_id)
        if not line:
            raise gl.vm.UserError("target credit line not found")
        if line.get("status") != "open":
            raise gl.vm.UserError("target credit line is not open for funding")
        if int(amount) > int(line.get("max_loan_amount", 0)):
            raise gl.vm.UserError(f"exceeds target line's max_loan_amount: {line.get('max_loan_amount')}")

        r = self._check_mandate_and_reserve(vault_id, amount, "credit", justification)
        v, amt, just = r["vault"], r["amt"], r["justification"]
        if str(line.get("borrower", "")).lower() == v["owner"].lower():
            raise gl.vm.UserError("cannot fund your own credit line")

        movement_id = self._record_movement(r["vault_id"], v, "credit", amt, just, target_address, line_id)

        _CreditLineIface(Address(target_address)).emit(value=u256(amt), on="accepted").fund_line(line_id, v["owner"])
        return movement_id

    @gl.public.write
    def move_to_prediction(
        self, vault_id: str, target_address: str, market_id: str, amount: u256, position: str, justification: str,
    ) -> str:
        """Stakes on an EXISTING prediction market at target_address,
        directly, with the vault owner recorded as the position-holder. The
        owner later claims winnings themselves, directly through the normal
        /markets flow - claim_winnings() checks the stake against
        gl.message.sender_address, and on_behalf_of already recorded the
        stake under the owner's own address, so no separate VaultManager
        claim method is needed."""
        target_address = _sanitize(target_address, 64)
        market_id = _sanitize(market_id, 20)
        position = position.lower().strip()
        if not target_address:
            raise gl.vm.UserError("target_address is required")
        if not market_id:
            raise gl.vm.UserError("market_id is required")
        if position not in ("yes", "no"):
            raise gl.vm.UserError("position must be 'yes' or 'no'")

        market = _PredictionMarketIface(Address(target_address)).view().get_market(market_id)
        if not market:
            raise gl.vm.UserError("target market not found")
        if market.get("status") != "active":
            raise gl.vm.UserError("target market is not open for staking")

        r = self._check_mandate_and_reserve(vault_id, amount, "prediction", justification)
        v, amt, just = r["vault"], r["amt"], r["justification"]

        movement_id = self._record_movement(r["vault_id"], v, "prediction", amt, just, target_address, market_id)

        _PredictionMarketIface(Address(target_address)).emit(value=u256(amt), on="accepted").stake(
            market_id, position, v["owner"]
        )
        return movement_id

    @gl.public.write.payable
    def challenge_movement(self, movement_id: str, reason: str, evidence_url: str = "") -> str:
        """Anyone can challenge a capital movement by posting a bond,
        arguing it didn't actually serve the vault's stated mandate.
        resolve_movement() weighs it - not a rubber stamp of the owner's
        own justification. evidence_url is optional but strongly preferred:
        a real, independently-fetchable link resolve_movement() actually
        fetches live, rather than adjudicating purely on competing prose."""
        movement_id = _sanitize(movement_id, 20)
        if movement_id not in self.movements:
            raise gl.vm.UserError("movement_not_found")
        m = json.loads(self.movements[movement_id])
        if m["status"] != "executed":
            raise gl.vm.UserError("movement_not_challengeable")
        bond = int(gl.message.value)
        if bond <= 0:
            raise gl.vm.UserError("challenge requires a bond")
        reason = _sanitize(reason, 500)
        if not reason:
            raise gl.vm.UserError("challenge reason is required")
        evidence_url = _sanitize(evidence_url, 300)

        challenger = str(gl.message.sender_address)
        count = int(self.movement_challenge_counts[movement_id]) if movement_id in self.movement_challenge_counts else 0
        self.movement_challenges[f"{movement_id}_{count}"] = json.dumps({
            "challenger": challenger, "reason": reason, "evidence_url": evidence_url, "bond": bond, "refunded": False,
        })
        self.movement_challenge_counts[movement_id] = str(count + 1)

        m["status"] = "challenged"
        self.movements[movement_id] = json.dumps(m)
        return "challenged"

    @gl.public.write
    def resolve_movement(self, movement_id: str) -> str:
        """Five validators independently decide whether a specific,
        contested capital movement genuinely complied with the vault's
        original natural-language objective - grounded in the owner's
        stated justification, the challenge, and live market context.
        Permissionless: anyone (typically the keeper) can trigger this."""
        movement_id = _sanitize(movement_id, 20)
        if movement_id not in self.movements:
            raise gl.vm.UserError("movement_not_found")
        m = json.loads(self.movements[movement_id])
        if m["status"] != "challenged":
            raise gl.vm.UserError("movement_not_ready_for_resolution")

        objective = m["objective"]
        personality = m["personality"] or "no stated personality"
        instrument = m["instrument"]
        amount = m["amount"]
        justification = m["justification"]
        owner = m["owner"]

        challenge_count = int(self.movement_challenge_counts[movement_id]) if movement_id in self.movement_challenge_counts else 0
        challenge_texts = []
        first_evidence_url = ""
        for i in range(challenge_count):
            key = f"{movement_id}_{i}"
            if key in self.movement_challenges:
                c = json.loads(self.movement_challenges[key])
                challenge_texts.append(f"- {c['challenger']}: {c['reason']}")
                if not first_evidence_url and c.get("evidence_url"):
                    first_evidence_url = c["evidence_url"]
        challenges_text = "\n".join(challenge_texts)[:1000] if challenge_texts else "No challenges were raised."

        # GenVM forbids more than one non-deterministic block reachable from
        # the same write method, and requires the leader function to be a
        # named def, not an inline lambda - so every live fetch and the
        # reasoning happen inside this single named function.
        #
        # Authoritative sourcing: if a challenger supplied a real evidence
        # URL, fetch it live and make it primary evidence - otherwise this
        # adjudication would rest entirely on the owner's justification vs.
        # the challenger's prose, exactly the "party-authored text" grounding
        # gap this fix addresses.
        def _fetch_and_adjudicate() -> str:
            if first_evidence_url.startswith("http"):
                try:
                    ce = gl.nondet.web.get(first_evidence_url)
                    challenge_evidence = ce.body.decode("utf-8", errors="ignore")[:1200]
                except Exception:
                    challenge_evidence = "EVIDENCE_URL_FETCH_FAILED"
            else:
                challenge_evidence = "No challenger provided a fetchable evidence URL."

            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            market_data = r.body.decode("utf-8")[:400]

            return (
                f"You are adjudicating whether a specific capital movement out of "
                f"a mandate vault on COMPAX complied with that vault's stated "
                f"objective. Do not simply accept the owner's justification - "
                f"weigh it against the objective, the challenge, and live market "
                f"conditions.\n"
                f"[VAULT OBJECTIVE]\n{objective}\n"
                f"[VAULT PERSONALITY]\n{personality}\n"
                f"[MOVEMENT]\n{amount} cGEN moved toward a {instrument} instrument\n"
                f"[OWNER'S JUSTIFICATION FOR THIS MOVE]\n{justification}\n"
                f"[CHALLENGES RAISED]\n{challenges_text}\n"
                f"[LIVE FETCH OF A CHALLENGER'S EVIDENCE URL - weigh this as "
                f"primary factual evidence when present, over either side's own "
                f"prose]\n{challenge_evidence}\n"
                f"[LIVE MARKET CONTEXT - secondary]\n{market_data}\n"
                f"[TASK]\nDecide \"compliant\" (this specific move genuinely served "
                f"the stated objective) or \"violation\" (it did not - e.g. an "
                f"objective committing to low risk being used to fund a much "
                f"riskier instrument than the justification admits, or fetched "
                f"evidence contradicting the justification).\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"outcome\": \"compliant\"|\"violation\", '
                f'\"reasoning\": \"<2-4 sentences citing the fetched evidence if '
                f'present, the objective, and the justification>\"}}'
            )

        result_str = gl.eq_principle.prompt_non_comparative(
            _fetch_and_adjudicate,
            task="Adjudicate whether a specific vault capital movement complied with its mandate",
            criteria=(
                "outcome is exactly one of compliant, violation. reasoning "
                "explicitly weighs the objective against the actual movement and "
                "any challenge raised."
            ),
        )
        try:
            parsed = json.loads(result_str)
            outcome = str(parsed.get("outcome", "violation")).lower().strip()
            if outcome not in ("compliant", "violation"):
                outcome = "violation"
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 600)
        except Exception:
            outcome = "violation"
            reasoning = "Unable to parse adjudication result; defaulting to violation to protect depositors."

        bond_payouts: list = []
        for i in range(challenge_count):
            key = f"{movement_id}_{i}"
            if key not in self.movement_challenges:
                continue
            c = json.loads(self.movement_challenges[key])
            bond = int(c["bond"])
            if outcome == "violation":
                c["refunded"] = True
                bond_payouts.append((c["challenger"], bond))
            else:
                c["refunded"] = False
                bond_payouts.append((owner, bond))
            self.movement_challenges[key] = json.dumps(c)

        m["status"] = "resolved"
        m["outcome"] = outcome
        m["ai_reasoning"] = reasoning
        m["resolved_at"] = datetime.now(timezone.utc).isoformat()
        self.movements[movement_id] = json.dumps(m)

        for recipient, bond in bond_payouts:
            if bond > 0:
                _Recipient(Address(recipient)).emit_transfer(value=u256(bond))

        return outcome

    # ── views ────────────────────────────────────────────────────────

    @gl.public.view
    def get_vault(self, vault_id: str) -> dict:
        if vault_id not in self.vaults:
            return {}
        return json.loads(self.vaults[vault_id])

    @gl.public.view
    def get_all_vaults(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        for i, v in enumerate(self.vaults.values()):
            if i < offset:
                continue
            if len(result) >= limit:
                break
            result.append(json.loads(v))
        return result

    @gl.public.view
    def get_vault_count(self) -> int:
        return int(self.vault_counter)

    @gl.public.view
    def get_deposit(self, vault_id: str, address: str) -> dict:
        key = f"{_sanitize(vault_id, 20)}_{_sanitize(address, 42).lower()}"
        if key not in self.vault_deposits:
            return {"amount": 0}
        return json.loads(self.vault_deposits[key])

    @gl.public.view
    def get_movement(self, movement_id: str) -> dict:
        if movement_id not in self.movements:
            return {}
        return json.loads(self.movements[movement_id])

    @gl.public.view
    def get_vault_movements(self, vault_id: str, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        skipped = 0
        for v in self.movements.values():
            m = json.loads(v)
            if m["vault_id"] != vault_id:
                continue
            if skipped < offset:
                skipped += 1
                continue
            if len(result) >= limit:
                break
            result.append(m)
        return result

    @gl.public.view
    def get_movement_challenges(self, movement_id: str, offset: int = 0, limit: int = 100) -> list:
        if movement_id not in self.movement_challenge_counts:
            return []
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        count = int(self.movement_challenge_counts[movement_id])
        result = []
        end = min(count, offset + limit)
        for i in range(offset, end):
            key = f"{movement_id}_{i}"
            if key in self.movement_challenges:
                result.append(json.loads(self.movement_challenges[key]))
        return result

    @gl.public.view
    def get_movement_count(self) -> int:
        return int(self.movement_counter)
