import { mock } from "bun:test";

export let authResult = true;

export const setAuthResult = (value: boolean) => {
  authResult = value;
};

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
    authenticate: () => Promise.resolve(authResult),
  }));
};

export const clearMocks = () => {
  mockInsert.mockClear();
  mockUpdate.mockClear();
  mockDelete.mockClear();
  mockSelect.mockClear();
  authResult = true;
};

export const mockDbError = () => {
  const dbError = new Error("Database error");
  mockInsert.mockImplementation(() => ({
    values: () => Promise.reject(dbError),
  }));
  mockUpdate.mockImplementation(() => ({
    set: () => ({ where: () => Promise.reject(dbError) }),
  }));
  mockDelete.mockImplementation(() => ({
    where: () => Promise.reject(dbError),
  }));
  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: () => ({ limit: () => Promise.reject(dbError) }),
      limit: () => ({ offset: () => Promise.reject(dbError) }),
    }),
  }));
};

export const resetDbMocks = () => {
  mockInsert.mockImplementation(() => ({ values: () => Promise.resolve() }));
  mockUpdate.mockImplementation(() => ({
    set: () => ({ where: () => Promise.resolve() }),
  }));
  mockDelete.mockImplementation(() => ({ where: () => Promise.resolve() }));
  mockSelect.mockImplementation(() => ({
    from: () => ({
      limit: () => ({ offset: () => Promise.resolve([] as unknown[]) }),
    }),
  }));
};
