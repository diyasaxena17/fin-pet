#pragma once
#include "demo.hpp"
namespace mochi {
// Private native replay format, deliberately separate from the public API types.
Json sandbox_snapshot(const std::string& start_date, int day, const Json& schedule = nullptr);
Json sandbox_ledger(const Json& metadata);
void set_demo_clock(std::int64_t millis); // Startup only, after DEMO_MODE gating.
}
