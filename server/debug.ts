
import { db } from './db';
import { users, rooms, messages } from '@shared/schema';

// Example functions for direct database access
export async function getAllUsers() {
  return await db.select().from(users);
}

export async function getAllRooms() {
  return await db.select().from(rooms);
}

export async function runCustomQuery(query: string) {
  return await db.execute(query);
}

// Usage example:
// const allUsers = await getAllUsers();
// console.log('All users:', allUsers);
