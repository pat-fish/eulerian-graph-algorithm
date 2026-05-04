cmake_minimum_required(VERSION 3.15)
project(my_api LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Prefer a system-installed Crow package, fall back to FetchContent if not found
find_package(Crow CONFIG QUIET)

if(NOT TARGET Crow::Crow)
	include(FetchContent)
	FetchContent_Declare(
		crow
		GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
		GIT_TAG        master
	)
	FetchContent_MakeAvailable(crow)
endif()

add_executable(my_api main.cpp)
target_compile_definitions(my_api PRIVATE _WIN32_WINNT=0x0601)

if(TARGET Crow::Crow)
	target_link_libraries(my_api PRIVATE Crow::Crow)
else()
	# If the Crow target wasn't created by the upstream CMake, add include dir
	if(DEFINED crow_SOURCE_DIR)
		target_include_directories(my_api PRIVATE ${crow_SOURCE_DIR}/include)
	endif()
endif()