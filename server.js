const fastify = require('fastify')({ logger: true });
const path = require('node:path');
const fs = require('node:fs');

const USERS_FILE = path.join(__dirname, 'users.json');

let users = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Ошибка чтения users.json, начинаем с пустого массива');
  }
} else {
 
  users = [
    { id: 1, name: "Гриша Маракуя", email: "chhh@mail.ru" },
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

fastify.register(require('@fastify/view'), {
  engine: { pug: require('pug') },
  root: path.join(__dirname, 'views'),
  viewExt: 'pug'
});

fastify.register(require('@fastify/formbody'));

fastify.get('/', async (request, reply) => {
  return reply.redirect('/users');
});

fastify.get('/users', async (request, reply) => {
  return reply.view('users', { users });
});

fastify.get('/users/create', async (request, reply) => {
  return reply.view('create');
});

fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body;

  if (!name || !email) {
    return reply.code(400).send({ error: 'Имя и email обязательны' });
  }

  const newUser = {
    id: users.length + 1,
    name: name.trim(),
    email: email.trim()
  };

  users.push(newUser);

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  console.log(`Пользователь добавлен: ${name} (${email})`);

  return reply.redirect('/users');
});


const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('   Открой: http://127.0.0.1:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();