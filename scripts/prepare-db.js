const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Check if we are in Vercel environment or if DATABASE_URL starts with postgres
const isPostgres = process.env.VERCEL === '1' || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

if (isPostgres) {
  // Use postgresql
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  console.log('Swapped Prisma provider to postgresql');
} else {
  // Use sqlite
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  console.log('Swapped Prisma provider to sqlite');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
