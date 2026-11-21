#pragma once
#include "finance.hpp"
namespace mochi {
inline constexpr std::int64_t reflection_delay_ms = 48LL * 60 * 60 * 1000;
void apply_reflection(Json& state, const Json& input, std::int64_t now_ms);
Json reflection_response(const Json& state, const Json& input, const std::string& day);
Json due_reflections(const Json& state, std::int64_t now_ms = current_millis());
Json spending_insights(const Json& state, std::int64_t now_ms = current_millis());
}
