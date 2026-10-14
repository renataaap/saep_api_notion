require('dotenv').config();
const pool = require('./database/connection');
const criarApp = require('./app');

const porta = Number(process.env.PORT || 3000);
const app = criarApp(pool);

app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
});
