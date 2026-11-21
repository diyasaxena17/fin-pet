#include "game_logic.hpp"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <iomanip>
#include <regex>
#include <sstream>
#include <vector>

namespace mochi {
namespace {
[[noreturn]] void invalid() { throw ApiError(400, "INVALID_REQUEST", "Invalid request data."); }
void fields(const Json& input, std::initializer_list<const char*> required,
            std::initializer_list<const char*> optional = {}) {
  if (!input.is_object()) invalid();
  for (const auto* key : required) if (!input.contains(key)) invalid();
  for (const auto& [key, value] : input.items()) {
    (void)value;
    const auto matches = [&](const char* expected) { return key == expected; };
    if (std::none_of(required.begin(), required.end(), matches) &&
        std::none_of(optional.begin(), optional.end(), matches)) invalid();
  }
}
struct Rune { std::size_t begin, end; unsigned value; };
std::vector<Rune> runes(const std::string& text) {
  std::vector<Rune> result;
  for (std::size_t i = 0; i < text.size();) {
    const auto start = i;
    const auto lead = static_cast<unsigned char>(text[i++]);
    unsigned cp = lead;
    int count = 0;
    if (lead >= 0xc2 && lead <= 0xdf) { count = 1; cp = lead & 0x1f; }
    else if (lead >= 0xe0 && lead <= 0xef) { count = 2; cp = lead & 0x0f; }
    else if (lead >= 0xf0 && lead <= 0xf4) { count = 3; cp = lead & 7; }
    else if (lead >= 0x80) invalid();
    for (int j = 0; j < count; ++j) {
      if (i == text.size()) invalid();
      const auto next = static_cast<unsigned char>(text[i++]);
      if ((next & 0xc0) != 0x80) invalid();
      cp = (cp << 6) | (next & 0x3f);
    }
    if ((count == 1 && cp < 0x80) || (count == 2 && cp < 0x800) ||
        (count == 3 && cp < 0x10000) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) invalid();
    result.push_back({start, i, cp});
  }
  return result;
}
bool whitespace(unsigned cp) {
  return (cp >= 9 && cp <= 13) || cp == 32 || cp == 0xa0 || cp == 0x1680 ||
      (cp >= 0x2000 && cp <= 0x200a) || cp == 0x2028 || cp == 0x2029 ||
      cp == 0x202f || cp == 0x205f || cp == 0x3000 || cp == 0xfeff;
}
std::string text(const Json& value, std::size_t max, bool trim) {
  if (!value.is_string()) invalid();
  auto result = value.get<std::string>();
  const auto chars = runes(result);
  auto begin = chars.begin(), end = chars.end();
  if (trim) {
    while (begin != end && whitespace(begin->value)) ++begin;
    while (begin != end && whitespace((end - 1)->value)) --end;
  }
  std::size_t units = 0;
  for (auto i = begin; i != end; ++i) units += i->value > 0xffff ? 2 : 1;
  if (units > max || (trim && units == 0)) invalid();
  if (begin == end) return "";
  return result.substr(begin->begin, (end - 1)->end - begin->begin);
}
void letter(const Json& value) {
  fields(value, {"vision", "why", "reminder"});
  for (const auto* key : {"vision", "why", "reminder"}) text(value.at(key), 4000, false);
}
std::chrono::year_month_day date(const std::string& value) {
  static const std::regex format("^[0-9]{4}-[0-9]{2}-[0-9]{2}$");
  if (!std::regex_match(value, format)) invalid();
  const auto parsed = std::chrono::year(std::stoi(value.substr(0, 4))) /
      std::chrono::month(static_cast<unsigned>(std::stoi(value.substr(5, 2)))) /
      std::chrono::day(static_cast<unsigned>(std::stoi(value.substr(8, 2))));
  if (!parsed.ok()) invalid();
  return parsed;
}
void uuid(const Json& value) {
  static const std::regex format(
      "^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|"
      "00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$", std::regex::icase);
  if (!value.is_string() || !std::regex_match(value.get<std::string>(), format)) invalid();
}
std::int64_t integer(const Json& value, std::int64_t max = max_safe) {
  if (!value.is_number()) invalid();
  const double v = value.get<double>();
  if (!std::isfinite(v) || v < 0 || v > static_cast<double>(max) || std::floor(v) != v) invalid();
  return static_cast<std::int64_t>(v);
}
void add(Json& value, std::int64_t increment) {
  const auto current = value.get<std::int64_t>();
  if (increment > max_safe - current) throw ApiError(409, "LIMIT_EXCEEDED", "This amount exceeds the supported balance.");
  value = current + increment;
}
}
int level_for(std::int64_t xp) { return xp >= 250 ? 3 : xp >= 100 ? 2 : 1; }
std::int64_t money_cents(const Json& value, bool allow_zero) {
  if (!value.is_number()) invalid();
  const double amount = value.get<double>();
  if (!std::isfinite(amount) || amount < (allow_zero ? 0 : 0.01) || amount > 1e9) invalid();
  const auto scaled = amount * 100;
  if (std::abs(scaled - std::round(scaled)) >= 0.00001) invalid();
  return static_cast<std::int64_t>(std::round(scaled));
}
Json validate_input(Action action, Json input) {
  switch (action) {
    case Action::onboard:
      fields(input, {"petName", "goalTitle", "goalTarget", "letter"}, {"goalDate"});
      input["petName"] = text(input.at("petName"), 200, true);
      input["goalTitle"] = text(input.at("goalTitle"), 200, true);
      money_cents(input.at("goalTarget")); letter(input.at("letter"));
      if (input.contains("goalDate")) {
        if (!input.at("goalDate").is_string()) invalid();
        date(input.at("goalDate").get<std::string>());
      }
      break;
    case Action::letter: fields(input, {"letter"}); letter(input.at("letter")); break;
    case Action::decision:
      fields(input, {"requestId", "itemName", "amount", "decision"});
      input["itemName"] = text(input.at("itemName"), 200, true);
      if (input.at("decision") != "skip" && input.at("decision") != "buy") invalid();
      money_cents(input.at("amount")); uuid(input.at("requestId")); break;
    case Action::savings:
      fields(input, {"requestId", "amount"}); money_cents(input.at("amount")); uuid(input.at("requestId")); break;
    case Action::feed:
      fields(input, {"requestId", "petId"}); uuid(input.at("requestId"));
      if (input.at("petId") != "mochi-01") invalid();
      break;
    case Action::quest:
      fields(input, {"requestId", "questId"}); uuid(input.at("requestId"));
      if (input.at("questId") != "daily-check-in") invalid();
      break;
    case Action::seed:
      fields(input, {}, {"xp", "coins", "confirmedSaved"});
      if (input.contains("xp")) {
        const auto xp = integer(input.at("xp"), 250);
        if (xp != 0 && xp != 100 && xp != 250) invalid();
      }
      if (input.contains("coins")) integer(input.at("coins"), 1000000);
      if (input.contains("confirmedSaved")) money_cents(input.at("confirmedSaved"), true);
      break;
    case Action::reset: fields(input, {}); break;
    case Action::gesture:
      fields(input, {"gesture"}); if (input.at("gesture") != "open_palm") invalid(); break;
  }
  return input;
}
void configure_timezone(const std::string& zone) {
  if (zone.empty() || zone.front() == '/' || zone.find("..") != std::string::npos ||
      !std::filesystem::is_regular_file(std::filesystem::path("/usr/share/zoneinfo") / zone))
    throw std::runtime_error("DEMO_TIME_ZONE must name an installed IANA time zone");
  if (setenv("TZ", zone.c_str(), 1) != 0) throw std::runtime_error("Cannot set time zone");
  tzset(); // Called once at startup, before HTTP workers are started.
}
std::string local_day(std::time_t now) {
  std::tm calendar{};
  if (!localtime_r(&now, &calendar)) throw std::runtime_error("Cannot read local date");
  std::ostringstream result; result << std::put_time(&calendar, "%Y-%m-%d"); return result.str();
}
std::string previous_day(const std::string& day) {
  const auto previous = std::chrono::year_month_day(std::chrono::sys_days(date(day)) - std::chrono::days(1));
  std::ostringstream result;
  result << std::setfill('0') << std::setw(4) << static_cast<int>(previous.year()) << '-'
         << std::setw(2) << static_cast<unsigned>(previous.month()) << '-'
         << std::setw(2) << static_cast<unsigned>(previous.day());
  return result.str();
}
Json empty_state() {
  return {{"version", 1}, {"account", nullptr}, {"reactionSeq", 0}, {"reactionType", nullptr}, {"lastGestureAt", 0}};
}
void validate_stored_state(const Json& state) {
  try {
    fields(state, {"version", "account", "reactionSeq", "reactionType", "lastGestureAt"});
    if (state.at("version") != 1) invalid();
    integer(state.at("reactionSeq")); integer(state.at("lastGestureAt"));
    const auto& reaction = state.at("reactionType");
    if (!reaction.is_null() && reaction != "feed" && reaction != "level_up" && reaction != "greeting") invalid();
    const auto& a = state.at("account");
    if (a.is_null()) return;
    fields(a, {"petName", "hunger", "mood", "coins", "xp", "goalTitle", "targetCents", "savedCents", "potentialCents",
               "goalDate", "letter", "lastQuestDate", "streakDays", "demoSeeded"});
    text(a.at("petName"), 200, true); text(a.at("goalTitle"), 200, true); letter(a.at("letter"));
    integer(a.at("hunger"), 100);
    for (const auto* key : {"coins", "xp", "targetCents", "savedCents", "potentialCents", "streakDays"}) integer(a.at(key));
    if (a.at("targetCents") == 0 || (a.at("mood") != "neutral" && a.at("mood") != "happy") || !a.at("demoSeeded").is_boolean()) invalid();
    for (const auto* key : {"goalDate", "lastQuestDate"}) if (!a.at(key).is_null()) {
      if (!a.at(key).is_string()) invalid();
      date(a.at(key).get<std::string>());
    }
  } catch (const std::exception&) { throw std::runtime_error("Corrupt or incompatible Mochi state"); }
}
Json app_state(const Json& state, const std::string& day) {
  const auto& a = state.at("account");
  if (a.is_null()) return {{"initialized", false}};
  const auto today = day.empty() ? local_day() : day;
  const int level = level_for(a.at("xp").get<std::int64_t>());
  const bool completed = a.at("lastQuestDate") == today;
  Json features = {"spending", "goal", "feed", "basicProjection", "letter"};
  if (level >= 2) { features.push_back("dailyQuest"); features.push_back("streak"); }
  if (level == 3) features.push_back("expandedProjection");
  const auto saved = a.at("savedCents").get<std::int64_t>(), target = a.at("targetCents").get<std::int64_t>();
  auto original_letter = a.at("letter");
  original_letter["revealedSections"] = (saved * 4 >= target ? 1 : 0) + (saved * 2 >= target ? 1 : 0) + (saved >= target ? 1 : 0);
  return {
    {"initialized", true},
    {"pet", {{"id", "mochi-01"}, {"name", a.at("petName")}, {"hunger", a.at("hunger")}, {"mood", a.at("mood")}}},
    {"wallet", {{"coins", a.at("coins")}, {"xp", a.at("xp")}, {"level", level}, {"nextLevelXp", level == 3 ? Json(nullptr) : Json(level == 2 ? 250 : 100)}}},
    {"goal", {{"title", a.at("goalTitle")}, {"targetAmount", target / 100.0}, {"confirmedSaved", saved / 100.0},
      {"potentialSavings", a.at("potentialCents").get<std::int64_t>() / 100.0},
      {"progressPercent", std::min(100.0, static_cast<double>(saved) / static_cast<double>(target) * 100)}, {"goalDate", a.at("goalDate")}}},
    {"letter", original_letter}, {"unlockedFeatures", features},
    {"quest", {{"id", "daily-check-in"}, {"available", level >= 2 && !completed}, {"completedToday", completed},
      {"streakDays", completed || a.at("lastQuestDate") == previous_day(today) ? a.at("streakDays") : Json(0)}}},
    {"demoSeeded", a.at("demoSeeded")}
  };
}
void emit_reaction(Json& state, const std::string& type) {
  add(state["reactionSeq"], 1); state["reactionType"] = type;
}
void apply_action(Json& state, Action action, const Json& input, const std::string& day) {
  (void)day;
  if (action == Action::reset) {
    // Retain the hardware sequence across account resets to avoid stale baselines.
    const auto seq = state.at("reactionSeq"); state = empty_state(); state["reactionSeq"] = seq; return;
  }
  auto& a = state["account"];
  if (action == Action::onboard) {
    if (!a.is_null()) throw ApiError(409, "ALREADY_INITIALIZED", "Mochi is already set up.");
    a = {{"petName", input.at("petName")}, {"hunger", 50}, {"mood", "neutral"}, {"coins", 0}, {"xp", 0},
      {"goalTitle", input.at("goalTitle")}, {"targetCents", money_cents(input.at("goalTarget"))}, {"savedCents", 0}, {"potentialCents", 0},
      {"goalDate", input.value("goalDate", Json(nullptr))}, {"letter", input.at("letter")}, {"lastQuestDate", nullptr}, {"streakDays", 0}, {"demoSeeded", false}};
    return;
  }
  if (a.is_null()) throw ApiError(404, "NOT_INITIALIZED", "Set up Mochi before using this action.");
  const int before_level = level_for(a.at("xp").get<std::int64_t>());
  switch (action) {
    case Action::letter: a["letter"] = input.at("letter"); break;
    case Action::decision:
      if (input.at("decision") == "skip") {
        const auto cents = money_cents(input.at("amount"));
        add(a["coins"], std::min<std::int64_t>((cents + 99) / 100, 100));
        add(a["xp"], 20); add(a["potentialCents"], cents);
      }
      break;
    case Action::savings: add(a["savedCents"], money_cents(input.at("amount"))); add(a["xp"], 30); break;
    default: throw std::runtime_error("Action is not implemented yet");
  }
  if (level_for(a.at("xp").get<std::int64_t>()) > before_level) emit_reaction(state, "level_up");
}
}
