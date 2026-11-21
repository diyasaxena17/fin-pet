#pragma once
#include "app_state.hpp"
#include <cstdint>
#include <ctime>

namespace mochi {
inline constexpr std::int64_t max_safe = 9007199254740991LL;
enum class Action { onboard, letter, decision, savings, feed, quest, seed, reset, gesture, preferences, budget, transaction, reflection };
Json validate_input(Action action, Json input);
std::int64_t money_cents(const Json& value, bool allow_zero = false);
void apply_action(Json& state, Action action, const Json& input, const std::string& day,
                  std::time_t now = std::time(nullptr));
Json device_state(const Json& state);
std::string local_day(std::time_t now = std::time(nullptr));
std::string previous_day(const std::string& day);
void configure_timezone(const std::string& zone);
int level_for(std::int64_t xp);
void emit_reaction(Json& state, const std::string& type);
}
