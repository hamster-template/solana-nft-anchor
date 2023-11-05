import * as fs from 'fs';
import {
  Keypair,
  Connection,
  clusterApiUrl
} from "@solana/web3.js";

async function main() {

  let secret

  const secertfile = './file.json'
  await fs.promises.readFile(secertfile)
    .then((data: Buffer) => {
      const str = data.toString('utf8')
      secret = JSON.parse(str) as number[]
    })
    .catch((err: NodeJS.ErrnoException) => {
      console.error(`Error reading the file: ${err}`)
    })

  const uint8Array = new Uint8Array(secret)
  const bufferKp = Keypair.fromSecretKey(uint8Array)
  const addr = bufferKp.publicKey.toString()
  console.log("bufferKpAddr: ", addr)

  const conn = new Connection(clusterApiUrl('devnet'))

  const gap = 1000
  let runs = 20 * 1000 / gap

  const _loop = setInterval(async () => {
    --runs
    const bufferInit = await conn.getAccountInfo(bufferKp.publicKey)
    console.log(runs)

    if (bufferInit) {
      console.log(/bufferInit/)
      console.log(bufferInit)
      console.log(/bufferInit/)
      clearInterval(_loop)
    }
    if (runs == 0) {
      clearInterval(_loop)
    }
  }, gap)

}

main()
