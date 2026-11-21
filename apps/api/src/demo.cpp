#include "demo.hpp"
#include <algorithm>
#include <array>
#include <iomanip>
#include <sstream>

namespace mochi {
namespace {
std::string utc_timestamp(std::int64_t millis) {
  const auto seconds = static_cast<std::time_t>(millis / 1000);
  std::tm utc{};
  if (!gmtime_r(&seconds, &utc)) throw std::runtime_error("Cannot format demo timestamp");
  std::ostringstream out;
  out << std::put_time(&utc, "%Y-%m-%dT%H:%M:%S") << '.' << std::setfill('0') << std::setw(3) << millis % 1000 << 'Z';
  return out.str();
}
}
std::size_t seed_forest_demo(Database& db, std::int64_t now_ms) {
  constexpr std::int64_t hour_ms = 60LL * 60 * 1000;
  std::size_t added = 0;
  db.mutate("", "/cli/demo/forest", Json::object(), [&](Json& state) {
    if (state.at("account").is_null()) throw ApiError(404, "NOT_INITIALIZED", "Onboard before seeding forest examples.");
    auto& transactions = state["finance"]["transactions"];
    const auto insert = [&](const std::string& id, const std::string& name, const std::string& category,
                            std::int64_t amount_cents, std::int64_t occurred_at) {
      auto existing = std::find_if(transactions.begin(), transactions.end(), [&](const Json& t) { return t.at("id") == id; });
      if (existing != transactions.end()) {
        // Never overwrite a user's record, or a review already saved on this demo.
        if (existing->at("source") != "demo" || existing->at("name") != name || existing->at("category") != category || existing->at("amountCents") != amount_cents)
          throw ApiError(409, "REQUEST_ID_CONFLICT", "A forest demo transaction ID is already in use.");
        return;
      }
      transactions.push_back({{"id", id}, {"name", name}, {"amountCents", amount_cents}, {"category", category},
        {"occurredAt", utc_timestamp(occurred_at)}, {"planned", false}, {"source", "demo"}, {"reflection", nullptr}});
      ++added;
    };
    for (int i = 0; i < 3; ++i)
      insert("txn-demo-forest-takeout-" + std::to_string(i + 1), "Takeout", "food", 1800, now_ms - (72 - i) * hour_ms);
    const std::array<std::string, 3> names = {"Demo bookstore", "Demo movie", "Demo art supplies"};
    const std::array<std::int64_t, 3> amounts = {1200, 800, 1500};
    for (int i = 0; i < 3; ++i)
      insert("txn-demo-forest-cluster-" + std::to_string(i + 1), names[i], i == 1 ? "entertainment" : "shopping", amounts[i], now_ms - 3 * hour_ms + i * hour_ms / 2);
    state["account"]["demoSeeded"] = true;
  });
  return added;
}
}
