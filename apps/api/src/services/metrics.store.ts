/* eslint-disable prefer-const */

//Переделать на переменную окружения
const arrayLength = Number(process.env.LOGGING_REPORTS_ARRAY_LENGTH) || 500;

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
export class oneMetricsArray {
  callMethod: string;
  routeWay: string;
  metricResults: metricParams[];

  constructor(callMethod: string, routeWay: string) {
    this.callMethod = callMethod;
    this.routeWay = routeWay;
    this.metricResults = [];
  }
  addResults(currentMetric: metricParams) {
    this.metricResults.push(currentMetric);
  }
  getAverageValues() {
    //Функция, возвращающая средние значения по связке запрос/путь
    let elementsCount = this.metricResults.length;
    let summRespTime = 0;
    let summRespSize = 0;
    let summRespItems = 0;
    this.metricResults.forEach((metric) => {
      summRespTime += metric.processingTime;
      summRespSize += metric.responseSize;
      summRespItems += metric.approximateItemsCount;
    });
    return {
      elementsCount,
      averageTime: elementsCount > 0 ? summRespTime / elementsCount : 0,
      averageSize: elementsCount > 0 ? summRespSize / elementsCount : 0,
      averageItems: elementsCount > 0 ? summRespItems / elementsCount : 0,
      p50: calcualatePersetiles(
        this.metricResults.map((values) => values.processingTime),
        50
      ),
      p95: calcualatePersetiles(
        this.metricResults.map((values) => values.processingTime),
        95
      ),
    };
  }
}
let allMetricsArray: oneMetricsArray[] = [];

function calcualatePersetiles(data: number[], p: number): number {
  //Расчёт персентиля
  const sorted = [...data].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

export function addMetric(
  time: number,
  respSize: number,
  itemsCount: number,
  callMethod: string,
  routeWay: string
) {
  //console.log(`Результат запуска time=${time} respSize=${respSize} itemsCount=${itemsCount} callMethod=${callMethod} routeWay=${routeWay}`);
  let newMetric = new metricParams(time, respSize, itemsCount);
  const currentMetric = allMetricsArray.find(
    (metricsArray) =>
      metricsArray.callMethod == callMethod && metricsArray.routeWay == routeWay
  );
  if (currentMetric) {
    //Масив уже существует,дополняем его
    currentMetric.addResults(newMetric);
    if (currentMetric.metricResults.length > arrayLength)
      currentMetric.metricResults.length = arrayLength;
  } else {
    //Запроса с таким ключём/запросом ещё не было. Предварительно создаётся oneMetricsArray
    let newMetricArray = new oneMetricsArray(callMethod, routeWay);
    newMetricArray.addResults(newMetric);
    allMetricsArray.push(newMetricArray);
  }
  //console.log(`arrayLength ${arrayLength} metricsArray.length ${oneMetricsArray.length}` )
}

interface MethodDetail {
  method: string;
  routes?: any[]; // или более конкретный тип
}
export function getAllMetrics() {
  if (allMetricsArray.length > 0) {
    //console.log('Запущено получение')
    let allToReturn: any = [];
    let callMethods = [
      ...new Set(allMetricsArray.map((values) => values.callMethod)),
    ];
    // console.log(`${callMethods.length} callMethods.length`)
    for (let callMethod of callMethods) {
      let methodDetails: MethodDetail = {
        method: callMethod,
        routes: [],
      };
      allMetricsArray
        .filter((values) => values.callMethod == callMethod)
        .forEach((wayName) => {
          let valueToReturn = {
            routeWay: wayName.routeWay,
            averageMetricParams: wayName.getAverageValues(),
            allMetrics: wayName.metricResults,
          };
          methodDetails['routes']?.push(valueToReturn);
        });
      allToReturn.push(methodDetails);
    }
    return allToReturn;
  } else {
    return {};
  }
}

export default {
  oneMetricsArray,
  addMetric,
  getAllMetrics,
};
