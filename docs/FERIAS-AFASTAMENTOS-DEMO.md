# Formosa — Férias e afastamentos (demonstração)

A rota /ferias oferece painel com funcionários em férias, afastados, pedidos pendentes, retornos previstos e cobertura A/B/C. Carrega sete exemplos fictícios referentes a outubro de 2026.

Fluxo: Cadastrar pedido → Selecionar colaborador, férias/atestado/afastamento, datas inclusivas e observação genérica → Registrar (pendente) → Solicitações → Aprovar ou recusar. Aprovação recalcula o quadro exclusivamente neste módulo. Alterar período já aprovado retorna o pedido para análise; cancelamento exige motivo e permanece no histórico local.

Bloqueios: datas inexistentes, período invertido e conflitos de períodos pendentes/aprovados do mesmo funcionário. Para planejamento, mostrar o impacto previsto de aprovar um pedido, sem bloquear atestados ou criar juízo sobre direito trabalhista. Pedido pendente não reduz cobertura.

Cálculo por grupo: programados na Escala & trocas menos ausências aprovadas = disponíveis. Deficiências adicionais atribuíveis a ausência são diferenciadas de déficit já existente. O retorno previsto é o primeiro turno planejado depois do período, não confirmação de alta, presença, benefício ou retorno real.

Retornos indicados no indicador até 7 dias e na lista até 14 dias. Ausências com período anterior à data de referência aparecem como período encerrado, embora preservadas como aprovadas no histórico.

Privacidade: NÃO inserir documentos verdadeiros, informações clínicas, CID, diagnóstico ou fotos de atestados no protótipo. Não há autenticação ou proteção de dados adequadas. Nenhum anexo é aceito. As informações e os atos demonstrativos são armazenados somente em localStorage sob chave formosa:augusto-montenegro:ausencias-demo:v1. Lê a escala sob a chave já existente, sem modificar a escala, o ponto ou a visão da operação. Não há integração com Supabase, relógio físico, folha de pagamento, INSS nem autenticação de aprovadores.

Este modelo não calcula direitos de férias, férias proporcionais, prazos legais, ou validade de atestados, que exigem orientação de RH/jurídico e convenções coletivas.

Verificação local sugerida: npm test -- src/domain/absences.test.ts src/components/absences/AbsenceWorkspace.test.tsx ; npm run lint ; npm run build. Evitar GitHub Actions desnecessários.
