import fs from 'fs';
import path from 'path';
import "dotenv/config";
import { Account, Call, Contract, num, constants, ec, json, stark, RpcProvider, hash, CallData } from 'starknet';

require('dotenv').config();

const JSON_RPC_URL = process.env.JSON_RPC_URL;
const RPC_PROVIDER = new RpcProvider({
  nodeUrl: JSON_RPC_URL,
});

const outputFilePath = path.resolve(__dirname, 'account_details.txt');
const writeStream = fs.createWriteStream(outputFilePath);

// Function to write to the file
const writeToFile = (data: string): void => {
  writeStream.write(`\n${data}\n`);
};

RPC_PROVIDER.getSpecVersion().then((specVersion: string) => {
  writeToFile(`Spec Version:\n${specVersion}`);
});

const PRIVATE_KEY = ec.starkCurve.utils.randomPrivateKey();
const privateKeyHex = '0x' + Buffer.from(PRIVATE_KEY).toString('hex');
writeToFile(`Private Key\n${privateKeyHex}`);
const starkKeyPub = ec.starkCurve.getStarkKey(PRIVATE_KEY);
writeToFile(`Public Key\n${starkKeyPub}`);

const OZaccountClassHash = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';
const OZaccountConstructorCallData = CallData.compile({ publicKey: starkKeyPub });
const OZcontractAddress = hash.calculateContractAddressFromHash(
  starkKeyPub,
  OZaccountClassHash,
  OZaccountConstructorCallData,
  0
);

writeToFile(`Precalculated account address\n${OZcontractAddress}`);
writeStream.end(() => {
  console.log('Account ready for funding. Check account_details.txt for details.');
});