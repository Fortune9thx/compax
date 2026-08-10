# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
Shared reference patterns for COMPAX v2 contracts.

This file is NOT imported by the other contracts at runtime. Each GenLayer
intelligent contract deploys as a single self-contained module — there is no
verified multi-file import mechanism on the current GenVM build, and every
contract in this repo (v1 and v2) declares its own copy of `_Recipient`
inline for that reason. This file exists purely as the canonical copy other
contracts are kept in sync with, and as documentation for anyone auditing
the codebase.

Source: https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers
"""
from genlayer import *


@gl.evm.contract_interface
class _Recipient:
    """Sends native GEN to an EOA or EVM contract address.

    Usage inside a write method, after CEI state updates:
        _Recipient(Address(recipient_address)).emit_transfer(value=u256(amount))
    """
    class View:
        pass
    class Write:
        pass


def sanitize(s: str, max_len: int = 500) -> str:
    """Strip prompt-structuring characters and cap length before any string
    reaches an LLM prompt. Applied to every piece of user-supplied text."""
    for ch in ("{", "}", "[", "]", "`", '"', "#"):
        s = s.replace(ch, "")
    s = s.replace("\\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return s[:max_len].strip()


# ─── Cross-contract call pattern (IC → IC) ──────────────────────────────
# Documented at docs.genlayer.com/developers/intelligent-contracts/
# advanced-features/value-transfers, "Sending Value to Another Intelligent
# Contract" section:
#
#   gl.get_contract_at(Address(reputation_registry_address)) \
#       .emit(on='finalized') \
#       .record_escrow_outcome(user_address, success, severity_context)
#
# Pilot-tested against Bradbury before EscrowAdjudicator was built to depend
# on it — see contracts/deploy_order.md for the pilot result and whatever
# fallback pattern was actually shipped if this one didn't hold up.
