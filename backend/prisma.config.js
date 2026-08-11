require('dotenv/config');

console.log("DEBUG: DATABASE_URL is present:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log("DEBUG: DATABASE_URL length:", process.env.DATABASE_URL.length);
  console.log("DEBUG: DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 15));
}

module.exports = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
