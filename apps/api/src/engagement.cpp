#include "engagement.hpp"
#include <iomanip>
#include <sstream>

namespace mochi {
namespace {
void require_account(const Json& state) {
  if (state.at("account").is_null()) throw ApiError(404, "NOT_INITIALIZED", "Set up Mochi before using this action.");
}
std::string iso_utc(std::int64_t millis) {
  const auto seconds = static_cast<std::time_t>(millis / 1000); std::tm utc{};
  if (!gmtime_r(&seconds, &utc)) throw std::runtime_error("Cannot format timestamp");
  std::ostringstream out; out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << '.' << std::setfill('0') << std::setw(3) << millis % 1000 << 'Z';
  return out.str();
}
}
void apply_reflection(Json& state, const Json& input, std::int64_t now_ms) {
  require_account(state);
  for (auto& t : state["finance"]["transactions"]) {
    if (t.at("id") != input.at("transactionId")) continue;
    const auto& reflection = t.at("reflection");
    if (!reflection.is_null() && reflection.at("verdict") != input.at("verdict"))
      throw ApiError(409, "REFLECTION_EXISTS", "This transaction has already been reflected on.");
    if (now_ms - timestamp_millis(t.at("occurredAt")) < 86400000)
      throw ApiError(409, "REFLECTION_NOT_DUE", "Reflection opens after 24 hours.");
    if (reflection.is_null()) t["reflection"] = {{"verdict", input.at("verdict")}, {"reflectedAt", iso_utc(now_ms)}};
    return;
  }
  throw ApiError(404, "NOT_FOUND", "Transaction not found.");
}
Json reflection_response(const Json& state, const Json& input, const std::string& day) {
  for (const auto& t : state.at("finance").at("transactions")) if (t.at("id") == input.at("transactionId"))
    return {{"transaction", transaction_view(t)}, {"state", app_state(state, day)}};
  throw ApiError(404, "NOT_FOUND", "Transaction not found.");
}
Json due_reflections(const Json& state, std::int64_t now_ms) {
  require_account(state); Json result = Json::array();
  for (const auto& t : state.at("finance").at("transactions"))
    if (t.at("reflection").is_null() && now_ms - timestamp_millis(t.at("occurredAt")) >= 86400000) result.push_back(transaction_view(t));
  return result;
}
Json spending_insights(const Json& state, std::int64_t now_ms) {
  require_account(state); std::vector<Json> groups;
  for (const auto& t : state.at("finance").at("transactions")) {
    const auto elapsed = now_ms - timestamp_millis(t.at("occurredAt"));
    if (elapsed < 0 || elapsed > 7LL * 86400000) continue;
    auto group = std::find_if(groups.begin(), groups.end(), [&](const Json& item) {
      return item.at("name") == t.at("name") && item.at("source") == t.at("source");
    });
    if (group == groups.end()) groups.push_back({{"id", t.at("id")}, {"name", t.at("name")}, {"source", t.at("source")}, {"count", 1}, {"totalCents", t.at("amountCents")}});
    else { (*group)["count"] = group->at("count").get<int>() + 1; (*group)["totalCents"] = group->at("totalCents").get<std::int64_t>() + t.at("amountCents").get<std::int64_t>(); }
  }
  Json result = Json::array();
  for (const auto& group : groups) {
    const int count = group.at("count"); if (count < 3) continue;
    const auto name = group.at("name").get<std::string>(), source = group.at("source").get<std::string>();
    result.push_back({{"id", "frequency-" + source + "-" + group.at("id").get<std::string>()}, {"kind", "frequency"},
      {"title", name + " showed up " + std::to_string(count) + " times this week"},
      {"description", "You recorded " + std::to_string(count) + " " + name + " purchases in the last seven days."},
      {"evidence", {{"count", count}, {"windowDays", 7}, {"totalAmount", group.at("totalCents").get<std::int64_t>() / 100.0}}},
      {"source", source}, {"suggestion", "Consider a small spending challenge that suits you."}});
  }
  return result;
}
}
