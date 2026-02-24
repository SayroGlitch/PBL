cmake_minimum_required(VERSION 4.0)
project(PBL C)

set(CMAKE_C_STANDARD 11)

add_executable(PBL
    main.c
    Algoritmi/radix_sort.c
    Algoritmi/merge_sort.c
    Algoritmi/quick_sort.c
    Algoritmi/selection_sort.c
    Algoritmi/timsort_Bogdan.c
)
