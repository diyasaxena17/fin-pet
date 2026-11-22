#include "sandbox.hpp"
#include "engagement.hpp"
#include "learning.hpp"
#include <iostream>
#include <set>
using namespace mochi;
namespace {
void check(bool value, const char* message) { if (!value) throw std::runtime_error(message); }
void progression(const std::string& start) {
  const auto first = sandbox_snapshot(start, 1);
  const auto schedule = first.at("metadata").at("schedule");
  std::int64_t prior_saved = 0;
  for (int day = 1; day <= 14; ++day) {
    const auto snapshot = sandbox_snapshot(start, day, schedule);
    const auto& meta = snapshot.at("metadata"); const auto& state = snapshot.at("state");
    const auto view = app_state(state, meta.at("date"));
    const auto report = daily_report(state, meta.at("date"));
    std::int64_t cash = 25000, spending_today = 0; std::size_t expenses = 0;
    for (const auto& entry : meta.at("ledger")) {
      const auto amount = entry.at("amountCents").get<std::int64_t>();
      const auto type = entry.at("type").get<std::string>();
      check(timestamp_millis(entry.at("occurredAt")) <= meta.at("clockMillis").get<std::int64_t>(), "Future event leaked to ledger");
      check(entry.at("source") == "demo" && !entry.at("merchant").get<std::string>().empty(), "Missing provenance/merchant");
      if (type == "income") cash += amount;
      if (type == "expense" || type == "savings_contribution" || type == "investment_contribution") cash -= amount;
      check(cash == entry.at("cashAfterCents").get<std::int64_t>(), "Per-entry cash conservation failed");
      if (type == "expense") {
        ++expenses;
        if (entry.at("date") == meta.at("date")) spending_today += amount;
      }
    }
    check(state.at("finance").at("transactions").size() == expenses, "Non-expense counted as spending");
    for (const auto& transaction : state.at("finance").at("transactions"))
      check(timestamp_millis(transaction.at("occurredAt")) <= meta.at("clockMillis").get<std::int64_t>(), "Future expense leaked to API state");
    check(report.at("spentToday").get<double>() == spending_today / 100.0, "Report not scoped to selected local day");
    check(report.at("dailyLimit") == (day < 8 ? 75 : 25), "Historical target leaked across days/months");
    check(report.at("completedToday") == (day >= 8), "Check-in history incorrect");
    check(report.at("streakDays") == (day >= 8 ? day - 7 : 0), "Historical streak incorrect");
    const auto saved = state.at("account").at("savedCents").get<std::int64_t>();
    check(saved >= prior_saved && saved == meta.at("balancesCents").at("savingsContributions"), "Savings goal disagrees with ledger");
    prior_saved = saved;
    check(sandbox_snapshot(start, day, schedule) == snapshot, "Replay is not deterministic");
    if (day == 3) {
      bool takeout = false, cluster = false;
      for (const auto& insight : spending_insights(state, meta.at("clockMillis"))) {
        takeout = takeout || insight.at("title").get<std::string>().starts_with("Takeout");
        cluster = cluster || insight.at("id").get<std::string>().starts_with("cluster-");
      }
      check(takeout && cluster, "Week one lacks frequency/cluster evidence");
      check(!due_reflections(state, meta.at("clockMillis")).empty(), "48-hour purchase missing from due list");
    }
    if (day == 2) check(due_reflections(state, meta.at("clockMillis")).empty(), "Early reflection became due");
    if (day == 9) check(view.at("forest").at("treeStage") == "sapling" && view.at("letter").at("revealedSections") == 1, "Day 9 goal milestone incorrect");
    if (day == 11) check(view.at("forest").at("treeStage") == "young" && view.at("letter").at("revealedSections") == 2, "Day 11 goal milestone incorrect");
    if (day == 13) check(view.at("forest").at("treeStage") == "mature", "Day 13 goal milestone incorrect");
    if (day == 14) {
      check(view.at("forest").at("treeStage") == "thriving" && view.at("letter").at("revealedSections") == 3, "Day 14 completion incorrect");
      check(view.at("wallet").at("xp") == 590 && view.at("wallet").at("coins") == 355, "Reward totals incorrect");
      for (const auto& insight : spending_insights(state, meta.at("clockMillis")))
        check(!insight.at("title").get<std::string>().starts_with("Takeout") &&
              !insight.at("id").get<std::string>().starts_with("cluster-"), "Week one patterns leaked past trailing window");
    }
  }
  const auto week1 = sandbox_snapshot(start, 7, schedule).at("metadata").at("balancesCents");
  const auto final = sandbox_snapshot(start, 14, schedule).at("metadata");
  const auto balances = final.at("balancesCents");
  check(week1.at("expenses") == 79174 && balances.at("expenses") == 126349, "Expense fixture arithmetic changed");
  check(balances.at("cash") == 116651 && balances.at("income") == 250000, "Final cash/income incorrect");
  check(balances.at("savingsContributions") == 20000 && balances.at("investmentContributions") == 12000,
        "Savings and investment principals were combined");
  check(balances.at("simulatedInvestmentReturn") == 19 && balances.at("simulatedInvestmentValue") == 12019,
        "Illustrative return accounting incorrect");
  check(balances.at("expenses").get<int>() - week1.at("expenses").get<int>() < week1.at("expenses").get<int>(), "Week two did not reduce spending");
  std::set<std::string> dates;
  for (const auto& entry : final.at("ledger")) dates.insert(entry.at("date"));
  check(dates.size() == 14, "Dataset lacks 14 consecutive activity days");
  const auto visible = sandbox_ledger(final);
  check(!visible.contains("schedule") && visible.at("balances").at("simulatedInvestmentReturn") == .19, "Private schedule leaked or gains mislabeled");
}
void storage() {
  Database db(":memory:"); const auto snapshot = sandbox_snapshot("2026-11-08", 14);
  db.save_sandbox(snapshot); check(db.read() == snapshot.at("state"), "Snapshot persistence failed");
  check(db.sandbox_metadata() == snapshot.at("metadata"), "Clock/ledger persistence failed");
  db.save_sandbox(sandbox_snapshot("2026-11-08", 3));
  check(db.read() == sandbox_snapshot("2026-11-08", 3).at("state"), "Rewind retained future state");
  Database real(":memory:");
  real.mutate("", "/api/onboarding", Json::object(), [&](Json& state) { state = snapshot.at("state"); });
  const auto before = real.read(); bool refused = false;
  try { real.save_sandbox(snapshot); } catch (const std::exception&) { refused = true; }
  check(refused && real.read() == before && real.sandbox_metadata().is_null(), "Unowned database was overwritten");
}
}
int main() {
  try {
    configure_timezone("America/Toronto");
    progression("2026-11-08"); progression("2026-11-25"); progression("2026-03-01"); storage();
    for (const int day : {0, 15}) {
      bool rejected = false; try { sandbox_snapshot("2026-11-08", day); } catch (const std::exception&) { rejected = true; }
      check(rejected, "Invalid clock day accepted");
    }
    for (const auto* start : {"2026-02-30", "1969-12-01", "not-a-date"}) {
      bool rejected = false; try { sandbox_snapshot(start, 1); } catch (const std::exception&) { rejected = true; }
      check(rejected, "Invalid start date accepted");
    }
    std::cout << "Sandbox conservation, progression, milestones, DST, rewind and isolation passed\n";
  } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
}
