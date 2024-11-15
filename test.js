const { Keypair, Connection } = require("@solana/web3.js");
const {  swapPumpfunFasterWalletHidden } = require("./swap");

require("dotenv").config();
const connection=new Connection(process.env.RPC_API)
const PRIVATE_KEY =new  Uint8Array(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);

const targetToken="9Z79XWVNpGKnaQ4Tiv5KWQFEhrC1g8SCyoLr44UBkKX"
const bondingCurve="3mm3P9fC899FzM5BQrt5SQRyMZD5aeFS9ywxUDMLW4cK"
const bondingCurveVault="5masFP6hcRRaqYp92pGkGi8zQj1WSxXZj9iVg8vP1kcT"
const newWallet=Keypair.generate();
console.log(newWallet.publicKey.toBase58())
setTimeout(async () => {
    // await swapPumpfunFasterWallet(connection,wallet,targetToken,bondingCurve,bondingCurveVault,100,false)
}, 0);