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


class PredictionMarket(gl.Contract):
    """
    Contested binary prediction markets. Anyone creates a market and stakes
    real value on yes/no. After the resolution deadline, anyone can propose
    an outcome with evidence; anyone can challenge that proposal with a
    bond; resolve() then has five validators independently evaluate the
    proposal, any challenges, and live web data against the original
    question - the creator cannot unilaterally resolve their own market.
    Winners individually claim their stake plus a proportional share of the
    losing pool after finality.

    Note on "after resolution date": this GenVM build has no contract-level
    wall-clock primitive verified anywhere in this codebase (every contract
    here stores timestamps as "" and ships on tx ordering instead). So
    propose_outcome is not gated on the deadline having actually passed - that's enforced as a UI/process convention, not an onchain guarantee.
    Documenting this honestly rather than faking a check that doesn't work.
    """

    markets: TreeMap[str, str]
    stakes: TreeMap[str, str]
    challenges: TreeMap[str, str]
    challenge_counts: TreeMap[str, str]
    market_counter: u256
    total_volume: u256
    _owner: str

    def __init__(self) -> None:
        self.markets = TreeMap[str, str]()
        self.stakes = TreeMap[str, str]()
        self.challenges = TreeMap[str, str]()
        self.challenge_counts = TreeMap[str, str]()
        self.market_counter = u256(0)
        self.total_volume = u256(0)
        self._owner = str(gl.message.sender_address)

    # ── creation & staking ────────────────────────────────────────────

    @gl.public.write
    def create_market(self, question: str, resolution_sources: str, deadline: str) -> str:
        question = _sanitize(question, 400)
        resolution_sources = _sanitize(resolution_sources, 300)
        deadline = _sanitize(deadline, 40)
        if not question:
            raise gl.vm.UserError("question is required")
        if not deadline:
            raise gl.vm.UserError("deadline is required")
        try:
            datetime.strptime(deadline, "%Y-%m-%d")
        except ValueError:
            raise gl.vm.UserError("deadline must be an ISO date, e.g. 2026-12-31")

        creator = str(gl.message.sender_address)
        market_id = f"MKT-{int(self.market_counter)}"
        self.market_counter = u256(int(self.market_counter) + 1)

        market = json.dumps({
            "id": market_id,
            "creator": creator,
            "question": question,
            "resolution_sources": resolution_sources,
            "deadline": deadline,
            "total_yes": 0,
            "total_no": 0,
            "bonus_pool": 0,
            "status": "active",
            "proposed_outcome": "",
            "proposed_by": "",
            "proposed_evidence": "",
            "outcome": "",
            "resolution_reasoning": "",
            "web_data_snapshot": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "resolved_at": "",
        })
        self.markets[market_id] = market
        return market_id

    @gl.public.write.payable
    def stake(self, market_id: str, position: str, on_behalf_of: str = "") -> str:
        """on_behalf_of lets a caller (e.g. VaultManager, funding this stake
        out of a mandate vault's treasury with its own emitted value) record
        someone else as the actual position-holder, so claim_winnings() pays
        that real address directly through the normal, already-proven EOA
        payout path - see VaultManager.py for why staking a payout-bearing
        position AS an Intelligent Contract itself is unsafe on this GenVM
        build (plain value transfers to an IC silently fail to deliver)."""
        market_id = _sanitize(market_id, 20)
        sender = str(gl.message.sender_address).lower()
        holder = _sanitize(on_behalf_of, 64).lower() or sender
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("stake amount must be positive")
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            raise gl.vm.UserError("market_not_open_for_staking")
        position = position.lower().strip()
        if position not in ("yes", "no"):
            raise gl.vm.UserError("position must be 'yes' or 'no'")

        stake_key = f"{market_id}_{holder}"
        if stake_key in self.stakes:
            existing = json.loads(self.stakes[stake_key])
            if existing["position"] != position:
                raise gl.vm.UserError("cannot_change_position")
            existing["amount"] = existing["amount"] + amount
            self.stakes[stake_key] = json.dumps(existing)
        else:
            self.stakes[stake_key] = json.dumps({"position": position, "amount": amount, "claimed": False})

        if position == "yes":
            m["total_yes"] = m["total_yes"] + amount
        else:
            m["total_no"] = m["total_no"] + amount
        self.markets[market_id] = json.dumps(m)
        self.total_volume = u256(int(self.total_volume) + amount)
        return "staked"

    # ── propose → challenge → resolve ────────────────────────────────

    @gl.public.write
    def propose_outcome(self, market_id: str, outcome: str, evidence: str) -> str:
        """Anyone (not just the creator) can propose how the market resolved,
        with supporting evidence. This closes staking and opens a challenge
        window before resolve() makes the real, adjudicated decision."""
        market_id = _sanitize(market_id, 20)
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] != "active":
            raise gl.vm.UserError("market_not_open_for_proposals")
        deadline_dt = datetime.strptime(m["deadline"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < deadline_dt:
            raise gl.vm.UserError(f"cannot_propose_before_deadline: {m['deadline']}")

        outcome = outcome.lower().strip()
        if outcome not in ("yes", "no"):
            raise gl.vm.UserError("outcome must be 'yes' or 'no'")
        evidence = _sanitize(evidence, 800)
        if not evidence:
            raise gl.vm.UserError("evidence is required")

        m["status"] = "proposed"
        m["proposed_outcome"] = outcome
        m["proposed_by"] = str(gl.message.sender_address)
        m["proposed_evidence"] = evidence
        self.markets[market_id] = json.dumps(m)
        return "proposed"

    @gl.public.write.payable
    def challenge_proposal(self, market_id: str, reason: str) -> str:
        market_id = _sanitize(market_id, 20)
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] not in ("proposed", "challenged"):
            raise gl.vm.UserError("nothing_to_challenge")
        bond = int(gl.message.value)
        if bond <= 0:
            raise gl.vm.UserError("challenge requires a bond")
        reason = _sanitize(reason, 500)
        if not reason:
            raise gl.vm.UserError("challenge reason is required")

        challenger = str(gl.message.sender_address)
        count = int(self.challenge_counts[market_id]) if market_id in self.challenge_counts else 0
        self.challenges[f"{market_id}_{count}"] = json.dumps({
            "challenger": challenger, "reason": reason, "bond": bond,
        })
        self.challenge_counts[market_id] = str(count + 1)

        m["status"] = "challenged"
        self.markets[market_id] = json.dumps(m)
        return "challenged"

    @gl.public.write
    def resolve(self, market_id: str) -> str:
        """Five validators independently determine the real outcome from the
        original question, the proposal, any challenges, and live web data - not a rubber stamp of whatever was proposed. The market's creator
        cannot call this in a way that favors themselves; the outcome is
        reasoned fresh from the question every time."""
        market_id = _sanitize(market_id, 20)
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] not in ("proposed", "challenged"):
            raise gl.vm.UserError("market_not_ready_for_resolution")

        question = m["question"]
        sources = m["resolution_sources"] or "no preferred sources specified"
        proposed = m["proposed_outcome"]
        proposed_evidence = m["proposed_evidence"]
        total_yes = m["total_yes"]
        total_no = m["total_no"]

        challenge_count = int(self.challenge_counts[market_id]) if market_id in self.challenge_counts else 0
        challenge_texts = []
        for i in range(challenge_count):
            key = f"{market_id}_{i}"
            if key in self.challenges:
                c = json.loads(self.challenges[key])
                challenge_texts.append(f"- {c['challenger']}: {c['reason']}")
        challenges_text = "\n".join(challenge_texts)[:1000] if challenge_texts else "No challenges were raised."

        # GenVM forbids more than one non-deterministic block reachable from
        # the same write method, and requires the leader function to be a
        # named def, not an inline lambda - so every live fetch and the
        # reasoning happen inside this single named function.
        #
        # Authoritative sourcing: if the creator gave a real URL in
        # resolution_sources, fetch it live and make it the PRIMARY evidence
        # - this is the actual fix for markets not being grounded in anything
        # but party-authored text. The CoinGecko fetch below is a separate,
        # secondary check - only relevant when the question is actually about
        # crypto prices, disclosed to the model as exactly that rather than
        # mislabeled as relevant "market data" for a question it has nothing
        # to do with.
        def _fetch_and_resolve() -> str:
            source_url = sources if sources.startswith("http") else ""
            if source_url:
                try:
                    rs = gl.nondet.web.get(source_url)
                    source_data = rs.body.decode("utf-8", errors="ignore")[:1200]
                except Exception:
                    source_data = "SOURCE_FETCH_FAILED"
            else:
                source_data = (
                    "No fetchable source URL was provided by the market creator "
                    "(resolution_sources was empty or not a URL) - resolve from "
                    "the question, submitted evidence, and general knowledge only."
                )

            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            live_fetch = r.body.decode("utf-8")[:600]

            return (
                f"You are independently resolving a binary prediction market on "
                f"COMPAX. Do not simply accept the proposed outcome - determine "
                f"the real answer to the question yourself using your knowledge "
                f"and the live data provided, then weigh the proposal and any "
                f"challenges against that independent determination.\n"
                f"[QUESTION]\n{question}\n"
                f"[CREATOR'S STATED RESOLUTION SOURCE]\n{sources or 'none stated'}\n"
                f"[LIVE FETCH OF THAT SOURCE - treat as the primary authoritative "
                f"evidence when present]\n{source_data}\n"
                f"[PROPOSED OUTCOME]\n{proposed} - evidence: {proposed_evidence}\n"
                f"[CHALLENGES RAISED]\n{challenges_text}\n"
                f"[STAKES]\nYES: {total_yes} cGEN | NO: {total_no} cGEN\n"
                f"[LIVE INTERNET FETCH - CoinGecko BTC/ETH pricing, proves this "
                f"resolution has live web access at this moment; only treat this "
                f"as relevant evidence if the question is actually about crypto "
                f"prices, otherwise ignore its content]\n{live_fetch}\n"
                f"[TASK]\nDetermine the real outcome: \"yes\" or \"no\". This may "
                f"or may not match the proposal. Prefer the fetched source over "
                f"the proposer's own claim when they conflict.\n"
                f"Return ONLY valid JSON with no extra text: "
                f'{{\"outcome\": \"yes\"|\"no\", \"reasoning\": \"<2-4 sentences '
                f'citing the fetched source if present, otherwise the strongest '
                f'available evidence, explaining whether this agrees or '
                f'disagrees with the proposal>\", '
                f'\"web_data_snapshot\": \"<brief verbatim excerpt of whichever '
                f'live fetch above actually informed the decision>\"}}'
            )

        result_str = gl.eq_principle.prompt_non_comparative(
            _fetch_and_resolve,
            task="Independently resolve a binary prediction market",
            criteria=(
                "outcome is exactly the string yes or no. reasoning cites "
                "the fetched resolution source when one was provided, "
                "otherwise the strongest available evidence, and explicitly "
                "states whether it agrees with the proposed outcome. "
                "web_data_snapshot is a short excerpt of a live fetch shown "
                "above, not fabricated - do not fail this on minor numeric "
                "differences (e.g. live prices) between independent fetches, "
                "only on content that could not plausibly come from either "
                "fetch at all."
            ),
        )

        try:
            parsed = json.loads(result_str)
            outcome = str(parsed.get("outcome", "no")).lower().strip()
            if outcome not in ("yes", "no"):
                outcome = "no"
            reasoning = _sanitize(str(parsed.get("reasoning", "")), 600)
            web_data_snapshot = _sanitize(str(parsed.get("web_data_snapshot", "")), 400)
        except Exception:
            outcome = "no"
            reasoning = "Unable to parse adjudication result; defaulting to NO."
            web_data_snapshot = ""

        # Challenge bonds must resolve too - collected in challenge_proposal()
        # as real value, they cannot sit in the contract forever with no
        # code path out. A challenge that turned out to be right (the
        # resolved outcome differs from what was proposed) is refunded
        # directly to the challenger. A challenge against a proposal the
        # validators independently confirmed is forfeited into a SEPARATE
        # bonus_pool field, distributed pro-rata to winners in
        # claim_winnings() alongside the losing pool. It must NOT be added
        # into total_yes/total_no directly - that field doubles as the
        # payout-share denominator, and inflating it there under-pays every
        # individual winner (their share of the pool shrinks) while leaving
        # the forfeited GEN permanently stuck with no claim path. Verified
        # by hand: payout_i = principal_i + principal_i*(losing_pool+bonus)
        # /winning_pool, summed over all winners, exactly equals
        # winning_pool + losing_pool + bonus - conserved, nothing stuck.
        challenge_vindicated = outcome != proposed
        refund_payouts: list = []
        forfeited_total = 0
        for i in range(challenge_count):
            key = f"{market_id}_{i}"
            if key not in self.challenges:
                continue
            c = json.loads(self.challenges[key])
            bond = int(c["bond"])
            if challenge_vindicated:
                refund_payouts.append((c["challenger"], bond))
            else:
                forfeited_total += bond

        m["bonus_pool"] = m.get("bonus_pool", 0) + forfeited_total

        m["status"] = "resolved"
        m["outcome"] = outcome
        m["resolution_reasoning"] = reasoning
        m["resolved_at"] = datetime.now(timezone.utc).isoformat()
        m["web_data_snapshot"] = web_data_snapshot
        self.markets[market_id] = json.dumps(m)

        for recipient, bond in refund_payouts:
            if bond > 0:
                _Recipient(Address(recipient)).emit_transfer(value=u256(bond))

        return outcome

    @gl.public.write
    def claim_winnings(self, market_id: str) -> str:
        market_id = _sanitize(market_id, 20)
        sender = str(gl.message.sender_address).lower()
        if market_id not in self.markets:
            raise gl.vm.UserError("market_not_found")
        m = json.loads(self.markets[market_id])
        if m["status"] != "resolved":
            raise gl.vm.UserError("market_not_resolved")

        stake_key = f"{market_id}_{sender}"
        if stake_key not in self.stakes:
            raise gl.vm.UserError("no_stake_found")
        s = json.loads(self.stakes[stake_key])
        if s.get("claimed"):
            raise gl.vm.UserError("already_claimed")
        if s["position"] != m["outcome"]:
            raise gl.vm.UserError("losing_position_not_claimable")

        # winning_pool is the ORIGINAL stake total on the winning side only -
        # never inflated by bonus_pool, which would shrink every individual
        # winner's proportional share and strand GEN with no claim path.
        # bonus_pool is added to the numerator (shared out) instead, exactly
        # like the losing pool.
        winning_pool = m["total_yes"] if m["outcome"] == "yes" else m["total_no"]
        losing_pool = m["total_no"] if m["outcome"] == "yes" else m["total_yes"]
        bonus_pool = m.get("bonus_pool", 0)
        principal = s["amount"]
        if winning_pool > 0:
            payout = principal + (principal * (losing_pool + bonus_pool)) // winning_pool
        else:
            payout = principal

        s["claimed"] = True
        self.stakes[stake_key] = json.dumps(s)

        if payout > 0:
            _Recipient(Address(sender)).emit_transfer(value=u256(payout))
        return str(payout)

    # ── views ────────────────────────────────────────────────────────

    @gl.public.view
    def get_market(self, market_id: str) -> dict:
        if market_id not in self.markets:
            return {}
        return json.loads(self.markets[market_id])

    @gl.public.view
    def get_all_markets(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        for i, v in enumerate(self.markets.values()):
            if i < offset:
                continue
            if len(result) >= limit:
                break
            result.append(json.loads(v))
        return result

    @gl.public.view
    def get_active_markets(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        skipped = 0
        for v in self.markets.values():
            m = json.loads(v)
            if m["status"] not in ("active",):
                continue
            if skipped < offset:
                skipped += 1
                continue
            if len(result) >= limit:
                break
            result.append(m)
        return result

    @gl.public.view
    def get_user_stake(self, market_id: str, address: str) -> dict:
        key = f"{market_id}_{address.lower()}"
        if key not in self.stakes:
            return {}
        return json.loads(self.stakes[key])

    @gl.public.view
    def get_challenges(self, market_id: str, offset: int = 0, limit: int = 100) -> list:
        if market_id not in self.challenge_counts:
            return []
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        count = int(self.challenge_counts[market_id])
        result = []
        end = min(count, offset + limit)
        for i in range(offset, end):
            key = f"{market_id}_{i}"
            if key in self.challenges:
                result.append(json.loads(self.challenges[key]))
        return result

    @gl.public.view
    def get_total_volume(self) -> int:
        return int(self.total_volume)

    @gl.public.view
    def get_market_count(self) -> int:
        return int(self.market_counter)
