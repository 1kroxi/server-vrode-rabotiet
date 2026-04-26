const fastify = require('fastify')({ logger: true });
const path = require('node:path');
const fs = require('node:fs');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'database.db');

let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    )
  `);

  const result = db.exec('SELECT COUNT(*) as count FROM users');
  const count = result[0].values[0][0];
  if (count === 0) {
    db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Гриша Маракуя', 'chhh@mail.ru']);
    db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['Так тестируем', 'rrr@mail.ru']);
  }

  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function getAllUsers() {
  const result = db.exec('SELECT id, name, email FROM users ORDER BY id');
  if (!result.length) return [];
  const [cols, ...rows] = [result[0].columns, ...result[0].values];
  return result[0].values.map(row => {
    const obj = {};
    result[0].columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function getUserById(id) {
  const result = db.exec(`SELECT id, name, email FROM users WHERE id = ${Number(id)}`);
  if (!result.length || !result[0].values.length) return null;
  const obj = {};
  result[0].columns.forEach((col, i) => obj[col] = result[0].values[0][i]);
  return obj;
}

fastify.register(require('@fastify/view'), {
  engine: { pug: require('pug') },
  root: path.join(__dirname, 'views'),
  viewExt: 'pug'
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/public/'
});

fastify.register(require('@fastify/formbody'));

fastify.get('/', async (request, reply) => {
  return reply.redirect('/users');
});

fastify.get('/users', async (request, reply) => {
  const users = getAllUsers();
  return reply.view('users', { users });
});

fastify.get('/users/create', async (request, reply) => {
  return reply.view('create', { error: null });
});

fastify.post('/users', async (request, reply) => {
  const { name, email } = request.body;

  if (!name || !email) {
    return reply.view('create', { error: 'Имя и email обязательны' });
  }

  try {
    db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name.trim(), email.trim()]);
    saveDb();
  } catch (err) {
    return reply.view('create', { error: 'Пользователь с таким email уже существует' });
  }

  return reply.redirect('/users');
});

fastify.get('/users/:id/edit', async (request, reply) => {
  const user = getUserById(request.params.id);
  if (!user) return reply.code(404).send('Пользователь не найден');
  return reply.view('edit', { user, error: null });
});

fastify.post('/users/:id/edit', async (request, reply) => {
  const { name, email } = request.body;
  const { id } = request.params;

  if (!name || !email) {
    const user = getUserById(id);
    return reply.view('edit', { user, error: 'Имя и email обязательны' });
  }

  try {
    db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), email.trim(), Number(id)]);
    saveDb();
  } catch (err) {
    const user = getUserById(id);
    return reply.view('edit', { user, error: 'Пользователь с таким email уже существует' });
  }

  return reply.redirect('/users');
});

fastify.post('/users/:id/delete', async (request, reply) => {
  db.run('DELETE FROM users WHERE id = ?', [Number(request.params.id)]);
  saveDb();
  return reply.redirect('/users');
});

const start = async () => {
  try {
    await initDatabase();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Открой: http://127.0.0.1:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
