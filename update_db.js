require('dotenv').config({ path: '.env' });
const pool = require('./src/mysql_db');

async function update() {
  try {
    const query = "UPDATE settings SET \`value\` = '\"Cada pieza nace en nuestro estudio creativo y toma forma en manos de maestros artesanos bogotanos. Para quienes entienden que un hogar no se decora: se compone.\"' WHERE \`key\` = 'heroSubtitle'";
    const [result] = await pool.query(query);
    console.log("Update result:", result);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
update();
