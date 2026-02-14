import { mock } from "bun:test";

export const mockInsert = mock(() => ({ values: () => Promise.resolve() }));
export const mockUpdate = mock(() => ({
  set: () => ({ where: () => Promise.resolve() }),
}));
export const mockDelete = mock(() => ({ where: () => Promise.resolve() }));

export const mockSelect = mock(() => ({
  from: () => ({
    limit: () => ({
      offset: () => Promise.resolve([] as unknown[]),
    }),
  }),
}));

export const mockDb = {
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelect,
};

export const setupMocks = () => {
  mock.module("../../db/index.ts", () => ({
    db: mockDb,
  }));

  mock.module("../../middleware/auth.ts", () => ({
    authenticate: () => Promise.resolve(true),
  }));
};

export const clearMocks = () => {
  mockInsert.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
  mockSelect.mockClear();
};
