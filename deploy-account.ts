import "dotenv/config";
import { Account, Call, Contract, num, constants, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';
//import ROUTER_ABI from "./router-abi.json";

const JSON_RPC_URL = process.env.JSON_RPC_URL;
const RPC_PROVIDER = new RpcProvider({
  nodeUrl: JSON_RPC_URL,
});

const ContractAddress = process.env.ACCOUNT_ADDRESS!;
const ContractPrivateKey = process.env.ACCOUNT_PRIVATE_KEY!;
const ContractPublicKey = process.env.ACCOUNT_PUBLIC_KEY!;

async function deployAndValidateAccount() {
  // Deploy the OpenZeppelin Account first
  const ACCOUNT = new Account(RPC_PROVIDER, ContractAddress, ContractPrivateKey);

  try {

    const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
    const OZaccountConstructorCallData = CallData.compile({ publicKey: ContractPublicKey });
    const OZcontractAddress = hash.calculateContractAddressFromHash(
      ContractPublicKey,
      OZaccountClassHash,
      OZaccountConstructorCallData,
      0
    );
    const { transaction_hash, contract_address } = await ACCOUNT.deployAccount({
      classHash: OZaccountClassHash,
      constructorCalldata: OZaccountConstructorCallData,
      addressSalt: ContractPublicKey,
    });

    // Wait for the transaction to be confirmed
    await RPC_PROVIDER.waitForTransaction(transaction_hash);
    console.log("✅ New OpenZeppelin account created.\n   address =", contract_address);

    // Now validate the contract class at the deployed address
    const contract = await RPC_PROVIDER.getClassAt(contract_address);
    console.log("Contract Class Found:", contract);
  } catch (error) {
    console.error("❌ Error deploying account or validating contract:", error);
  }
}

deployAndValidateAccount();