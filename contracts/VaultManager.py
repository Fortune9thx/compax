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


class VaultManager(gl.Contract):
    """
    Mandate vaults: a user states a natural-language objective + risk
    tolerance; an intelligent contract reasons which instrument types
    (escrow, prediction, credit) the mandate permits. Capital can only leave
    the vault via withdraw() (back to the owner) or move_to_* (released to
    the owner, gated on the mandate having actually approved that instrument
    type for this vault).

    Design note - why move_to_* releases capital to the OWNER instead of
    directly funding the target instrument contract in one call: this
    GenVM build's cross-contract WRITE calls
    (gl.get_contract_at(addr).emit(on=...).method(args)) are confirmed
    broken - the calling contract's tx accepts, the target's state never
    changes (see contracts/deploy_order.md). A single atomic
    "vault -> new escrow" call is therefore not reliably achievable. What IS
    proven to work is a plain value transfer with no method call
    (_Recipient(...).emit_transfer(value=...), used throughout this
    contract's withdraw/move_to_*), so move_to_* enforces the mandate
    constraint onchain, decrements the vault's treasury, and releases the
    real capital to the vault owner's own wallet - who then creates the
    actual escrow/market/credit-line themselves as a direct, separate
    transaction, naming themselves as funder/staker/borrower. The mandate
    gate (you cannot release capital toward an instrument type the AI never
    approved for this vault) is enforced here regardless; only the literal
    single-transaction atomicity is not.
    """

    vaults: TreeMap[str, str]
    vault_counter: u256
    keepers: TreeMap[str, str]
    _owner: str

    def __init__(self) -> None:
        self.vaults = TreeMap[str, str]()
        self.vault_counter = u256(0)
        self.keepers = TreeMap[str, str]()
        self._owner = str(gl.message.sender_address)

    # ── keeper registry - re-evaluation only, never moves funds ────────

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

    # ── vault lifecycle ────────────────────────────────────────────

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

        allowed, mandate_reasoning = self._reasoned_allowed_instruments(objective, risk, personality)

        vault = json.dumps({
            "id": vault_id,
            "owner": owner,
            "name": name,
            "objective": objective,
            "risk_tolerance": risk,
            "personality": personality,
            "treasury": 0,
            "allowed_instruments": allowed,
            "mandate_reasoning": mandate_reasoning,
            "deposit_count": 0,
            "status": "active",
            "created_at": "",
        })
        self.vaults[vault_id] = vault
        return vault_id

    def _reasoned_allowed_instruments(self, objective: str, risk: int, personality: str) -> tuple:
        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"You are setting the mandate constraints for a new capital vault "
                f"on COMPAX, an autonomous capital-adjudication platform.\n"
                f"Objective: {objective}\n"
                f"Risk tolerance: {risk}/10\n"
                f"Personality: {personality}\n"
                f"[TASK]\nDecide which instrument types this vault's capital is "
                f"permitted to be committed toward: any non-empty subset of "
                f"\"escrow\", \"prediction\", \"credit\". A conservative, "
                f"low-risk mandate should generally avoid volatile instruments "
                f"like prediction markets unless the objective explicitly calls "
                f"for it. A mandate focused on paying for deliverables should "
                f"include escrow. A mandate open to earning yield on lending "
                f"should include credit.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"allowed\": [\"escrow\"|\"prediction\"|\"credit\", ...], '
                f'\"reasoning\": \"<1-2 sentences>\"}}'
            ),
            task="Determine which capital instrument types a new vault's mandate permits",
            criteria=(
                "allowed is a non-empty JSON array containing only the strings "
                "escrow, prediction, and/or credit, with no duplicates. "
                "reasoning is consistent with the stated objective and risk tolerance."
            ),
        )
        try:
            parsed = json.loads(result_str)
            allowed = [a for a in parsed.get("allowed", []) if a in ("escrow", "prediction", "credit")]
            if not allowed:
                allowed = ["escrow"]
            allowed = sorted(set(allowed))
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 300)
        except Exception:
            allowed = ["escrow"]
            reasoning = "Defaulted to escrow-only after failing to parse mandate reasoning."
        return allowed, reasoning

    @gl.public.write.payable
    def deposit(self, vault_id: str) -> str:
        vault_id = _sanitize(vault_id, 20)
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("deposit amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        v["treasury"] = v["treasury"] + amount
        v["deposit_count"] = v["deposit_count"] + 1
        self.vaults[vault_id] = json.dumps(v)
        return "deposited"

    @gl.public.write
    def withdraw(self, vault_id: str, amount: u256) -> str:
        vault_id = _sanitize(vault_id, 20)
        sender = str(gl.message.sender_address)
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError("withdraw amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        if sender.lower() != v["owner"].lower():
            raise gl.vm.UserError("unauthorized: only the vault owner can withdraw")
        if amt > v["treasury"]:
            raise gl.vm.UserError("insufficient_treasury")

        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)
        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return "withdrawn"

    def _move_to(self, vault_id: str, amount: u256, instrument: str) -> str:
        vault_id = _sanitize(vault_id, 20)
        sender = str(gl.message.sender_address)
        amt = int(amount)
        if amt <= 0:
            raise gl.vm.UserError("amount must be positive")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])
        if sender.lower() != v["owner"].lower():
            raise gl.vm.UserError("unauthorized: only the vault owner can move capital")
        if instrument not in v["allowed_instruments"]:
            raise gl.vm.UserError(f"mandate_violation: this vault's mandate does not permit {instrument}")
        if amt > v["treasury"]:
            raise gl.vm.UserError("insufficient_treasury")

        v["treasury"] = v["treasury"] - amt
        self.vaults[vault_id] = json.dumps(v)
        _Recipient(Address(sender)).emit_transfer(value=u256(amt))
        return f"released_for_{instrument}"

    @gl.public.write
    def move_to_escrow(self, vault_id: str, amount: u256) -> str:
        """Releases mandate-approved capital to the vault owner, who then
        creates the real escrow themselves via EscrowAdjudicator.create_escrow()."""
        return self._move_to(vault_id, amount, "escrow")

    @gl.public.write
    def move_to_prediction(self, vault_id: str, amount: u256) -> str:
        return self._move_to(vault_id, amount, "prediction")

    @gl.public.write
    def move_to_credit(self, vault_id: str, amount: u256) -> str:
        return self._move_to(vault_id, amount, "credit")

    @gl.public.write
    def re_evaluate_mandate(self, vault_id: str, event_context: str) -> str:
        """Keeper-only re-evaluation of which instrument types the mandate
        permits, given new context (e.g. a market event). Cannot move funds."""
        vault_id = _sanitize(vault_id, 20)
        caller = str(gl.message.sender_address)
        if not self._is_keeper(caller) and caller != self._owner:
            raise gl.vm.UserError("unauthorized: keeper or owner only")
        if vault_id not in self.vaults:
            raise gl.vm.UserError("vault_not_found")
        v = json.loads(self.vaults[vault_id])

        event_context = _sanitize(event_context, 300) if event_context else "No new context provided."
        objective = f"{v['objective']} [Re-evaluation context: {event_context}]"
        allowed, reasoning = self._reasoned_allowed_instruments(objective, v["risk_tolerance"], v["personality"])
        v["allowed_instruments"] = allowed
        v["mandate_reasoning"] = reasoning
        self.vaults[vault_id] = json.dumps(v)
        return "re_evaluated"

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
