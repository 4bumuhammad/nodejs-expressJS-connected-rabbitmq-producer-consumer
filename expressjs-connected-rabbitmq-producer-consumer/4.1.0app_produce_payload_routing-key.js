const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3003;

// RabbitMQ connection config
const rabbitMQConfig = {
    url: 'amqp://guest:guest@localhost:5673',
    exchange: 'order_exchange', 
    queue: 'order_queue',
    routingKey: 'order.created',
};


// Sample payloads
const payloads = [
    {
        "order_id": "ABC123",
        "customer_name": "Sheikh Saleh Al-Talib",
        "items": [
            {
                "id": "item1",
                "name": "Product 1",
                "quantity": 2
            },
            {
                "id": "item2",
                "name": "Product 2",
                "quantity": 1
            }
        ],
        "total_price": 50.00
    },
    // Tambahkan payloads lainnya di sini jika diperlukan
];

// Function to publish a payload to RabbitMQ
async function publishToRabbitMQ(payload) {
    try {
        const connection = await amqp.connect(rabbitMQConfig.url);
        const channel = await connection.createChannel();
        await channel.assertExchange(rabbitMQConfig.exchange, 'topic', { durable: true });
        const queueResult = await channel.assertQueue(rabbitMQConfig.queue);
        // Bind queue with the routing key
        await channel.bindQueue(
            queueResult.queue,
            rabbitMQConfig.exchange,
            rabbitMQConfig.routingKey
        );        

        await channel.publish(rabbitMQConfig.exchange, rabbitMQConfig.routingKey, Buffer.from(JSON.stringify(payload)));
        console.log(`Payload sent to RabbitMQ: ${JSON.stringify(payload, null, 2)}`);
        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing payload to RabbitMQ:', error);
    }
}

// Route to send payloads to RabbitMQ
app.get('/send-payloads', (req, res) => {
    payloads.forEach(payload => {
        publishToRabbitMQ(payload);
    });
    res.send('Payloads sent to RabbitMQ');
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
