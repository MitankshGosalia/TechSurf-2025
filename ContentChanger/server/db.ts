// For demo purposes, we'll use in-memory storage
// In production, you would use a real database
export const db = {
  // Mock database for demo
  select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
  insert: () => ({ values: () => Promise.resolve({ id: Date.now().toString() }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve({ id: Date.now().toString() }) }) }),
  delete: () => ({ where: () => Promise.resolve({ id: Date.now().toString() }) })
};
