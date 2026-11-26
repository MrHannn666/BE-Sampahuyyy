const config = require('./config');
const app = require('./app');
app.listen(config.port, () => console.log(`Server jalan di port ${config.port} (midtrans mock: ${config.midtrans.mock})`));
