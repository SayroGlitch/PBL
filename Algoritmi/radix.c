#include "radix.h"
#include <stdlib.h>
//facem apel cu radixSort(arr, N);
void radixSort(int arr[], int n) {
    if (n <= 1) return;

    //aici avem grija sa despartim negative/pozitive
    int *neg = malloc(n * sizeof(int));
    int *pos = malloc(n * sizeof(int));
    int *output = malloc(n * sizeof(int));
    int nC = 0, pC = 0;

    for (int i = 0; i < n; i++) {
        if (arr[i] < 0) neg[nC++] = (arr[i] == -2147483648) ? 2147483647 : -arr[i];
        else pos[pC++] = arr[i];
    }

    // aplicam aparte pentru neg si poz
    int *targets[] = {neg, pos};
    int counts[] = {nC, pC};

    for (int t = 0; t < 2; t++) {
        int *currentArr = targets[t];
        int currentN = counts[t];
        if (currentN <= 1) continue;

        // maximul local necesar
        int maxVal = currentArr[0];
        for (int i = 1; i < currentN; i++) if (currentArr[i] > maxVal) maxVal = currentArr[i];

        // radix pe cifre
        for (long long exp = 1; maxVal / exp > 0; exp *= 10) {
            int count[10] = {0};
            for (int i = 0; i < currentN; i++) count[(currentArr[i] / exp) % 10]++;
            for (int i = 1; i < 10; i++) count[i] += count[i - 1];
            for (int i = currentN - 1; i >= 0; i--) {
                output[count[(currentArr[i] / exp) % 10] - 1] = currentArr[i];
                count[(currentArr[i] / exp) % 10]--;
            }
            for (int i = 0; i < currentN; i++) currentArr[i] = output[i];
        }
    }

    //unim inapoi tot
    for (int i = 0; i < nC; i++) arr[i] = -neg[nC - 1 - i];
    for (int i = 0; i < pC; i++) arr[nC + i] = pos[i];

    free(neg); free(pos); free(output);
}