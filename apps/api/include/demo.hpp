#pragma once
#include "database.hpp"
#include "finance.hpp"
namespace mochi {
// Explicit native CLI operation; the caller must enforce DEMO_MODE=true.
// Stable IDs make re-running it preserve timestamps and completed reflections.
std::size_t seed_forest_demo(Database& db, std::int64_t now_ms = current_millis());
}
