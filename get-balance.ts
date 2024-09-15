import "dotenv/config";
import { Account, Call, Contract, num, constants, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';
import ROUTER_ABI from "./router-abi.json";

const JSON_RPC_URL = process.env.JSON_RPC_URL;
const RPC_PROVIDER = new RpcProvider({nodeUrl: JSON_RPC_URL,});

const ContractAddress = process.env.ACCOUNT_ADDRESS!;
const ContractPrivateKey = process.env.ACCOUNT_PRIVATE_KEY!;
const ContractPublicKey = process.env.ACCOUNT_PUBLIC_KEY!;
const ACCOUNT = new Account(RPC_PROVIDER,process.env.ACCOUNT_ADDRESS!,process.env.ACCOUNT_PRIVATE_KEY!);
const ROUTER_CONTRACT = new Contract(ROUTER_ABI,process.env.ROUTER_ADDRESS!,RPC_PROVIDER);
const TOKEN_TO_ARBITRAGE = process.env.TOKEN_TO_ARBITRAGE!;

async function fetchTokenBalance(tokenAddress: string, accountAddress: string) {
    try {
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
  

async function outputTokenBalances() {
    const accountBalance = await fetchTokenBalance(TOKEN_TO_ARBITRAGE, ACCOUNT.address);
    const routerBalance = await fetchTokenBalance(TOKEN_TO_ARBITRAGE, ROUTER_CONTRACT.address);

    console.log(`Account Balance (${ACCOUNT.address}):`, accountBalance.toString(), "wei");
    console.log(`Router Contract Balance (${ROUTER_CONTRACT.address}):`, routerBalance.toString(), "wei");
}

outputTokenBalances();
