export const createMockProduct = (
  overrides: Partial<{
    id: string;
    name: string;
    availableTiers?: string[];
  }> = {},
) => ({
  id: overrides.id || "prod_default",
  name: overrides.name || "Default Product",
  ...(overrides.availableTiers && { availableTiers: overrides.availableTiers }),
});

export const createMockLicense = (
  overrides: Partial<{
    key: string;
    productId: string;
    expirationDate: Date;
  }> = {},
) => ({
  key: overrides.key || "license_default",
  productId: overrides.productId || "prod_default",
  expirationDate: overrides.expirationDate || new Date(),
});
