import "dotenv/config";
import { Account, Contract, RpcProvider } from 'starknet';
import ROUTER_ABI from "./router-abi.json";

const JSON_RPC_URL = process.env.JSON_RPC_URL;
const RPC_PROVIDER = new RpcProvider({ nodeUrl: JSON_RPC_URL });

const ACCOUNT = new Account(
  RPC_PROVIDER,
  process.env.ACCOUNT_ADDRESS!,
  process.env.ACCOUNT_PRIVATE_KEY!
);

const ROUTER_CONTRACT = new Contract(
  ROUTER_ABI,
  process.env.ROUTER_ADDRESS!,
  RPC_PROVIDER
);

const TOKEN_TO_ARBITRAGE = process.env.TOKEN_TO_ARBITRAGE!;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS!; 
const WITHDRAWAL_AMOUNT = process.env.WITHDRAWAL_AMOUNT!;

async function fetchTokenBalance(tokenAddress: string, accountAddress: string) {
  try {
    console.log(ACCOUNT);
    const balanceResponse = await RPC_PROVIDER.callContract({
      contractAddress: tokenAddress,
      entrypoint: "balanceOf",
      calldata: [accountAddress],
    });
    // The balance is returned as a hex value; convert it to a BigInt
    const balance = BigInt(balanceResponse[0]);
    return balance;
  } catch (error) {
    console.error(`Failed to fetch balance for ${accountAddress}:`, error);
    return 0n;
  }
}

// Function to call 'clear_minimum_to_recipient' to transfer tokens
async function transferFunds() {
  try {
    // Call the 'clear_minimum_to_recipient' function to transfer funds
    const response = await ACCOUNT.execute({
      contractAddress: TOKEN_TO_ARBITRAGE,
      entrypoint: "clear_minimum_to_recipient",
      calldata: [
        TOKEN_TO_ARBITRAGE,     
        WITHDRAWAL_AMOUNT,         
        WALLET_ADDRESS       
      ]
    });

    console.log(`Transfer initiated. Transaction hash: ${response.transaction_hash}`);
  } catch (error) {
    console.error("Failed to transfer funds:", error);
  }
}

async function outputTokenBalancesAndTransfer() {
  const contractBalance = await fetchTokenBalance(TOKEN_TO_ARBITRAGE, ACCOUNT.address);
  console.log(`Account Balance (${ACCOUNT.address}):`, contractBalance.toString(), "wei");
 
  // Proceed to transfer if there's sufficient balance
  if (contractBalance > BigInt(WITHDRAWAL_AMOUNT)) {
    console.log(`Transferring ${WITHDRAWAL_AMOUNT} wei to ${WALLET_ADDRESS}`);
    await transferFunds();
  } else {
    console.log(`Error transferring balance.`);
  }
}

outputTokenBalancesAndTransfer();
