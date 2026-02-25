#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <windows.h>
#include <ctype.h>
#include <psapi.h>
// TimSort
#include "Algoritmi/timsort_Bogdan.h"
// Radix Sort
#include "Algoritmi/radix_sort.h"
// Quick Sort (temporar)
#include "Algoritmi/quick_sort.h"
// Selection Sort (temporar)
#include "Algoritmi/selection_sort.h"
// Merge Sort (temporar)
#include "Algoritmi/merge_sort.h"

#define WIN32_LEAN_AND_MEAN

void afiseaza_meniu() {
    printf("\nSELECT ALGORITM:\n");
    printf("1. Tim Sort\n");
    printf("2. Radix Sort\n");
    printf("3. Quick Sort\n");
    printf("4. Selection Sort\n");
    printf("5. Merge Sort\n");
    printf("0. Quit\n");
    printf("You've selected : ");
}

int standart_case() {
    printf("You can also start the program by using arguments.\nYou must use 4 arguments:\n"
           "1.Algorithm(1-5)\n"
           "2.Number of elements:{100, 1000, 10000, 100000, 1000000}\n"
           "3.Initial array order:1.ascendent, 2.descendent, 3.random\n"
           "4.Output:1.Console, 2.File");
    int optiune, n_elemente, tip_ordine, output_dest;
    char filename[150], ordine_str[20];
    LARGE_INTEGER frequency, start, end;
    PROCESS_MEMORY_COUNTERS pmc;

    while (1) {
        afiseaza_meniu();
        if (scanf("%d", &optiune) != 1 || optiune == 0) return 0;

        printf("Insert number of elements for sorting (100, 1000, 10000, 100000, 1000000): ");
        scanf("%d", &n_elemente);

        printf("From the beginning elements are sorted as (1. ascendent, 2. descendent(worst), 3. random): ");
        scanf("%d", &tip_ordine);

        // alegem sub ce forma sa fie elementele de la inceput(pentru complexitate diferita)
        switch (tip_ordine) {
            case 1: strcpy(ordine_str, "ascendent"); break;
            case 2: strcpy(ordine_str, "descendent"); break;
            default: strcpy(ordine_str, "random"); break;
        }

        // concatenam calea la fisierul meu
        sprintf(filename, "PBL/Main/inputs/input_%d_%s.txt", n_elemente, ordine_str);

        FILE *fin = fopen(filename, "r");
        if (!fin) {
            printf(" Eroare: We can't find file %s\nCheck inputs folder\n", filename);
            continue;
        }

        // alocarea dinamica
        int *arr = (int*)malloc(n_elemente * sizeof(int));
        if (!arr) {
            printf(" Error: No memory !\n");
            fclose(fin);
            continue;
        }

        for (int i = 0; i < n_elemente; i++) {
            if (fscanf(fin, "%d", &arr[i]) == EOF) break;
        }
        fclose(fin);

        printf("We sort:\n");

        //masuram in nanosec
        QueryPerformanceFrequency(&frequency);
        QueryPerformanceCounter(&start);

        switch (optiune) {
            case 1: timSort(arr, n_elemente); break;
            case 2: radixSort(arr, n_elemente); break;
            case 3: quickSort(arr, 0, n_elemente - 1); break;
            case 4: selectionSort(arr, n_elemente); break;
            case 5: mergeSort(arr, 0, n_elemente - 1); break;
            default: printf("Invalid variant!\n"); break;
        }

        //vedem timpul final
        QueryPerformanceCounter(&end);

        double time = (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart;

        printf("Where do you want to save results? (1. Screen, 2. out.txt): ");
        scanf("%d", &output_dest);

        if(output_dest == 2) {
            FILE *fout = fopen("PBL/Main/results/out.txt", "a");
            if (fout) {
                for (int i = 0; i < n_elemente; i++) fprintf(fout, "%d ", arr[i]);
                QueryPerformanceCounter(&end);
                double out_time = time + (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart;
                fclose(fout);
                printf("Success! Check file out.txt.\nSorting + File Output time:%.6f seconds\n",out_time);
            }
        } else {
            printf("\nSorted vector is:\n");
            for (int i = 0; i < n_elemente; i++) printf("%d ", arr[i]);
            printf("\n");
        }

        printf("Execution time: %.6f seconds\n", time);
        if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc))) {
            printf("Memory Usage:%zu KB\n", pmc.PagefileUsage / 1024);
        } else {
            printf("Failed to get memory info.\n");
        }
        free(arr); //eliberam memoria noastra
    }
    return 0;
}

int argument_case(char *arg[]) {
    char filename[150], ordine_str[20];
    LARGE_INTEGER frequency, start, end;
    PROCESS_MEMORY_COUNTERS pmc;

    char *endptr;
    long optiune = strtol(arg[1], &endptr, 10);

    if(*endptr != '\0') {
        printf("Invalid number: %s\n", arg[1]);
        return 1;
    }
    endptr = "";
    long n_elemente = strtol(arg[2], &endptr, 10);

    if(*endptr != '\0') {
        printf("Invalid number: %s\n", arg[2]);
        return 1;
    }
    endptr = "";

    long tip_ordine = strtol(arg[3], &endptr, 10);

    if(*endptr != '\0') {
        printf("Invalid number: %s\n", arg[3]);
        return 1;
    }
    endptr = "";

    long output_dest = strtol(arg[4], &endptr, 10);

    if(*endptr != '\0') {
        printf("Invalid number: %s\n", arg[4]);
        return 1;
    }
    endptr = "";

    switch(tip_ordine) {
        case 1: strcpy(ordine_str, "ascendent"); break;
        case 2: strcpy(ordine_str, "descendent"); break;
        default: strcpy(ordine_str, "random"); break;
    }

    // concatenam calea la fisierul meu
    sprintf(filename, "PBL/Main/inputs/input_%ld_%s.txt", n_elemente, ordine_str);

    FILE *fin = fopen(filename, "r");
    if (!fin) {
        printf(" Eroare: We can't find file %s\nCheck inputs folder\n", filename);
    }

    // alocarea dinamica
    int *arr = malloc(n_elemente * sizeof(int));
    if (!arr) {
        printf(" Error: No memory !\n");
        fclose(fin);
    }

    for (int i = 0; i < n_elemente; i++) {
        if (fscanf(fin, "%d", &arr[i]) == EOF) break;
    }
    fclose(fin);

    printf("We sort:\n");

        //masuram in sec
    QueryPerformanceFrequency(&frequency);
    QueryPerformanceCounter(&start);

    switch (optiune) {
        case 1: timSort(arr, n_elemente); break;
        case 2: radixSort(arr, n_elemente); break;
        case 3: quickSort(arr, 0, n_elemente - 1); break;
        case 4: selectionSort(arr, n_elemente); break;
        case 5: mergeSort(arr, 0, n_elemente - 1); break;
        default: printf("Invalid variant!\n"); break;
    }

    //vedem timpul final
    QueryPerformanceCounter(&end);

    //calculam timpul de lucru al algoritmului in secunde
    double time = (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart;

    if (output_dest == 2) {
        FILE *fout = fopen("PBL/Main/results/out.txt", "a");
        if (fout) {
            for (int i = 0; i < n_elemente; i++) fprintf(fout, "%d ", arr[i]);
            QueryPerformanceCounter(&end);
            double out_time = time + (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart;
            fclose(fout);
            printf("Success! Check file out.txt.\nSorting + File Output time:%.6f seconds\n",out_time);
        }
    } else {
        printf("\nSorted vector is:\n");
        for (int i = 0; i < n_elemente; i++) printf("%d ", arr[i]);
        printf("\n");
    }

    printf("Execution time: %.6f seconds\n", time);
    if (GetProcessMemoryInfo(GetCurrentProcess(), &pmc, sizeof(pmc))) {
        printf("Memory Usage:%zu KB\n", pmc.PagefileUsage / 1024);
    } else {
        printf("Failed to get memory info.\n");
    }
    free(arr); //eliberam memoria noastra

    return 0;
}


int main(int argc, char *argv[]) {
    char delete;
    if(argc == 1) standart_case();
    else argument_case(argv);

    FILE *fout = fopen("PBL/Main/results/out.txt", "r");
    if(fout) {
        printf("\nDo you want to delete the output file?(y/n): ");

        scanf(" %c",&delete);
        if(tolower(delete) == 'y') remove("PBL/Main/results/out.txt");
    }
    fclose(fout);
    return 0;
}