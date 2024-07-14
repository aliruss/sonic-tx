const web3 = require('@solana/web3.js');
const bs58 = require('bs58');
const readline = require('readline');

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt the user for input
const promptUser = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const main = async () => {
  // Prompt the user for the private key, recipient address, and pause hour
  const privateKey = await promptUser('Enter your private key: ');
  const recipientAddress = await promptUser('Enter the recipient address: ');
  let pauseHour = await promptUser('Enter the hour (UTC) to pause until the next day (default is 1 AM): ');

  // Set default hour to 1 AM if no input is provided
  if (!pauseHour) {
    pauseHour = 1;
  } else {
    pauseHour = parseInt(pauseHour, 10);
  }

  rl.close();

  const connection = new web3.Connection('https://devnet.sonic.game', 'confirmed');

  const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(privateKey));
  const recipientPublicKey = new web3.PublicKey(recipientAddress);

  const sol = 1000000000;
  const lamportsToSend = Math.floor(0.0001 * sol); // Convert SOL to lamports

  let successfulTransactions = 0;

  const getRandomDelay = () => {
    // Generate a random delay between 15 and 20 seconds
    return Math.floor(Math.random() * 6 + 15) * 1000;
  };

  const getDelayUntilNextDayHourUTC = (hour) => {
    const now = new Date();
    const nextDayHourUTC = new Date(now);
    nextDayHourUTC.setUTCDate(now.getUTCDate() + 1);
    nextDayHourUTC.setUTCHours(hour, 0, 0, 0);
    return nextDayHourUTC - now;
  };

  const transferToRecipient = async () => {
    try {
      const balanceMainWallet = await connection.getBalance(fromWallet.publicKey);
      const balanceLeft = balanceMainWallet - lamportsToSend;

      if (balanceLeft < 0) {
        console.log('Not enough balance to transfer');
      } else {
        console.log('Wallet A balance:', balanceMainWallet);

        const transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: fromWallet.publicKey,
            toPubkey: recipientPublicKey,
            lamports: lamportsToSend,
          })
        );

        const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromWallet]);
        console.log('Transfer signature:', signature);

        const balanceOfWalletB = await connection.getBalance(recipientPublicKey);
        console.log('Wallet B balance:', balanceOfWalletB);

        successfulTransactions += 1;
        console.log(`Successful transactions: ${successfulTransactions}`);
      }

      if (successfulTransactions >= 103) {
        const delayUntilNextDayHourUTC = getDelayUntilNextDayHourUTC(pauseHour);
        console.log(`Pausing until next day at ${pauseHour}:00 UTC (${delayUntilNextDayHourUTC / 1000} seconds)`);
        await new Promise((resolve) => setTimeout(resolve, delayUntilNextDayHourUTC));
        successfulTransactions = 0; // Reset the counter for the next day
      } else {
        const delay = getRandomDelay();
        console.log(`Next transfer in ${delay / 1000} seconds`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        transferToRecipient(); // Recursive call for continuous transfers
      }
    } catch (error) {
      console.error('Error during transfer:', error.message);
    }
  };

  transferToRecipient();
};

main();
