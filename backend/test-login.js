const bcrypt = require('bcrypt');
const db = require('./config/database');

(async () => {
  try {
    const result = await db.query('SELECT password_hash FROM users WHERE username = $1', ['admin']);
    const hash = result.rows[0].password_hash;
    console.log('Hash from DB:', hash);
    const match = await bcrypt.compare('password123', hash);
    console.log('Password matches:', match);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
