require('dotenv/config');
const { Account, Contract, RpcProvider, CallData } = require('starknet');
const fs = require('fs');
const path = require('path');

const RPC_PROVIDER = new RpcProvider({ 
  nodeUrl: process.env.RPC_PROVIDER 
});

const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS; 
const abiPath = path.resolve(__dirname, 'router-abi.json');
const ABI = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const ACCOUNT = new Account(
  RPC_PROVIDER,
  process.env.ACCOUNT_ADDRESS,
  process.env.ACCOUNT_PRIVATE_KEY
);

(async function() {
  try {

    const SWAP_CONTRACT = new Contract(ABI, ROUTER_ADDRESS, RPC_PROVIDER);
    SWAP_CONTRACT.connect(ACCOUNT);
    const id = 1; 
    const data = []; 

    // Estimate fee for the transaction
    const feeEstimate = await ACCOUNT.estimateFee({
      to: ROUTER_ADDRESS,
      selector: SWAP_CONTRACT.locked.selector, // Get the function selector
      calldata: CallData.compile([id, data]) // Prepare calldata for the function
    });

    console.log('Estimated fee:', feeEstimate.suggestedMaxFee);

  } catch (error) {
    console.error('Failed:', error);
  }
})();
