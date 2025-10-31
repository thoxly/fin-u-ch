/* eslint-disable prefer-const */

//Переделать на переменную окружения
const arrayLength = 500;

class metricParams {
  processingTime: number;
  responseSize: number;
  approximateItemsCount: number;

  constructor(time: number, respSize: number, itemsCount: number) {
    ((this.processingTime = time),
      (this.responseSize = respSize),
      (this.approximateItemsCount = itemsCount));
  }
}
let metricsArray: metricParams[] = [];

export function addMetric(time: number, respSize: number, itemsCount: number) {
  console.log(
    `Результат запуска time=${time} respSize=${respSize} itemsCount=${itemsCount}`
  );
  let newMetric = new metricParams(time, respSize, itemsCount);
  if (metricsArray.length >= arrayLength) {
    //Если размер массива больше допустимого он дополняется в начало и убирает первый файл
    metricsArray.push(newMetric);
    metricsArray.length = arrayLength;
  } else {
    metricsArray.unshift(newMetric);
  }
}
