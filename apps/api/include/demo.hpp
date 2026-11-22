#pragma once
#include "database.hpp"
#include "finance.hpp"
namespace mochi {
// Explicit native CLI operation; the caller must enforce DEMO_MODE=true.
// Stable IDs prevent duplicates. Refresh stale unreviewed dates as a batch;
// completed reflections and their purchase timestamps are preserved.
std::size_t seed_forest_demo(Database& db, std::int64_t now_ms = current_millis());
}
