#include "stdio.h"
#include "stdlib.h"
#import "../timsort_Bujdan.c"
#include "time.h"

int main() {
    time_t start,end;
    start = clock();
    int N[] = {5,3,9,3,4,1,19,54,21,56,12,453,1212,8,3434,22,43,76,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,11,1,1,1,1,1,1,1,1,1};
    int n = sizeof(N) / sizeof(N[0]);
    timSort(N,n);
    end = clock();
    double timp = (double)(end-start) / CLOCKS_PER_SEC;
    for (int i=0;i<n;i++) printf("%d ",N[i]);
    printf("\nTime:%.99lf",timp);
    return 0;
}