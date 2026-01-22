import bcrypt from 'bcryptjs';

const password = 'admin';
const hashedPassword = await bcrypt.hash(password, 10);

console.log('Password:', password);
console.log('Hashed:', hashedPassword);
console.log('\nYou can use this hash in your database for the admin user.');
