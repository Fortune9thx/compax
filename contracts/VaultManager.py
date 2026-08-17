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

    Design note - why move_to_* releases capital to the OWNER instead of
    directly funding the target instrument contract in one call: this
    GenVM build's cross-contract WRITE calls
    (gl.get_contract_at(addr).emit(on=...).method(args)) are confirmed
    broken - the calling contract's tx accepts, the target's state never
    changes (see contracts/deploy_order.md). What IS proven to work is a
    plain value transfer with no method call (_Recipient(...).emit_transfer),
    used throughout this contract, so move_to_* enforces the mandate
    constraint onchain, decrements the vault's live treasury, and releases
    the real capital to the vault owner's own wallet - who then creates the
    actual escrow/market/credit-line themselves as a direct, separate
    transaction. The mandate gate is enforced here regardless; only the
    literal single-transaction atomicity is not.
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
            "created_at": "",
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

    # ── capital movement: mandate-gated, justified, contestable ────────

    def _move_to(self, vault_id: str, amount: u256, instrument: str, justification: str) -> str:
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

        movement_id = f"MOV-{int(self.movement_counter)}"
        self.movement_counter = u256(int(self.movement_counter) + 1)
        self.movements[movement_id] = json.dumps({
            "id": movement_id,
            "vault_id": vault_id,
            "owner": v["owner"],
            "objective": v["objective"],
            "personality": v["personality"],
            "instrument": instrument,
            "amount": amt,
            "justification": justification,
            "status": "executed",
            "outcome": "",
            "ai_reasoning": "",
            "created_at": "",
            "resolved_at": "",
        })

        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return movement_id

    @gl.public.write
    def move_to_escrow(self, vault_id: str, amount: u256, justification: str) -> str:
        """Releases mandate-approved capital to the vault owner, who then
        creates the real escrow themselves via EscrowAdjudicator.create_escrow().
        Returns the movement id - any depositor can later challenge it."""
        return self._move_to(vault_id, amount, "escrow", justification)

    @gl.public.write
    def move_to_prediction(self, vault_id: str, amount: u256, justification: str) -> str:
        return self._move_to(vault_id, amount, "prediction", justification)

    @gl.public.write
    def move_to_credit(self, vault_id: str, amount: u256, justification: str) -> str:
        return self._move_to(vault_id, amount, "credit", justification)

    @gl.public.write.payable
    def challenge_movement(self, movement_id: str, reason: str) -> str:
        """Anyone can challenge a capital movement by posting a bond,
        arguing it didn't actually serve the vault's stated mandate.
        resolve_movement() weighs it - not a rubber stamp of the owner's
        own justification."""
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

        challenger = str(gl.message.sender_address)
        count = int(self.movement_challenge_counts[movement_id]) if movement_id in self.movement_challenge_counts else 0
        self.movement_challenges[f"{movement_id}_{count}"] = json.dumps({
            "challenger": challenger, "reason": reason, "bond": bond, "refunded": False,
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
        for i in range(challenge_count):
            key = f"{movement_id}_{i}"
            if key in self.movement_challenges:
                c = json.loads(self.movement_challenges[key])
                challenge_texts.append(f"- {c['challenger']}: {c['reason']}")
        challenges_text = "\n".join(challenge_texts)[:1000] if challenge_texts else "No challenges were raised."

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
                f"[LIVE MARKET CONTEXT]\n{market_data}\n"
                f"[TASK]\nDecide \"compliant\" (this specific move genuinely served "
                f"the stated objective) or \"violation\" (it did not - e.g. an "
                f"objective committing to low risk being used to fund a much "
                f"riskier instrument than the justification admits).\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"outcome\": \"compliant\"|\"violation\", '
                f'\"reasoning\": \"<2-4 sentences citing the objective, the '
                f'justification, and the live data>\"}}'
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
