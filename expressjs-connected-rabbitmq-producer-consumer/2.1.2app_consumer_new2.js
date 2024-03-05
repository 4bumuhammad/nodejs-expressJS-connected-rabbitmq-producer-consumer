const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3001;

// RabbitMQ connection config
const rabbitMQConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  queue: 'order_queue',
};

async function consumeMessage() {
  try {
    const connection = await amqp.connect(rabbitMQConfig.url);
    const channel = await connection.createChannel();

    await channel.assertQueue(rabbitMQConfig.queue);

    channel.consume(rabbitMQConfig.queue, async (message) => {
      try {

          const payload = message.content.toString();
          const order = JSON.parse(payload);
          console.log('Received message:', payload); // Log the message content

          // Perform your processing here
          console.log('Received order:', JSON.stringify(order, null, 2)); // Print the order with formatting

          // Acknowledge the message after processing
          await channel.ack(message);

      } catch (error) {

          console.error('Invalid JSON format, message left in the queue');
          // Requeue the message if it is not valid JSON format

          await channel.reject(message, true); // true means requeue

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
