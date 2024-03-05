const express = require('express');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid'); // Import UUID module
const moment = require('moment-timezone');

const app = express();
const port = 3001;

// RabbitMQ connection config
const rabbitMQConfig = {
    url: 'amqp://guest:guest@localhost:5673',
    queue: 'order_queue',
    exchange: 'rejected_exchange', // New exchange for rejected messages
};

// Function to generate timestamp in Asia/Jakarta timezone
function generateTimestamp() {
    return moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
}

async function setupConsumer() {
    try {
        const connection = await amqp.connect(rabbitMQConfig.url);
        const channel = await connection.createChannel();
        const queue = rabbitMQConfig.queue;
        const exchange = rabbitMQConfig.exchange;

        await channel.assertQueue(queue);
        await channel.assertExchange(exchange, 'fanout', { durable: true });

        // Bind the queue to the exchange
        await channel.bindQueue(queue, exchange, '');

        // Setup event-driven consumer
        channel.consume(queue, async (message) => {
            if (message !== null) {
                try {
                    const order = JSON.parse(message.content.toString());

                    // Jika exchange tersebut bukan rejected_exchange
                    if (message.fields.exchange !== rabbitMQConfig.exchange) {
                        console.log('Valid JSON format, ready to be consumed.');
                    }

                    console.log('Received order:', JSON.stringify(order, null, 2));

                    // Lakukan proses sesuai kebutuhan
                    await channel.ack(message); // Konfirmasi pesan telah dikonsumsi

                } catch (error) {
                    const status = !channel ? "Consumer is not available" : "Invalid JSON format";
                    const notes = !channel ? "Pesan gagal, konsumen tidak tersedia. Periksa koneksi jaringan atau konfigurasi, ketersediaan sumber daya." : "Pesan gagal, tanpa format JSON terkategori unacked message jika ditolak kembali masuk antrian.";
                    
                    if (!channel) {
                        console.error('Consumer is not available. Failed to process message.');
                    } else {
                        console.error('Invalid JSON format, message left in the queue');
                    }

                    // Ubah pesan yang ditolak ke format JSON yang diinginkan
                    const timestamp = generateTimestamp();
                    const id = uuidv4(); // Generate unique ID using UUID
                    const rejectedPayload = JSON.stringify({
                        "id": id,
                        "timestamp": timestamp,
                        "status": status,
                        "message": message.content.toString(),
                        "keterangan": notes
                    });

                    // Publish pesan yang ditolak ke exchange baru
                    await channel.publish(exchange, '', Buffer.from(rejectedPayload));
                    await channel.ack(message); // Acknowledge pesan aslinya
                }
            }
        });

        console.log('Consumer setup completed.\n\n');
    } catch (error) {
        console.error('Error setting up consumer:', error);
    }
}

// Call setupConsumer to start the consumer
setupConsumer();

// Start the server
app.listen(port, () => {
    console.log(`Consumer service running on port ${port}`);
});
