#include "engagement.hpp"
#include <algorithm>
#include <array>
#include <iomanip>
#include <vector>
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
    // Completed reviews survive the longer v2 delay unchanged, including a new-ID retry.
    if (!reflection.is_null()) return;
    if (now_ms - timestamp_millis(t.at("occurredAt")) < reflection_delay_ms)
      throw ApiError(409, "REFLECTION_NOT_DUE", "Reflection opens after 48 hours.");
    t["reflection"] = {{"verdict", input.at("verdict")}, {"reflectedAt", iso_utc(now_ms)}};
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
    if (t.at("reflection").is_null() && now_ms - timestamp_millis(t.at("occurredAt")) >= reflection_delay_ms) result.push_back(transaction_view(t));
  return result;
}
Json discretionary_clusters(const Json& state, std::int64_t now_ms) {
  require_account(state);
  constexpr std::int64_t window_ms = 4LL * 60 * 60 * 1000;
  constexpr std::int64_t lookback_ms = 7LL * 24 * 60 * 60 * 1000;
  struct Purchase { const Json* transaction; std::int64_t at; };
  Json result = Json::array();
  // Keep observed and synthetic evidence separate. These categories are the
  // conservative discretionary subset; food/transport/bills/other are excluded.
  for (const auto* source : std::array{"manual", "demo"}) {
    std::vector<Purchase> purchases;
    for (const auto& t : state.at("finance").at("transactions")) {
      if (t.at("source") != source || (t.at("category") != "shopping" && t.at("category") != "entertainment")) continue;
      const auto at = timestamp_millis(t.at("occurredAt"));
      if (at > now_ms || now_ms - at > lookback_ms) continue;
      purchases.push_back({&t, at});
    }
    std::sort(purchases.begin(), purchases.end(), [](const Purchase& a, const Purchase& b) {
      return a.at != b.at ? a.at < b.at : a.transaction->at("id").get<std::string>() < b.transaction->at("id").get<std::string>();
    });
    std::size_t right = 0, previous_end = 0;
    for (std::size_t left = 0; left < purchases.size(); ++left) {
      while (right < purchases.size() && purchases[right].at - purchases[left].at <= window_ms) ++right;
      // Omit windows fully contained in an already reported window.
      if (right - left < 3 || right <= previous_end) continue;
      previous_end = right;
      std::int64_t total = 0;
      for (auto i = left; i < right; ++i) total += purchases[i].transaction->at("amountCents").get<std::int64_t>();
      const auto count = right - left;
      result.push_back({{"id", std::string("cluster-") + source + "-" + purchases[left].transaction->at("id").get<std::string>() + "-" + purchases[right - 1].transaction->at("id").get<std::string>()},
        {"kind", "frequency"}, {"title", std::to_string(count) + " purchases within four hours"},
        {"description", "You recorded " + std::to_string(count) + " shopping and entertainment purchases within four hours."},
        {"evidence", {{"count", count}, {"windowDays", 4.0 / 24.0}, {"totalAmount", total / 100.0}}},
        {"source", source}, {"suggestion", "Consider reviewing this group of purchases."}});
    }
  }
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
  for (const auto& insight : discretionary_clusters(state, now_ms)) result.push_back(insight);
  return result;
}
}
