# Contract Deployment Order

Deploy in this sequence — VaultManager takes EconomicEvents address as constructor arg.

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

# 6. Deploy VaultManager — pass EconomicEvents address as constructor arg
genlayer deploy --contract contracts/VaultManager.py --args "<EconomicEvents_address>"
```

After deployment, fill all addresses into: src/lib/contracts.ts
