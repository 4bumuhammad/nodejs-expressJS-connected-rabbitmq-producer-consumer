const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3004;

app.use(express.json());

const rabbitMQConfig = {
    url: 'amqp://guest:guest@localhost:5673',
    exchange: 'order_exchange', 
    queue: 'order_queue',
    routingKey: 'order.created',
};

// Function to publish a payload to RabbitMQ
async function publishToRabbitMQ(payload) {
    try {
        const connection = await amqp.connect(rabbitMQConfig.url);
        const channel = await connection.createChannel();
        await channel.assertExchange(rabbitMQConfig.exchange, 'topic', { durable: true });
        
        const queueResult = await channel.assertQueue(rabbitMQConfig.queue);
        await channel.bindQueue(
            queueResult.queue,
            rabbitMQConfig.exchange,
            rabbitMQConfig.routingKey
        );        

        // Check if the payload is an object or a string
        if (typeof payload === 'object') {
            await channel.publish(rabbitMQConfig.exchange, rabbitMQConfig.routingKey, Buffer.from(JSON.stringify(payload)));
            console.log(`Payload sent to RabbitMQ: ${JSON.stringify(payload, null, 2)}`);
        } else if (typeof payload === 'string') {
            await channel.sendToQueue(rabbitMQConfig.queue, Buffer.from(payload));
            console.log(`Message sent to RabbitMQ: ${payload}`);
        } else {
            throw new Error('Invalid payload type.');
        }

        await channel.close();
        await connection.close();
    } catch (error) {
        console.error('Error publishing payload to RabbitMQ:', error);
    }
}

// Sample payloads using Map
const payloads = new Map([
    [1, {
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
    }],
    [2, {
        "order_id": "DEF456",
        "customer_name": "John Doe",
        "items": [
            {
                "id": "item3",
                "name": "Product 3",
                "quantity": 3
            }
        ],
        "total_price": 70.00
    }],
    [3, "Hellooooooooo . . . 1234567890"] // Change payload 3 to a string
]);

// Route to send payloads to RabbitMQ based on selected payload type
app.post('/send-payload', (req, res) => {
    try {
        const payload = req.body.payload;
        if (!payload) {
            throw new Error('Payload not found.');
        }
        publishToRabbitMQ(payload);
        res.send('Payload sent to RabbitMQ');
    } catch (error) {
        console.error('Error sending payload to RabbitMQ:', error);
        res.status(500).send('Failed to send payload to RabbitMQ');
    }
});

// Route to get payload based on selected payload type
app.post('/get-payload', (req, res) => {
    try {
        const payloadType = req.body.payloadType;
        const payload = payloads.get(payloadType);
        if (!payload) {
            throw new Error('Invalid payload type.');
        }
        res.json(payload);

    } catch (error) {
        console.error('Error getting payload:', error);
        res.status(500).send('Failed to get payload');
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/html_FE/index4.2.1.html');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
