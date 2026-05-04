#include "crow.h"
#include "unordered_map"

using namespace std;

struct graph {
    unordered_map<int, int[]> 
}   

int main()
{
    crow::SimpleApp app;

    CROW_ROUTE(app, "/")([](){
        return "Hello world";
    });

    app.port(18080).multithreaded().run();
}