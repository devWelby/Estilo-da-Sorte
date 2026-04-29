import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatCurrency, formatDate } from '../../utils/formatters';

export async function shareSaleReceipt(venda) {
  const content = [
    'ESTILO DA SORTE',
    `Venda: ${venda.id || '-'}`,
    `Numero: ${venda.numero}`,
    `Valor: ${formatCurrency(venda.valor)}`,
    `Status: ${venda.status || venda.statusPagamento || '-'}`,
    `Data: ${formatDate(venda.criadoEm || venda.createdAt)}`
  ].join('\n');

  const fileUri = `${FileSystem.cacheDirectory}comprovante-${venda.id || Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Compartilhar comprovante' });
  }

  return fileUri;
}
