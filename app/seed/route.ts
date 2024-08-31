// This code sets up a basic database seeding mechanism for a Next.js application using the @vercel/postgres library

// How to Use

// Provide Placeholder Data: Populate the invoices, customers, revenue, and users arrays with your actual data.
// Database Connection: Configure the database connection details in your Next.js environment.
// Trigger Seeding: Make a GET request to the defined route (likely /api/seed or similar) to execute the seeding process.

import bcrypt from "bcrypt"; //Used for password hashing
import { db } from "@vercel/postgres"; //Provides tools to connect and interact with a PostgreSQL database
import { invoices, customers, revenue, users } from "../lib/placeholder-data"; //Placeholder data

const client = await db.connect(); //Establishes a database connection using db.connect()

// Seeding Functions:
// Each function (seedUsers, seedInvoices, seedCustomers, seedRevenue) is responsible for seeding a specific table in the database.
// They follow a common pattern:
// Create the table if it doesn't exist.
// Iterate over the placeholder data.
// Insert each record into the table using parameterized SQL queries for security.
// Use ON CONFLICT (id) DO NOTHING to avoid duplicate entries.

async function seedUsers() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return client.sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    })
  );

  return insertedUsers;
}

async function seedInvoices() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await client.sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => client.sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `
    )
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await client.sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => client.sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `
    )
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await client.sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => client.sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `
    )
  );

  return insertedRevenue;
}

// GET Route Handler:
// An HTTP GET request to this route triggers the seeding process.
// It wraps the seeding functions in a transaction (BEGIN and COMMIT) to ensure data consistency.
// If any error occurs, it rolls back the transaction (ROLLBACK) to prevent partial seeding.
// Returns a JSON response indicating success or failure
export async function GET() {
  //   return Response.json({
  //     message:
  //       'Uncomment this file and remove this line. You can delete this file when you are finished.',
  //   });
  try {
    await client.sql`BEGIN`;
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    await client.sql`COMMIT`;

    return Response.json({ message: "Database seeded successfully" });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
