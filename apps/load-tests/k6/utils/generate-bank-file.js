/**
 * Утилита для генерации тестовых файлов ClientBank Exchange
 * Используется в нагрузочных тестах для создания файлов разных размеров
 */

export function generateClientBankFile(operationCount = 10, companyInn = '5262382878', companyAccount = '40702810068000001468') {
  const lines = [
    '1CClientBankExchange',
    'ВерсияФормата=1.03',
    'Кодировка=Windows',
    'Отправитель=Банк',
    `ДатаСоздания=${formatDate(new Date())}`,
    `ВремяСоздания=${formatTime(new Date())}`,
    `РасчСчет=${companyAccount}`,
    ''
  ];

  // Генерируем операции
  for (let i = 0; i < operationCount; i++) {
    const isIncome = Math.random() > 0.5;
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const operationNumber = 100 + i;
    const amount = Math.floor(Math.random() * 100000) + 1000;
    
    if (isIncome) {
      // Доход: получатель - компания
      lines.push('СекцияДокумент=Платежное поручение');
      lines.push(`Номер=${operationNumber}`);
      lines.push(`Дата=${formatDate(date)}`);
      lines.push(`Сумма=${amount.toFixed(2)}`);
      lines.push(`ПлательщикСчет=4081781009991000${String(i).padStart(4, '0')}`);
      lines.push(`Плательщик=ООО Поставщик ${i}`);
      lines.push(`ПлательщикИНН=${generateInn()}`);
      lines.push(`ПолучательСчет=${companyAccount}`);
      lines.push(`Получатель=ООО Тестовая Компания`);
      lines.push(`ПолучательИНН=${companyInn}`);
      lines.push(`НазначениеПлатежа=Оплата по счету №${operationNumber} от ${formatDate(date)}`);
    } else {
      // Расход: плательщик - компания
      lines.push('СекцияДокумент=Платежное поручение');
      lines.push(`Номер=${operationNumber}`);
      lines.push(`Дата=${formatDate(date)}`);
      lines.push(`Сумма=${amount.toFixed(2)}`);
      lines.push(`ПлательщикСчет=${companyAccount}`);
      lines.push(`Плательщик=ООО Тестовая Компания`);
      lines.push(`ПлательщикИНН=${companyInn}`);
      lines.push(`ПолучательСчет=0310064300000001${String(i).padStart(4, '0')}`);
      lines.push(`Получатель=Получатель ${i}`);
      lines.push(`ПолучательИНН=${generateInn()}`);
      lines.push(`НазначениеПлатежа=Оплата услуг, в том числе НДС 20%`);
    }
    lines.push('КонецДокумента');
    lines.push('');
  }

  return lines.join('\n');
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function generateInn() {
  // Генерируем случайный 10-значный ИНН
  return String(Math.floor(Math.random() * 9000000000) + 1000000000);
}
