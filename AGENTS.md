# Project architecture decisions

- Keep the PSI commons separate from APEX-operated capacity: offline verification and self-hosting remain free, while the hosted allowance is capped at 20 receipts per minute and 100 per day and higher-volume products are arranged directly. This prevents public licensing promises from being confused with hosted-service capacity.
- Reserve public notary capacity atomically in a private database counter shared by single and batch endpoints. This prevents instance restarts or parallel requests from bypassing published limits.