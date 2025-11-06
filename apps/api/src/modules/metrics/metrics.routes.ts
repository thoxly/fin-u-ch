import { Router } from 'express';
import { getAllMetrics } from '../../services/metrics.store';
import { generatePage } from './metricsTable';
const router: Router = Router();

router.get('/api/internal/metrics', (req, res) => {
  //��������� JSON �� �����������
  let metricsResult;
  let successRes: boolean;
  let resStatus: number;
  try {
    metricsResult = getAllMetrics();
    successRes = true;
    resStatus = 200;
  } catch (error) {
    metricsResult = {};
    successRes = false;
    resStatus = 500;
  }
  res.status(resStatus).json({
    success: successRes,
    data: metricsResult,
  });
});

router.get('api/docs/metrics', (req, res) => {
  let metricsResult;
  let successRes: boolean;
  let resStatus: number;

  try {
    metricsResult = getAllMetrics();
    successRes = true;
    resStatus = 200;
    //������� �������������� ������ �
    // �������� � ���������� ���������
    const html = generatePage(metricsResult);
    res.status(resStatus).send(html);
  } catch (error) {
    console.error('Error:', error);
    metricsResult = {};
    successRes = false;
    resStatus = 500;
    res.status(resStatus).send('Internal Server Error');
  }
});

export default router;
