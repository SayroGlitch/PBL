
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>

// TimSort
#include "Algoritmi/timsort_Bogdan.h"
#include "Algoritmi/timsort_Bogdan.c"
// Radix Sort
#include "Algoritmi/radix_sort.c"
#include "Algoritmi/radix_sort.h"
// Quick Sort (temporar)
#include "Algoritmi/quick_sort.c"
#include "Algoritmi/quick_sort.h"
// Selection Sort (temporar)
#include "Algoritmi/selection_sort.c"
#include "Algoritmi/selection_sort.h"
// Merge Sort (temporar)
#include "Algoritmi/merge_sort.c"
#include "Algoritmi/merge_sort.h"


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

int main() {
    int optiune, n_elemente, tip_ordine, output_dest;
    char filename[150], ordine_str[20];
    struct timespec start, end;

    while (1) {
        afiseaza_meniu();
        if (scanf("%d", &optiune) != 1 || optiune == 0) break;

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
        sprintf(filename, "inputs/input_%d_%s.txt", n_elemente, ordine_str);

        FILE *fin = fopen(filename, "r");
        if (!fin) {
            printf(" Eroare: We can't find file %s.Check inputs folder \n", filename);
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
        timespec_get(&start, TIME_UTC);

        switch (optiune) {
            case 1: timSort(arr, n_elemente); break; 
            case 2: radixSort(arr, n_elemente); break;
            case 3: quickSort(arr, 0, n_elemente - 1); break;
            case 4: selectionSort(arr, n_elemente); break;
            case 5: mergeSort(arr, 0, n_elemente - 1); break;
            default: printf("Invalid variant!\n"); break;
        }

        //vedem timpul final
        timespec_get(&end, TIME_UTC);

        // diferenta de secunde
        long long nanosecunde = (long long)(end.tv_sec - start.tv_sec) * 1000000000LL + (end.tv_nsec - start.tv_nsec);

        printf("Where do you want to save results? (1. Screen, 2. out.txt): ");
        scanf("%d", &output_dest);

        if (output_dest == 2) {
            FILE *fout = fopen("out.txt", "a");
            if (fout) {
                for (int i = 0; i < n_elemente; i++) fprintf(fout, "%d ", arr[i]);
                fclose(fout);
                printf("Success! Check file out.txt.\n");
            }
        } else {
            printf("\nSorted vector is:\n");
            for (int i = 0; i < n_elemente; i++) printf("%d ", arr[i]);
            printf("\n");
        }

        printf("\n>>> Time of execution : %lld nanosec <<<\n", nanosecunde);
        printf(">>> Approximate: %.6f milisec <<<\n", (double)nanosecunde / 1000000.0);

        free(arr); //eliberam memoria noastra
    }

    printf("\n");
    return 0;
}
