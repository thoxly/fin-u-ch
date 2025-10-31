import { Request, Response, NextFunction } from 'express';
import { addMetric } from '../services/metrics.store';

export const repMetricMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //���� �������� ������� �� �����-����������
  if (!req.path.startsWith('/reports')) {
    return next();
  }
  //������ ����������
  const timeStart = Date.now();
  const originalJSON = res.json;
  let elementsAmount = 0;
  let respSize = 0;
  //
  res.json = function (body: any): Response {
    respSize = body ? Buffer.byteLength(JSON.stringify(body), 'utf-8') : 0;
    if (Array.isArray(body)) {
      elementsAmount = body.length;
    } else if (body && typeof body === 'object' && Array.isArray(body.items)) {
      elementsAmount = body.items.length;
    }
    res.json = originalJSON;
    return originalJSON.call(this, body);
  };
  res.on('finish', () => {
    const processingTime = Date.now() - timeStart;
    res.setHeader('X-Report-Generation-Time', `${processingTime} ms`);
    addMetric(processingTime, respSize, elementsAmount);
  });
};
