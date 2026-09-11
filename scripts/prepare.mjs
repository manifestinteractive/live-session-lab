// CI and production installs do not need local Git hooks.
if (process.env.CI || process.env.NODE_ENV === "production" || process.env.HUSKY === "0") {
  process.exit(0);
}

const { default: husky } = await import("husky");
const message = husky();
if (message) {
  console.error(message);
  process.exitCode = 1;
}
