const fastify = require('fastify')({ logger: true });
const path = require('node:path');
const fs = require('node:fs');

const RESULTS_FILE = path.join(__dirname, 'results.json');
const USERS_FILE = path.join(__dirname, 'users.json');

let results = [];
if (fs.existsSync(RESULTS_FILE)) {
  try { results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')); }
  catch { results = []; }
}

let users = [];
if (fs.existsSync(USERS_FILE)) {
  try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); }
  catch { users = []; }
}

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function saveResults() {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

fastify.register(require('@fastify/view'), {
  engine: { pug: require('pug') },
  root: path.join(__dirname, 'views'),
  viewExt: 'pug'
});

fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/session'), {
  secret: 'supersecretkey-change-this-in-prod-32ch!!',
  cookie: { secure: false },
  saveUninitialized: false,
});

function getCurrentUser(request) {
  return request.session.userId
    ? users.find(u => u.id === request.session.userId) || null
    : null;
}

fastify.get('/', async (request, reply) => {
  const user = getCurrentUser(request);
  if (!user) return reply.redirect('/auth');
  return reply.view('index', { user });
});

fastify.get('/auth', async (request, reply) => {
  if (getCurrentUser(request)) return reply.redirect('/');
  return reply.view('auth', { error: null, success: null });
});

fastify.post('/register', async (request, reply) => {
  const { username, email, password } = request.body;

  if (!username || !email || !password) {
    return reply.view('auth', { error: 'Заполните все поля', success: null });
  }
  if (password.length < 3) {
    return reply.view('auth', { error: 'Пароль должен быть не менее 3 символов', success: null });
  }
  if (users.find(u => u.email === email.toLowerCase())) {
    return reply.view('auth', { error: 'Этот email уже зарегистрирован', success: null });
  }

  const newUser = {
    id: Date.now().toString(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();

  return reply.view('auth', { error: null, success: 'Аккаунт создан! Теперь войдите.' });
});

fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.view('auth', { error: 'Введите email и пароль', success: null });
  }

  const user = users.find(u => u.email === email.toLowerCase().trim());
  if (!user || user.password !== password) {
    return reply.view('auth', { error: 'Неверный email или пароль', success: null });
  }

  request.session.userId = user.id;
  return reply.redirect('/');
});

fastify.get('/logout', async (request, reply) => {
  request.session.destroy();
  return reply.redirect('/auth');
});

// Генерация поля
function generateGameBoard(size = 4) {
  const numbers = Array.from({ length: size * size }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const board = [];
  for (let i = 0; i < size; i++) {
    board.push(numbers.slice(i * size, (i + 1) * size));
  }
  return board;
}

fastify.get('/api/new-board', async (request, reply) => {
  return reply.send({ board: generateGameBoard(4) });
});

fastify.post('/api/save-result', async (request, reply) => {
  const user = getCurrentUser(request);
  if (!user) return reply.code(401).send({ error: 'Не авторизован' });

  const { timeInSeconds } = request.body;

  const newResult = {
    id: Date.now(),
    name: user.username,
    email: user.email,
    time: timeInSeconds,
    date: new Date().toISOString()
  };

  results.push(newResult);
  saveResults();

  return reply.send({ success: true });
});

fastify.get('/api/results', async (request, reply) => {
  const top10 = [...results].sort((a, b) => a.time - b.time).slice(0, 10);
  return reply.send(top10);
});

fastify.get('/leaderboard', async (request, reply) => {
  const user = getCurrentUser(request);
  const top10 = [...results].sort((a, b) => a.time - b.time).slice(0, 10);
  return reply.view('leaderboard', { results: top10, user });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Игра запущена: http://127.0.0.1:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();