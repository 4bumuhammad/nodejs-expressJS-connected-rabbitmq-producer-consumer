const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3001;

// RabbitMQ Configuration
const rabbitMQConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  exchange: 'order_exchange',
  queue: 'order_queue',
  routingKey: 'order.created',
};

async function consumeMessage() {
  try {
    const connection = await amqp.connect(rabbitMQConfig.url);
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });

    const channel = await connection.createChannel();

    await channel.assertExchange(rabbitMQConfig.exchange, 'topic');
    const queueResult = await channel.assertQueue(rabbitMQConfig.queue);

    // Bind queue with the routing key
    await channel.bindQueue(
      queueResult.queue,
      rabbitMQConfig.exchange,
      rabbitMQConfig.routingKey
    );

    console.log('Waiting for messages...');

    channel.consume(queueResult.queue, (message) => {
      const order = JSON.parse(message.content.toString());
      console.log('Received order:', order);
      // Perform the desired processing here

      // Acknowledge that the message has been consumed
      channel.ack(message);
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
