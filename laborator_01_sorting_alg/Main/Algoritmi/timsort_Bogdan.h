#ifndef TIMSORT_H
#define TIMSORT_H

#define RUN 32

void timSort(int arr[], int n);

void insertionSort(int arr[], int left, int right);

void merge_second(int arr[], int l, int m, int r);
//pus merge second pentru ca deja exista unul in quick.c si merge.c

#endif // TIMSORT_H