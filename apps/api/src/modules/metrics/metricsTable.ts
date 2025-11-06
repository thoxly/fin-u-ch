interface averageMetricParams {
  elementsCount: number;
  averageTime: number;
  averageSize: number;
  averageItems: number;
  p50: number | null;
  p95: number | null;
}

interface Route {
  routeWay: string;
  averageMetricParams: averageMetricParams;
}

interface MethodData {
  method: string;
  routes: Route[];
}

interface ApiResponse {
  data: MethodData[];
}

export function generatePage(data: MethodData[]): string {
  console.log('generatingPage');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Статистика API методов</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        
        h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #2c3e50;
            font-size: 2.5rem;
            border-bottom: 2px solid #3498db;
            padding-bottom: 15px;
        }
        
        #apiTable {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        #apiTable th {
            background-color: #3498db;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #2980b9;
        }
        
        #apiTable td {
            padding: 12px 15px;
            border: 1px solid #ddd;
            vertical-align: top;
        }
        
        #apiTable tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        #apiTable tr:hover {
            background-color: #e8f4fc;
            transition: background-color 0.3s ease;
        }
        
        .params {
            font-size: 0.9rem;
        }
        
        .params div {
            margin-bottom: 4px;
        }
        
        .params strong {
            color: #2c3e50;
        }
        
        .no-data {
            text-align: center;
            color: #7f8c8d;
            font-style: italic;
            padding: 40px !important;
        }
        
        .method-get {
            color: #27ae60;
            font-weight: bold;
        }
        
        .method-post {
            color: #2980b9;
            font-weight: bold;
        }
        
        .method-put {
            color: #f39c12;
            font-weight: bold;
        }
        
        .method-delete {
            color: #e74c3c;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Статистика API методов</h1>
        <table id="apiTable">
            <thead>
                <tr>
                    <th>Метод</th>
                    <th>Путь</th>
                    <th>Параметры</th>
                </tr>
            </thead>
            <tbody>
                ${generateBody(data)}
            </tbody>
        </table>
    </div>
</body>
</html>`;
}

function generateBody(data: MethodData[]): string {
  console.log(`data`);
  console.log(data);
  if (Object.keys(data).length === 0) {
    return '<tr><td colspan="3" class="no-data">Нет данных для отображения</td></tr>';
  }

  let tableRows = '';

  data.forEach((methodData: MethodData) => {
    methodData.routes.forEach((route: Route) => {
      const params = formatParams(route.averageMetricParams);
      tableRows += `
                <tr>
                    <td>${methodData.method}</td>
                    <td>${route.routeWay}</td>
                    <td>${params}</td>
                </tr>
            `;
    });
  });

  return tableRows;
}

function formatParams(params: averageMetricParams): string {
  return `
        <div class="params">
            <div><strong>Elements:</strong> ${params.elementsCount}</div>
            <div><strong>Avg Time:</strong> ${params.averageTime}ms</div>
            <div><strong>Avg Size:</strong> ${params.averageSize} bytes</div>
            <div><strong>Avg Items:</strong> ${params.averageItems}</div>
            ${params.p50 ? `<div><strong>P50:</strong> ${params.p50}ms</div>` : ''}
            ${params.p95 ? `<div><strong>P95:</strong> ${params.p95}ms</div>` : ''}
        </div>
    `;
}

export default generatePage;
