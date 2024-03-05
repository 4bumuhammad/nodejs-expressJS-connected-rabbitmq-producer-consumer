const express = require('express');
const amqp = require('amqplib');

const app = express();
const port = 3000;

// Konfigurasi RabbitMQ
const rabbitmqConfig = {
  url: 'amqp://guest:guest@localhost:5673',
  exchange: 'order_exchange',
  queue: 'order_queue',
  routingKey: 'order.created',
};

// Membuat koneksi RabbitMQ
async function createRabbitMQConnection() {
  try {
    const connection = await amqp.connect(rabbitmqConfig.url);
    const channel = await connection.createChannel();
    
    // Membuat exchange
    await channel.assertExchange(rabbitmqConfig.exchange, 'topic', { durable: true });
    
    // Membuat queue
    await channel.assertQueue(rabbitmqConfig.queue, { durable: true });
    
    // Binding queue dengan routing key
    await channel.bindQueue(rabbitmqConfig.queue, rabbitmqConfig.exchange, rabbitmqConfig.routingKey);
    
    return channel;
  } catch (error) {
    console.error('Terjadi kesalahan saat membuat koneksi RabbitMQ:', error);
    throw error;
  }
}

// Inisialisasi koneksi RabbitMQ
let rabbitmqChannel;

(async () => {
  try {
    rabbitmqChannel = await createRabbitMQConnection();
    console.log('Koneksi RabbitMQ berhasil dibuat');
  } catch (error) {
    console.error('Terjadi kesalahan saat membuat koneksi RabbitMQ:', error);
  }
})();

// Handler untuk mengirim pesan ke RabbitMQ
async function sendMessageToRabbitMQ(message) {
  try {
    await rabbitmqChannel.publish(
      rabbitmqConfig.exchange,
      rabbitmqConfig.routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
    console.log('Pesan berhasil dikirim ke RabbitMQ');
  } catch (error) {
    console.error('Terjadi kesalahan saat mengirim pesan ke RabbitMQ:', error);
    throw error;
  }
}

app.use(express.json());


// Route untuk membuat event order
app.post('/api/orders', (req, res) => {
  const { productId, quantity } = req.body;
  
  // Lakukan validasi data
  if (!productId || !quantity) {
    return res.status(400).json({ error: 'Data order tidak lengkap' });
  }
  
  // Kirim pesan ke RabbitMQ
  const message = {
    eventType: 'order.created',
    productId,
    quantity,
  };
  
  sendMessageToRabbitMQ(message);
  
  res.status(200).json({ message: 'Event order berhasil dikirim' });
});

// Menjalankan server
app.listen(port, () => {
  console.log(`Service Producer berjalan pada port ${port}`);
});
