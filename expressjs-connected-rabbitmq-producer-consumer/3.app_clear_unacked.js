const express = require('express');
const amqp = require('amqplib');
const moment = require('moment-timezone');

const app = express();
const port = 3002;

// RabbitMQ connection config
const rabbitMQConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  queue: 'order_queue',
};

// Function to generate timestamp in Asia/Jakarta timezone
function generateTimestamp() {
  return moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
}

let noUnackedCount = 0; // variabel untuk melacak jumlah pesan "No unacked messages found." yang ditampilkan
let isSuspending = false; // flag untuk menandai apakah proses sedang dalam penundaan

async function clearUnackedMessages() {
  try {
    const connection = await amqp.connect(rabbitMQConfig.url);
    const channel = await connection.createChannel();
    const queue = rabbitMQConfig.queue;

    let messageFound = false;

    let message;
    do {
      if (!isSuspending) { // hanya mengambil pesan jika tidak dalam penundaan
        message = await channel.get(queue, { noAck: false });
      } else {
        message = null; // jika dalam penundaan, set pesan menjadi null
      }

      if (message) {
        messageFound = true;
        noUnackedCount = 0; 

        const currentTimeStart = generateTimestamp();
        console.log(`[${currentTimeStart}] Clearing message from unacked: ${message.content.toString()}`);
        await channel.ack(message);
      }
    } while (message);

    if (!messageFound) {
      noUnackedCount++;       
      
      if (noUnackedCount <= 3) { 
        const currentTime = generateTimestamp();
        console.log(`[${currentTime}] No unacked messages found.`);
        if (noUnackedCount === 3) {  
          isSuspending = true; // set flag penundaan

          const currentTimeStart = generateTimestamp();
          console.log(`[${currentTimeStart}] Temporary suspension of unacked message checking process.`);
          await new Promise(resolve => setTimeout(resolve, 55000)); // Suspend for n seconds
  
          noUnackedCount = 0; // Reset counter after suspension
          const currentTimeEnd = generateTimestamp();
          console.log(`[${currentTimeEnd}] Resuming unacked message checking process.`);;
          isSuspending = false; // reset flag penundaan setelah penundaan selesai
        }
      }  

    } else {
      const currentTimeEnd = generateTimestamp();
      console.log(`[${currentTimeEnd}] All unacked messages cleared.`);
    }

    await channel.close();
    await connection.close();
  } catch (error) {
    console.error('Error clearing unacked messages:', error);
  }
}


setInterval(clearUnackedMessages, 10000);

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
