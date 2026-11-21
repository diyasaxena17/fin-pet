Pinned upstream single-header dependencies, committed for offline builds:

- cpp-httplib v0.18.3: https://github.com/yhirose/cpp-httplib/tree/v0.18.3
  SHA256 httplib.h: a0a0c13dc086663863dbe6730a19716f7d3744904b6205496e8301750814dbd5
- nlohmann/json v3.11.3: https://github.com/nlohmann/json/tree/v3.11.3
  SHA256 nlohmann/json.hpp: 9bea4c8066ef4a1c206b2be5a36302f8926f7fdc6087af5d20b417d0cf103ea6

Both use MIT licenses, included alongside the headers. SQLite is supplied by
the operating system/developer toolchain, discovered through CMake.
