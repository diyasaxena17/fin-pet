#pragma once
#include "finance.hpp"
namespace mochi {
void apply_lesson(Json& state, const Json& input);
Json lessons(const Json& state);
Json lesson_response(const Json& state, const Json& input, const std::string& day, const Json& reward);
Json daily_report(const Json& state, const std::string& day);
}
