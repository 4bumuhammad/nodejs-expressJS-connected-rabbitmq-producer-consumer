const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3001;

// Koneksi RabbitMQ
const rabbitMQConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  queue: 'order_queue',
};

async function consumeMessage() {
  try {
    
    const connection = await amqp.connect(rabbitMQConfig.url);
    const channel = await connection.createChannel();

    await channel.assertQueue(rabbitMQConfig.queue);
    channel.consume(rabbitMQConfig.queue, (message) => {

        const order = JSON.parse(message.content.toString());
        console.log('Received order:', JSON.stringify(order, null, 2)); // Print the order with formatting
        // Lakukan proses sesuai kebutuhan

        // Konfirmasi pesan telah dikonsumsi
        channel.ack(message);

    });
  } catch (error) {

      console.error('Error consuming message:', error);

  }
}

consumeMessage();

// Menjalankan server
app.listen(port, () => {
  console.log(`Consumer service running on port ${port}`);
});
