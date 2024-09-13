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

const PRIVATE_KEY = ec.starkCurve.utils.randomPrivateKey();
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
process.env.PREPARED_ADDRESS = OZcontractAddress;
