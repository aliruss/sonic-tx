const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const connection = new web3.Connection('https://devnet.sonic.game', 'confirmed');

const privateKey = process.env.PRIVATE_KEY;
const recipientAddress = process.env.RECIPIENT_ADDRESS;

if (!privateKey || !recipientAddress) {
  console.error('Missing PRIVATE_KEY or RECIPIENT_ADDRESS in the .env file');
  process.exit(1);
}

const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
const recipientPublicKey = new web3.PublicKey(recipientAddress);

const sol = 1000000000;
const lamportsToSend = Math.floor(0.0001 * sol); // Convert SOL to lamports

const maxTransactions = 102; // Set the maximum number of transactions
let transactionCount = 0; // Initialize transaction counter

const getRandomDelay = () => {
  // Generate a random delay between 15 and 20 seconds
  return Math.floor(Math.random() * 6 + 15) * 1000;
};

const transferToRecipient = async () => {
  try {
    const balanceMainWallet = await connection.getBalance(fromWallet.publicKey);
    const balanceLeft = balanceMainWallet - lamportsToSend;

    if (balanceLeft < 0) {
      console.log('Not enough balance to transfer');
    } else {
      console.log(`Transaction ${transactionCount + 1}: Wallet A balance: ${balanceMainWallet}`);

      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: fromWallet.publicKey,
          toPubkey: recipientPublicKey,
          lamports: lamportsToSend,
        })
      );

      const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromWallet]);
      console.log(`Transfer signature for transaction ${transactionCount + 1}: ${signature}`);

      const balanceOfWalletB = await connection.getBalance(recipientPublicKey);
      console.log(`Wallet B balance after transaction ${transactionCount + 1}: ${balanceOfWalletB}`);
    }

    transactionCount += 1;

    if (transactionCount < maxTransactions) {
      const delay = getRandomDelay();
      console.log(`Next transfer in ${delay / 1000} seconds`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      transferToRecipient(); // Recursive call for continuous transfers
    } else {
      console.log('Reached maximum transaction count. Restarting in 24 hours...');
      await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000)); // Wait for 24 hours
      transactionCount = 0; // Reset transaction counter
      transferToRecipient(); // Restart transfers
    }
  } catch (error) {
    console.error('Error during transfer:', error.message);
  }
};

transferToRecipient();
