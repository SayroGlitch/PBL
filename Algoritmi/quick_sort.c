#include "quick_sort.h"

// Funcție pentru a împărți array-ul în jurul pivotului
int partition(int arr[], int low, int high) {
    int pivot = arr[high]; // alegem ultimul element ca pivot
    int i = (low - 1);

    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            // schimbăm arr[i] și arr[j]
            int temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }

    // schimbăm arr[i+1] și pivotul
    int temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;

    return (i + 1);
}

void quickSort(int arr[], int low, int high) {
    if (low < high) {
        // găsim poziția pivotului
        int pi = partition(arr, low, high);

        // sortăm separat elementele din stânga și dreapta pivotului
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}
