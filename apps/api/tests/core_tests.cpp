#include "database.hpp"
#include <iostream>

int main() {
  try {
    mochi::Database db(":memory:");
    if (mochi::app_state(db.read()) != mochi::Json{{"initialized", false}})
      throw std::runtime_error("Fresh state must be uninitialized");
    std::cout << "Fresh SQLite state passed\n";
  } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
}
