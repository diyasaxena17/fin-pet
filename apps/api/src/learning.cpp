#include "learning.hpp"
#include "contract_rules.hpp"
#include <algorithm>

namespace mochi {
namespace {
void require_account(const Json& state) {
  if (state.at("account").is_null()) throw ApiError(404, "NOT_INITIALIZED", "Set up Mochi before using this action.");
}
const Json& find_lesson(const Json& id) {
  for (const auto& lesson : contract_rules.at("lessons")) if (lesson.at("id") == id) return lesson;
  throw ApiError(404, "NOT_FOUND", "Lesson not found.");
}
bool completed(const Json& state, const Json& id) {
  const auto& completed = state.at("finance").at("completedLessons");
  return std::find(completed.begin(), completed.end(), id) != completed.end();
}
const Json zero_reward = {{"coins", 0}, {"xp", 0}};
}
void apply_lesson(Json& state, const Json& input) {
  require_account(state); const auto& lesson = find_lesson(input.at("lessonId"));
  bool found = false;
  for (const auto& option : lesson.at("options")) if (option.at("id") == input.at("selectedOptionId")) found = true;
  if (!found) throw ApiError(400, "INVALID_REQUEST", "Unknown lesson option.");
  if (lesson.at("correctOptionId") != input.at("selectedOptionId") || completed(state, lesson.at("id"))) return;
  auto& account = state["account"];
  const auto coins = account.at("coins").get<std::int64_t>(), xp = account.at("xp").get<std::int64_t>();
  if (coins > max_safe - 5 || xp > max_safe - 10) throw ApiError(409, "LIMIT_EXCEEDED", "This amount exceeds the supported balance.");
  account["coins"] = coins + 5; account["xp"] = xp + 10;
  state["finance"]["completedLessons"].push_back(lesson.at("id"));
}
Json lessons(const Json& state) {
  require_account(state); Json result = Json::array();
  for (auto lesson : contract_rules.at("lessons")) {
    const bool done = completed(state, lesson.at("id"));
    lesson.erase("correctOptionId"); lesson.erase("feedback");
    lesson["completed"] = done; lesson["availableReward"] = done ? zero_reward : Json{{"coins", 5}, {"xp", 10}};
    result.push_back(lesson);
  }
  return result;
}
Json lesson_response(const Json& state, const Json& input, const std::string& day, const Json& reward) {
  const auto& lesson = find_lesson(input.at("lessonId"));
  return {{"correct", lesson.at("correctOptionId") == input.at("selectedOptionId")}, {"feedback", lesson.at("feedback")},
    {"reward", reward}, {"state", app_state(state, day)}};
}
Json daily_report(const Json& state, const std::string& day) {
  require_account(state); const auto view = app_state(state, day);
  const auto& budget = view.at("budgetSummary"); const auto& quest = view.at("quest");
  const bool configured = !budget.at("dailyLimit").is_null();
  const bool within = configured && budget.at("spentToday").get<double>() <= budget.at("dailyLimit").get<double>();
  return {{"date", day}, {"spentToday", budget.at("spentToday")}, {"dailyLimit", budget.at("dailyLimit")},
    {"underDailyLimit", configured ? Json(within) : Json(nullptr)},
    {"achievement", within ? Json("Daily spending is within your target") : Json(nullptr)},
    {"insight", quest.at("completedToday").get<bool>() ? "You completed your financial check-in" : "Your financial check-in is ready"},
    {"completedToday", quest.at("completedToday")}, {"streakDays", quest.at("streakDays")},
    {"availableReward", quest.at("available").get<bool>() ? Json{{"coins", 10}, {"xp", 20}} : zero_reward}};
}
}
