import "dotenv/config";
import { Account, Call, Contract, num, constants, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';


const PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY as string;
if (!PRIVATE_KEY) {
  throw new Error("ACCOUNT_PRIVATE_KEY is not defined in the environment variables");
}
console.log('New OZ account:\nprivateKey=', PRIVATE_KEY);
const starkKeyPub = ec.starkCurve.getStarkKey(PRIVATE_KEY);
console.log('publicKey=', starkKeyPub);

const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
const OZaccountConstructorCallData = CallData.compile({ publicKey: starkKeyPub });
const OZcontractAddress = hash.calculateContractAddressFromHash(
  starkKeyPub,
  OZaccountClassHash,
  OZaccountConstructorCallData,
  0
);

console.log('Precalculated account address=', OZcontractAddress);

