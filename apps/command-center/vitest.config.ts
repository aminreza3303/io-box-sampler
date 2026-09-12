// Prevent Vitest from walking up to the workstation's repository-root Vite config.
// That config uses root-only Vite/React plugin dependencies, not this package's test setup.
export default {
  test: {
    include: ["tests/**/*.test.ts"],
  },
};
