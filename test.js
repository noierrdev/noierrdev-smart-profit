require("dotenv").config()

const { Connection, Keypair } = require("@solana/web3.js");
const { pumpfunSwapTransactionFasterWallet } = require("./swap");

const PRIVATE_KEY =new  Uint8Array(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);
const connection=new Connection(process.env.RPC_API)
function pumpfunSellProcess(targetToken){
    var timer=0
    var intervalId=setInterval(async () => {
        if(timer>12) {
            clearInterval(intervalId)
            await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.0001,false);
        }
        console.log(targetToken)
        timer++;
    }, 1000);
}
const targetToken="6XMkPq48AQ5i9kJ91eHtjJ44ypju4NLeerbu42Xtpump"
setTimeout(async() => {
    await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.0001,true);
    pumpfunSellProcess(targetToken)
}, 0);