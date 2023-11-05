import * as fs from 'fs';
import {
  Keypair,
} from "@solana/web3.js";

function main() {
  const bufferKp = Keypair.generate()
  const privKey = bufferKp.secretKey.toString()
  const bufferWallet = bufferKp.publicKey.toString()
  const filePath: string = `${bufferWallet}.json`

  fs.writeFile(filePath, privKey, (err: NodeJS.ErrnoException | null) => {
    if (err) {
      console.error('Error writing to the file: ', err)
    } else {
      console.log('Data has been written to the file successfully')
      console.log(`${filePath} created successfully`)
    }
  });

}

main()
