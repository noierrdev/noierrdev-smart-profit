require("dotenv").config()

const {Connection, PublicKey, Keypair}=require("@solana/web3.js")
const fs=require('fs')
const path=require('path')
const WebSocket = require('ws');
const { pumpfunSwapTransactionFaster, swapTokenAccounts, swapPumpfunFaster, swapTokenFastest, swapTokenFastestWallet, pumpfunSwapTransactionFasterWallet, swapTokenAccountsWallet, swapPumpfunFasterWallet } = require("./swap");
const { getAssociatedTokenAddressSync } = require("@solana/spl-token");

const { getSwapMarket, getSwapMarketFaster } = require("./utils");
const Client=require("@triton-one/yellowstone-grpc");
const bs58=require("bs58")

if(!fs.existsSync(path.resolve(__dirname,"logs"))){
    fs.mkdirSync(path.resolve(__dirname,"logs"));
}

var wallets=fs.readdirSync(path.resolve(__dirname,"wallets"));
setInterval(() => {
    wallets=fs.readdirSync(path.resolve(__dirname,"wallets"));
}, 500);

const connection=new Connection(process.env.RPC_API);

const PUMPFUN_RAYDIUM_MIGRATION="39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
const RAYDIUM_OPENBOOK_AMM="675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
const PUMPFUN_BONDINGCURVE="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
const RAYDIUM_AUTHORITY="5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
const BSD_CONTRACT="BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW"
const MINT_CONTRACT="minTcHYRLVPubRK8nt6sqe2ZpWrGDLQoNLipDJCGocY"

const PRIVATE_KEY =new  Uint8Array(JSON.parse(process.env.PRIVATE_KEY));
const wallet = Keypair.fromSecretKey(PRIVATE_KEY);

// const bot = new Bot(process.env.TELEGRAM_TOKEN);
// bot.start()

function connectWebsocket(){
    var ws = new WebSocket(process.env.RPC_WEBSOCKET);
    function sendRequest(ws) {
        const request = {
            jsonrpc: "2.0",
            id: 420,
            method: "transactionSubscribe",
            params: [
                {   failed: false,
                    accountInclude: [PUMPFUN_BONDINGCURVE,RAYDIUM_OPENBOOK_AMM]
                },
                {
                    commitment: "processed",
                    encoding: "jsonParsed",
                    transactionDetails: "full",
                    maxSupportedTransactionVersion: 0
                }
            ]
        };
        ws.send(JSON.stringify(request));
    }
    
    
    ws.on('open', function open() {
        console.log('WebSocket is open');
        sendRequest(ws);
    });
    
    ws.on('message', async function incoming(data) {
        
        try {

            const messageStr = data.toString('utf8');

            const messageObj = JSON.parse(messageStr);
    
            const result = messageObj.params.result;
            
            const signature = result.signature; // Extract the signature
            
            const allAccounts = result.transaction.transaction.message.accountKeys.map(ak => ak.pubkey);

            var listed=false;
            const signers=result.transaction.transaction.message.accountKeys.filter(ak=>ak.signer==true).map(ak=>{
                if((!listed)&&(wallets.includes(ak.pubkey))) listed=true;
                return ak.pubkey
            });

            if(!listed) return;

            console.log(`https://solscan.io/tx/${signature}`)
            const SOLBalanceChange=result.transaction.meta.postBalances[0]-result.transaction.meta.preBalances[0]
            console.log({SOLBalanceChange})
            const userPreWSOLBalance=result.transaction.meta.preTokenBalances.find(ba=>((ba.mint==SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
            const userPostWSOLBalance=result.transaction.meta.postTokenBalances.find(ba=>((ba.mint==SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
            const WSOLBalChange=userPostWSOLBalance?(userPostWSOLBalance.uiTokenAmount.uiAmount-(userPreWSOLBalance?userPreWSOLBalance.uiTokenAmount.uiAmount:0)):(0-userPreWSOLBalance?userPreWSOLBalance.uiTokenAmount.uiAmount:0);
            console.log({WSOLBalChange})
            const userPreTokenBalance=result.transaction.meta.preTokenBalances.find(ba=>((ba.mint!=SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
            const userPostTokenBalance=result.transaction.meta.postTokenBalances.find(ba=>((ba.mint!=SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
            console.log({userPreTokenBalance,userPostTokenBalance})

            if((!userPreTokenBalance)&&(!userPostTokenBalance)) {
                console.log("!!!!!===NOT SWAP TX===!!!!!");
                return;
            }
            
            const targetToken=userPreTokenBalance?userPreTokenBalance.mint:userPostTokenBalance.mint;
            console.log({targetToken})

            const userTokenBalanceChange=userPostTokenBalance?(userPostTokenBalance.uiTokenAmount.uiAmount-(userPreTokenBalance?userPreTokenBalance.uiTokenAmount.uiAmount:0)):(0-userPreTokenBalance?userPreTokenBalance.uiTokenAmount.uiAmount:0);
            console.log(userTokenBalanceChange)

            if(userTokenBalanceChange==0){
                console.log(":::!!!NOT SWAPPING!!!:::")
            }

            if(accountKeys.includes(RAYDIUM_OPENBOOK_AMM)){
                const swapInstruction=(result.transaction?.transaction.message.instructions).find(instruction =>instruction.programId==RAYDIUM_OPENBOOK_AMM);
                console.log(swapInstruction)
                if(swapInstruction){
                    if(userTokenBalanceChange>0){
                        console.log(`::::BUY:::::`)
                        await swapTokenAccounts(connection,targetToken,swapInstruction.accounts,0.1,false);
                        await bot.api.sendMessage(`noierrdevcopytrading_channel`,`<b>Raydium copied!</b>\n<code>${signers[0]}</code>\n<a href="https://solscan.io/tx/${signature}" >Photon</a>`,{parse_mode:"HTML",link_preview_options:{is_disabled:true}})
                    }else{
                        console.log(`::::SELL::::`);
                        await swapTokenAccounts(connection,targetToken,swapInstruction.accounts,0.1,true);
                    }
                }else{
                    const swapMarket=await getSwapMarketFaster(connection,targetToken);
                    if(userTokenBalanceChange>0){
                        console.log(`::::BUY:::::`)
                        await swapTokenFastest(connection,targetToken,swapMarket.poolKeys,0.1,false);
                        // await bot.api.sendMessage(`noierrdevcopytrading_channel`,`<b>Raydium copied!</b>\n<code>${signers[0]}</code>\n<a href="https://solscan.io/tx/${signature}" >Photon</a>`,{parse_mode:"HTML",link_preview_options:{is_disabled:true}})
                    }else{
                        console.log(`::::SELL::::`);
                        await swapTokenFastest(connection,targetToken,swapMarket.poolKeys,0.1,true)
                    }
                }
            }
            else if(accountKeys.includes(PUMPFUN_BONDINGCURVE)){
                const swapInstruction=(result.transaction?.transaction.message.instructions).find(instruction =>instruction.programId==PUMPFUN_BONDINGCURVE);
                
                if(swapInstruction){
                    var bondingCurve=null;
                    var bondingCurveVault=null;
                    bondingCurve=swapInstruction?.accounts[3];
                    bondingCurveVault=swapInstruction?.accounts[4];
                    if(userTokenBalanceChange>0){
                        console.log(`::::BUY:::::`)
                        const tokenToBuy=Math.floor(userTokenBalanceChange*((0.1*(10**9))/(0-SOLBalanceChange)))
                        // await swapPumpfunFaster(connection,targetToken,bondingCurve,bondingCurveVault,tokenToBuy,true);
                        await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.1,true);
                    }
                    else {
                        console.log(`::::SELL:::::`)
                        // await swapPumpfunFaster(connection,targetToken,bondingCurve,bondingCurveVault,10000,false);
                        await pumpfunSwapTransactionFasterWallet(connection, wallet,targetToken,0.15,false);
                        
                    }
                }else{
                    if(userTokenBalanceChange>0){
                        console.log(`::::BUY:::::`)
                        // const tokenToBuy=Math.floor(userTokenBalanceChange*((0.1*(10**9))/(0-SOLBalanceChange)))
                        await pumpfunSwapTransactionFasterWallet(connection, wallet,targetToken,0.1,true);
                        // await bot.api.sendMessage(`noierrdevcopytrading_channel`,`<b>Pumpfun copied!</b>\n<code>${signers[0]}</code>\n<a href="https://solscan.io/tx/${signature}" >Photon</a>`,{parse_mode:"HTML",link_preview_options:{is_disabled:true}})
                    }
                    else {
                        console.log(`::::SELL:::::`)
                        await pumpfunSwapTransactionFasterWallet(connection, wallet,targetToken,0.15,false);
                        
                    }
                }
            }

            
        } catch (e) {
            console.log(e)
            console.log(messageStr)
        }
    });
    
    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });
    
    ws.on('close', function close() {
        console.log('WebSocket is closed');
        ws=null
        setTimeout(async () => {
            await connectWebsocket()
        }, 300);
        
    });
    setTimeout(() => {
        ws.close();
    }, 180000);
}

// connectWebsocket()


function connectGeyser(){
    const client =new Client.default("http://grpc.solanavibestation.com:10000/",undefined,undefined);
    client.getVersion()
    .then(async version=>{
        try {
            console.log(version)
            const request =Client.SubscribeRequest.fromJSON({
                accounts: {},
                slots: {},
                transactions: {
                    pumpfun: {
                        vote: false,
                        failed: false,
                        signature: undefined,
                        accountInclude: [PUMPFUN_BONDINGCURVE, RAYDIUM_OPENBOOK_AMM],
                        accountExclude: [],
                        accountRequired: [],
                    },
                },
                transactionsStatus: {},
                entry: {},
                blocks: {},
                blocksMeta: {},
                accountsDataSlice: [],
                ping: undefined,
                commitment: Client.CommitmentLevel.PROCESSED
            })
        
            const stream =await client.subscribe();
            stream.on("data", async (data) => {
                if(data.transaction&&data.transaction.transaction&&data.transaction.transaction.signature) {
                        const transaction=data.transaction.transaction;
                        const sig=bs58.encode(data.transaction.transaction.signature)
                        const allAccounts=[];
                        var detected=false;
                        transaction.transaction.message.accountKeys.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            if((!detected)&&wallets.includes(accountID)) detected=true;
                            allAccounts.push(accountID);
                        })
                        transaction.meta.loadedWritableAddresses.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            allAccounts.push(accountID);
                        })
                        transaction.meta.loadedReadonlyAddresses.map((account,index)=>{
                            if(!account) return;
                            const accountID=bs58.encode(account);
                            allAccounts.push(accountID);
                        })

                        if(!detected) return;
                        const signers=[allAccounts[0]]
                        if(allAccounts.includes(PUMPFUN_BONDINGCURVE)||allAccounts.includes(RAYDIUM_OPENBOOK_AMM)){
                            
                            const SOLBalanceChange=transaction.meta.postBalances[0]-transaction.meta.preBalances[0]
                            // console.log({SOLBalanceChange})
                            const userPreWSOLBalance=transaction.meta.preTokenBalances.find(ba=>((ba.mint==SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
                            const userPostWSOLBalance=transaction.meta.postTokenBalances.find(ba=>((ba.mint==SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
                            const WSOLBalChange=userPostWSOLBalance?(userPostWSOLBalance.uiTokenAmount.uiAmount-(userPreWSOLBalance?userPreWSOLBalance.uiTokenAmount.uiAmount:0)):(0-userPreWSOLBalance?userPreWSOLBalance.uiTokenAmount.uiAmount:0);
                            // console.log({WSOLBalChange})
                            const userPreTokenBalance=transaction.meta.preTokenBalances.find(ba=>((ba.mint!=SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
                            const userPostTokenBalance=transaction.meta.postTokenBalances.find(ba=>((ba.mint!=SOL_MINT_ADDRESS)&&(ba.owner==signers[0])));
                            // console.log({userPreTokenBalance,userPostTokenBalance});

                            if((!userPreTokenBalance)&&(!userPostTokenBalance)) {
                                // console.log("!!!!!===NOT SWAP TX===!!!!!");
                                return;
                            }
                            
                            const targetToken=userPreTokenBalance?userPreTokenBalance.mint:userPostTokenBalance.mint;
                            // console.log({targetToken})
                            if(!targetToken) return;
                            if(fs.existsSync(path.resolve(__dirname,"logs",targetToken))){
                                return;
                            }
                            fs.appendFileSync(path.resolve(__dirname,"logs",targetToken),"")

                
                            const userTokenBalanceChange=userPostTokenBalance?(userPostTokenBalance.uiTokenAmount.uiAmount-(userPreTokenBalance?userPreTokenBalance.uiTokenAmount.uiAmount:0)):(0-userPreTokenBalance?userPreTokenBalance.uiTokenAmount.uiAmount:0);
                            // console.log(userTokenBalanceChange)
                
                            if(userTokenBalanceChange==0){
                                // console.log(":::!!!NOT SWAPPING!!!:::");
                            }
                
                            if(allAccounts.includes(RAYDIUM_OPENBOOK_AMM)){
                                const swapInstruction=(transaction?.transaction.message.instructions).find(instruction =>instruction.programId==RAYDIUM_OPENBOOK_AMM);
                                console.log(swapInstruction)
                                if(swapInstruction){
                                    if(userTokenBalanceChange>0){
                                        console.log(`https://solscan.io/tx/${sig}`)
                                        console.log(`::::BUY:::::`)
                                        await swapTokenAccountsWallet(connection,wallet,targetToken,swapInstruction.accounts,0.1,false);
                                    }
                                }else{
                                    const swapMarket=await getSwapMarketFaster(connection,targetToken);
                                    if(userTokenBalanceChange>0){
                                        console.log(`https://solscan.io/tx/${sig}`)
                                        console.log(`::::BUY:::::`)
                                        await swapTokenFastestWallet(connection,wallet,swapMarket.poolKeys, 0.1,false)
                                    }
                                }
                            }
                            else if(allAccounts.includes(PUMPFUN_BONDINGCURVE)){
                                const swapInstruction=(transaction?.transaction.message.instructions).find(instruction =>instruction.programId==PUMPFUN_BONDINGCURVE);
                                
                                if(swapInstruction){
                                    var bondingCurve=null;
                                    var bondingCurveVault=null;
                                    bondingCurve=swapInstruction?.accounts[3];
                                    bondingCurveVault=swapInstruction?.accounts[4];
                                    if(userTokenBalanceChange>0){
                                        console.log(`https://solscan.io/tx/${sig}`)
                                        console.log(`::::BUY:::::`)
                                        // const tokenToBuy=Math.floor(userTokenBalanceChange*((0.01*(10**9))/(0-SOLBalanceChange)))
                                        var result=await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        // while(result!=true){
                                        //     await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.01,true);
                                        // }
                                        pumpfunSellProcess(targetToken)
                                    }
                                }else{
                                    if(userTokenBalanceChange>0){
                                        console.log(`https://solscan.io/tx/${sig}`)
                                        console.log(`::::BUY:::::`)
                                        var result=await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        if(result!=true) await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.001,true);
                                        // while(result!=true){
                                        //     await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.01,true);
                                        // }
                                        pumpfunSellProcess(targetToken)
                                    }
                                }
                            }

                        }


                }
            });
            await new Promise((resolve, reject) => {
                stream.write(request, (err) => {
                    if (err === null || err === undefined) {
                    resolve();
                    } else {
                    reject(err);
                    }
                });
            }).catch((reason) => {
                console.error(reason);
                throw reason;
            });
        } catch (error) {
            console.log(error)
            console.log("RECONNECTING!!!")
            setTimeout(() => {
                connectGeyser()
            }, 2000);
            
        }

    });
}
function pumpfunSellProcess(targetToken){
    var timer=0
    var intervalId=setInterval(async() => {
        if(timer>12) {
            clearInterval(intervalId)
            await pumpfunSwapTransactionFasterWallet(connection,wallet,targetToken,0.0001,false);
        }
        console.log(targetToken)
        timer++;
    }, 1000);
}
connectGeyser()