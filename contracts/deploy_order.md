# Contract Deployment Order

All 7 contracts are independent — none take constructor arguments and none call each other.
Deploy in any order; the sequence below is just for consistency with src/lib/contracts.ts.

```bash
# 1. Deploy EconomicEvents (no dependencies)
genlayer deploy --contract contracts/EconomicEvents.py

# 2. Deploy ReputationSystem (no dependencies)
genlayer deploy --contract contracts/ReputationSystem.py

# 3. Deploy LendingMarket (no dependencies)
genlayer deploy --contract contracts/LendingMarket.py

# 4. Deploy BuilderFunding (no dependencies)
genlayer deploy --contract contracts/BuilderFunding.py

# 5. Deploy PredictionMarkets (no dependencies)
genlayer deploy --contract contracts/PredictionMarkets.py

# 6. Deploy VaultManager (no dependencies)
genlayer deploy --contract contracts/VaultManager.py

# 7. Deploy StakingReserve (no dependencies)
genlayer deploy --contract contracts/StakingReserve.py
```

After deployment, fill all addresses into: src/lib/contracts.ts
