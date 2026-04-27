// Disable Testcontainers' Ryuk reaper container — it fails to start in some
// Docker Desktop configurations on macOS. Cleanup is handled in afterAll hooks.
process.env.TESTCONTAINERS_RYUK_DISABLED = "true";
