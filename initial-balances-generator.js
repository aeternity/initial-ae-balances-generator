const Web3 = require("web3");
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));
const ProgressBar = require('progress');

const WEB3_URL = args.p;
const DELIVERY_PERIOD = args.d;

// validate parameters
if (WEB3_URL == null || DELIVERY_PERIOD == null) {
  console.log('Specify websocket provider and delivery period: "node initial-balances-generator.js -p ws://localhost:8546 -d 0"');
  process.exit(1);
}

// handle process exit
process
  .on('exit', (code) => {
    if (code == 0) {
      if (fs.existsSync("./.cfg"))
        fs.unlinkSync("./.cfg");
      console.log(`File saved: genesis.json.`);
    }
  })
  .on('SIGINT', onexit)
  .on('SIGTERM', onexit);

function onexit() {
  console.log('*** EXITING ***');
  saveState();
  process.exit(1);
}

// setup Web3
const provider = new Web3.providers.WebsocketProvider(WEB3_URL)
provider.on('error', error => {
  console.log('WS Error');
  console.log(error);
  throw error;
  process.exit(1);
});
provider.on('end', error => {
  console.log('WS closed');
  console.log(error);
  throw error;
  process.exit(1);
});
const web3 = new Web3(provider);
var BN = web3.utils.BN;
const BURNER_CONTRACT = '0x8a3B7094e1D80C8366B4687cB85862311C931C52';
const START_BLOCK = 6682073;
const tokenBurnerABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "AEdeliveryBatchCounter",
    "outputs": [
      {
        "name": "",
        "type": "uint16"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "burnCount",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "",
        "type": "uint16"
      }
    ],
    "name": "batchTimes",
    "outputs": [
      {
        "name": "blockNumber",
        "type": "uint256"
      },
      {
        "name": "eventCount",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "AEdmin",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "name": "_AEdmin",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_pubkey",
        "type": "bytes"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "_count",
        "type": "uint256"
      },
      {
        "indexed": true,
        "name": "_deliveryPeriod",
        "type": "uint16"
      }
    ],
    "name": "Burn",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "str",
        "type": "bytes"
      }
    ],
    "name": "checkAddress",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      },
      {
        "name": "_token",
        "type": "address"
      },
      {
        "name": "_pubkey",
        "type": "bytes"
      }
    ],
    "name": "receiveApproval",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [],
    "name": "countUpDeliveryBatch",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const TokenBurner = new web3.eth.Contract(tokenBurnerABI, BURNER_CONTRACT);

var bar;

var json = {};
var start = START_BLOCK;
var end = 0;
var lastCount = 0;

startWatching();

async function startWatching() {
  console.log("Starting..");
  await setupProgressBar();
  const currentBlockNumber = await web3.eth.getBlockNumber();
  checkConfig();

  let done = false;
  let address;
  let value;
  if (lastCount != 0)
    bar.tick(lastCount);

  while (!done) {
    end = start + 200;
    if (end > currentBlockNumber) {
      done = true;
      end = currentBlockNumber;
    }
    await TokenBurner.getPastEvents(
      "Burn",
      {
        fromBlock: start,
        toBlock: end,
        filter : {_deliveryPeriod : [DELIVERY_PERIOD]}
      },
      (errors, events) => {
        if (!errors) {
          if (events.length > 0) {
            for (let i=0; i<events.length; i++) {
              bar.tick();
              if(events[i].returnValues._count <= lastCount) {
                continue;
              }
              address = web3.utils.toAscii(events[i].returnValues._pubkey);
              if (isValidAEddress(address)) {
                value = events[i].returnValues._value;
                if (json[address])
                  json[address] = new BN(json[address]).add(new BN(value)).toString();
                else json[address] = new BN(value).toString();
              };
              lastCount = Number(events[i].returnValues._count);
            }
          }
        } else {
          console.log(errors);
        }
      }
    );
    start = end;
  }
  saveJSON();
  process.exit(0);
}

function checkConfig() {
  if (fs.existsSync("./.cfg") && fs.existsSync("./genesis.json")) {
    let input = fs.readFileSync("./.cfg");
    let jsonConfig = JSON.parse(input);
    start = jsonConfig.start;
    end = jsonConfig.end;
    lastCount = jsonConfig.lastCount;
    input = fs.readFileSync("./genesis.json");
    json = JSON.parse(input);
  }
}

async function setupProgressBar() {
  let total;

  let currentDeliveryPeriod = await TokenBurner.methods.AEdeliveryBatchCounter().call();
  if (Number(currentDeliveryPeriod) < DELIVERY_PERIOD) {
    console.log("The provided delivery period is invalid. The most recent one is " + currentDeliveryPeriod);
    process.exit(1);
  }

  let burnCount = await TokenBurner.methods.burnCount().call();

  if (DELIVERY_PERIOD > 0) {
    let prevBatchTime = await TokenBurner.methods.batchTimes(DELIVERY_PERIOD-1).call();
    start = Number(prevBatchTime.blockNumber);
    total = Number(burnCount) - Number(prevBatchTime.eventCount);
  } else {
    total = Number(burnCount);
  }
  console.log(total + " burn events to be found");
  bar = new ProgressBar(':bar :current/:total Burn events found.', { total: total });
}

function isValidAEddress(address) {
  return address.startsWith("ak_") && address.length > 50 && address.length < 60;
}

function saveJSON() {
  fs.writeFileSync("./genesis.json", JSON.stringify(json));
}

function saveCFG() {
  fs.writeFileSync("./.cfg", JSON.stringify({ start: start, end: end, lastCount: lastCount }))
}

function saveState() {
  saveJSON();
  saveCFG();
}
