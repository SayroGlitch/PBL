#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <time.h>
//tim_sort
#include "Algoritmi/timsort_Bogdan.h"
#include "Algoritmi/timsort_Bogdan.c"
//radix_sort
#include "Algoritmi/radix_sort.c"
#include "Algoritmi/radix_sort.h"
//quick_sort(e temporal)
#include "Algoritmi/quick_sort.c"
#include "Algoritmi/quick_sort.h"
//selection_sort(e temporal)
#include "Algoritmi/selection_sort.c"
#include "Algoritmi/selection_sort.h"
//merge_sort(e temporal)
#include "Algoritmi/merge_sort.c"
#include "Algoritmi/merge_sort.h"


void print_menu() {
    printf("\nAlgorithms:\n");
    printf("1. Tim Sort\n");
    printf("2. Radix Sort\n");
    printf("3. Quick Sort\n");
    printf("4. Selection Sort\n");
    printf("5. Merge Sort\n");
    printf("0. Quit\n");
    printf("Choose one: ");
}

int main() {
    //folosim pentru a masura timp
      
    int optiune, n_elemente, tip_ordine, output_dest;
    char filename[100], ordine_str[20];
    
    while (1) {
        print_menu();
        scanf("%d", &optiune);
        if (optiune == 0) break;

        printf("Numar elemente (100, 1000, 10000, 100000, 1000000): ");
        scanf("%d", &n_elemente);

        printf("Tip ordine (1. Ascendent, 2. Descendent, 3. Random): ");
        scanf("%d", &tip_ordine);
        
        // usor alegem ce sa rulam
        switch(tip_ordine) {
            case 1: strcpy(ordine_str, "ascendent"); break;
            case 2: strcpy(ordine_str, "descendent"); break;
            default: strcpy(ordine_str, "random"); break;
        }
        sprintf(filename, "inputs/input_%d_%s.txt", n_elemente, ordine_str);

        // Citire date din fisier
        FILE *fin = fopen(filename, "r");
        if (!fin) {
            printf("Eroare: Nu s-a putut deschide fisierul %s\n", filename);
            continue;
        }

        int *arr = (int*)malloc(n_elemente * sizeof(int));
        for (int i = 0; i < n_elemente; i++) {
            fscanf(fin, "%d", &arr[i]);
        }
        fclose(fin);

          clock_t start = clock();
        switch (optiune) {
            case 1: /* tim_sort(arr, n_elemente); */ break; 
            case 2: /* radix_sort(arr, n_elemente); */ break;
            case 3: /* quick_sort(arr, 0, n_elemente - 1); */ break;
            case 4: /* selection_sort(arr, n_elemente); */ break;
            case 5: /* merge_sort(arr, 0, n_elemente - 1); */ break;
        }
        clock_t end = clock();
        double time_taken = ((double)(end - start)) / CLOCKS_PER_SEC;

        // Destinatie Output
        printf("Where to output? (1.Screen, 2. out.txt): ");
        scanf("%d", &output_dest);

        if (output_dest == 2) {
            FILE *fout = fopen("out.txt", "a");
            for (int i = 0; i < n_elemente; i++) fprintf(fout, "%d ", arr[i]);
            fclose(fout);
            printf("Saved in out.txt. Time of execution: %f sec.\n", time_taken);
        } else {
            for (int i = 0; i < n_elemente; i++) printf("%d ", arr[i]);
            printf("\nTime of execution: %f sec.\n", time_taken);
        }

        free(arr);
    }

    return 0;
}