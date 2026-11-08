# Existing Google Sheets workbook: structural mapping (read-only)

Inspected on 2026-11-08 through an authorized, read-only Google Drive integration.
This is **structure only**: no private spreadsheet ID/URL, financial values,
transaction descriptions, account numbers, or personal identifiers are included.

Workbook locale: pt_BR. Timezone: America/Sao_Paulo.
12 tabs were found, one of which is a hidden backup.

| Tab                        |   Header row | Observed column structure                                                                                                                                                                     | Reader policy                                               |
| -------------------------- | -----------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Resumo 2026                |            4 | Month and aggregate totals                                                                                                                                                                    | Calculated presentation, never transaction source           |
| Contas Fixas e Vencimentos |            6 | Competência, Conta, Âmbito, Vencimento, Avisar em, Previsto, Pago, Data pagamento, Situação, Modalidade, Banco, Reembolso, Observações                                                        | Read-only bill source; formulas in E:I                      |
| Cartões - Visão Total      | presentation | Card and monthly summary tables                                                                                                                                                               | Aggregations, hyperlinks; exclude                           |
| Cartões - Avulsas          |            6 | Data da compra, Cartão, Descrição da compra, Categoria da casa, Quem comprou, Tipo, Vencimento, Valor avulso, Status da fatura, Observações                                                   | Individual purchases                                        |
| Cartões - Parceladas       |           10 | Data da compra, Cartão, Descrição da compra, Categoria da casa, Quem comprou, Parcela, Vencimento, Valor da parcela, Status da fatura, Observações                                            | Summary formulas above header; installments need stable IDs |
| Faturas dos Cartões        |            6 | Mês da fatura, Cartão, Vencimento, Assinaturas previstas, Parcelas e avulsos, Total previsto, Total da fatura, Valor pago, Data do pagamento, Situação, Saldo a pagar, Diferença, Observações | Liabilities, not consumption                                |
| Cartões - Assinaturas      |            6 | Cartão, Assinatura, Valor mensal, Categoria da casa, Titular, Desde, Até, Status, Observações                                                                                                 | Plans, not confirmed charges                                |
| Outubro 2026               |            6 | Data, Descrição, Categoria, Quem comprou, Forma de pagamento, Banco, Valor, Observações                                                                                                       | Daily subtotals must be skipped                             |
| Novembro 2026              |            6 | Same monthly expense columns                                                                                                                                                                  | Daily subtotals must be skipped                             |
| Dezembro 2026              |            6 | Same monthly expense columns                                                                                                                                                                  | Same layout                                                 |
| Despesas Externas          |            6 | Data do pagamento, Vencimento, Origem, Descrição / fornecedor, Quem pagou, Valor, Status, Reembolso previsto?, Quem reembolsa, Valor reembolsado, Saldo a reembolsar, Rateio / observações    | Exclude from household totals                               |
| Hidden historical backup   |            6 | Same as monthly expense columns                                                                                                                                                               | Exclude from live import                                    |

## Verified vs proposed

- **Verified:** main headers and their row positions, formula summary regions,
  status/amount formulas, BR date and money formatting, grouped daily summary rows.
- **Not yet verified:** immutable transaction IDs, all cross-sheet relationships,
  all formula behaviors, duplicate semantics, safe concurrent edits or row reorder.
- **Proposed only:** immutable UUID, row checksum, revision, idempotency key,
  synchronization event ID and write-audit record. None was added to the workbook.

Current read adapter treats source rows as transient snapshot IDs only.
Do not write using these IDs because users may sort or insert sheet rows.
Unknown amounts remain null; card invoice payments are not counted twice;
subscriptions are not booked as spending without observed charges.
The actual workbook was NOT changed.
