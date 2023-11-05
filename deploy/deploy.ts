import * as fs from 'fs';

import { Keypair, Connection, clusterApiUrl} from "@solana/web3.js";
import { Tx, Common, BpfLoaderUpgradeable } from "../packages/solana-bpf-upgradeable";

/** Maximum amount of transaction retries */
const MAX_RETRIES = 5;

/** Sleep amount multiplier each time a transaction fails */
const SLEEP_MULTIPLIER = 1.8;

const pathToProgram = './file.so'

const processDeploy = async () => {

  let programBuffer;

  await fs.promises.readFile(pathToProgram)
    .then((data: Buffer) => {
      console.log('File data:', data);
      programBuffer = data
    })
    .catch((err: NodeJS.ErrnoException) => {
      console.error(`Error reading the file: ${err}`);
    });

  const conn = new Connection(clusterApiUrl('devnet'));

  // buffer Account
  const buffersecret = []
  const bufferuint8Array = new Uint8Array(buffersecret);
  const bufferKp = Keypair.fromSecretKey(bufferuint8Array)
  const bufferAddr = bufferKp.publicKey.toString()
  console.log("bufferAddr: ", bufferAddr)

  // Create buffer
  // const bufferKp = Keypair.generate();
  // console.log("Buffer pk: " + bufferKp.publicKey.toBase58())

  const programLen = programBuffer.length;
  const bufferSize = BpfLoaderUpgradeable.getBufferAccountSize(programLen); //
  const bufferBalance = await conn.getMinimumBalanceForRentExemption(
    bufferSize
  );

  ///// payer Account
  const secret = []
  const uint8Array = new Uint8Array(secret);
  const walletKp = Keypair.fromSecretKey(uint8Array)
  const payerAccountAddr = walletKp.publicKey.toString()
  console.log("payerAccountAddr: ", payerAccountAddr)

  const userBalance = await conn.getBalance(walletKp.publicKey);

  let sleepAmount = 1000;
  // Retry until it's successful or exceeds max tries
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      if (i !== 0) {
        const bufferInit = await conn.getAccountInfo(bufferKp.publicKey);
        if (bufferInit) break;
      }

      const createBufferResult = await BpfLoaderUpgradeable.createBuffer(
        conn,
        walletKp,
        bufferKp,
        bufferBalance,
        programLen,
      );
      console.log(/createBufferResult/);
      console.log(createBufferResult);
      console.log(/createBufferResult/);

    } catch (e: any) {
      console.log("Create buffer error: ", e.message);
      if (i === MAX_RETRIES - 1) {
        throw new Error("err")
      }

      let _sleepAmount = 1000 * 3
      await Common.sleep(_sleepAmount)
      _sleepAmount *= SLEEP_MULTIPLIER
    }
  }

  const bufferAccount = await conn.getAccountInfo(bufferKp.publicKey)
  console.log(/bufferAccount/)
  console.log(bufferAccount)
  console.log(/bufferAccount/)
  await Common.sleep(1000 * 5);

  // Load buffer
  console.log(/loadBuffer/);
  await BpfLoaderUpgradeable.loadBuffer(
    conn,
    walletKp,
    bufferKp.publicKey,
    programBuffer
  );

  await Common.sleep(1000 * 5);

  let txHash: string | undefined;

  sleepAmount = 1000;

  const programSecret = []
  const programUint8Array = new Uint8Array(programSecret);

  const programKp = Keypair.fromSecretKey(programUint8Array);
  const programPk = programKp.publicKey;
  const programAddr = programPk.toString()
  console.log("programAddr: ", programAddr)

  // Retry until it's successful or exceeds max tries
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // First deploy needs keypair
      if (!programKp) {
        let errMsg =
          "Initial deployment needs a keypair but you've only provided a public key.";
        break;
      }

      const programSize = BpfLoaderUpgradeable.getBufferAccountSize(
        BpfLoaderUpgradeable.BUFFER_PROGRAM_SIZE
      );

      // get Balance
      const programBalance =
        await conn.getMinimumBalanceForRentExemption(programSize);

      console.log(/deployProgram/);
      txHash = await BpfLoaderUpgradeable.deployProgram(
        conn,
        walletKp,
        bufferKp.publicKey,
        programKp,
        programBalance,
        programLen * 2,
      );

      console.log("Deploy Program Tx Hash:", txHash);

      const result = await Tx.confirm(txHash, conn);
      if (!result?.err) break;
    } catch (e: any) {
      console.log(e.message);
      if (e.message.endsWith("0x0")) {
        await BpfLoaderUpgradeable.closeBuffer(conn, walletKp, bufferKp.publicKey);

        throw new Error("Incorrect program id.");
      } else if (e.message.endsWith("0x1")) {
        // Not enough balance
        await BpfLoaderUpgradeable.closeBuffer(conn, walletKp, bufferKp.publicKey);

        throw new Error(
          "Make sure you have enough SOL to complete the deployment."
        );
      }

      await Common.sleep(sleepAmount);
      sleepAmount *= SLEEP_MULTIPLIER;
    }
  }

  // Most likely the user doesn't have the upgrade authority
  if (!txHash) {
    await BpfLoaderUpgradeable.closeBuffer(conn, walletKp, bufferKp.publicKey);

    throw new Error();
  }

  return { txHash };
};

async function main(){
  await processDeploy()
}

main()
