#include <stdlib.h>
#define RUN 32

void insertionSort(int arr[], int left, int right) {
    for (int i = left + 1; i <= right; i++) {
        int temp = arr[i];
        int j = i - 1;

        while (j >= left && arr[j] > temp) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = temp;
    }
}

// Merge function
void merge_second(int arr[], int l, int m, int r) {
    int len1 = m - l + 1;
    int len2 = r - m;

    int *left = (int *)malloc(len1 * sizeof(int));
    int *right = (int *)malloc(len2 * sizeof(int));

    for (int i = 0; i < len1; i++)
        left[i] = arr[l + i];
    for (int i = 0; i < len2; i++)
        right[i] = arr[m + 1 + i];

    int i = 0, j = 0, k = l;

    while (i < len1 && j < len2) {
        if (left[i] <= right[j])
            arr[k++] = left[i++];
        else
            arr[k++] = right[j++];
    }

    while (i < len1)
        arr[k++] = left[i++];

    while (j < len2)
        arr[k++] = right[j++];

    free(left);
    free(right);
}

// Timsort main function
void timSort(int arr[], int n) {

    // Sort small runs with insertion sort
    for (int i = 0; i < n; i += RUN)
        insertionSort(arr, i,
            (i + RUN - 1 < n - 1) ? i + RUN - 1 : n - 1);

    // Start merging runs
    for (int size = RUN; size < n; size = 2 * size) {
        for (int left = 0; left < n; left += 2 * size) {

            int mid = left + size - 1;
            int right = (left + 2 * size - 1 < n - 1) ?
                        left + 2 * size - 1 : n - 1;

            if (mid < right)
                merge_second(arr, left, mid, right);
        }
    }
}
