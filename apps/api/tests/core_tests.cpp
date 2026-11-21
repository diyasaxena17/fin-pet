#include "database.hpp"
#include "game_logic.hpp"
#include "engagement.hpp"
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
  check(due_reflections(state, boundary - 86400000).empty(), "24 hours is not due in v2");
  check(due_reflections(state, boundary - 1).empty(), "Before reflection boundary");
  check(due_reflections(state, boundary).size() == 1, "Exact reflection boundary");
  error([&] { apply_reflection(state, reflection, boundary - 1); }, "REFLECTION_NOT_DUE");
  apply_reflection(state, reflection, boundary);
  check(due_reflections(state, boundary).empty() && state["account"]["xp"] == 0, "Reflection grants no reward");
  const auto completed = state["finance"]["transactions"][0]["reflection"];
  apply_reflection(state, reflection, boundary - 86400000);
  check(state["finance"]["transactions"][0]["reflection"] == completed, "Existing v1 review stays stable under the v2 delay");
  check(timestamp_millis("2026-11-01T01:00:00+14:00") == timestamp_millis("2026-10-31T11:00:00Z"), "Offset instant");
  for (const auto& [saved, stage] : std::vector<std::pair<double, std::string>>{{49.99, "seedling"}, {50, "sapling"}, {100, "young"}, {150, "mature"}, {200, "thriving"}}) {
    apply_action(state, Action::seed, {{"confirmedSaved", saved}}, today);
    check(app_state(state, today)["forest"]["treeStage"] == stage, "Shared tree boundary");
  }
}

}
int main() {
  try {
    configure_timezone("America/Toronto");
    economy(); validation(); atomicity(); concurrency(); feeding_and_quests(); reflection_boundary();
    std::cout << "Economy, validation, transactions, concurrency, feeding, quests, timezone passed\n";
  } catch (const std::exception& e) { std::cerr << e.what() << '\n'; return 1; }
}
