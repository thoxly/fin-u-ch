import { Request, Response, NextFunction } from 'express';
import { addMetric } from '../services/metrics.store';

export const repMetricMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reqPath = req.path;
  //console.log(`Запущен мидлвейр ${ req.path }`)
  //Проверка роута
  //Обработка данных
  const timeStart = Date.now();
  const originalJSON = res.json;
  let elementsAmount = 0;
  let respSize = 0;
  let isResponseSent = false;
  let processingTime = 0;
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;
  // Функция для установки заголовка времени выполнения
  const setProcessingTimeHeader = () => {
    if (!isResponseSent) {
      processingTime = Date.now() - timeStart;
      res.setHeader('X-Report-Generation-Time', `${processingTime} ms`);
      isResponseSent = true;
      //console.log(`Установлено время выполнения: ${processingTime}ms`);
    }
  };

  res.json = function (body: any): Response {
    //console.log('Обработка тела')
    // Считаем размер и количество элементов
    respSize = body ? Buffer.byteLength(JSON.stringify(body), 'utf-8') : 0;
    Object.entries(body).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        //console.log(`${key} Определено как массив длиной ${value.length}`)
        elementsAmount += value.length;
      } else {
        //console.log(`${key} Определено не как массив`)
        elementsAmount++;
      }
      // console.log(`Итоговоая длина ${elementsAmount}`)
    });
    setProcessingTimeHeader();
    res.json = originalJSON;
    return originalJson.call(this, body);
  };
  // Обертка для res.send
  res.send = function (body: any): Response {
    //console.log('Обработка тела в res.send');

    if (body && typeof body === 'string') {
      respSize = Buffer.byteLength(body, 'utf-8');
    } else if (body && typeof body === 'object') {
      respSize = Buffer.byteLength(JSON.stringify(body), 'utf-8');
    }

    setProcessingTimeHeader();
    res.send = originalSend;
    return originalSend.call(this, body);
  };

  // Обертка для res.end
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    //console.log('Обработка в res.end');
    setProcessingTimeHeader();
    res.end = originalEnd;
    return originalEnd.call(this, chunk, encoding, cb);
  };
  res.on('finish', () => {
    //console.log('Завершили выполнение');
    // Добавляем метрику с полным временем выполнения
    addMetric(processingTime, respSize, elementsAmount, req.method, reqPath);
    //console.log(`Полное время выполнения: ${processingTime}ms, размер: ${respSize} байт, элементов: ${elementsAmount}`);
  });
  next();
};
