# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
from datetime import datetime, timezone


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


class EscrowAdjudicator(gl.Contract):
    """
    Performance escrows: a funder locks capital against a natural-language
    success criteria and a named provider. The provider accepts, does the
    work, and submits evidence. Anyone can challenge. resolve() fetches live
    web data, has five validators independently evaluate "does the evidence +
    live data satisfy the original criteria", and pays out full/partial/
    clawback accordingly.

    Reputation is NOT updated inline from here - cross-contract WRITE calls
    are confirmed broken on this GenVM build (caller tx accepts, callee state
    never changes; see contracts/deploy_order.md). Instead this contract just
    exposes a clean, honest get_escrow() that ReputationRegistry.
    record_from_escrow() pulls from after resolution, as a separate
    transaction from a party or a keeper.

    "Appeal window": GenLayer's Optimistic Democracy consensus gives every
    accepted transaction a native appeal window before it finalizes - this is
    a protocol-level property of the transaction itself (ACCEPTED, then an
    appeal window, then FINALIZED), not something this contract implements.
    The frontend surfaces it by polling the resolve() transaction's status.
    """

    escrows: TreeMap[str, str]
    challenges: TreeMap[str, str]
    challenge_counts: TreeMap[str, str]
    escrow_counter: u256
    _owner: str

    def __init__(self) -> None:
        self.escrows = TreeMap[str, str]()
        self.challenges = TreeMap[str, str]()
        self.challenge_counts = TreeMap[str, str]()
        self.escrow_counter = u256(0)
        self._owner = str(gl.message.sender_address)

    # ── creation & lifecycle ────────────────────────────────────────

    @gl.public.write.payable
    def create_escrow(
        self, provider: str, criteria: str, deadline: str, required_evidence_types: str, on_behalf_of: str = ""
    ) -> str:
        """Funder locks capital (gl.message.value) against a natural-language
        success criteria, naming the provider who must accept and deliver.

        on_behalf_of lets a caller (e.g. VaultManager, funding this escrow
        out of a mandate vault's treasury with its own emitted value) record
        someone else as the real funder of record, so refunds pay that real
        address directly through the normal, already-proven EOA payout path.
        Safe to leave permissionless: it only ever redirects where the
        CALLER'S OWN spent capital's refund goes, never anyone else's."""
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("escrow must lock a positive amount")

        provider = _sanitize(provider, 64)
        criteria = _sanitize(criteria, 800)
        deadline = _sanitize(deadline, 40)
        required_evidence_types = _sanitize(required_evidence_types, 200)
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

        funder = _sanitize(on_behalf_of, 64) or str(gl.message.sender_address)
        if provider.lower() == funder.lower():
            raise gl.vm.UserError("provider must differ from funder")

        escrow_id = f"ESC-{int(self.escrow_counter)}"
        self.escrow_counter = u256(int(self.escrow_counter) + 1)

        escrow = json.dumps({
            "id": escrow_id,
            "funder": funder,
            "provider": provider,
            "amount": amount,
            "criteria": criteria,
            "deadline": deadline,
            "required_evidence_types": required_evidence_types,
            "status": "open",
            "evidence": [],
            "outcome": "",
            "released_amount": 0,
            "ai_reasoning": "",
            "evidence_snapshot": "",
            "web_data_snapshot": "",
            "provider_bond": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resolved_at": "",
        })
        self.escrows[escrow_id] = escrow
        return escrow_id

    @gl.public.write.payable
    def accept_escrow(self, escrow_id: str) -> str:
        """Named provider accepts the mandate, optionally posting a bond
        (gl.message.value) forfeited to the funder on a clawback outcome."""
        escrow_id = _sanitize(escrow_id, 20)
        if escrow_id not in self.escrows:
            raise gl.vm.UserError("escrow_not_found")
        e = json.loads(self.escrows[escrow_id])
        if e["status"] != "open":
            raise gl.vm.UserError("escrow_not_open")
        caller = str(gl.message.sender_address)
        if caller.lower() != e["provider"].lower():
            raise gl.vm.UserError("unauthorized: only the named provider can accept")

        e["status"] = "accepted"
        e["provider_bond"] = int(gl.message.value)
        self.escrows[escrow_id] = json.dumps(e)
        return "accepted"

    @gl.public.write
    def submit_evidence(self, escrow_id: str, text: str, urls: list) -> str:
        escrow_id = _sanitize(escrow_id, 20)
        if escrow_id not in self.escrows:
            raise gl.vm.UserError("escrow_not_found")
        e = json.loads(self.escrows[escrow_id])
        if e["status"] not in ("accepted", "evidence_submitted", "challenged"):
            raise gl.vm.UserError("escrow_not_ready_for_evidence")
        caller = str(gl.message.sender_address)
        if caller.lower() != e["provider"].lower():
            raise gl.vm.UserError("unauthorized: only the provider can submit evidence")

        text = _sanitize(text, 1500)
        if not text:
            raise gl.vm.UserError("evidence text is required")
        clean_urls = []
        for u in (urls or [])[:10]:
            cu = _sanitize(str(u), 300)
            if cu:
                clean_urls.append(cu)

        e["evidence"].append({"submitter": caller, "text": text, "urls": clean_urls})
        if e["status"] == "accepted":
            e["status"] = "evidence_submitted"
        self.escrows[escrow_id] = json.dumps(e)
        return "submitted"

    @gl.public.write.payable
    def challenge(self, escrow_id: str, reason: str) -> str:
        """Anyone can challenge submitted evidence by posting a bond. A
        challenge doesn't block resolve() - it's additional context the
        adjudicating validators weigh, and is refunded/forfeited based on
        whether resolve() agrees the evidence was actually insufficient."""
        escrow_id = _sanitize(escrow_id, 20)
        if escrow_id not in self.escrows:
            raise gl.vm.UserError("escrow_not_found")
        e = json.loads(self.escrows[escrow_id])
        if e["status"] not in ("evidence_submitted", "challenged"):
            raise gl.vm.UserError("nothing_to_challenge_yet")
        bond = int(gl.message.value)
        if bond <= 0:
            raise gl.vm.UserError("challenge requires a bond")

        reason = _sanitize(reason, 500)
        if not reason:
            raise gl.vm.UserError("challenge reason is required")

        challenger = str(gl.message.sender_address)
        count = int(self.challenge_counts[escrow_id]) if escrow_id in self.challenge_counts else 0
        self.challenges[f"{escrow_id}_{count}"] = json.dumps({
            "challenger": challenger,
            "reason": reason,
            "bond": bond,
            "refunded": False,
        })
        self.challenge_counts[escrow_id] = str(count + 1)

        e["status"] = "challenged"
        self.escrows[escrow_id] = json.dumps(e)
        return "challenged"

    @gl.public.write
    def resolve(self, escrow_id: str) -> str:
        """Fetches live web evidence, has five validators independently
        evaluate whether the submitted evidence + live data satisfies the
        original natural-language criteria, and pays out accordingly."""
        escrow_id = _sanitize(escrow_id, 20)
        if escrow_id not in self.escrows:
            raise gl.vm.UserError("escrow_not_found")
        e = json.loads(self.escrows[escrow_id])
        if e["status"] not in ("evidence_submitted", "challenged"):
            raise gl.vm.UserError("escrow_not_ready_for_resolution")

        criteria = e["criteria"]
        amount = e["amount"]
        evidence = e["evidence"]
        funder = e["funder"]
        provider = e["provider"]
        required_evidence_types = e.get("required_evidence_types") or "not specified by the funder"

        evidence_text = "\n".join(
            f"- Submitted by {ev['submitter']}: {ev['text']}"
            + (f" [URLs: {', '.join(ev['urls'])}]" if ev.get("urls") else "")
            for ev in evidence
        )[:2000] if evidence else "No evidence was submitted."

        challenge_count = int(self.challenge_counts[escrow_id]) if escrow_id in self.challenge_counts else 0
        challenge_texts = []
        for i in range(challenge_count):
            key = f"{escrow_id}_{i}"
            if key in self.challenges:
                c = json.loads(self.challenges[key])
                challenge_texts.append(f"- {c['challenger']}: {c['reason']}")
        challenges_text = "\n".join(challenge_texts)[:1000] if challenge_texts else "No challenges were raised."

        first_url = ""
        for ev in evidence:
            if ev.get("urls"):
                first_url = ev["urls"][0]
                break

        # GenVM forbids more than one non-deterministic block reachable from
        # the same write method (genvm-lint: "nested non-deterministic blocks
        # are forbidden"), and requires the leader function to be a named def,
        # not an inline lambda. So both live fetches AND the reasoning happen
        # inside this single named function, and the web data it saw is
        # threaded back out through the validated JSON response itself
        # (web_data_snapshot) rather than a side-channel variable - only the
        # equivalence-validated return value is safe to rely on afterward.
        def _fetch_and_adjudicate() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            market_data = r.body.decode("utf-8")[:400]

            evidence_url_data = "No evidence URL to fetch."
            if first_url:
                try:
                    r2 = gl.nondet.web.get(first_url)
                    evidence_url_data = r2.body.decode("utf-8", errors="ignore")[:800]
                except Exception:
                    evidence_url_data = "URL_FETCH_FAILED"

            return (
                f"You are adjudicating a performance escrow on COMPAX. Determine "
                f"whether the submitted evidence, together with any live web data, "
                f"satisfies the funder's original natural-language success criteria.\n"
                f"[SUCCESS CRITERIA]\n{criteria}\n"
                f"[EVIDENCE TYPES THE FUNDER REQUIRED]\n{required_evidence_types}\n"
                f"[LOCKED AMOUNT]\n{amount} cGEN\n"
                f"[EVIDENCE SUBMITTED BY PROVIDER]\n{evidence_text}\n"
                f"[CHALLENGES RAISED]\n{challenges_text}\n"
                f"[LIVE WEB DATA - market freshness check]\n{market_data}\n"
                f"[LIVE WEB DATA - fetched from submitted evidence URL]\n{evidence_url_data}\n"
                f"[TASK]\nDecide the outcome: \"full_release\" (criteria fully met, "
                f"pay the provider the full amount), \"partial\" (criteria partly "
                f"met, pay the provider a fair fraction of the amount), or "
                f"\"clawback\" (criteria not met, return the full amount to the "
                f"funder). If the funder specified required evidence types and the "
                f"provider's submission doesn't match them, weigh that toward "
                f"partial or clawback. If challenges raise credible, unaddressed "
                f"doubts about the evidence, weigh that toward partial or "
                f"clawback.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"outcome\": \"full_release\"|\"partial\"|\"clawback\", '
                f'\"released_amount\": <int 0 to {amount}>, '
                f'\"reasoning\": \"<2-4 sentences citing the evidence and the live data>\", '
                f'\"web_data_snapshot\": \"<brief verbatim excerpt of the two LIVE WEB DATA '
                f'sections above, so an onchain reader can see what was actually fetched>\"}}'
            )

        result_str = gl.eq_principle.prompt_non_comparative(
            _fetch_and_adjudicate,
            task="Adjudicate a performance escrow against its natural-language success criteria",
            criteria=(
                f"outcome is exactly one of full_release, partial, clawback. "
                f"released_amount is an integer between 0 and {amount} inclusive, "
                f"consistent with the outcome (full_release implies released_amount "
                f"equals {amount}; clawback implies released_amount is 0). "
                f"reasoning explicitly cites both the submitted evidence and the "
                f"live web data. web_data_snapshot is a short excerpt of the live "
                f"data actually shown above, not fabricated."
            ),
        )

        try:
            parsed = json.loads(result_str)
            outcome = str(parsed.get("outcome", "clawback")).lower().strip()
            if outcome not in ("full_release", "partial", "clawback"):
                outcome = "clawback"
            released = max(0, min(amount, int(parsed.get("released_amount", 0))))
            if outcome == "full_release":
                released = amount
            elif outcome == "clawback":
                released = 0
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 600)
            web_data_snapshot = _sanitize(str(parsed.get("web_data_snapshot", "")), 600)
        except Exception:
            outcome = "clawback"
            released = 0
            reasoning = "Unable to parse adjudication result; defaulting to clawback to protect funder capital."
            web_data_snapshot = ""

        # Challenge bonds must resolve too - collected in challenge() as real
        # value, they cannot sit in the contract forever with no code path
        # out. A challenge that raised doubt validated by the outcome
        # (partial/clawback) is refunded to the challenger; a challenge
        # against evidence the validators deemed fully sufficient is
        # forfeited to the provider as compensation for a meritless dispute.
        provider_bond = int(e.get("provider_bond", 0))
        bond_payouts: list = []
        for i in range(challenge_count):
            key = f"{escrow_id}_{i}"
            if key not in self.challenges:
                continue
            c = json.loads(self.challenges[key])
            if c.get("refunded"):
                continue
            challenge_bond = int(c["bond"])
            if outcome == "full_release":
                c["refunded"] = False
                bond_payouts.append((provider, challenge_bond))
            else:
                c["refunded"] = True
                bond_payouts.append((c["challenger"], challenge_bond))
            self.challenges[key] = json.dumps(c)

        # CEI: record state before external transfers
        e["status"] = "resolved"
        e["outcome"] = outcome
        e["released_amount"] = released
        e["ai_reasoning"] = reasoning
        e["evidence_snapshot"] = evidence_text[:600]
        e["web_data_snapshot"] = web_data_snapshot
        e["resolved_at"] = datetime.now(timezone.utc).isoformat()
        self.escrows[escrow_id] = json.dumps(e)

        refund = amount - released
        provider_payout = released + (provider_bond if outcome != "clawback" else 0)
        funder_payout = refund + (provider_bond if outcome == "clawback" else 0)
        if provider_payout > 0:
            _Recipient(Address(provider)).emit_transfer(value=u256(provider_payout))
        if funder_payout > 0:
            _Recipient(Address(funder)).emit_transfer(value=u256(funder_payout))
        for recipient, bond_amount in bond_payouts:
            if bond_amount > 0:
                _Recipient(Address(recipient)).emit_transfer(value=u256(bond_amount))

        return outcome

    @gl.public.write
    def reclaim_if_abandoned(self, escrow_id: str) -> str:
        """If the provider never accepted, or accepted but never submitted
        any evidence, before the stated deadline, the funder reclaims their
        locked capital (plus any provider bond, forfeited for abandonment)
        directly - there is no evidence to adjudicate, just a deadline that
        passed with nothing delivered. Without this, an escrow whose
        provider simply never shows up had no way back to the funder."""
        escrow_id = _sanitize(escrow_id, 20)
        if escrow_id not in self.escrows:
            raise gl.vm.UserError("escrow_not_found")
        e = json.loads(self.escrows[escrow_id])
        if e["status"] not in ("open", "accepted"):
            raise gl.vm.UserError("not_reclaimable: evidence was submitted or this is already resolved")
        caller = str(gl.message.sender_address)
        if caller.lower() != e["funder"].lower():
            raise gl.vm.UserError("unauthorized: only the funder can reclaim")
        deadline_dt = datetime.strptime(e["deadline"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < deadline_dt:
            raise gl.vm.UserError(f"cannot_reclaim_before_deadline: {e['deadline']}")

        provider_bond = int(e.get("provider_bond", 0))
        amount = e["amount"]

        e["status"] = "reclaimed"
        e["outcome"] = "reclaimed_abandoned"
        e["released_amount"] = 0
        e["ai_reasoning"] = "Provider never submitted evidence before the stated deadline; funder reclaimed without adjudication."
        e["resolved_at"] = datetime.now(timezone.utc).isoformat()
        self.escrows[escrow_id] = json.dumps(e)

        payout = amount + provider_bond
        if payout > 0:
            _Recipient(Address(e["funder"])).emit_transfer(value=u256(payout))
        return "reclaimed"

    # ── views ────────────────────────────────────────────────────────

    @gl.public.view
    def get_escrow(self, escrow_id: str) -> dict:
        if escrow_id not in self.escrows:
            return {}
        return json.loads(self.escrows[escrow_id])

    @gl.public.view
    def get_all_escrows(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        for i, v in enumerate(self.escrows.values()):
            if i < offset:
                continue
            if len(result) >= limit:
                break
            result.append(json.loads(v))
        return result

    @gl.public.view
    def get_challenges(self, escrow_id: str, offset: int = 0, limit: int = 100) -> list:
        if escrow_id not in self.challenge_counts:
            return []
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        count = int(self.challenge_counts[escrow_id])
        result = []
        end = min(count, offset + limit)
        for i in range(offset, end):
            key = f"{escrow_id}_{i}"
            if key in self.challenges:
                result.append(json.loads(self.challenges[key]))
        return result

    @gl.public.view
    def get_escrow_count(self) -> int:
        return int(self.escrow_counter)
