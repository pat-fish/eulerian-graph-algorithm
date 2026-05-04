cmake_minimum_required(VERSION 3.15)
project(my_api)

set(CMAKE_CXX_STANDARD 17)

find_package(Crow CONFIG REQUIRED)

add_executable(my_api main.cpp)
target_link_libraries(my_api PRIVATE Crow::Crow)