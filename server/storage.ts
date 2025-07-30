import {
  users,
  rooms,
  messages,
  roomMembers,
  type User,
  type InsertUser,
  type Room,
  type InsertRoom,
  type Message,
  type InsertMessage,
  type RoomMember,
  type InsertRoomMember,
  type RoomWithMembers,
  type MessageWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(userId: string, status: "online" | "away" | "offline"): Promise<void>;
  
  // Room operations
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(id: string): Promise<Room | undefined>;
  getRoomWithMembers(id: string): Promise<RoomWithMembers | undefined>;
  getUserRooms(userId: string): Promise<RoomWithMembers[]>;
  getPublicRooms(): Promise<Room[]>;
  
  // Room member operations
  joinRoom(roomMember: InsertRoomMember): Promise<RoomMember>;
  leaveRoom(roomId: string, userId: string): Promise<void>;
  getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]>;
  updateTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void>;
  updateLastRead(roomId: string, userId: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<MessageWithUser>;
  getRoomMessages(roomId: string, limit?: number, offset?: number): Promise<MessageWithUser[]>;
  getUnreadMessageCount(roomId: string, userId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserStatus(userId: string, status: "online" | "away" | "offline"): Promise<void> {
    await db
      .update(users)
      .set({ 
        status, 
        lastSeen: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
  }

  // Room operations
  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async getRoomWithMembers(id: string): Promise<RoomWithMembers | undefined> {
    const room = await this.getRoom(id);
    if (!room) return undefined;

    const members = await this.getRoomMembers(id);
    const messages = await this.getRoomMessages(id, 50);

    return {
      ...room,
      members,
      messages,
    };
  }

  async getUserRooms(userId: string): Promise<RoomWithMembers[]> {
    const userRooms = await db
      .select({
        room: rooms,
      })
      .from(roomMembers)
      .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
      .where(eq(roomMembers.userId, userId));

    const roomsWithDetails = await Promise.all(
      userRooms.map(async ({ room }) => {
        const members = await this.getRoomMembers(room.id);
        const messages = await this.getRoomMessages(room.id, 50);
        const unreadCount = await this.getUnreadMessageCount(room.id, userId);

        return {
          ...room,
          members,
          messages,
          unreadCount,
        };
      })
    );

    return roomsWithDetails;
  }

  async getPublicRooms(): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(eq(rooms.isPrivate, false));
  }

  // Room member operations
  async joinRoom(roomMember: InsertRoomMember): Promise<RoomMember> {
    const [member] = await db
      .insert(roomMembers)
      .values(roomMember)
      .onConflictDoNothing()
      .returning();
    return member;
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    await db
      .delete(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );
  }

  async getRoomMembers(roomId: string): Promise<(RoomMember & { user: User })[]> {
    return await db
      .select({
        id: roomMembers.id,
        roomId: roomMembers.roomId,
        userId: roomMembers.userId,
        joinedAt: roomMembers.joinedAt,
        isTyping: roomMembers.isTyping,
        lastReadAt: roomMembers.lastReadAt,
        user: users,
      })
      .from(roomMembers)
      .innerJoin(users, eq(roomMembers.userId, users.id))
      .where(eq(roomMembers.roomId, roomId));
  }

  async updateTypingStatus(roomId: string, userId: string, isTyping: boolean): Promise<void> {
    await db
      .update(roomMembers)
      .set({ isTyping })
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );
  }

  async updateLastRead(roomId: string, userId: string): Promise<void> {
    await db
      .update(roomMembers)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<MessageWithUser> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    const messageWithUser = await db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        roomId: messages.roomId,
        userId: messages.userId,
        imageUrl: messages.imageUrl,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        user: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.id, newMessage.id));

    return messageWithUser[0];
  }

  async getRoomMessages(roomId: string, limit = 50, offset = 0): Promise<MessageWithUser[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        type: messages.type,
        roomId: messages.roomId,
        userId: messages.userId,
        imageUrl: messages.imageUrl,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        user: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUnreadMessageCount(roomId: string, userId: string): Promise<number> {
    const member = await db
      .select({ lastReadAt: roomMembers.lastReadAt })
      .from(roomMembers)
      .where(
        and(
          eq(roomMembers.roomId, roomId),
          eq(roomMembers.userId, userId)
        )
      );

    if (!member[0]) return 0;

    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.roomId, roomId),
          sql`${messages.createdAt} > ${member[0].lastReadAt}`
        )
      );

    return result.count;
  }
}

export const storage = new DatabaseStorage();
