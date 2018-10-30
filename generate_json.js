
const Web3 = require("web3");
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));

const WEB3_URL = args.p;
const DELIVERY_PERIOD = args.d;

if (WEB3_URL == null || DELIVERY_PERIOD == null) {
	console.log('Specify websocket provider and delivery period: "node generate_json.js -p ws://localhost:8546 -d 0"');
    process.exit(1);
}

process
.on('exit', (code) => {
    if (code == 0) {
		if (fs.existsSync("./.cfg")) 
			fs.unlinkSync("./.cfg");
		console.log(lastCount)
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

const web3 = new Web3(new Web3.providers.WebsocketProvider(WEB3_URL));
var BN = web3.utils.BN;
// TODO: Address on mainnet
const BURNER_CONTRACT = "0x4ecD812B010D9Db16b0fb7143A79786B65b89B09";
// TODO: TokenBurner deployment block
const START_BLOCK = 9028627;
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
		"constant": false,
		"inputs": [],
		"name": "countUpDeliveryBatch",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
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
		"constant": true,
		"inputs": [],
		"name": "AEdmin1",
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
		"constant": true,
		"inputs": [],
		"name": "AEdmin2",
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
				"name": "_AEdmin1",
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
	}
];


const TokenBurner = new web3.eth.Contract(tokenBurnerABI, BURNER_CONTRACT);
var json = {};
var start = START_BLOCK;
var end = 0;
var lastCount = 0;

async function startWatching() {
    const currentBlockNumber = await web3.eth.getBlockNumber();
	
	checkConfig();

    let done = false;
    let address;
    let value;

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

startWatching();
