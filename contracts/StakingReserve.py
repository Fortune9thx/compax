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


class StakingReserve(gl.Contract):
    """The Staking/Reserve sector — backs VaultManager.allocation_staking.

    Users stake cGEN into the reserve. Each position is assigned a yield band
    and a validator tier by an intelligent evaluation grounded in live market
    conditions (GenLayer thesis). The pool APR itself is periodically
    re-derived from the same live context, so staking yield reflects the real
    network environment rather than a hardcoded constant.
    """

    positions: TreeMap[str, str]
    position_counter: u256
    total_staked: u256
    current_apr_bps: u256
    _owner: str

    def __init__(self) -> None:
        self.positions = TreeMap[str, str]()
        self.position_counter = u256(0)
        self.total_staked = u256(0)
        self.current_apr_bps = u256(450)  # 4.50% baseline until first rebalance
        self._owner = str(gl.message.sender_address)

    @gl.public.write.payable
    def stake(self, lock_hint: str) -> str:
        lock_hint = _sanitize(lock_hint, 120)
        amount = int(gl.message.value)
        if amount <= 0:
            raise gl.vm.UserError("stake amount must be positive")

        staker = str(gl.message.sender_address)
        position_id = f"STK-{int(self.position_counter)}"
        self.position_counter = u256(int(self.position_counter) + 1)

        # Grounded market context for a defensible yield-band decision
        def _fetch_market_context() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:400]

        market_context = gl.eq_principle.strict_eq(_fetch_market_context)
        base_apr = int(self.current_apr_bps)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Assign a staking yield band and validator tier for a reserve deposit.\n"
                f"[POSITION]\nAmount: {amount} cGEN\nStaker preference: {lock_hint}\n"
                f"[POOL]\nCurrent pool APR: {base_apr} bps ({base_apr / 100:.2f}%)\n"
                f"Total already staked: {int(self.total_staked)} cGEN\n"
                f"[LIVE MARKET CONTEXT]\n{market_context}\n"
                f"[TASK]\nAssign a per-position APR near the pool APR, adjusted for size and "
                f"conditions, plus a validator tier. Larger, longer positions may earn a small "
                f"premium; volatile conditions warrant a more conservative band.\n"
                f"Return ONLY valid JSON:\n"
                f'{{"apr_bps": <int 100-1500>, '
                f'"tier": "core" or "standard" or "provisional", '
                f'"reasoning": "<2-3 sentences>"}}'
            ),
            task="Assign a staking yield band and validator tier grounded in market context",
            criteria=(
                "apr_bps is an integer between 100 and 1500. "
                "tier is exactly 'core', 'standard', or 'provisional'. "
                "reasoning is professional and references position size and market conditions."
            ),
        )

        try:
            parsed = json.loads(result_str)
            apr_bps = max(100, min(1500, int(parsed.get("apr_bps", base_apr))))
            tier = str(parsed.get("tier", "standard")).lower().strip()
            if tier not in ("core", "standard", "provisional"):
                tier = "standard"
            reasoning = str(parsed.get("reasoning", ""))[:500]
        except Exception:
            apr_bps = base_apr
            tier = "standard"
            reasoning = "Assigned pool baseline; evaluation unavailable."

        position = json.dumps({
            "id": position_id,
            "staker": staker,
            "amount": amount,
            "apr_bps": apr_bps,
            "tier": tier,
            "status": "active",
            "ai_reasoning": reasoning,
            "staked_at": "",
            "unstaked_at": "",
        })
        self.positions[position_id] = position
        self.total_staked = u256(int(self.total_staked) + amount)
        return position_id

    @gl.public.write
    def unstake(self, position_id: str) -> str:
        position_id = _sanitize(position_id, 20)
        sender = str(gl.message.sender_address)
        if position_id not in self.positions:
            raise gl.vm.UserError("position_not_found")
        p = json.loads(self.positions[position_id])
        if p["staker"] != sender:
            raise gl.vm.UserError("unauthorized: only staker can unstake")
        if p["status"] != "active":
            raise gl.vm.UserError("position_not_active")
        amount = int(p["amount"])
        # CEI: update state before the external transfer
        p["status"] = "unstaked"
        self.positions[position_id] = json.dumps(p)
        self.total_staked = u256(max(0, int(self.total_staked) - amount))
        if amount > 0:
            _Recipient(Address(sender)).emit_transfer(value=u256(amount))
        return "unstaked"

    @gl.public.write
    def rebalance_rate(self) -> int:
        """Re-derive the pool APR from live market conditions. Owner-gated."""
        if str(gl.message.sender_address) != self._owner:
            raise gl.vm.UserError("unauthorized: owner only")

        def _fetch_market_context() -> str:
            r = gl.nondet.web.get(
                "https://api.coingecko.com/api/v3/simple/price"
                "?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
            )
            return r.body.decode("utf-8")[:400]

        market_context = gl.eq_principle.strict_eq(_fetch_market_context)
        current = int(self.current_apr_bps)

        result_str = gl.eq_principle.prompt_non_comparative(
            lambda: (
                f"Set the reserve pool's staking APR for the next period.\n"
                f"[POOL]\nCurrent APR: {current} bps\nTotal staked: {int(self.total_staked)} cGEN\n"
                f"[LIVE MARKET CONTEXT]\n{market_context}\n"
                f"[TASK]\nRecommend a pool APR in bps. Favor stability: move gradually from the "
                f"current rate. Raise slightly in calm, higher-demand conditions; lower in stress.\n"
                f'Return ONLY valid JSON:\n{{"apr_bps": <int 100-1500>, "reasoning": "<1-2 sentences>"}}'
            ),
            task="Set the staking pool APR grounded in market context, favoring gradual change",
            criteria=(
                "apr_bps is an integer between 100 and 1500 and within 200 bps of the current rate. "
                "reasoning is professional and references market conditions."
            ),
        )

        try:
            parsed = json.loads(result_str)
            new_apr = max(100, min(1500, int(parsed.get("apr_bps", current))))
            # clamp to ±200 bps of current for stability
            new_apr = max(current - 200, min(current + 200, new_apr))
        except Exception:
            new_apr = current

        self.current_apr_bps = u256(new_apr)
        return new_apr

    @gl.public.view
    def get_position(self, position_id: str) -> dict:
        if position_id not in self.positions:
            return {}
        return json.loads(self.positions[position_id])

    @gl.public.view
    def get_all_positions(self, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        result = []
        for i, v in enumerate(self.positions.values()):
            if i < offset:
                continue
            if len(result) >= limit:
                break
            result.append(json.loads(v))
        return result

    @gl.public.view
    def get_user_positions(self, address: str, offset: int = 0, limit: int = 100) -> list:
        limit = max(1, min(200, limit))
        offset = max(0, offset)
        out = []
        skipped = 0
        for v in self.positions.values():
            p = json.loads(v)
            if p["staker"] != address:
                continue
            if skipped < offset:
                skipped += 1
                continue
            if len(out) >= limit:
                break
            out.append(p)
        return out

    @gl.public.view
    def get_total_staked(self) -> int:
        return int(self.total_staked)

    @gl.public.view
    def get_current_apr(self) -> int:
        return int(self.current_apr_bps)

    @gl.public.view
    def get_position_count(self) -> int:
        return int(self.position_counter)

    @gl.public.view
    def get_pool_stats(self) -> dict:
        active = 0
        stakers: set = set()
        for v in self.positions.values():
            p = json.loads(v)
            if p["status"] == "active":
                active += 1
                stakers.add(p["staker"])
        return {
            "total_staked": int(self.total_staked),
            "current_apr_bps": int(self.current_apr_bps),
            "active_positions": active,
            "unique_stakers": len(stakers),
            "total_positions": int(self.position_counter),
        }
