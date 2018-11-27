# initial-ae-balances-generator
Generate a `accounts.json` with AEccounts and balances for the given delivery period,
e.g.
```
$ head accounts.json
{
  "ak_1GPPzM3VDKCP5RNEbp2uBNtgGTHRNQmrNkeAKGp7wfPWKYQvM": 6098700000000000000000,
  "ak_1K5vpH1WEGSQnrSLdk1Y1fBBc48zA6xiijuaQQbUKgLhcHZ5J": 24063510000000000000000,
  "ak_211qpHaGTsNJTPGSTqGjSEwsc9y59EFLQhveVcWASxB4Wt8L6V": 2100000000000000000,
  "ak_216i6AuBfMHQUXvkzFxTwFgKvgiM7RTJ3HAnA22uxZutNQqe7": 384279056000000000000,
  "ak_21CRygi4JNP3zPTTPVczp58dpoxfd5T4H8ihQqwfdGBscw5uxd": 1750000000000000000000,
  "ak_21SNo3YauCq2MCgLcHAeVhBju5zyfzMSTkSc94zqd15AVVeVaa": 13177139541300000000000,
  "ak_21bCwkU3c9CsM2CmJUtkFbmgZM2MsWZDDprUJDXUAYjytjce65": 1000000000000000000,
  "ak_21fQWLjY8fW7qx5yjFJt83w8D5Wci3v2fFsn8o91RQofnw1kJ3": 62536340215200000000000,
  "ak_21sfKckpk3EgRtRJpBFFv8UF9QuDjC1fvbWzoAnmoBNuo2SUtH": 28000000000000000000000,
$
```

# Usage
`node initial-balances-generator.js -p ws://localhost:8546 -d 0`

where: `-p [WebsocketProvider]`
       `-d [delivery_period]`


Verify the file hash.

```
$shasum -a 256 accounts.json
761e27a90d931551a5f5d3a8f9014a276292ba6a780db1c0013e7996770cab69  accounts.json
```
