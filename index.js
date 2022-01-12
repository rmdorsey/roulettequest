const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const { Keypair, PublicKey } = require('@solana/web3.js');

const {getWalletBalance,transferSOL,airDropSol}=require("./solana");
const { getReturnAmount, totalAmtToBePaid, randomNumber } = require('./helper');

const init = () => {
    console.log(
        chalk.green(
        figlet.textSync("DORSEY'S", {
            font: "Standard",
            horizontalLayout: "default",
            verticalLayout: "default"
        })
        )
    );
    console.log(chalk.yellow`The max bidding amount is 2.5 SOL here`);
};

const userSecretKey=[
    87, 112, 174, 228,   4,  73,  32,  45,  35,   8,  72,
    38, 218, 235, 152,  15, 199, 216, 243,  74, 192,  10,
    98, 233,  57, 132,  75, 163,  78,   7, 255, 190, 168,
    10,  81,  91, 184, 238, 151, 210,  55, 218, 222,   5,
   147,  48, 195, 176,  89, 195, 157, 144, 111, 186,  60,
   239, 162, 195,  65,  59, 191,  15,  75, 180
];
const userWallet=Keypair.fromSecretKey(Uint8Array.from(userSecretKey));

//Treasury
const secretKey=[
    91, 241, 238, 249, 185,  71, 195, 163, 197,  82, 191,
    32,  28,  62,  86, 190, 245,  76, 105, 235, 123,  89,
    15,  83, 164, 114, 240, 234,  87,  14, 109, 102,  29,
   131, 179,  25,  83, 165, 230,  59,  12,  92, 131, 132,
   189,  33, 184,  26, 125, 213,  97,   1,  73, 117, 122,
    52,  39,  29, 163,  39,  23, 218, 172, 178
];
const treasuryWallet=Keypair.fromSecretKey(Uint8Array.from(secretKey));

const askQuestions = () => {
    const questions = [
        {
            name: "SOL",
            type: "number",
            message: "What is the amount of SOL you want to stake?",
        },
        {
            type: "rawlist",
            name: "RATIO",
            message: "What is the ratio of your staking?",
            choices: ["1:1.25", "1:1.5", "1:1.75", "1:2"],
            filter: function(val) {
                const stakeFactor=val.split(":")[1];
                return stakeFactor;
            },
        },
        {
            type:"number",
            name:"RANDOM",
            message:"Guess a random number from 1 to 5 (both 1, 5 included)",
            when:async (val)=>{
                if(parseFloat(totalAmtToBePaid(val.SOL))>5){
                    console.log(chalk.red`You have violated the max stake limit. Stake with smaller amount.`)
                    return false;
                }else{
                    // console.log("In when")
                    console.log(`You need to pay ${chalk.green`${totalAmtToBePaid(val.SOL)}`} to move forward`)
                    const userBalance=await getWalletBalance(userWallet.publicKey.toString())
                    if(userBalance<totalAmtToBePaid(val.SOL)){
                        console.log(chalk.red`You don't have enough balance in your wallet`);
                        return false;
                    }else{
                        console.log(chalk.green`You will get ${getReturnAmount(val.SOL,parseFloat(val.RATIO))} if guessing the number correctly`)
                        return true;    
                    }
                }
            },
        }
    ];
    return inquirer.prompt(questions);
};


const gameExecution=async ()=>{
    init();
    const generateRandomNumber=randomNumber(1,5);
    // console.log("Generated number",generateRandomNumber);
    const answers=await askQuestions();
    if(answers.RANDOM){
        const paymentSignature=await transferSOL(userWallet,treasuryWallet,totalAmtToBePaid(answers.SOL))
        console.log(`Signature of payment for playing the game`,chalk.green`${paymentSignature}`);
        if(answers.RANDOM===generateRandomNumber){
            //AirDrop Winning Amount
            await airDropSol(treasuryWallet,getReturnAmount(answers.SOL,parseFloat(answers.RATIO)));
            //guess is successfull
            const prizeSignature=await transferSOL(treasuryWallet,userWallet,getReturnAmount(answers.SOL,parseFloat(answers.RATIO)))
            console.log(chalk.green`Your guess is absolutely correct`);
            console.log(`Here is the price signature `,chalk.green`${prizeSignature}`);
        }else{
            //better luck next time
            console.log(chalk.yellowBright`Better luck next time`)
        }
    }
}

gameExecution()