# Personal Finance Hub

PWA open-source de finanças pessoais com Next.js, React e TypeScript.
O modo padrão é uma **demonstração com dados inteiramente fictícios**.
Não há alteração de planilhas, contas ou calendários reais.

## Funcionalidades

Dashboard, despesas, contas a pagar, orçamento, relatórios, indicadores,
prévia de calendário e operações simuladas em memória, agora com conferência
obrigatória de alterações. Parcelamentos seguem o mês de vencimento de cada
parcela; gastos potencialmente repetidos são sinalizados, sem exclusão automática.
Foi implementado um fluxo Google OAuth com PKCE, conta permitida, sessão
criptografada no servidor, logout e integração Sheets **somente leitura**.
A integração está **desativada por padrão e ainda não foi testada com
credenciais ou planilha reais**. Google Calendar e escrita Sheets permanecem
bloqueados.

## Rodar e testar

Node.js 22+ e npm: `npm ci`, `npm run dev` e
`http://localhost:3000`. Testes: `npm test`, `npm run lint`,
`npm run typecheck`, `npm run build` e `npm run test:e2e`.
Nenhuma credencial é necessária para o modo demonstração.

Consulte `docs/google-setup.md` para preparar uma validação privada e
`npm run test:google` para testar as integrações simuladas sem credenciais,
`docs/security.md` para segurança, `docs/sheets-mapping.md`
para a estrutura saneada da planilha e `docs/release-checklist.md`
para as pendências.

## Instalação

Em hospedagem HTTPS, o Android pode instalar pelo navegador.
No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.
A instalação em aparelhos reais ainda precisa ser validada.
O modo offline não guarda dados financeiros. Licença MIT.
