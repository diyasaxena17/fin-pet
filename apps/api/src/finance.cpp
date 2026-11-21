#include "finance.hpp"
#include "contract_rules.hpp"
#include <chrono>
#include <regex>
#include <set>

namespace mochi {
namespace {
[[noreturn]] void invalid() { throw ApiError(400, "INVALID_REQUEST", "Invalid request data."); }
void keys(const Json& value, std::initializer_list<const char*> expected) {
  if (!value.is_object() || value.size() != expected.size()) invalid();
  for (const auto* key : expected) if (!value.contains(key)) invalid();
}
std::int64_t integer(const Json& value, bool positive = false) {
  if (!value.is_number_integer()) invalid();
  const auto number = value.get<std::int64_t>();
  if (number < (positive ? 1 : 0) || number > max_safe) invalid();
  return number;
}
std::int64_t sum(std::int64_t a, std::int64_t b) {
  if (b > max_safe - a) throw ApiError(409, "LIMIT_EXCEEDED", "This amount exceeds the supported balance.");
  return a + b;
}
const std::vector<std::pair<std::string, std::string>> categories = {
  {"food", "Food & Drink"}, {"shopping", "Shopping"}, {"transport", "Transport"},
  {"entertainment", "Entertainment"}, {"bills", "Bills"}, {"other", "Other"}
};
bool category(const Json& value) {
  for (const auto& [id, label] : categories) { (void)label; if (value == id) return true; }
  return false;
}
void month_format(const std::string& month) {
  if (!std::regex_match(month, std::regex("^[0-9]{4}-(0[1-9]|1[0-2])$"))) invalid();
}
void require_account(const Json& state) {
  if (state.at("account").is_null()) throw ApiError(404, "NOT_INITIALIZED", "Set up Mochi before using this action.");
}
std::string transaction_day(const Json& transaction) {
  return local_day(static_cast<std::time_t>(std::chrono::floor<std::chrono::seconds>(
    std::chrono::milliseconds(timestamp_millis(transaction.at("occurredAt")))).count()));
}
}
std::int64_t current_millis() {
  return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}
std::int64_t timestamp_millis(const Json& timestamp) {
  if (!timestamp.is_string()) invalid();
  const auto value = timestamp.get<std::string>();
  static const std::regex format(R"(^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.([0-9]+))?(Z|([+-])([0-9]{2}):([0-9]{2}))$)");
  std::smatch match;
  if (!std::regex_match(value, match, format)) invalid();
  using namespace std::chrono;
  const auto date = year(std::stoi(match[1])) / month(static_cast<unsigned>(std::stoi(match[2]))) / day(static_cast<unsigned>(std::stoi(match[3])));
  const int h = std::stoi(match[4]), m = std::stoi(match[5]), s = std::stoi(match[6]);
  if (!date.ok() || h > 23 || m > 59 || s > 59) invalid();
  int offset = 0;
  if (match[9] != "Z") {
    const int oh = std::stoi(match[11]), om = std::stoi(match[12]);
    if (oh > 23 || om > 59) invalid();
    offset = (oh * 60 + om) * (match[10] == "-" ? -1 : 1);
  }
  const auto fraction = match[8].str() + "000";
  return duration_cast<milliseconds>(sys_days(date).time_since_epoch() + hours(h) + minutes(m - offset) + seconds(s)).count() + std::stoi(fraction.substr(0, 3));
}
Json empty_finance() {
  return {{"preferences", {{"voice", "cute"}}}, {"budgets", Json::object()}, {"transactions", Json::array()}, {"completedLessons", Json::array()}};
}
void validate_finance_state(const Json& finance) {
  keys(finance, {"preferences", "budgets", "transactions", "completedLessons"});
  keys(finance.at("preferences"), {"voice"});
  if (finance.at("preferences").at("voice") != "cute" && finance.at("preferences").at("voice") != "calm") invalid();
  if (!finance.at("budgets").is_object() || !finance.at("transactions").is_array() || !finance.at("completedLessons").is_array()) invalid();
  for (const auto& [month, budget] : finance.at("budgets").items()) {
    month_format(month); keys(budget, {"monthlyCents", "dailyCents", "categoryCents"});
    integer(budget.at("monthlyCents"), true);
    if (!budget.at("dailyCents").is_null()) integer(budget.at("dailyCents"), true);
    if (!budget.at("categoryCents").is_object()) invalid();
    for (const auto& [id, limit] : budget.at("categoryCents").items()) { if (!category(id)) invalid(); integer(limit, true); }
  }
  std::int64_t total = 0;
  std::set<std::string> ids;
  for (const auto& t : finance.at("transactions")) {
    keys(t, {"id", "name", "amountCents", "category", "occurredAt", "planned", "source", "reflection"});
    if (!t.at("id").is_string() || !ids.insert(t.at("id").get<std::string>()).second ||
        !t.at("name").is_string() || t.at("name").get<std::string>().empty() || !category(t.at("category")) || !t.at("planned").is_boolean() ||
        (t.at("source") != "manual" && t.at("source") != "demo")) invalid();
    total = sum(total, integer(t.at("amountCents"), true)); timestamp_millis(t.at("occurredAt"));
    if (!t.at("reflection").is_null()) {
      const auto& reflection = t.at("reflection"); keys(reflection, {"verdict", "reflectedAt"});
      if (reflection.at("verdict") != "worth_it" && reflection.at("verdict") != "unsure" && reflection.at("verdict") != "not_worth_it") invalid();
      timestamp_millis(reflection.at("reflectedAt"));
    }
  }
  std::set<std::string> lessons;
  for (const auto& id : finance.at("completedLessons")) {
    if (!id.is_string() || !lessons.insert(id.get<std::string>()).second) invalid();
    bool found = false;
    for (const auto& lesson : contract_rules.at("lessons")) if (lesson.at("id") == id) found = true;
    if (!found) invalid();
  }
}
Json transaction_view(const Json& transaction) {
  auto result = transaction; result["amount"] = transaction.at("amountCents").get<std::int64_t>() / 100.0; result.erase("amountCents"); return result;
}
Json transactions_for(const Json& state, const std::string& month) {
  require_account(state); month_format(month); Json result = Json::array();
  for (const auto& t : state.at("finance").at("transactions")) if (transaction_day(t).substr(0, 7) == month) result.push_back(transaction_view(t));
  return result;
}
Json budget_summary(const Json& state, const std::string& month, const std::string& day) {
  require_account(state); month_format(month);
  const auto& finance = state.at("finance");
  const auto& budgets = finance.at("budgets");
  const Json budget = budgets.contains(month) ? budgets.at(month) : Json(nullptr);
  std::int64_t spent = 0, spent_today = 0; std::map<std::string, std::int64_t> by_category;
  for (const auto& t : finance.at("transactions")) {
    const auto date = transaction_day(t); if (date.substr(0, 7) != month) continue;
    const auto amount = t.at("amountCents").get<std::int64_t>();
    spent = sum(spent, amount); if (date == day) spent_today = sum(spent_today, amount);
    const auto id = t.at("category").get<std::string>(); by_category[id] = sum(by_category[id], amount);
  }
  Json groups = Json::array();
  for (const auto& [id, label] : categories) groups.push_back({{"id", id}, {"label", label}, {"spent", by_category[id] / 100.0},
    {"limit", !budget.is_null() && budget.at("categoryCents").contains(id) ? Json(budget.at("categoryCents").at(id).get<std::int64_t>() / 100.0) : Json(nullptr)}});
  return {{"month", month}, {"monthlyLimit", budget.is_null() ? Json(nullptr) : Json(budget.at("monthlyCents").get<std::int64_t>() / 100.0)},
    {"dailyLimit", budget.is_null() || budget.at("dailyCents").is_null() ? Json(nullptr) : Json(budget.at("dailyCents").get<std::int64_t>() / 100.0)},
    {"spentThisMonth", spent / 100.0}, {"spentToday", spent_today / 100.0},
    {"remainingThisMonth", budget.is_null() ? Json(nullptr) : Json((budget.at("monthlyCents").get<std::int64_t>() - spent) / 100.0)}, {"categories", groups}};
}
Json additive_state(Json view, const Json& state, const std::string& day) {
  const double progress = view.at("goal").at("progressPercent");
  std::string stage;
  for (const auto& entry : contract_rules.at("treeStages")) if (progress >= entry.at("minimumPercent").get<double>()) stage = entry.at("stage");
  view["forest"] = {{"treeStage", stage}, {"growthPercent", progress}};
  view["preferences"] = state.at("finance").at("preferences");
  view["budgetSummary"] = budget_summary(state, day.substr(0, 7), day);
  view["today"] = {{"checkInCompleted", view.at("quest").at("completedToday")}};
  return view;
}
}
