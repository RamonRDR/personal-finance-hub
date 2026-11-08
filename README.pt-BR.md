# Personal Finance Hub

PWA open-source de finanças pessoais em Next.js, React e TypeScript.
**Estado atual:** demonstração interativa com dados inteiramente fictícios.
Ela não faz login no Google nem modifica planilhas ou calendários reais.

## O que já funciona

Dashboard, despesas, contas a pagar, orçamento, relatórios, análises
determinísticas e prévia de eventos de calendário. Inclusão de despesas
e quitação de contas são simulações temporárias na sessão.
Há código para leitura da API Sheets, mas não existe autorização OAuth ativa.

## Rodar e testar

Com Node.js 24 e npm: execute npm install e npm run dev.
Abra http://localhost:3000. Execute npm test, npm run lint,
npm run typecheck, npm run build e npm run test:e2e.

Consulte docs/sheets-mapping.md para a estrutura saneada da planilha
existente, docs/architecture.md para arquitetura, docs/security.md
para os gates de segurança e docs/google-setup.md para OAuth futuro.
Nenhum dado financeiro real é publicado.

## Instalação

Em hospedagem HTTPS, Android: opção de instalar no navegador.
No iPhone: Safari, Compartilhar, Adicionar à Tela de Início.
A instalação e os ícones ainda precisam ser validados em aparelhos reais.
Offline não armazena transações ou dados sensíveis.

**Pendente:** OAuth seguro com tokens no servidor, validação real,
backup, escrita idempotente e sync Calendar autorizada, deploy manual
e revisão técnica final. Licença MIT.
