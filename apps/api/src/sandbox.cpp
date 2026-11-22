#include "sandbox.hpp"
#include "engagement.hpp"
#include "learning.hpp"
#include <algorithm>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace mochi {
namespace {
std::string date_offset(const std::string& start, int days) {
  const auto instant = timestamp_millis(start + "T00:00:00Z") + days * 86400000LL;
  const auto seconds = static_cast<std::time_t>(instant / 1000);
  std::tm utc{}; if (!gmtime_r(&seconds, &utc)) throw std::runtime_error("Invalid sandbox date");
  std::ostringstream out; out << std::put_time(&utc, "%Y-%m-%d"); return out.str();
}
std::int64_t local_at(const std::string& day, int hour, int minute) {
  (void)timestamp_millis(day + "T00:00:00Z");
  std::tm local{};
  local.tm_year = std::stoi(day.substr(0, 4)) - 1900;
  local.tm_mon = std::stoi(day.substr(5, 2)) - 1; local.tm_mday = std::stoi(day.substr(8, 2));
  local.tm_hour = hour; local.tm_min = minute; local.tm_isdst = -1;
  const auto seconds = std::mktime(&local);
  if (seconds == -1) throw std::runtime_error("Unsupported sandbox local date");
  return static_cast<std::int64_t>(seconds) * 1000;
}
std::string timestamp(std::int64_t at) {
  auto seconds = static_cast<std::time_t>(at / 1000); std::tm utc{};
  if (!gmtime_r(&seconds, &utc)) throw std::runtime_error("Invalid sandbox instant");
  std::ostringstream out; out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << ".000Z"; return out.str();
}
std::string uuid(int ordinal) {
  std::ostringstream out; out << "14000000-0000-4000-8000-" << std::setfill('0') << std::setw(12) << ordinal;
  return out.str();
}
Json schedule(const std::string& start) {
  Json events = Json::array(); int ordinal = 0; std::string first_takeout;
  const auto add = [&](int day, int hour, int minute, const std::string& type, const std::string& merchant,
                       const std::string& category, int cents, Json details = Json::object()) {
    details["id"] = uuid(++ordinal); details["day"] = day + 1; details["date"] = date_offset(start, day);
    details["at"] = local_at(details["date"], hour, minute); details["occurredAt"] = timestamp(details["at"]);
    details["type"] = type; details["merchant"] = merchant; details["category"] = category;
    details["amountCents"] = cents; details["source"] = "demo";
    events.push_back(details); return details["id"].get<std::string>();
  };
  const int savings[] = {1500,2500,2500,2500,3000,3000,4000};
  const int investing[] = {1000,1000,1500,1500,2000,2000,2500};
  for (int d = 0; d < 14; ++d) {
    if (d == 0 || d == 7 || date_offset(start, d).substr(0, 7) != date_offset(start, d - 1).substr(0, 7))
      add(d, 7, 0, "budget", "Mochi spending plan", "planning", 0, {{"dailyLimitCents", d < 7 ? 7500 : 2500}, {"monthlyLimitCents", d < 7 ? 200000 : 175000}});
    if (d == 0 || d == 7) {
      add(d, 9, 0, "income", "Maple Studio payroll (simulated)", "salary", 125000);
      add(d, 10, 0, "expense", "Shared apartment rent", "bills", 32500, {{"planned", true}});
      add(d, 10, 15, "expense", "Transit weekly pass", "transport", 2500, {{"planned", true}});
    }
    // Every calendar date contains small planned household activity.
    add(d, 8, 0, "expense", "Corner market essentials", "food", 275, {{"planned", true}});
    if (d < 7) {
      if (d < 5) add(d, 8, 30, "expense", "Neighbourhood coffee", "food", 525);
      if (d < 6) {
        const auto id = add(d, 12, 30, "expense", d % 2 ? "Bento Sushi takeout" : "Pita Kitchen takeout", "food", 1800 + d * 75,
                           {{"name", "Takeout"}});
        if (first_takeout.empty()) first_takeout = "txn-" + id;
      }
      if (d == 1 || d == 4 || d == 6) add(d, 17, 15, "expense", "QuickCart impulse order", "shopping", 2200 + d * 300);
      if (d == 2) {
        add(d, 15, 0, "expense", "Indigo unplanned books", "shopping", 3500);
        add(d, 15, 40, "expense", "Game shop impulse buy", "entertainment", 2400);
        add(d, 16, 15, "expense", "Accessories pop-up", "shopping", 1800);
        add(d, 18, 0, "expense", "Mobile phone bill", "bills", 4500, {{"planned", true}});
      }
      if (d == 5) add(d, 20, 0, "expense", "Cinema and snacks", "entertainment", 4500);
      if (d == 5) add(d, 7, 30, "expense", "Music subscription", "bills", 1099, {{"planned", true}});
      if (d == 1 || d == 5) add(d, 19, 0, "savings_contribution", "Emergency fund transfer", "savings", 500);
      if (d == 5) add(d, 19, 15, "investment_contribution", "Simulated index fund contribution", "investment", 500);
      if (d == 2 || d == 4) add(d, 19, 30, "lesson", "Mochi savings lesson", "education", 0,
                               {{"lessonId", "potential-vs-confirmed"}, {"selectedOptionId", d == 2 ? "skip" : "save"}});
      if (d == 3) add(d, 20, 0, "reflection", "Worth-It: early takeout", "reflection", 0,
                      {{"transactionId", first_takeout}, {"verdict", "not_worth_it"}});
      if (d == 6) add(d, 20, 0, "decision", "Skipped another delivery order", "positive_decision", 3000);
    } else {
      if (d == 7 || d == 10) add(d, 11, 0, "expense", "No Frills meal-prep groceries", "food", d == 7 ? 4800 : 3200, {{"planned", true}});
      if (d == 8 || d == 12) add(d, 8, 30, "expense", "Planned coffee treat", "food", 325, {{"planned", true}});
      if (d == 9) add(d, 12, 30, "expense", "Pita Kitchen planned takeout", "food", 1600, {{"name", "Takeout"}, {"planned", true}});
      add(d, 18, 0, "savings_contribution", "Emergency fund transfer", "savings", savings[d - 7]);
      add(d, 18, 15, "investment_contribution", "Simulated index fund contribution", "investment", investing[d - 7]);
      add(d, 19, 0, "decision", "Skipped an impulse purchase", "positive_decision", 2000 + (d - 7) * 500);
      if (d == 8) add(d, 19, 15, "lesson", "Mochi budget lesson", "education", 0,
                      {{"lessonId", "budget-target"}, {"selectedOptionId", "limit"}});
      add(d, 20, 0, "check_in", "Explicit financial check-in", "check_in", 0);
      if (d == 9 || d == 13) add(d, 21, 0, "investment_return", "SIMULATED illustrative gain (not a forecast)", "investment", d == 9 ? 7 : 12);
    }
  }
  std::sort(events.begin(), events.end(), [](const Json& a, const Json& b) {
    return a.at("at") != b.at("at") ? a.at("at") < b.at("at") : a.at("id") < b.at("id");
  });
  return events;
}
}
Json sandbox_snapshot(const std::string& start, int day, const Json& persisted_schedule) {
  if (day < 1 || day > 14) throw std::runtime_error("Sandbox day must be an integer from 1 to 14");
  (void)date_offset(start, 14);
  const auto year = std::stoi(start.substr(0, 4));
  if (year < 1971 || year > 9998) throw std::runtime_error("Sandbox start year must be 1971..9998");
  const auto events = persisted_schedule.is_null() ? schedule(start) : persisted_schedule;
  const auto selected = date_offset(start, day - 1);
  const auto clock = local_at(date_offset(start, day), 0, 0) - 1;
  Json state = empty_state(), requests = Json::array(), ledger = Json::array();
  apply_action(state, Action::onboard, validate_input(Action::onboard,
    {{"petName", "Mochi"}, {"goalTitle", "Emergency fund (sandbox)"}, {"goalTarget", 200},
     {"letter", {{"vision", "Build a calm financial cushion."}, {"why", "More choices for future me."}, {"reminder", "Small consistent steps count."}}}}), start);
  state["account"]["demoSeeded"] = true;
  std::int64_t cash = 25000, income = 0, spending = 0, saved = 0, invested = 0, returns = 0;
  for (const auto& event : events) {
    if (event.at("at").get<std::int64_t>() > clock) continue;
    const auto type = event.at("type").get<std::string>();
    const auto cents = event.at("amountCents").get<std::int64_t>();
    const auto at = event.at("at").get<std::int64_t>();
    const auto date = event.at("date").get<std::string>();
    const auto prior_coins = state["account"]["coins"].get<std::int64_t>();
    const auto prior_xp = state["account"]["xp"].get<std::int64_t>();
    Json input = {{"requestId", event.at("id")}}; std::string endpoint;
    if (type == "income") { cash += cents; income += cents; }
    else if (type == "expense") {
      input.update({{"name", event.value("name", event.at("merchant").get<std::string>())}, {"amount", cents / 100.0},
        {"category", event.at("category")}, {"occurredAt", event.at("occurredAt")}, {"planned", event.value("planned", false)}});
      input = validate_input(Action::transaction, input);
      apply_finance_action(state, Action::transaction, input, at);
      state["finance"]["transactions"].back()["source"] = "demo";
      cash -= cents; spending += cents; endpoint = "/api/transactions";
    } else if (type == "budget") {
      apply_finance_action(state, Action::budget, {{"month", date.substr(0, 7)}, {"monthlyLimit", event.at("monthlyLimitCents").get<int>() / 100.0},
        {"dailyLimit", event.at("dailyLimitCents").get<int>() / 100.0}, {"categoryLimits", {{"food", 300}, {"shopping", 150}}}}, at);
    } else if (type == "investment_contribution") { cash -= cents; invested += cents; }
    else if (type == "investment_return") returns += cents;
    else if (type == "reflection") {
      input.update({{"transactionId", event.at("transactionId")}, {"verdict", event.at("verdict")}});
      apply_reflection(state, validate_input(Action::reflection, input), at); endpoint = "/api/reflections";
    } else {
      Action action;
      if (type == "savings_contribution") {
        action = Action::savings; input["amount"] = cents / 100.0; cash -= cents; saved += cents; endpoint = "/api/savings";
      } else if (type == "decision") {
        action = Action::decision; input.update({{"itemName", event.at("merchant")}, {"amount", cents / 100.0}, {"decision", "skip"}});
        endpoint = "/api/decisions";
      } else if (type == "lesson") {
        action = Action::lesson; input.update({{"lessonId", event.at("lessonId")}, {"selectedOptionId", event.at("selectedOptionId")}});
        endpoint = "/api/lessons/answer";
      } else if (type == "check_in") { action = Action::check_in; endpoint = "/api/check-ins"; }
      else throw std::runtime_error("Unsupported sandbox ledger event");
      input = validate_input(action, input); apply_action(state, action, input, date, static_cast<std::time_t>(at / 1000));
    }
    if (cash < 0) throw std::runtime_error("Sandbox schedule overdraws cash");
    if (!endpoint.empty()) requests.push_back({{"endpoint", endpoint}, {"input", input}, {"at", at}});
    ledger.push_back({{"id", event.at("id")}, {"occurredAt", event.at("occurredAt")}, {"date", date},
      {"merchant", event.at("merchant")}, {"category", event.at("category")}, {"type", type},
      {"amountCents", cents}, {"source", "demo"}, {"cashAfterCents", cash},
      {"reward", {{"coins", state["account"]["coins"].get<std::int64_t>() - prior_coins},
                   {"xp", state["account"]["xp"].get<std::int64_t>() - prior_xp}}}});
  }
  validate_stored_state(state);
  return {{"state", state}, {"requests", requests}, {"metadata", {{"dataset", "mochi-sandbox-14-v1"},
    {"startDate", start}, {"selectedDay", day}, {"date", selected}, {"clockMillis", clock}, {"schedule", events}, {"ledger", ledger},
    {"balancesCents", {{"openingCash", 25000}, {"income", income}, {"expenses", spending}, {"cash", cash},
      {"savingsContributions", saved}, {"investmentContributions", invested}, {"simulatedInvestmentReturn", returns}, {"simulatedInvestmentValue", invested + returns}}}}}};
}
Json sandbox_ledger(const Json& metadata) {
  if (metadata.is_null() || metadata.value("dataset", "") != "mochi-sandbox-14-v1") throw std::runtime_error("Sandbox is not initialized");
  Json output = {{"dataset", metadata.at("dataset")}, {"startDate", metadata.at("startDate")},
    {"selectedDay", metadata.at("selectedDay")}, {"date", metadata.at("date")}, {"currency", "CAD"},
    {"notice", "Synthetic activity only. Investment gains are simulated illustrations, not actual returns or forecasts."},
    {"entries", metadata.at("ledger")}, {"balances", Json::object()}};
  for (auto& entry : output["entries"]) { entry["amount"] = entry.at("amountCents").get<std::int64_t>() / 100.0; entry.erase("amountCents");
    entry["cashAfter"] = entry.at("cashAfterCents").get<std::int64_t>() / 100.0; entry.erase("cashAfterCents"); }
  for (const auto& [key, value] : metadata.at("balancesCents").items()) output["balances"][key] = value.get<std::int64_t>() / 100.0;
  return output;
}
}
