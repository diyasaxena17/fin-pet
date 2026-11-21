#pragma once
#include "game_logic.hpp"
namespace mochi {
Json empty_finance();
void validate_month(const std::string& month);
bool is_category(const Json& value);
void apply_finance_action(Json& state, Action action, const Json& input, std::int64_t now_ms);
Json finance_mutation_response(Action action, const Json& state, const Json& input, const std::string& day);
void validate_finance_state(const Json& finance);
std::int64_t timestamp_millis(const Json& timestamp);
std::int64_t current_millis();
Json budget_summary(const Json& state, const std::string& month, const std::string& day);
Json transactions_for(const Json& state, const std::string& month);
Json transaction_view(const Json& transaction);
Json additive_state(Json view, const Json& state, const std::string& day);
}
