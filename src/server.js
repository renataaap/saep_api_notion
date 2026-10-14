require('dotenv').config();
const path = require('path');
const next = require('next');
const pool = require('./database/connection');
const criarApp = require('./app');

const porta = Number(process.env.PORT || 3000);
const desenvolvimento = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev: desenvolvimento, dir: path.join(__dirname, '..') });

nextApp.prepare().then(() => {
  const app = criarApp(pool, { nextHandler: nextApp.getRequestHandler() });
  app.listen(porta, '0.0.0.0', () => {
    console.log(`Aplicação rodando na porta ${porta}`);
  });
}).catch((erro) => {
  console.error('Falha ao iniciar a aplicação:', erro);
  process.exit(1);
});
