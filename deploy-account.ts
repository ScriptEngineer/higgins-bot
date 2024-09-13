import "dotenv/config";
import { Account, Call, Contract, num, constants, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';
//import ROUTER_ABI from "./router-abi.json";

const JSON_RPC_URL = process.env.JSON_RPC_URL;
const RPC_PROVIDER = new RpcProvider({
  nodeUrl: JSON_RPC_URL,
});

RPC_PROVIDER.getSpecVersion().then(specVersion => {
  console.log(specVersion);
});

const PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY as string;
if (!PRIVATE_KEY) {
  throw new Error("ACCOUNT_PRIVATE_KEY is not defined in the environment variables");
}


/*
const PRIVATE_KEY = stark.randomAddress();
*/
console.log('New OZ account:\nprivateKey=', PRIVATE_KEY);
const starkKeyPub = ec.starkCurve.getStarkKey(PRIVATE_KEY);
console.log('publicKey=', starkKeyPub);


const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';

/*
RPC_PROVIDER.getClass("0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f", "latest").then(cls => {
  console.log(cls);
});
*/

const OZaccountConstructorCallData = CallData.compile({ publicKey: starkKeyPub });
const OZcontractAddress = hash.calculateContractAddressFromHash(
  starkKeyPub,
  OZaccountClassHash,
  OZaccountConstructorCallData,
  0
);

console.log('Precalculated account address=', OZcontractAddress);

async function deployAndValidateAccount() {
  // Deploy the OpenZeppelin Account first
  const ACCOUNT = new Account(RPC_PROVIDER, OZcontractAddress, PRIVATE_KEY);

  try {
    const { transaction_hash, contract_address } = await ACCOUNT.deployAccount({
      classHash: OZaccountClassHash,
      constructorCalldata: OZaccountConstructorCallData,
      addressSalt: starkKeyPub,
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