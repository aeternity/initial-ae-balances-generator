# initial-ae-balances-generator
Generate a `genesis.json` with AEccounts and balances for the given delivery period,
e.g.
```
{
    "ak_wmZUvZWrVibPM2PuSGhgWmMQXchEWgRTbwBp7tYUcPyBYHnpR":"5000000000000006",
    "ak_v12Pf9vWcN5tSuN2SeFL3RmYUDpu7zeeUsSuAYwyGDMW9NX3B":"7666616739113605573880",
    "ak_35dcFLx2yrkkHsvwm3CGyXoAn2FuJjSvxeWDwrGSjRBwQvYAB":"2000000000000000000"
}
```

# Usage
`node generate-json.js -p ws://localhost:8546 -d 0`

where: `-p [WebsocketProvider]`
       `-d [delivery_period]`

After running the script successfully, format it with `jq` and trim quotes (`"`) of the numbers.

sure thing
```
$ cat  genesis.json | jq . | sed -e 's/: "/: /' -e 's/",$/,/' -e 's/"$//' > accounts.json
```

Verify the file hash.

```
$shasum -a 256 accounts.json
761e27a90d931551a5f5d3a8f9014a276292ba6a780db1c0013e7996770cab69  accounts.json
