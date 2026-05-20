import { Types } from "mongoose";
import UserModel from "../../models/users/users.model";

export interface IMemoryItem {
  _id?: Types.ObjectId;
  text: string;
  createdAt?: Date;
}

/**
 * Get all memories for a user
 */
export const getMemories = async (userId: string): Promise<IMemoryItem[]> => {
  try {
    const user = await UserModel.findById(new Types.ObjectId(userId))
      .select("memory")
      .lean();

    if (!user) throw new Error("User not found");

    // Return memory array — default to [] if field doesn't exist on old documents
    return (user as any).memory ?? [];
  } catch (error: any) {
    console.error("[memoryService] getMemories:", error.message);
    throw error;
  }
};

/**
 * Add a new memory for a user
 */
export const addMemory = async (
  userId: string,
  text: string
): Promise<IMemoryItem[]> => {
  const newMemory = { text, createdAt: new Date() };

  const user = await UserModel.findByIdAndUpdate(
    new Types.ObjectId(userId),
    { $push: { memory: newMemory } },
    { new: true }
  ).select("memory");

  if (!user) throw new Error("User not found");
  return (user as any).memory ?? [];
};

/**
 * Update an existing memory by its subdocument ID
 */
export const updateMemory = async (
  userId: string,
  memoryId: string,
  text: string
): Promise<IMemoryItem[]> => {
  const user = await UserModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      "memory._id": new Types.ObjectId(memoryId),
    },
    {
      $set: { "memory.$.text": text },
    },
    { new: true }
  ).select("memory");

  if (!user) throw new Error("User or memory not found");
  return (user as any).memory ?? [];
};

/**
 * Delete a memory by its subdocument ID
 */
export const deleteMemory = async (
  userId: string,
  memoryId: string
): Promise<IMemoryItem[]> => {
  const user = await UserModel.findByIdAndUpdate(
    new Types.ObjectId(userId),
    {
      $pull: { memory: { _id: new Types.ObjectId(memoryId) } },
    },
    { new: true }
  ).select("memory");

  if (!user) throw new Error("User not found");
  return (user as any).memory ?? [];
};
