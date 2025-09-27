import { 
  type User, 
  type InsertUser,
  type BrandkitRule,
  type InsertBrandkitRule,
  type ReplacementHistory,
  type InsertReplacementHistory,
  type BatchOperation,
  type InsertBatchOperation
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Brandkit rules operations
  getBrandkitRules(): Promise<BrandkitRule[]>;
  createBrandkitRule(rule: InsertBrandkitRule): Promise<BrandkitRule>;
  updateBrandkitRule(id: string, rule: Partial<InsertBrandkitRule>): Promise<BrandkitRule>;
  deleteBrandkitRule(id: string): Promise<void>;
  
  // Replacement history operations
  getReplacementHistory(limit?: number): Promise<ReplacementHistory[]>;
  createReplacementHistory(history: InsertReplacementHistory): Promise<ReplacementHistory>;
  deleteReplacementHistory(id: string): Promise<void>;
  
  // Batch operations
  getBatchOperations(): Promise<BatchOperation[]>;
  createBatchOperation(batch: InsertBatchOperation): Promise<BatchOperation>;
  updateBatchOperation(id: string, batch: Partial<InsertBatchOperation>): Promise<BatchOperation>;
  deleteBatchOperation(id: string): Promise<void>;
}

// In-memory storage for demo purposes
class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private brandkitRules: BrandkitRule[] = [];
  private replacementHistory: ReplacementHistory[] = [];
  private batchOperations: BatchOperation[] = [];

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: Date.now().toString(),
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.push(user);
    return user;
  }

  // Brandkit rules operations
  async getBrandkitRules(): Promise<BrandkitRule[]> {
    return this.brandkitRules.filter(rule => rule.isActive);
  }

  async createBrandkitRule(rule: InsertBrandkitRule): Promise<BrandkitRule> {
    const brandkitRule: BrandkitRule = {
      id: Date.now().toString(),
      ...rule,
      createdAt: new Date()
    };
    this.brandkitRules.push(brandkitRule);
    return brandkitRule;
  }

  async updateBrandkitRule(id: string, rule: Partial<InsertBrandkitRule>): Promise<BrandkitRule> {
    const index = this.brandkitRules.findIndex(r => r.id === id);
    if (index >= 0) {
      this.brandkitRules[index] = { ...this.brandkitRules[index], ...rule };
      return this.brandkitRules[index];
    }
    throw new Error('Brandkit rule not found');
  }

  async deleteBrandkitRule(id: string): Promise<void> {
    this.brandkitRules = this.brandkitRules.filter(r => r.id !== id);
  }

  // Replacement history operations
  async getReplacementHistory(limit: number = 20): Promise<ReplacementHistory[]> {
    return this.replacementHistory
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createReplacementHistory(history: InsertReplacementHistory): Promise<ReplacementHistory> {
    const historyRecord: ReplacementHistory = {
      id: Date.now().toString(),
      ...history,
      createdAt: new Date()
    };
    this.replacementHistory.push(historyRecord);
    return historyRecord;
  }

  async deleteReplacementHistory(id: string): Promise<void> {
    this.replacementHistory = this.replacementHistory.filter(h => h.id !== id);
  }

  // Batch operations
  async getBatchOperations(): Promise<BatchOperation[]> {
    return this.batchOperations
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async createBatchOperation(batch: InsertBatchOperation): Promise<BatchOperation> {
    const batchOp: BatchOperation = {
      id: Date.now().toString(),
      ...batch,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.batchOperations.push(batchOp);
    return batchOp;
  }

  async updateBatchOperation(id: string, batch: Partial<InsertBatchOperation>): Promise<BatchOperation> {
    const index = this.batchOperations.findIndex(b => b.id === id);
    if (index >= 0) {
      this.batchOperations[index] = { 
        ...this.batchOperations[index], 
        ...batch, 
        updatedAt: new Date() 
      };
      return this.batchOperations[index];
    }
    throw new Error('Batch operation not found');
  }

  async deleteBatchOperation(id: string): Promise<void> {
    this.batchOperations = this.batchOperations.filter(b => b.id !== id);
  }
}

export const storage = new InMemoryStorage();
