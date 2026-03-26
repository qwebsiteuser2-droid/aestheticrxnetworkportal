const { AppDataSource } = require('./dist/db/data-source.js');

async function checkUsers() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');
    
    const result = await AppDataSource.query('SELECT id, email, doctor_name, is_admin, is_approved FROM doctors LIMIT 5');
    console.log('Users in database:');
    result.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Name: ${user.doctor_name}, Admin: ${user.is_admin}, Approved: ${user.is_approved}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
