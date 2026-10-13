# APEX PSI Attest — GitHub Action

Seal any build artifact's SHA-256 digest into the APEX PSI ledger on every release.

```yaml
- uses: kawal393/apex-psi-attest-action@v1
  with:
    path: dist/app.tar.gz
    # api-key: ${{ secrets.APEX_NOTARY_KEY }}   # optional, for higher volume
```

Outputs `receipt-id` and `verify-url`, and writes a job summary.

- Free public allowance: 20 receipts/minute, 100/day. Higher volume: https://ai-governance-standard.com/upgrade
- Only the digest leaves your runner — never the file.
- A receipt proves the digest existed and was sealed at that time. It does not prove the artifact is safe or correct.

Licence: MIT.
