# Mochi C++20 API

Build with CMake 3.20+, a C++20 compiler, and SQLite3 development headers.
cpp-httplib and nlohmann/json are pinned in `vendor/` with their MIT licenses.

```sh
cmake -S apps/api -B apps/api/build
cmake --build apps/api/build
ctest --test-dir apps/api/build --output-on-failure
apps/api/build/mochi-api
```

`API_HOST` defaults to `0.0.0.0`, `PORT` to `3000`, and `DB_PATH` to
`apps/api/data/mochi.sqlite3` (absolute source-relative default). Explicit
relative database paths resolve from the process working directory. SQLite
runtime files and build output are ignored. `DEMO_MODE` defaults to `false`.
The binary reads process environment variables, without Node or dotenv.

Workspace `pnpm dev:api`, build, and test scripts invoke CMake/the native binary.
The existing JavaScript dependency declarations are retained solely to preserve
the frozen root lockfile; the backend does not import or run them.

The current frozen contract on `main` supersedes the historical scaffold.
HTTP AppState will retain its exact standalone frontend shape. Hardware support
will be an explicit opt-in extension, without adding fields to AppState.
