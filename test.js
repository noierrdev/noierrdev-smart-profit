const { Keypair, Connection } = require("@solana/web3.js");
const {  swapPumpfunFasterWalletHidden, swapPumpfunFasterWalletStaked, pumpfunSwapTransactionFasterWalletStaked } = require("./swap");

require("dotenv").config();
const connection=new Connection(process.env.RPC_API)
const stakedConnection=new Connection(process.env.STAKED_RPC)
const PRIVATE_KEY =new  Uint8Array(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);

const targetToken="9C37Zbi64X79F8MS5gqZEDMTgakbbia1MmhV1qXypump"
const bondingCurve="27oQPzyhPkC6KrwiwshGNcCFy4KLU2ZWfQB6snxVUDNC"
const bondingCurveVault="CCpGAWoxfq44J9FjoFacxNiGQHj4T8tVJ3ufbWfaUc1C"
// const newWallet=Keypair.generate();
// console.log(newWallet.publicKey.toBase58())
setTimeout(async () => {
    // await swapPumpfunFasterWallet(connection,wallet,targetToken,bondingCurve,bondingCurveVault,100,false)
    // await swapPumpfunFasterWalletStaked(connection,stakedConnection,wallet,targetToken,bondingCurve,bondingCurveVault,1000,true)
    await pumpfunSwapTransactionFasterWalletStaked(connection,stakedConnection,wallet,"4Ytr27KmCYWK16pxEA2Fr7xGRVvwctf6Dj6sHLrApump",0.1,false)
}, 0);