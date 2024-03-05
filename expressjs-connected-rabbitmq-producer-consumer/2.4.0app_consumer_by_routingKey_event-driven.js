const express = require('express');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid'); // Import UUID module
const moment = require('moment-timezone');

const app = express();
const port = 3001;

// RabbitMQ Configuration
const rabbitMQConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  exchange: 'order_exchange',
  queue: 'order_queue',
  routingKey: 'order.created',
  rejectedExchange: 'rejected_exchange', // New exchange for rejected messages
};

// Function to generate timestamp in Asia/Jakarta timezone
function generateTimestamp() {
  return moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
}

async function consumeMessage() {
  try {
    const connection = await amqp.connect(rabbitMQConfig.url);
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    const channel = await connection.createChannel();

    // Assert the exchange
    await channel.assertExchange(rabbitMQConfig.exchange, 'topic');
    // Assert the rejected exchange
    await channel.assertExchange(rabbitMQConfig.rejectedExchange, 'fanout');

    const queueResult = await channel.assertQueue(rabbitMQConfig.queue);

    // Bind queue with the routing key
    await channel.bindQueue(
      queueResult.queue,
      rabbitMQConfig.exchange,
      rabbitMQConfig.routingKey
    );

    await channel.bindQueue(
      queueResult.queue,
      rabbitMQConfig.rejectedExchange
    );


    console.log('Waiting for messages...');

    channel.consume(queueResult.queue, async (message) => {
      try {
        const order = JSON.parse(message.content.toString());
        console.log('Received order:', JSON.stringify(order, null, 2));
        // Perform the desired processing here

        // Acknowledge that the message has been consumed
        channel.ack(message);
      } catch (error) {
        const status = !channel ? "Consumer is not available" : "Error processing message";
        const notes = !channel ? "Consumer is not available. Failed to process message." : "Error processing message, message left in the queue";

        console.error(status + ':', notes);
        // Pangkas konten pesan jika melebihi 100 karakter atau 2 baris
        let trimmedMessageContent = message.content.toString().trim();
        if (trimmedMessageContent.length > 100 || trimmedMessageContent.split('\r\n').length > 2) {
            trimmedMessageContent = trimmedMessageContent.substring(0, 100) + ' ...';
        }        

        // Publikasikan muatan yang ditolak ke rejected exchange
        const timestamp = generateTimestamp();
        const id = uuidv4(); 
        const rejectedPayload = JSON.stringify({
          "id": id,
          "timestamp": timestamp,
          "status": status,
          "message": trimmedMessageContent,
          "keterangan": notes
        });

        await channel.publish(
          rabbitMQConfig.rejectedExchange,
          '',
          Buffer.from(rejectedPayload)
        );

        // Acknowledge pesan asli untuk menghapusnya dari antrean
        channel.ack(message);
      }
    });
  } catch (error) {
    console.error('Error consuming message:', error);
  }
}

consumeMessage();

// Start the server
app.listen(port, () => {
  console.log(`Consumer service running on port ${port}`);
});
