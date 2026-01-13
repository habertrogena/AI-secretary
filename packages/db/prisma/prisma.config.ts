import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import path from 'path'

// Load env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Choose the correct DB URL based on environment
const DATABASE_URL = process.env.DATABASE_URL
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

// Use the test database in CI or testing
const url =
  process.env.NODE_ENV === 'test'
    ? TEST_DATABASE_URL || DATABASE_URL
    : DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL is not defined in .env')
}

// Create Prisma Client
export const prisma = new PrismaClient()

