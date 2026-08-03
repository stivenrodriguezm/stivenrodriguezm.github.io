const db = require('../src/mysql_db');

async function seed() {
  try {
    console.log('Conectando a la base de datos...');
    
    // Crear tabla de prueba si no existe
    await db.query(`
      CREATE TABLE IF NOT EXISTS productos_test (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(100)
      )
    `);
    console.log('Tabla productos_test asegurada.');

    // Insertar datos de prueba
    const [result] = await db.query(`
      INSERT INTO productos_test (nombre, precio, categoria) 
      VALUES 
        ('Sala Lottus Premium', 8500000.00, 'salas'),
        ('Comedor Madera Roble', 4200000.00, 'comedores')
    `);
    
    console.log(`Datos de prueba insertados exitosamente. Filas afectadas: ${result.affectedRows}`);
    
    // Leer los datos insertados
    const [rows] = await db.query('SELECT * FROM productos_test');
    console.log('Datos actuales en la tabla:');
    console.table(rows);

  } catch (error) {
    console.error('Error durante la inserción de datos:', error);
  } finally {
    // Cerrar la conexión
    await db.end();
    console.log('Conexión cerrada.');
  }
}

seed();
