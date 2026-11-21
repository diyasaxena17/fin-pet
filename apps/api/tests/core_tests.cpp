#include "database.hpp"
#include "game_logic.hpp"
#include "engagement.hpp"
#include "learning.hpp"
#include "demo.hpp"
#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <thread>
#include <unistd.h>
#include <vector>

using namespace mochi;
namespace {
void check(bool condition, const std::string& message) {
  if (!condition) throw std::runtime_error(message);
}
template<class Fn> void error(Fn fn, const std::string& code) {
  try { fn(); } catch (const ApiError& e) { check(e.code == code, "Wrong error: " + e.code); return; }
  throw std::runtime_error("Expected error: " + code);
}
const Json onboarding = {{"petName", "  Mochi  "}, {"goalTitle", "Emergency fund"}, {"goalTarget", 200},
  {"goalDate", "2028-02-29"}, {"letter", {{"vision", "  My future\n"}, {"why", "My reasons"}, {"reminder", "Small steps count."}}}};
const std::string today = "2026-11-21";
std::string id(int n) {
  std::ostringstream out; out << "00000000-0000-4000-8000-" << std::setfill('0') << std::setw(12) << n; return out.str();
}
std::string endpoint(Action action) {
  if (action == Action::decision) return "/api/decisions";
  return "/test/" + std::to_string(static_cast<int>(action));
}
Json run(Database& db, Action action, const Json& raw, const std::string& day = today) {
  const auto input = validate_input(action, raw);
  return app_state(db.mutate(input.value("requestId", std::string{}), endpoint(action), input,
    [&](Json& state) { apply_action(state, action, input, day); }, action == Action::reset), day);
}
void economy() {
  Database db(":memory:");
  check(app_state(db.read()) == Json{{"initialized", false}}, "Fresh state");
  error([&] { run(db, Action::savings, {{"requestId", id(1)}, {"amount", 50}}); }, "NOT_INITIALIZED");
  auto state = run(db, Action::onboard, onboarding);
  check(state["pet"]["name"] == "Mochi" && state["letter"]["vision"] == "  My future\n", "Trim names; preserve letter");
  error([&] { run(db, Action::onboard, onboarding); }, "ALREADY_INITIALIZED");
  const Json decision = {{"requestId", id(1)}, {"itemName", " Hoodie "}, {"amount", 60}, {"decision", "skip"}};
  state = run(db, Action::decision, decision);
  check(state["wallet"]["coins"] == 60 && state["wallet"]["xp"] == 20, "Skip rewards");
  check(state["goal"]["potentialSavings"] == 60 && state["goal"]["confirmedSaved"] == 0, "Potential separate");
  check(run(db, Action::decision, decision) == state, "Decision replay");
  state = run(db, Action::savings, {{"requestId", id(2)}, {"amount", 50}});
  check(state["wallet"]["xp"] == 50 && state["goal"]["progressPercent"] == 25 && state["letter"]["revealedSections"] == 1, "First letter milestone");
  check(run(db, Action::decision, decision) == state, "Retry returns current state");
  const auto bought = run(db, Action::decision, {{"requestId", id(3)}, {"itemName", "Lunch"}, {"amount", 10}, {"decision", "buy"}});
  check(bought == state, "Buy has no penalty or reward");
  state = run(db, Action::savings, {{"requestId", id(4)}, {"amount", 50}});
  check(state["letter"]["revealedSections"] == 2, "50% letter");
  state = run(db, Action::savings, {{"requestId", id(5)}, {"amount", 100}});
  check(state["letter"]["revealedSections"] == 3 && state["wallet"]["level"] == 2, "Full letter and level 2");
  const Json letter = {{"vision", "Changed\n  "}, {"why", ""}, {"reminder", "Original author"}};
  check(run(db, Action::letter, {{"letter", letter}})["letter"]["vision"] == letter["vision"], "Letter editing");
  state = run(db, Action::decision, {{"requestId", id(6)}, {"itemName", "Large"}, {"amount", 1000.01}, {"decision", "skip"}});
  check(state["wallet"]["coins"] == 160, "100 coin cap");
  state = run(db, Action::decision, {{"requestId", id(7)}, {"itemName", "Fraction"}, {"amount", 0.01}, {"decision", "skip"}});
  check(state["wallet"]["coins"] == 161, "Ceiling coin award");
  state = run(db, Action::savings, {{"requestId", id(8)}, {"amount", .1}});
  check(state["goal"]["progressPercent"] == 100 && db.read()["account"]["savedCents"] == 20010, "Cents and capped progress");
}
void validation() {
  for (const Json& value : std::vector<Json>{nullptr, "5", true, -1, 0, .001, 10.999, 1000000000.01})
    error([&] { money_cents(value); }, "INVALID_REQUEST");
  check(money_cents(.29) == 29 && money_cents(1000000000) == 100000000000LL, "Money boundaries");
  for (auto changed : {Json{{"goalDate", "2027-02-29"}}, Json{{"petName", " \t"}}, Json{{"goalDate", nullptr}}, Json{{"extra", true}}}) {
    auto input = onboarding; input.update(changed);
    error([&] { validate_input(Action::onboard, input); }, "INVALID_REQUEST");
  }
  auto input = onboarding; input["petName"] = "\xE3\x80\x80Mochi\xC2\xA0";
  check(validate_input(Action::onboard, input)["petName"] == "Mochi", "Unicode trimming");
  std::string emoji;
  for (int i = 0; i < 101; ++i) emoji += "\xF0\x9F\x90\xB1";
  input["petName"] = emoji;
  error([&] { validate_input(Action::onboard, input); }, "INVALID_REQUEST");
  error([&] { validate_input(Action::savings, {{"requestId", "bad"}, {"amount", 5}}); }, "INVALID_REQUEST");
}
void atomicity() {
  Database db(":memory:"); run(db, Action::onboard, onboarding);
  auto before = db.read();
  try {
    db.mutate(id(1), "/test", {}, [](Json& state) { state["account"]["coins"] = 100; throw std::runtime_error("Injected failure"); });
    throw std::logic_error("Failure expected");
  } catch (const std::runtime_error&) {}
  check(db.read() == before, "Callback rollback");
  run(db, Action::savings, {{"requestId", id(1)}, {"amount", 1}});
  check(db.read()["account"]["savedCents"] == 100, "Failed ID can be retried");
  db.mutate("", "", {}, [](Json& state) { state["account"]["xp"] = max_safe; });
  before = db.read();
  error([&] { run(db, Action::savings, {{"requestId", id(2)}, {"amount", 1}}); }, "LIMIT_EXCEEDED");
  check(db.read() == before, "Overflow rolls back savings and ID");
}
void concurrency() {
  Database db(":memory:"); run(db, Action::onboard, onboarding);
  std::vector<std::thread> workers; std::atomic<bool> failed = false;
  for (int i = 0; i < 10; ++i) workers.emplace_back([&, i] {
    try {
      run(db, Action::savings, {{"requestId", id(i + 1)}, {"amount", .1}});
      run(db, Action::savings, {{"requestId", id(50)}, {"amount", .1}});
    } catch (...) { failed = true; }
  });
  for (auto& worker : workers) worker.join();
  const auto state = app_state(db.read(), today);
  check(!failed && state["goal"]["confirmedSaved"] == 1.1 && state["wallet"]["xp"] == 330, "Concurrent writes and duplicate requests");
  check(state["wallet"]["level"] == 3 && state["wallet"]["nextLevelXp"].is_null(), "Level 3");
  check(db.read()["reactionSeq"] == 2, "Exactly one reaction per crossed level");
}
void feeding_and_quests() {
  Database db(":memory:"); run(db, Action::onboard, onboarding);
  const Json feed = {{"requestId", id(1)}, {"petId", "mochi-01"}};
  const auto before = db.read();
  error([&] { run(db, Action::feed, feed); }, "INSUFFICIENT_COINS");
  check(db.read() == before, "Insufficient feed must not mutate");
  run(db, Action::seed, {{"coins", 40}, {"xp", 100}});
  check(db.read()["reactionSeq"] == 0, "Seed creates no earned reaction");
  auto state = run(db, Action::feed, feed);
  check(state["wallet"]["coins"] == 20 && state["wallet"]["xp"] == 100 && state["pet"]["hunger"] == 80, "Feed");
  const auto hardware = device_state(db.read());
  check(hardware.size() == 5 && hardware["reactionSeq"] == 1 && hardware["reactionType"] == "feed", "Private hardware projection");
  check(run(db, Action::feed, feed) == state && device_state(db.read()) == hardware, "Feed replay");
  state = run(db, Action::feed, {{"requestId", id(2)}, {"petId", "mochi-01"}});
  check(state["pet"]["hunger"] == 100 && state["wallet"]["coins"] == 0, "Fullness cap");
  state = run(db, Action::quest, {{"requestId", id(3)}, {"questId", "daily-check-in"}});
  check(state["wallet"]["xp"] == 120 && state["wallet"]["coins"] == 10 && state["quest"]["streakDays"] == 1, "Daily reward");
  check(run(db, Action::quest, {{"requestId", id(4)}, {"questId", "daily-check-in"}}) == state, "Same day fresh ID no reward");
  state = run(db, Action::quest, {{"requestId", id(5)}, {"questId", "daily-check-in"}}, "2026-11-22");
  check(state["quest"]["streakDays"] == 2, "Consecutive streak");
  const auto elapsed = app_state(db.read(), "2026-11-24");
  check(elapsed["quest"]["streakDays"] == 0 && elapsed["wallet"]["xp"] == 140, "Missed day keeps earned progress");
  state = run(db, Action::quest, {{"requestId", id(6)}, {"questId", "daily-check-in"}}, "2026-11-24");
  check(state["quest"]["streakDays"] == 1, "Missed day restarts consecutive streak");
  check(previous_day("2028-03-01") == "2028-02-29" && previous_day("2027-01-01") == "2026-12-31", "Calendar arithmetic");
  using namespace std::chrono;
  const auto utc = sys_days(year(2026)/11/22) + hours(4) + minutes(59);
  check(local_day(system_clock::to_time_t(utc)) == "2026-11-21", "Toronto before midnight");
  check(local_day(system_clock::to_time_t(utc + minutes(1))) == "2026-11-22", "Toronto midnight");
  const auto dst = sys_days(year(2026)/3/8) + hours(7);
  check(local_day(system_clock::to_time_t(dst)) == "2026-03-08", "DST calendar day");
  auto stored = db.read();
  apply_action(stored, Action::gesture, {{"gesture", "open_palm"}}, today, 100);
  const auto seq = stored["reactionSeq"];
  apply_action(stored, Action::gesture, {{"gesture", "open_palm"}}, today, 101);
  check(stored["reactionSeq"] == seq, "Gesture cooldown");
  apply_action(stored, Action::gesture, {{"gesture", "open_palm"}}, today, 103);
  check(stored["reactionSeq"] == seq.get<int>() + 1 && stored["reactionType"] == "greeting", "Greeting after cooldown");
}
void reflection_boundary() {
  auto state = empty_state(); apply_action(state, Action::onboard, validate_input(Action::onboard, onboarding), today);
  auto transaction = validate_input(Action::transaction, {{"requestId", id(101)}, {"name", "Book"}, {"amount", .29},
    {"category", "other"}, {"occurredAt", "2026-11-20T12:00:00Z"}});
  apply_finance_action(state, Action::transaction, transaction, timestamp_millis("2026-11-21T12:00:00Z"));
  const Json reflection = {{"requestId", id(102)}, {"transactionId", "txn-" + id(101)}, {"verdict", "worth_it"}};
  const auto boundary = timestamp_millis("2026-11-22T12:00:00Z");
  const auto unreviewed = state;
  check(due_reflections(state, boundary - 60000).empty(), "47h59m purchase is not due");
  check(state == unreviewed, "Due list is read-only");
  check(due_reflections(state, boundary - 86400000).empty(), "24 hours is not due in v2");
  check(due_reflections(state, boundary - 1).empty(), "Before reflection boundary");
  check(due_reflections(state, boundary).size() == 1, "Exact reflection boundary");
  error([&] { apply_reflection(state, reflection, boundary - 1); }, "REFLECTION_NOT_DUE");
  check(state == unreviewed, "Early reflection error leaves state unchanged");
  auto missing = reflection; missing["transactionId"] = "missing";
  error([&] { apply_reflection(state, missing, boundary); }, "NOT_FOUND");
  check(state == unreviewed, "Missing transaction error leaves state unchanged");
  apply_reflection(state, reflection, boundary);
  auto expected = unreviewed;
  expected["finance"]["transactions"][0]["reflection"] =
    {{"verdict", "worth_it"}, {"reflectedAt", "2026-11-22T12:00:00.000Z"}};
  check(state == expected, "Only attached reflection changes; account, cents and source are preserved");
  auto conflicting = reflection; conflicting["verdict"] = "unsure";
  error([&] { apply_reflection(state, conflicting, boundary); }, "REFLECTION_EXISTS");
  check(state == expected, "Conflicting verdict leaves original judgement unchanged");
  check(due_reflections(state, boundary).empty() && state["account"]["xp"] == 0, "Reflection grants no reward");
  const auto completed = state["finance"]["transactions"][0]["reflection"];
  apply_reflection(state, reflection, boundary - 86400000);
  check(state["finance"]["transactions"][0]["reflection"] == completed, "Existing v1 review stays stable under the v2 delay");
  for (const auto* source : std::array{"manual", "demo"}) {
    for (const auto* verdict : std::array{"worth_it", "unsure", "not_worth_it"}) {
      auto fixture = unreviewed;
      fixture["finance"]["transactions"][0]["source"] = source;
      auto input = reflection; input["verdict"] = verdict;
      input = validate_input(Action::reflection, input);
      const auto original_account = fixture["account"];
      apply_reflection(fixture, input, boundary);
      const auto& saved = fixture["finance"]["transactions"][0];
      check(saved["reflection"]["verdict"] == verdict && saved["source"] == source,
            "All frozen verdicts preserve manual/demo source");
      check(fixture["account"] == original_account && due_reflections(fixture, boundary).empty(),
            "All verdicts remove due item without changing goals or wallet");
    }
  }
  check(timestamp_millis("2026-11-01T01:00:00+14:00") == timestamp_millis("2026-10-31T11:00:00Z"), "Offset instant");
  for (const auto& [saved, stage] : std::vector<std::pair<double, std::string>>{{49.99, "seedling"}, {50, "sapling"}, {100, "young"}, {150, "mature"}, {200, "thriving"}}) {
    apply_action(state, Action::seed, {{"confirmedSaved", saved}}, today);
    check(app_state(state, today)["forest"]["treeStage"] == stage, "Shared tree boundary");
  }
}

void insight_windows() {
  auto state = empty_state(); apply_action(state, Action::onboard, validate_input(Action::onboard, onboarding), today);
  auto& transactions = state["finance"]["transactions"];
  for (int i = 0; i < 3; ++i) transactions.push_back({{"id", "cluster-" + std::to_string(i)}, {"name", "Purchase " + std::to_string(i)},
    {"amountCents", (i + 1) * 100}, {"category", i == 1 ? "entertainment" : "shopping"},
    {"occurredAt", std::array{"2026-11-21T08:00:00Z", "2026-11-21T09:00:00Z", "2026-11-21T12:00:00Z"}[i]},
    {"planned", true}, {"source", "manual"}, {"reflection", nullptr}});
  const auto now = timestamp_millis("2026-11-21T12:00:00Z");
  const auto before = state;
  const auto clusters = discretionary_clusters(state, now);
  check(clusters.size() == 1 && clusters[0]["evidence"]["count"] == 3 && clusters[0]["evidence"]["totalAmount"] == 6, "Exact four-hour cluster and cents total");
  check(clusters[0]["evidence"]["windowDays"] == 4.0 / 24.0 && state == before, "Existing evidence shape and read-only computation");
  std::reverse(transactions.begin(), transactions.end());
  check(discretionary_clusters(state, now) == clusters, "Stable result independent of insertion order");
  transactions = before["finance"]["transactions"];
  transactions[0]["occurredAt"] = "2026-11-21T07:59:59.999Z";
  check(discretionary_clusters(state, now).empty(), "Four hours plus one millisecond is not a cluster");
  transactions = before["finance"]["transactions"];
  transactions[0]["source"] = "demo";
  check(discretionary_clusters(state, now).empty(), "Do not mix manual and demo evidence");
  transactions = before["finance"]["transactions"];
  for (auto t : before["finance"]["transactions"]) { t["id"] = "demo-" + t["id"].get<std::string>(); t["source"] = "demo"; transactions.push_back(t); }
  check(discretionary_clusters(state, now).size() == 2, "Separate manual/demo clusters");
  for (auto& t : transactions) t["category"] = "bills";
  check(discretionary_clusters(state, now).empty(), "Do not classify bills as discretionary");
  transactions = before["finance"]["transactions"];
  for (auto& t : transactions) { t["name"] = "Takeout"; t["category"] = "food"; t["occurredAt"] = "2026-11-14T12:00:00Z"; }
  check(spending_insights(state, now)[0]["evidence"]["count"] == 3, "Seven-day frequency boundary included");
  transactions[0]["occurredAt"] = "2026-11-14T11:59:59.999Z";
  check(spending_insights(state, now).empty(), "Older than seven days excluded");
}


void insight_acceptance() {
  auto state = empty_state();
  apply_action(state, Action::onboard, validate_input(Action::onboard, onboarding), today);
  auto& transactions = state["finance"]["transactions"];
  const auto now = timestamp_millis("2026-11-21T12:00:00Z");
  const auto purchase = [](const std::string& id, const std::string& at, int cents,
                           const std::string& name, const std::string& category,
                           const std::string& source = "manual") {
    return Json{{"id", id}, {"occurredAt", at}, {"amountCents", cents}, {"name", name},
      {"category", category}, {"source", source}, {"planned", false}, {"reflection", nullptr}};
  };
  check(spending_insights(state, now).empty(), "Empty records produce no insight");
  transactions.push_back(purchase("b", "2026-11-21T08:00:00Z", 2, "Book", "shopping"));
  transactions.push_back(purchase("a", "2026-11-21T04:00:00-04:00", 1, "Game", "entertainment"));
  check(spending_insights(state, now).empty(), "Two discretionary purchases do not qualify");
  transactions.push_back(purchase("c", "2026-11-21T12:00:00Z", 3, "Shoes", "shopping"));
  const auto cluster = spending_insights(state, now);
  check(cluster.size() == 1 && cluster[0]["id"] == "cluster-manual-a-c", "Tied timestamps use ID order");
  check(cluster[0]["evidence"] == Json{{"count", 3}, {"windowDays", 4.0/24.0}, {"totalAmount", .06}}, "Exact four-hour window totals cents");
  const auto snapshot = state;
  for (int i = 0; i < 3; ++i) check(spending_insights(state, now) == cluster, "Repeated reads have stable IDs and evidence");
  check(state == snapshot, "Insight reads do not mutate stored state");
  for (auto& t : transactions) t["occurredAt"] = "2026-11-21T12:00:00.001Z";
  check(spending_insights(state, now).empty(), "Future discretionary transactions are excluded");
  for (auto& t : transactions) t["occurredAt"] = "2026-11-14T11:59:59.999Z";
  check(spending_insights(state, now).empty(), "Clusters older than the contract lookback are excluded");
  transactions = snapshot["finance"]["transactions"];
  transactions.push_back(purchase("d", "2026-11-21T09:00:00Z", 4, "Cinema", "entertainment"));
  auto cards = spending_insights(state, now);
  check(cards.size() == 1 && cards[0]["evidence"]["count"] == 4 && cards[0]["evidence"]["totalAmount"] == .10,
        "Contained windows do not produce duplicate cards");
  transactions[0]["occurredAt"] = "2026-11-21T07:59:59.999Z";
  cards = discretionary_clusters(state, now);
  check(cards.size() == 2 && cards[0]["id"] != cards[1]["id"], "Different overlapping maximal windows have distinct IDs");

  transactions = Json::array();
  for (int i = 0; i < 2; ++i)
    transactions.push_back(purchase("takeout-" + std::to_string(i), "2026-11-14T12:00:00Z", 1801, "Takeout", "food"));
  check(spending_insights(state, now).empty(), "Two takeouts do not qualify");
  transactions.push_back(purchase("old", "2026-11-14T11:59:59.999Z", 9999, "Takeout", "food"));
  transactions.push_back(purchase("future", "2026-11-21T12:00:00.001Z", 9999, "Takeout", "food"));
  transactions.push_back(purchase("demo-only", "2026-11-21T11:00:00Z", 9999, "Takeout", "food", "demo"));
  check(spending_insights(state, now).empty(), "Old, future and different-source entries cannot complete a group");
  transactions.push_back(purchase("takeout-2", "2026-11-21T12:00:00Z", 1801, "Takeout", "food"));
  cards = spending_insights(state, now);
  check(cards.size() == 1 && cards[0]["id"] == "frequency-manual-takeout-0", "One deterministic takeout card");
  check(cards[0]["source"] == "manual" && cards[0]["evidence"] == Json{{"count", 3}, {"windowDays", 7}, {"totalAmount", 54.03}},
        "Inclusive seven-day boundary and exact manual evidence");
  transactions.push_back(purchase("demo-2", "2026-11-21T10:00:00Z", 1, "Takeout", "food", "demo"));
  transactions.push_back(purchase("demo-3", "2026-11-21T09:00:00Z", 2, "Takeout", "food", "demo"));
  cards = spending_insights(state, now);
  check(cards.size() == 2 && cards[1]["source"] == "demo" && cards[1]["evidence"]["totalAmount"] == 100.02,
        "Demo frequency uses only demo evidence");
  const auto final_snapshot = state;
  check(spending_insights(state, now) == cards && state == final_snapshot, "Frequency reads are repeatable and read-only");
  for (const auto& card : cards) {
    check(card.size() == 7 && card["kind"] == "frequency" && !card["suggestion"].get<std::string>().empty(),
          "Frozen insight shape and constructive suggestion");
  }
}


void daily_report_calendar() {
  auto state = empty_state();
  apply_action(state, Action::onboard, validate_input(Action::onboard, onboarding), today);
  const auto report_at = [&](const char* instant) {
    const auto seconds = std::chrono::floor<std::chrono::seconds>(
      std::chrono::milliseconds(timestamp_millis(instant))).count();
    return daily_report(state, local_day(static_cast<std::time_t>(seconds)));
  };
  const auto empty = report_at("2026-12-01T04:59:59.999Z");
  check(empty == Json{{"date", "2026-11-30"}, {"spentToday", 0}, {"dailyLimit", nullptr},
    {"underDailyLimit", nullptr}, {"achievement", nullptr}, {"insight", "Your financial check-in is ready"},
    {"completedToday", false}, {"streakDays", 0}, {"availableReward", {{"coins", 0}, {"xp", 0}}}},
    "Empty level-one report has frozen shape, unknown target and no earned activity");
  check(state["account"]["savedCents"] == 0 && state["account"]["lastQuestDate"].is_null(),
        "Empty report creates neither savings nor check-in");
  apply_action(state, Action::seed, {{"xp", 100}}, today);
  for (const auto* month : {"2026-11", "2026-12", "2026-03"})
    apply_finance_action(state, Action::budget, {{"month", month}, {"monthlyLimit", 500}, {"dailyLimit", 25}}, 0);
  const auto add_purchase = [&](int n, const char* instant, double amount) {
    auto input = validate_input(Action::transaction, {{"requestId", id(n)}, {"name", "Meal"},
      {"amount", amount}, {"category", "food"}, {"occurredAt", instant}});
    apply_finance_action(state, Action::transaction, input, timestamp_millis("2026-12-02T00:00:00Z"));
  };
  add_purchase(201, "2026-12-01T04:59:59.999Z", 18);
  add_purchase(202, "2026-12-01T05:00:00Z", .29);
  apply_action(state, Action::check_in, {{"requestId", id(203)}}, "2026-11-30", timestamp_millis("2026-11-30T12:00:00Z") / 1000);
  const auto snapshot = state;
  const auto before = report_at("2026-12-01T04:59:59.999Z");
  check(before["date"] == "2026-11-30" && before["spentToday"] == 18 && before["underDailyLimit"] == true,
        "18 dollars against 25 uses Toronto day before midnight");
  check(before["completedToday"] == true && before["availableReward"] == Json{{"coins", 0}, {"xp", 0}},
        "Report uses completed authoritative check-in");
  const auto after = report_at("2026-12-01T05:00:00Z");
  check(after["date"] == "2026-12-01" && after["spentToday"] == .29 && after["dailyLimit"] == 25,
        "Midnight selects new month's budget and only its local-day spending");
  check(after["completedToday"] == false && after["streakDays"] == 1 &&
        after["availableReward"] == Json{{"coins", 10}, {"xp", 20}}, "Next-day reward remains merely available");
  check(report_at("2026-12-02T05:00:00Z")["streakDays"] == 0, "Missed day projects expired streak");
  for (int i = 0; i < 3; ++i) check(report_at("2026-12-01T05:00:00Z") == after, "Repeated fixed-time reports are deterministic");
  check(state == snapshot, "Reports do not change rewards, reaction, streak or saved state");
  const auto quest = app_state(state, "2026-12-01")["quest"];
  check(after["completedToday"] == quest["completedToday"] && after["streakDays"] == quest["streakDays"],
        "Report does not use a duplicate check-in counter");
  add_purchase(204, "2026-12-01T12:00:00-05:00", 24.71);
  check(report_at("2026-12-01T18:00:00Z")["underDailyLimit"] == true, "Exact daily limit is within target");
  add_purchase(205, "2026-12-01T13:00:00-05:00", .01);
  const auto over = report_at("2026-12-01T19:00:00Z");
  check(over["spentToday"] == 25.01 && over["underDailyLimit"] == false && over["achievement"].is_null(),
        "One cent over target produces no false achievement");
  apply_finance_action(state, Action::budget, {{"month", "2026-12"}, {"monthlyLimit", 500}}, 0);
  const auto untargeted = report_at("2026-12-01T19:00:00Z");
  check(untargeted["spentToday"] == 25.01 && untargeted["dailyLimit"].is_null() &&
        untargeted["underDailyLimit"].is_null() && untargeted["achievement"].is_null(),
        "Recorded spending without a daily target makes no success/failure claim");
  // Toronto's spring-forward day is 23 hours; both sides of the jump are March 8.
  add_purchase(206, "2026-03-08T06:59:59.999Z", 1);
  add_purchase(207, "2026-03-08T07:00:00Z", 2);
  add_purchase(208, "2026-03-09T04:00:00Z", 4);
  check(report_at("2026-03-08T07:00:00Z")["spentToday"] == 3, "DST jump stays in one calendar day");
  check(report_at("2026-03-09T04:00:00Z")["spentToday"] == 4, "DST midnight excludes previous local day");
}


void demo_clock_reproducibility() {
  Database db(":memory:");
  run(db, Action::onboard, onboarding);
  const auto start = timestamp_millis("2026-11-21T12:00:00Z");
  const auto later = start + 8LL * 86400000;
  auto manual = validate_input(Action::transaction, {{"requestId", id(301)}, {"name", "Manual book"},
    {"amount", 9.29}, {"category", "shopping"}, {"occurredAt", "2026-11-20T12:00:00Z"}});
  db.mutate(id(301), "/api/transactions", manual, [&](Json& state) {
    apply_finance_action(state, Action::transaction, manual, start);
  });
  const auto initial = db.read();
  check(seed_forest_demo(db, start) == 6, "Fresh demo creates six examples");
  const auto fresh = db.read();
  check(fresh["account"]["coins"] == initial["account"]["coins"] && fresh["account"]["xp"] == initial["account"]["xp"],
        "Demo creates no reward");
  const auto insights = spending_insights(fresh, start);
  check(insights.size() == 2 && due_reflections(fresh, start).size() == 3, "Fresh demo shows both patterns and overdue reviews");
  check(seed_forest_demo(db, start) == 0 && db.read() == fresh, "Same-clock reseed is byte-equivalent state");
  check(seed_forest_demo(db, start + 1000) == 0 && db.read() == fresh, "Nearby clock does not drift timestamps");
  check(spending_insights(fresh, later).empty(), "Fixture demonstrates stale examples after eight days");
  check(seed_forest_demo(db, later) == 0, "Refreshing adds no rows");
  const auto refreshed = db.read();
  check(refreshed["finance"]["transactions"].size() == 7 && refreshed["finance"]["transactions"][0] == initial["finance"]["transactions"][0],
        "Refresh preserves manual transaction and row count");
  check(spending_insights(refreshed, later) == insights, "Refresh restores identical insight IDs and evidence");
  check(seed_forest_demo(db, later) == 0 && db.read() == refreshed, "Refreshed seed is idempotent");
  check(refreshed["account"] == fresh["account"] && refreshed["reactionSeq"] == fresh["reactionSeq"],
        "Refresh preserves progress and reactions");
  bool replay_applied = false;
  db.mutate(id(301), "/api/transactions", manual, [&](Json&) { replay_applied = true; });
  check(!replay_applied, "Refresh retains successful manual request IDs");
  check(seed_forest_demo(db, start) == 0 && spending_insights(db.read(), start) == insights,
        "Moving the controlled demo clock back re-anchors future examples without duplicates");
  check(seed_forest_demo(db, later) == 0 && db.read() == refreshed, "Returning to later clock is reproducible");
  // Preserve the user's saved review and its purchase time even across clock refresh.
  const auto due = due_reflections(refreshed, later);
  const auto demo_due = std::find_if(due.begin(), due.end(), [](const Json& t) { return t.at("source") == "demo"; });
  check(demo_due != due.end(), "Refreshed demo has an overdue synthetic purchase");
  const Json review = {{"requestId", id(302)}, {"transactionId", demo_due->at("id")}, {"verdict", "unsure"}};
  db.mutate(id(302), "/api/reflections", review, [&](Json& state) { apply_reflection(state, review, later); });
  const auto reviewed = db.read()["finance"]["transactions"][1];
  seed_forest_demo(db, later + 8LL * 86400000);
  check(db.read()["finance"]["transactions"][1] == reviewed, "Saved judgement and purchase time are not rewritten");

  Database collision(":memory:"); run(collision, Action::onboard, onboarding);
  auto conflicting = initial["finance"]["transactions"][0];
  conflicting["id"] = "txn-demo-forest-cluster-3";
  collision.mutate("", "/test", Json::object(), [&](Json& state) { state["finance"]["transactions"].push_back(conflicting); });
  const auto before = collision.read();
  error([&] { seed_forest_demo(collision, start); }, "REQUEST_ID_CONFLICT");
  check(collision.read() == before, "Late demo-ID collision rolls back all earlier inserts");
}

}
int main() {
  try {
    configure_timezone("America/Toronto");
    economy(); validation(); atomicity(); concurrency(); feeding_and_quests(); reflection_boundary(); insight_windows(); insight_acceptance(); daily_report_calendar(); demo_clock_reproducibility();
    std::cout << "Economy, validation, transactions, concurrency, feeding, quests, timezone passed\n";
  } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
