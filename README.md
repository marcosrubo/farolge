# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Frontend em HTML, CSS e JavaScript, organizado por módulos, com backend de login e autorização Google em Vercel Functions. A biblioteca oficial Google é instalada pelo package.json; o frontend não tem etapa de compilação.

## Estrutura atual para apresentação

- Logos da plataforma e do colégio, com o nome da instituição em três linhas.
- Menu: Visão GERAL, Inspetores/Monitores, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; abaixo do divisor ficam Manutenção do Sistema e Configurações. Inspetores/Monitores apresenta alunos e registro manual de ocorrências. Manutenção do Sistema lista os nomes de arquivos da pasta FarolGE/FaltasSemanais da conta GERAL, conforme a seção ao final.
- As opções mostram “Meu espaço / nome da opção”. Radar também apresenta o fluxo solicitado: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos convergem para ANÁLISES, com saídas DOSSIÊ individual e Relação diária de FALTAS.
- BI SEED e Configurações exibem “em Desenvolvimento” e os textos definidos por Marcos em 06/11/2026. A Visão GERAL apresenta os totais de mensagens dos marcadores da Escola e Pessoal descritos ao final deste README. BI SEED apresenta o texto sobre os indicadores/resumos previstos para uma visão simplificada da situação da escola.
- O menu destaca a opção ativa e o título da aba acompanha a seleção.
- Abaixo do breadcrumb, o quadro apresenta duas conexões independentes, Geral e Pessoal, cada uma com Conectar/Desconectar. Não há etapa separada de entrada no FAROL GE: qualquer conexão pode ser feita primeiro. Cada conta é validada no Google, consultada em EmailsAutorizados e autenticada no Supabase Auth na mesma jornada de autorização de consulta ao Gmail e Drive com escopo drive.file. A conexão Pessoal prepara seus quatro marcadores. A GERAL solicita gmail.modify para preparar Classificadas/Arquivadas e permitir as movimentações institucionais por escolha do usuário. As permissões concedidas são indicadas separadamente. Em Geral, a pessoa escolhe/informa no Google a conta geral da sua escola; em Pessoal, escolhe a própria conta. Ambas aceitam uma Conta Google autorizada e verificada, sem endereço Geral fixo na Vercel. Configuração em [CONEXOES_GOOGLE.md](CONEXOES_GOOGLE.md).
- Foram retirados cartões, tabelas, exemplos, gráficos, filtros, datas, avisos, ajuda, roteiro de apresentação, formulários, rodapé e textos inferiores da barra lateral.

A simplificação foi solicitada por Marcos em 05/11/2026 para construir o conteúdo em conjunto com a equipe. Posteriormente, Marcos solicitou o fluxograma de Radar e os textos de desenvolvimento nas demais telas descritas acima. Os quadros dos demais módulos são uma estrutura visual, sem abertura de registros ou análises implementadas e sem integração aos sistemas citados. Em telas estreitas, o fluxo pode ser percorrido horizontalmente. Os endereços de e-mail nos textos são ilustrativos. Não preencher novamente as telas com exemplos ou sugestões de funcionalidades sem pedido. A carga de alunos depende do clique explícito na manutenção e do SQL descrito na seção Inspetores/Monitores ao final. Demandas PESSOAIS agora consulta conversas reais dos três marcadores, quando a conta Pessoal está autorizada. O backend OAuth foi implementado, mas depende de configuração externa e Marcos confirmou a conexão com duas contas Google reais. Cada conexão tem sessão própria verificada e autorização vinculada ao ID Supabase da própria conta Google. A conta Pessoal não herda a conexão Geral em outro navegador. Em 10/11/2026, Marcos pediu que as explicações de todos os módulos e o fluxograma do Radar sejam visíveis mesmo sem conexão, inclusive em caso de falha na verificação das contas. Esses conteúdos são estáticos e explicativos. Demandas INSTITUCIONAIS usa exclusivamente a GERAL para as três colunas, classificação com prazo confirmado e arquivamento descritos ao final deste README. Demandas PESSOAIS usa exclusivamente a Pessoal. As diferenças operacionais entre somente Geral, somente Pessoal e ambas nos demais módulos aguardam definição de Marcos.

## Publicação na nuvem

O atalho na Tela de Início do iPhone usa o logo existente em `arte/farol-ge-simbolo-quadrado.png`, indicado por `apple-touch-icon`, com o nome FAROL GE. Após publicar essa configuração, remover o atalho antigo e adicionar novamente pelo Safari para conferir o ícone. A arte original foi preservada.

Os testes visuais e a demonstração de Marcos serão feitos sempre pela Vercel. Não iniciar servidor local ou abrir HTML local para testes, salvo novo pedido explícito.

1. Criar um repositório próprio chamado `farolge` no GitHub. Se for enviar esta pasta pelo Git, criar o repositório vazio, sem outro README.
2. Enviar o conteúdo desta pasta preservando a estrutura, inclusive `arte/`. O arquivo `index.html` deve ficar na raiz do repositório.
3. Na Vercel, criar um projeto e importar esse repositório.
4. Selecionar **Framework Preset: Other**; manter a raiz do projeto como `./`, sem comando de build. Para saída estática na raiz, usar `.` se for necessário preencher Output Directory.
5. Publicar e abrir o endereço retornado pela Vercel. O domínio personalizado `farolge.com.br` pode ser conectado depois de confirmar seu registro e a configuração DNS.

Referência oficial: [publicação estática sem build na Vercel](https://vercel.com/docs/builds/configure-a-build#skip-build-step).

Depois de conectar o repositório à Vercel, os próximos envios à branch de produção gerarão novas publicações. Este trabalho prepara os arquivos: não cria repositório remoto, não publica e não configura domínio.

Para iniciar o Git nesta pasta, depois de conferir os arquivos:

```sh
git init -b main
git add .
git commit -m "Cria protótipo do Farol GE"
```

Após criar o repositório remoto, usar o comando `git remote add origin` com o endereço exato fornecido pelo GitHub e executar `git push -u origin main`. Nas atualizações seguintes:

```sh
git add .
git commit -m "Atualiza protótipo do Farol GE"
git push
```

## Política de Privacidade

A página pública `privacidade.html` usa `privacidade.css`, abre sem autenticação e tem links na barra superior e no diálogo de conexão. Após publicar na Vercel, o endereço é `https://www.farolge.com.br/privacidade.html`, para cadastrar em Google Auth Platform → Branding → Privacy policy. A página informa o funcionamento atual, dados e permissões, fornecedores, retenção, Uso Limitado das APIs Google e pedidos de exclusão. Marcos confirmou em 10/11/2026 o responsável **Marcos Rubo** e o contato público **marcos.rubo@escola.pr.gov.br**. Rever a política antes de mudar operações ou finalidades; esta página não representa aprovação do aplicativo pelo Google ou pela SEED/NRE.

A revisão 2, de 10/11/2026, usa a identificação completa **FAROL GE — Farol da Gestão Escolar**, confirmada por Marcos no Branding Google. Detalha em tabela a coleta, finalidade e armazenamento por categoria, o papel de cada fornecedor, Uso Limitado e o atendimento administrativo da exclusão. Foi preparada após o verificador apontar conteúdo insuficiente; não foi aprovada pelo Google. A propriedade da página inicial foi confirmada por Marcos no Search Console por tag HTML. Preservar a tag de verificação no `index.html`. Publicar a revisão e respeitar o intervalo de 24 horas solicitado no painel após a comprovação de propriedade antes de tentar novamente o Branding.

## Personalização da escola

Editar `config.js` para definir o nome público, as iniciais, a descrição e o caminho do emblema da escola (`schoolLogo`). Sem descrição, a linha secundária fica oculta. Sem emblema, aparecem as iniciais como alternativa.

A identificação do colégio usa o emblema à esquerda e apenas “COLÉGIO ESTADUAL CÍVICO MILITAR THIAGO TERRA” ao lado. O arquivo `arte/thiago-terra-identidade-original.png` preserva o cabeçalho original enviado por Marcos; o CSS mostra somente o emblema da faixa esquerda, sem redesenhar a arte. O símbolo do farol continua sendo a marca da plataforma. As artes originais foram preservadas. A fonte DM Sans é carregada do Google Fonts; há alternativa com fontes do sistema.

Na conexão Pessoal, o backend verifica e cria somente os marcadores ausentes entre estes quatro:

| Marcador | Destino |
| --- | --- |
| `GE_ME DEVEM` | GE_ME DEVEM |
| `GE_MINHAS` | GE_MINHAS |
| `GE_DEVO` | GE_DEVO |
| `GE_Despachadas` | Mensagens classificadas |

As três colunas mostram as conversas dos marcadores. Uma conversa com múltiplos marcadores aparece nas respectivas colunas com o mesmo prazo e conclusão, mas responsáveis por categoria. A precedência de arquivadas ainda não foi definida; não é aplicada exclusão de conversas por estarem fora da Caixa de entrada. Spam, lixeira e rascunhos não originam cartões. Não são renomeados/excluídos marcadores antigos. A Caixa de entrada abaixo do quadro permite adicionar uma das três etiquetas à mensagem escolhida, adicionando também GE_Despachadas e removendo somente INBOX. A data de um e-mail não deve ser convertida automaticamente em prazo.

A Pessoal solicita adicionalmente `gmail.labels`. Após publicar, contas já conectadas precisam usar **Revisar autorização** e conceder essa permissão. O status mostra se as quatro labels existem; consultar status não cria marcadores. Falhas mantêm a conta conectada e pedem nova revisão para tentar novamente. A Geral não solicita esse escopo nem consulta/cria essas labels. Desconectar preserva os marcadores no Gmail. Marcos confirmou a criação real na Vercel com os nomes anteriores. A alteração para os nomes numerados ainda deve ser validada após publicação. Os nomes usados no servidor são fixos; editar `config.js` não altera as operações do backend.

A revisão 3 acrescentou a consulta e criação dos três marcadores na conexão Pessoal e sua retenção no Gmail. A revisão 4 atualiza seus nomes para `GE_ME DEVEM`, `GE_MINHAS` e `GE_DEVO`, nessa ordem de criação. O backend não renomeia nem remove os marcadores anteriores; Marcos informou que os excluirá manualmente no Gmail.

## Limites e próximos passos

Há login Google integrado à solicitação de Gmail e Drive, condicionado à configuração de Google Cloud, Supabase Auth, tabelas e variáveis Vercel. Supabase Auth gerencia auth.users e cria usuários automaticamente; a aplicação não pede cadastro manual nem senha própria. Credenciais ficam criptografadas no backend. O quadro de conexões mostra endereço e permissões confirmadas; o módulo Pessoal mostra as conversas autorizadas.

A Manutenção do Sistema lista nomes de arquivos da pasta FarolGE/FaltasSemanais; não implementa editor de arquivos, criação de documentos, edição de planilhas, envio de mensagens, notificações ou indicadores reais nos módulos. A autorização drive.file prepara essas operações nos arquivos criados ou explicitamente autorizados para o aplicativo. A plataforma se destina a qualquer escola do Paraná. O cadastro de escolas, seus vínculos e o compartilhamento/isolamento de dados institucionais ainda precisam ser definidos; permitir escolher contas de escolas diferentes nesta etapa não implementa essa arquitetura. Ver detalhes e migração em CONEXOES_GOOGLE.md.

Antes da ativação real, habilitar o provedor Google no Supabase exclusivo do FAROL GE, executar database/google-sessions.sql, configurar variáveis e validar o fluxo na Vercel. O modo Testing do Google continua exigindo contas de teste, mesmo com entrada aberta no código; uso amplo depende da configuração Production e das regras de verificação aplicáveis.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.

## Demandas PESSOAIS e prazos

Marcos autorizou implementar o quadro e o acompanhamento para conferir na Vercel. A página mostra três colunas, um cartão por conversa por coluna, até 20 conversas por carregamento, com paginação. Busca, contagem, filtros de não lidas/pendentes/concluídas e ordenação operam sobre as conversas carregadas. A seleção por marcadores pode ser feita pelo usuário no Gmail ou pelos botões da Caixa de entrada abaixo das colunas. Sem conexão, a explicação e a estrutura permanecem visíveis.

Ao abrir um cartão: leitura de mensagens em texto simples, remetente/destinatário e data; quando só há HTML ou texto externo à resposta da API, exibe prévia e link para o Gmail. HTML não é inserido na página, imagens remotas não são carregadas, anexos não são baixados e ler no FAROL não marca como lido. Uma resposta não conclui a demanda.

O formulário permite definir/editar/remover a data limite, informar responsável por categoria (nome/e-mail livre em GE_ME DEVEM e GE_DEVO; conta Pessoal em GE_MINHAS), concluir/reabrir o trabalho e consultar o histórico. Prazos são datas civis no fuso America/Sao_Paulo, sem hora limite; ficam visíveis como sem prazo, vence em data, vence hoje, atraso em dias ou concluída. Não há notificação nem envio automático; comunicar o prazo ao destinatário no texto do e-mail.

Uma demanda pertence à identidade da conta Pessoal e à conversa (`threadId`), com ID próprio e referência à mensagem de origem. Não correlaciona automaticamente cópias nas caixas de remetente/destinatário nem compartilha dados com outra pessoa ou escola. As respostas usam o acompanhamento da mesma conversa. Alterações concorrentes são rejeitadas por versão, para não perder histórico. O backend verifica a identidade e os marcadores antes de ler/gravar; a conta Geral não dá acesso.

### Ativação

1. No SQL Editor do Supabase **exclusivo FAROL GE**, executar `database/personal-demands.sql` (depois das tabelas de `database/google-sessions.sql`, já usadas pelas conexões).
2. Publicar os arquivos pelo Git/Vercel. Para leitura e prazos não há variável ou escopo Google novo: usa o `gmail.readonly` já autorizado. Para classificação da Caixa de entrada, acrescentar `gmail.modify` conforme a seção abaixo. Política atualizada para revisão 5, incluindo leitura de conversas, dados de acompanhamento, histórico e retenção.
3. Na Vercel, abrir Demandas PESSOAIS com a conta Pessoal conectada. Classificar um e-mail em `GE_ME DEVEM` no Gmail, clicar Atualizar no FAROL, abrir o cartão e salvar um prazo. Atualizar/recarregar a página para confirmar persistência. Conferir edição/remoção, conclusão/reabertura, duas janelas e conta diferente. Nenhum teste visual local ou publicação remota foi realizado por esta entrega.

A tabela `farol_personal_demands` tem RLS, sem policies/acesso de anon/authenticated, com FK para auth.users e exclusão em cascata. O backend cifra prazo, responsável, conclusão, mensagem de origem e histórico com AES-GCM; IDs técnicos de proprietário/conversa, ID próprio, versão e horário permanecem metadados. Não grava corpo, assunto, trechos, anexos ou lista de participantes. Disconnect remove a conexão, mas preserva acompanhamento e histórico para a reconexão da mesma conta; exclusão integral é administrativa conforme política. Não manter cópias de e-mails em logs ou armazenamento local.

## Classificação atualizada — 12/11/2026

A conexão Pessoal prepara os marcadores ausentes `GE_ME DEVEM`, `GE_MINHAS`, `GE_DEVO` e `GE_Despachadas`, nessa ordem. Geral permanece independente. Consultar status não cria marcadores. Depois de publicar, usar **Pessoal → Revisar autorização** para preparar o quarto marcador; não há novo escopo, SQL ou variável nesta atualização. Continuam necessários gmail.labels e gmail.modify já descritos acima.

A Caixa de entrada lista mensagens individuais em páginas de 20. Classificar usa users.messages.modify na mensagem escolhida com addLabelIds contendo a categoria e GE_Despachadas, e removeLabelIds contendo somente INBOX. Preserva UNREAD e as outras etiquetas. A mensagem sai da lista após sucesso confirmado e a conversa aparece nas colunas correspondentes. Não duplica e-mails. Ao abrir uma conversa, cada mensagem elegível tem botões para adicionar categorias, inclusive depois de movida para GE_Despachadas; múltiplas categorias são permitidas. Mensagens fora de INBOX e GE_Despachadas, spam, lixeira e rascunhos são recusadas. Não há envio, edição de conteúdo, exclusão ou alteração de leitura.

Responsável é separado por categoria no payload criptografado (mapa responsibles). Em GE_MINHAS é derivado automaticamente da identidade Pessoal verificada e não editável. Em GE_ME DEVEM e GE_DEVO é textual e independente; registros antigos conservam o responsável como valor inicial até edição da categoria. Prazo e conclusão continuam compartilhados por conversa. Versão global protege alterações concorrentes e o histórico identifica a categoria alterada. Não é necessário migrar o banco; preserva os registros existentes.

A política pública e o diálogo passam à revisão 7. Publicar pelo Git/Vercel e validar na nuvem: preparação dos quatro marcadores sem duplicação; classificar e conferir saída de INBOX, presença em GE_Despachadas e categoria, preservação de UNREAD e outras etiquetas; adicionar as outras categorias pela conversa; salvar responsáveis diferentes; conferir GE_MINHAS com o próprio e-mail, persistência e histórico; contas distintas, recusa de permissões e falhas de rede. Nenhuma classificação retroativa em lote é executada. Mensagens antigas que ainda estejam em INBOX podem ser classificadas novamente para completar a movimentação.

Referências oficiais: [marcadores Gmail](https://developers.google.com/workspace/gmail/api/guides/labels) e [users.messages.modify](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).

## Lista de GE_Despachadas no final da tela

Demandas PESSOAIS exibe, abaixo da Caixa de entrada, a relação de mensagens individuais de `GE_Despachadas`, com remetente, assunto, data, trecho, estado de leitura, categorias e link para o Gmail. Usa páginas de 20, botão Carregar mais, atualização própria e busca nos registros carregados, independente dos filtros das três colunas. Categorias já aplicadas aparecem com indicação e botão desabilitado. As demais podem ser acrescentadas individualmente, preservando sempre `GE_Despachadas`, UNREAD e todas as categorias anteriores. A classificação na entrada atualiza também essa lista e as colunas sem exigir recarga da página.

`GET /api/google/classified` exige a mesma identidade Pessoal e permissão de leitura dos demais endpoints; resolve o ID de GE_Despachadas no servidor e lista somente metadados de mensagens desse marcador, sem spam, lixeira ou rascunhos. A consulta não cria marcadores e não depende da tabela de prazos. As ações continuam usando o endpoint classify existente, sem aceitar operações arbitrárias. Não há novo escopo, SQL ou variável. Política revisão 8. Publicar e validar na Vercel: listagem, paginação, categorias simultâneas, permanência em GE_Despachadas, preservação de prazos/responsáveis e troca de conta.


## Demandas INSTITUCIONAIS — três colunas e prazo confirmado

Em 13/11/2026, Marcos definiu três colunas na conexão **GERAL**, com mensagens individuais:

- **Caixa de entrada:** todas as mensagens em INBOX, mais recentes primeiro, por data/hora de recebimento (`internalDate` do Gmail).
- **Classificadas:** mensagens com o marcador Classificadas, ordenadas pela data limite salva mais antiga primeiro. Mensagens com esse marcador aplicadas externamente, sem prazo no FAROL, aparecem ao final com indicação.
- **Arquivadas:** mensagens com o marcador Arquivadas, mais recentes primeiro pela data/hora da mensagem; não pela data do arquivamento.

Ao conectar/reautorizar GERAL, o callback verifica e cria somente os ausentes **Classificadas** e **Arquivadas**, nessa ordem, após validar a identidade Google/Supabase. Status e listagens não criam marcadores. Os quatro marcadores pessoais e a conexão Pessoal continuam independentes. Reconectar não duplica nem renomeia marcadores; desconectar não os exclui. O Google representa essas pastas como marcadores.

**Classificar** exige a escolha explícita de uma data limite válida no cartão da entrada. O backend salva o prazo vinculado ao e-mail GERAL verificado e ao ID da mensagem, depois adiciona Classificadas e remove somente INBOX. **Arquivar** está disponível na entrada e nas classificadas: adiciona Arquivadas e remove somente INBOX e Classificadas. Preserva UNREAD e todos os outros marcadores. A operação é da mensagem escolhida, não de toda a conversa; não envia, edita conteúdo, exclui nem marca como lida. Arquivar preserva o prazo. Não há reabertura, edição do prazo em Classificadas ou histórico institucional nesta versão.

A tabela `farol_institutional_demands` tem RLS e acesso exclusivo do backend/service_role. A chave composta é proprietário Supabase + ID da mensagem. O payload AES-GCM contém o e-mail verificado da conta GERAL e a data limite civil de Brasília. Versão e horário são metadados. Não guarda assunto, corpo, trechos ou anexos. O proprietário e o e-mail vêm da sessão verificada, não de parâmetros que concedam acesso. A atualização usa versão condicional. Registros permanecem ao desconectar/arquivar e são recuperados pela mesma identidade; excluir a identidade remove seus registros em cascata.

Supabase e Gmail não formam uma transação única. O prazo é salvo antes da movimentação: falha no banco impede mover; falha/tempo limite no Gmail mantém o prazo para conferência e repetição segura da mesma data. A interface só anuncia movimentação após confirmação do backend e descarta respostas antigas após troca/desconexão. Em concorrência com outro navegador ou com o próprio Gmail, atualizar o quadro para reconciliar a posição da mensagem. Não executa migração/classificação retroativa nem atribui datas automaticamente.

`GET /api/google/institutional?mailbox=...&column=0|1|2` consulta cada coluna, com páginas de 20. Entrada/Arquivadas usam a paginação Gmail e ordenam por recebimento. Classificadas lista todos os IDs do marcador (até 10 mil por requisição), consulta os prazos criptografados em lotes de 100, ordena a seleção completa **antes** de paginar e busca o corpo somente das mensagens da página. Se a seleção exceder o limite, informa o erro sem apresentar uma ordem parcial como completa. Alterações no marcador durante a paginação podem deslocar páginas; Atualizar quadro reinicia a seleção. Busca e contagens consideram apenas os cartões carregados. Mensagens em spam/lixeira/rascunhos são excluídas; revalida o marcador ao obter o corpo.

`POST /api/google/institutional-move` exige Origin/X-Farol-Request, sessão GERAL, gmail.modify, identidade esperada, ID de mensagem válido e operação fixa classify/archive. Classificar exige data e versão; nenhum marcador arbitrário é aceito. Exige que a mensagem esteja nos marcadores permitidos; classificar recusa mensagens já em Arquivadas. Labels, UNREAD e confirmação da movimentação são tratados no servidor.

Mantida a identificação de **possíveis** prazos por regras de texto, sem IA externa: texto simples ou HTML convertido em texto inerte, sem anexos/links/imagens. Usa corpo e, na ausência de indicação, assunto. Reconhece datas completas como 20/11/2026, 2026-11-20 e 20 de novembro de 2026. Hoje/amanhã usam o recebimento em Brasília com aviso. Ano ausente/abreviado, datas inválidas, negações, mudanças e múltiplas datas no mesmo trecho pedem conferência. Não interpreta todos os formatos, dias úteis ou dias da semana; não garante interpretação semântica geral. O texto é limitado a 100 mil caracteres, com aviso de limite/ausência. **Sugestões não preenchem nem salvam a data limite automaticamente.**

### Ativação na Vercel

1. No Supabase **exclusivo FAROL GE**, executar `database/institutional-demands.sql` após `database/google-sessions.sql`.
2. No Data Access do projeto Google FAROL GE, incluir `https://www.googleapis.com/auth/gmail.modify`, se ainda não estiver cadastrado por causa da Pessoal. Não há variável de ambiente nova. Publicar o código e a política revisão 10 pelo Git/Vercel.
3. Na conexão **GERAL**, usar **Revisar autorização**, conceder a nova permissão e conferir a criação somente dos dois marcadores ausentes.
4. Validar na nuvem: classificação com data obrigatória; persistência após recarregar/reconectar; ordenação por prazo entre páginas; entrada/arquivadas por recebimento; arquivamento das duas origens; preservação de UNREAD e etiquetas; marcadores existentes; conta diferente e preservação da Pessoal; recusa/falha de permissão, SQL ausente e repetição após falha de rede.

Foram executados testes automatizados com dados fictícios e verificações estáticas. SQL, OAuth real e validação visual não foram executados remotamente nesta entrega. Não foi iniciado servidor local.

Referências oficiais: [listar mensagens](https://developers.google.com/workspace/gmail/api/guides/list-messages), [marcadores](https://developers.google.com/workspace/gmail/api/guides/labels), [criar marcador](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/create) e [modificar marcadores da mensagem](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).


Arquivos desta atualização: `institutional.js`, `server/institutional.cjs`, `server/google.cjs`, `database/institutional-demands.sql`, `app.js`, `index.html`, `styles.css`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/institutional.test.cjs`, `tests/google.test.cjs` e `tests/frontend.test.cjs`.


## Correção de preparação de marcadores — 14/11/2026

Se a linha GERAL indicar Classificação autorizada, mas marcadores incompletos, a autorização de escrita já foi reconhecida pelo FAROL: o bloqueio é a ausência de confirmação de Classificadas e/ou Arquivadas. O status agora mostra exatamente quais desses dois nomes faltam. A imagem do Google não comprova, por si só, a preparação dos marcadores da conexão ativa.

O botão **Preparar marcadores** aparece no quadro institucional quando há permissão de escrita e os marcadores não estão confirmados. Ele usa `POST /api/google/institutional-labels`, com CSRF e sessão GERAL verificada, sem refazer OAuth: lista e cria somente os ausentes Classificadas/Arquivadas, confirma os nomes por nova listagem e atualiza o quadro e a conexão. Não movimenta e-mails, não altera a Pessoal e não aceita nomes arbitrários. GET de status e listagens continuam sem criar marcadores. A confirmação de criação faz uma nova leitura sem cache e uma conferência adicional se a primeira listagem ainda não refletir o resultado. Não libera ações com base apenas na resposta de criação.

Falhas são informadas por categorias seguras (permissão recusada, nome recusado, indisponibilidade ou nomes não confirmados), sem exibir respostas brutas do Google, tokens ou logs de conteúdo. Não foi possível determinar a causa remota da ausência dos marcadores somente pela captura de tela; o fluxo agora permite tentar a preparação diretamente e distinguir essas condições. A comparação dos nomes permanece exata, sem renomear ou adotar outros marcadores.

Para ativar, publicar os arquivos pelo Git/Vercel e clicar em **Preparar marcadores** na tela institucional. Não há SQL, variável ou escopo adicional nesta correção. O SQL institucional da entrega anterior continua necessário. Política revisão 11 informa a preparação explícita. Foram verificados testes automatizados com dados fictícios, sintaxe e diferenças Git; não houve acesso à sessão Google real, alteração de marcadores reais ou validação visual remota nesta correção.

Arquivos alterados nesta correção: `server/google.cjs`, `institutional.js`, `app.js`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/google.test.cjs`, `tests/institutional.test.cjs` e `tests/frontend.test.cjs`.


## Nomes definitivos dos marcadores — 15/11/2026

| Conexão | Marcadores utilizados |
| --- | --- |
| PESSOAL | `GE_ME DEVEM`, `GE_MINHAS`, `GE_DEVO`, `GE_Despachadas` |
| GERAL | Caixa de Entrada existente do Gmail (`INBOX`), `Classificadas`, `Arquivadas` |

O quarto marcador Pessoal passa a ser **GE_Despachadas** em criação, conferência, classificação, leitura de conversas, lista final, mensagens da interface e política. Classificar continua adicionando a categoria escolhida e esse marcador, retirando somente INBOX e preservando UNREAD e as outras etiquetas. A lista GE_Despachadas permite acrescentar categorias sem retirar as anteriores. O nome não significa envio de mensagem: não há alteração de conteúdo ou envio pelo FAROL.

Os nomes do backend estão em `server/mailbox-labels.cjs`, compartilhados pela preparação OAuth e pelos endpoints Pessoal/Geral. As rotas internas `classified` e os IDs técnicos de interface correspondentes foram preservados; elas agora consultam somente o novo marcador pessoal. A configuração pública espelha os quatro nomes pessoais, mas não concede operações arbitrárias ao frontend. O status Pessoal mostra quatro marcadores prontos (4/4).

Não há renomeação, exclusão, transferência de marcadores antigos ou classificação retroativa. Se o marcador anterior continuar no Gmail, não será usado como substituto de GE_Despachadas. Mensagens que tiverem somente o marcador anterior não passam automaticamente para a nova lista; suas demais etiquetas permanecem. Prazos existentes por conversa/identidade continuam no banco e são reutilizados quando as conversas voltam a ter os marcadores exigidos. A GERAL mantém seus nomes e não cria INBOX. Quando a mesma conta é usada nas duas conexões, cada tipo prepara apenas seus próprios marcadores.

Após publicar, Marcos pode testar a recriação dos marcadores que apagar manualmente: usar **Pessoal → Revisar autorização** para preparar os quatro pessoais e **GERAL → Revisar autorização** ou **Preparar marcadores** para os dois institucionais. Conferir os nomes, atualização da lista GE_Despachadas, status 4/4, inclusão de categorias simultâneas e preservação de UNREAD. As duas conexões continuam independentes.

Sem novo SQL, escopo ou variável. Política revisão 12. Testes automatizados cobrem a recriação por tipo após exclusão dos marcadores na mesma conta e a ausência de escrita pelo status. O teste com a conta real requer publicação na Vercel; nenhuma conta ou marcador real foi alterado nesta atualização. A falha anterior de criação automática de Arquivadas não teve sua causa determinada e não deve ser considerada corrigida por esta troca de nomes.

Arquivos desta atualização: `server/mailbox-labels.cjs`, `server/google.cjs`, `server/demands.cjs`, `server/institutional.cjs`, `demands.js`, `app.js`, `config.js`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/google.test.cjs`, `tests/demands.test.cjs` e `tests/frontend.test.cjs`.


## Visão GERAL e linguagem feminina — 15/11/2026

Marcos definiu que as demandas devem ser sempre tratadas no feminino: Classificadas, Arquivadas e Despachadas. O quarto marcador Pessoal é **GE_Despachadas** em todo o código, preparação, classificação, lista final e política. Corrigir brevemente referências masculinas que surgirem na conversa. Não renomear/excluir marcadores já existentes nem migrar mensagens automaticamente; usar Pessoal → Revisar autorização para criar o novo nome se estiver ausente. A nomenclatura geral permanece Classificadas e Arquivadas, com INBOX padrão.

Visão GERAL agora exibe oito caixas:

| Grupo | Contagens |
| --- | --- |
| E-mails da ESCOLA (GERAL) | Caixa de Entrada, Classificadas, Arquivadas |
| E-mails PESSOAIS | ME DEVEM, MINHAS, DEVO, Caixa de Entrada, Despachadas |

Os totais são **mensagens** (`messagesTotal` de `users.labels.get`), incluindo lidas e não lidas e todas as páginas. Não são conversas (`threadsTotal`), estimativas de busca, cartões carregados ou demandas únicas. Contagens por marcadores podem se sobrepor, incluindo GE_Despachadas e categorias pessoais; não há soma geral nem indicadores de risco ou conclusão. Cada grupo mostra o e-mail verificado da conexão que forneceu seus números e pode ser atualizado separadamente. Os dados são carregados ao entrar na tela ou mudar a identidade/permissão da conexão. Além de Atualizar totais, desde 17/11 há uma opção de atualização automática por minuto na Visão GERAL, conforme a seção ao final.

`GET /api/google/overview?type=general|personal&mailbox=...` exige a sessão própria do tipo solicitado, e-mail esperado e autorização de consulta ao Gmail. Geral nunca dá acesso a totais da Pessoal e vice-versa. O backend resolve somente os marcadores fixos da conexão e consulta as contagens com concorrência limitada. Não consulta mensagens/conversas, não lê corpo/assunto/anexos, não grava totais no banco/localStorage e não cria/modifica marcadores. Uma falha isolada de contagem pode ser mostrada no cartão sem apagar contagens válidas do mesmo grupo; falhas de autenticação/permissão interrompem a resposta do grupo. Ausência de marcador é sinalizada. Apenas um total zero confirmado pelo Gmail é apresentado como zero; demais estados exibem traço e explicação.

Os grupos e suas explicações ficam visíveis sem conexão e em falhas de status. Trocar/desconectar uma conta limpa imediatamente seus totais e invalida respostas pendentes, preservando o outro grupo. Os módulos Radar, BI SEED, Demandas e Configurações mantêm suas funções. A Visão GERAL mantém indicação do desenvolvimento futuro de acompanhamento de alunos e índices BI SEED, sem inventar indicadores adicionais.

Sem novo SQL, escopo ou variável. Política revisão 13 e diálogo de conexão atualizados. Publicar na Vercel, reautorizar Pessoal para preparar GE_Despachadas e validar: comparar os totais com mensagens por marcador no Gmail (a interface Gmail pode agrupar conversas); conta Geral e Pessoal distintas; somente uma conectada; marcadores ausentes; zero real; falha de rede; troca/desconexão durante consulta; atualização manual e categorias simultâneas. Não houve publicação nem validação visual/contagens na conta real nesta entrega. A falha anterior de criação automática de Arquivadas continua sem causa determinada; esta implementação de contadores não a corrige.

Arquivos principais: `overview.js`, `server/overview.cjs`, `server/google.cjs`, `server/mailbox-labels.cjs`, `app.js`, `demands.js`, `config.js`, `index.html`, `styles.css`, `privacidade.html`, documentação e testes. Testes da entrega: `tests/overview.test.cjs`, `tests/google.test.cjs`, `tests/frontend.test.cjs`, `tests/demands.test.cjs`.

Referências: [Label e messagesTotal](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels) e [users.labels.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/get).


## Marcadores GE_ e títulos da interface — nomes confirmados

Marcos confirmou e corrigiu a distribuição por conexão em 15/11/2026. Esta seção substitui as nomenclaturas anteriores deste documento.

| Conexão | Nome exato no Gmail | Nome mostrado na interface |
| --- | --- | --- |
| PESSOAL | `GE_ME DEVEM` | ME DEVEM |
| PESSOAL | `GE_MINHAS` | MINHAS |
| PESSOAL | `GE_DEVO` | DEVO |
| PESSOAL | `GE_Despachadas` | Despachadas |
| GERAL | `GE_Classificadas` | Classificadas |
| GERAL | `GE_Arquivadas` | Arquivadas |
| Ambas, cada qual na própria conta | `INBOX` do Gmail | Caixa de Entrada |

O prefixo GE_ identifica os marcadores do FAROL no Gmail. A INBOX padrão não é criada como marcador personalizado. Não inverter os tipos de conexão. O backend compartilha os nomes em `server/mailbox-labels.cjs`; os títulos das categorias Pessoais são separados dos nomes Gmail para que botões, categorias simultâneas e responsáveis por categoria continuem funcionando. As respostas de categorias Pessoais usam os títulos sem prefixo; os contadores resolvem nomes Gmail exatos, que o frontend associa aos títulos visuais.

Pessoal classifica a mensagem adicionando o ID da categoria GE_ escolhida e de GE_Despachadas, removendo apenas INBOX. A lista Despachadas consulta GE_Despachadas. Geral classifica com data confirmada em GE_Classificadas e arquiva em GE_Arquivadas, removendo somente INBOX e, no arquivamento, GE_Classificadas. Os outros marcadores e UNREAD são preservados. Visão GERAL mostra três caixas da Escola e cinco Pessoais com os nomes visuais solicitados e consulta os totais dos novos marcadores GE_. Nenhuma operação foi transferida de uma conexão à outra.

Preparação: no callback OAuth, cada tipo verifica/cria somente seus nomes ausentes, na ordem da tabela. GERAL também mantém o botão Preparar marcadores com autorização existente. Status e contadores não criam. Se uma criação falhar, tenta os demais nomes fixos e retorna a falha sem simular sucesso completo; reconectar/preparar novamente tenta somente o que ainda falta. Conflitos ou respostas perdidas são reavaliados por nova listagem. Sucesso depende de confirmar todos os nomes reais no Gmail.

Marcadores sem GE_ e os nomes numéricos anteriores não são adotados como aliases nem renomeados ou excluídos. Não há migração automática de mensagens. Marcadores antigos, suas mensagens e dados de acompanhamento permanecem; mensagens precisam receber os novos marcadores para aparecer nas novas seleções. Não há alteração de SQL, variáveis ou escopos. Política revisão 14 e diálogo de conexão atualizados.

Após publicar na Vercel: reautorizar PESSOAL e confirmar os quatro nomes GE_ criados pela aplicação; reautorizar GERAL ou usar Preparar marcadores e confirmar GE_Classificadas e GE_Arquivadas criados pela aplicação. Conferir status 4/4 e nomes gerais prontos, contadores com títulos sem prefixo, classificação com categorias simultâneas, data institucional e arquivamento com preservação de UNREAD/outros marcadores. Testar também somente um marcador ausente, reconexão sem duplicação, mesma conta nas duas conexões e contas distintas. Não apagar/renomear marcadores para teste automaticamente.

Nesta entrega, a criação e as ações foram verificadas com testes automatizados e dados fictícios. Não houve criação manual ou automática na conta real, publicação ou validação visual na Vercel. O novo prefixo e o tratamento de falhas não comprovam a resolução da rejeição anterior do Google: a confirmação real precisa ser feita pela aplicação publicada, sem criar manualmente o marcador como substituto desse teste.

Arquivos alterados: `server/mailbox-labels.cjs`, `server/demands.cjs`, `server/google.cjs`, `demands.js`, `overview.js`, `institutional.js`, `app.js`, `config.js`, `index.html`, `privacidade.html`, `AGENTS.md`, `README.md`, `CONEXOES_GOOGLE.md`, `tests/demands.test.cjs`, `tests/google.test.cjs`, `tests/institutional.test.cjs`, `tests/overview.test.cjs`.


## Correção da atualização após arquivar — 15/11/2026

A captura enviada por Marcos mostrou sucesso no arquivamento e falha de consulta apenas na coluna de entrada, que passou a exibir zero e pedir nova autorização. Foi encontrado no código que a atualização esvaziava a lista antes de obter uma nova resposta e que o backend convertia qualquer 403 do Gmail em falta de escopo. Essas duas falhas foram corrigidas. A causa específica da resposta Google recebida na conta real não foi identificada pela captura; não afirmar que houve revogação, limite de consultas ou movimentação de todas as mensagens sem evidência.

A lista carregada agora é mantida durante a consulta e em falhas. A coluna sinaliza dados anteriores e bloqueia novas ações nela até atualizar, preservando as demais colunas e os rascunhos de datas. Uma consulta bem-sucedida substitui a primeira página; Carregar mais acrescenta sem duplicar. Falha antes do primeiro carregamento exibe traço, sem declarar caixa vazia. Troca de conta, login inválido e desconexão continuam limpando o estado e invalidando respostas antigas.

Após confirmar uma movimentação, o frontend retira somente a mensagem escolhida das origens e mostra seu cartão no destino com base nessa confirmação. Atualiza apenas a coluna de origem e a de destino, em sequência, em vez de reler as três simultaneamente. Se a atualização posterior falhar, mantém a movimentação confirmada e os demais cartões, com mensagem própria. Nenhum POST é repetido automaticamente.

`server/gmail-errors.cjs` distingue 403 por limite (`rateLimitExceeded`, `userRateLimitExceeded`, cota), falta efetiva de escopo (`insufficientPermissions`/`insufficientAuthenticationScopes`), política da organização (`domainPolicy`) e 403 sem motivo reconhecido. Erros desconhecidos não pedem nova autorização como diagnóstico automático. 429/limites retornam `gmail_rate_limit`; política retorna `gmail_domain_policy`. Na leitura institucional, limites transitórios, falhas 5xx e alguns erros de rede admitem somente mais uma tentativa GET, após um segundo; limite diário não é repetido. A resposta ao frontend contém somente códigos seguros, sem mensagens brutas do Google, tokens ou logs de conteúdo. As regras de autorização existentes continuam obrigatórias.

Arquivos alterados: `institutional.js`, `server/institutional.cjs`, `server/google.cjs`, `server/gmail-errors.cjs`, `tests/institutional.test.cjs`, `tests/google.test.cjs`, `tests/gmail-errors.test.cjs`, `README.md`, `AGENTS.md`. Sem SQL, escopos, variável ou finalidade nova de tratamento. Política revisão 14 permanece aplicável.

Validação: testes automatizados reproduzem duas mensagens arquivadas em sequência e falha na recarga da entrada, confirmando preservação da terceira mensagem, destino correto e recuperação por Atualizar quadro. Cobrem falha no primeiro carregamento, identidade alterada e razões de erro Google. Verificações estáticas e Git concluídas. Não houve publicação nem teste de movimentação em conta real. A verificação visual na sessão foi limitada pela ferramenta/revisão automática ao acessar controles de exibição do Firefox; não declarar essa tentativa como validação remota da correção. Após publicar na Vercel, conferir o mesmo fluxo com mensagens escolhidas pelo usuário e falhas de rede.

Referência oficial: [tratamento de erros Gmail](https://developers.google.com/workspace/gmail/api/guides/handle-errors).


## Manutenção do Sistema — arquivos do Drive GERAL (16/11/2026)

A tela consulta exclusivamente a conexão **GERAL** da escola, localiza uma pasta acessível com nome exato `FarolGE` (própria ou em Compartilhados comigo, inclusive se estiver dentro de outra pasta), resolve sua subpasta direta de nome exato `FaltasSemanais` e mostra os nomes dos arquivos diretamente em `FaltasSemanais`, em ordem alfabética. Exclui lixeira e subpastas, não abre conteúdo, segue atalhos ou modifica arquivos. Lista em páginas de 100 com **Carregar mais** e **Atualizar lista**. Se houver mais de uma pasta acessível FarolGE ou mais de uma FaltasSemanais diretamente nela, informa a duplicidade sem escolher silenciosamente. Pasta ausente, pasta vazia e falha são estados distintos.

GET `/api/google/maintenance?mailbox=...` exige sessão Geral verificada, identidade proprietária, conta esperada e capacidade `driveMetadata`. O servidor resolve as duas pastas fixas a cada chamada; não aceita pasta arbitrária. Paginação fica vinculada à pasta resolvida. Troca/desconexão da Geral, saída da tela e perda de autorização invalidam respostas pendentes e limpam a lista. Uma falha transitória de atualização preserva a lista anterior com aviso. A Pessoal não autoriza a consulta. Nomes são escapados antes de mostrar na tela. Os metadados ficam somente em memória, sem banco, armazenamento local ou logs de nomes/conteúdo.

**Ativação:** habilitar Google Drive API no projeto Google exclusivo FAROL GE; adicionar `https://www.googleapis.com/auth/drive.metadata.readonly` ao Data Access do Google Auth Platform; publicar código e política revisão 15; usar **Geral → Revisar autorização** e conceder a consulta de metadados. `drive.file` sozinho não dá acesso geral a nomes de arquivos preexistentes. A nova permissão permite consultar metadados em todo o Drive; o código resolve FarolGE e FaltasSemanais e limita a listagem de arquivos aos filhos diretos de FaltasSemanais. Não concede leitura de conteúdo nem alteração por essa permissão. A permissão é classificada como restrita pelo Google e pode exigir verificação adicional para uso em produção. Sem novo SQL ou variável Vercel. A Pessoal continua com seus escopos anteriores.

Validar na Vercel: conta Geral distinta da Pessoal, pasta FarolGE com arquivos reais em FaltasSemanais, mais de 100 arquivos, pasta vazia/ausente/duplicada, recusa do novo escopo, falha de consulta e troca/desconexão durante carregamento. Os testes usam dados fictícios, sem servidor local, publicação ou acesso a arquivos reais.

Referências oficiais: [escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) e [files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).

Arquivos desta implementação: `maintenance.js`, `server/maintenance.cjs`, `app.js`, `index.html`, `styles.css`, `server/google.cjs`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/maintenance.test.cjs`, `tests/google.test.cjs` e `tests/frontend.test.cjs`.


### Pastas compartilhadas com a Geral — correção de 16/11/2026

A consulta anterior exigia `'me' in owners`, excluindo FarolGE quando a pasta pertencia a outra conta e aparecia em **Compartilhados comigo**. Esse filtro foi removido. A pesquisa continua no conjunto acessível à sessão Geral (`corpora=user`), usando os nomes exatos FarolGE/FaltasSemanais e a relação de pasta pai; não exige adicionar atalho ao Meu Drive, transferir propriedade nem mover arquivos. Pastas próprias e compartilhadas acessíveis são aceitas; nomes duplicados continuam sendo sinalizados.

Sem novo escopo, SQL ou variável. A captura mostra a consulta de nomes no Drive autorizada; depois de publicar a correção, clicar **Atualizar lista**. Não é necessário revisar a autorização apenas por essa correção. Testes fictícios cobrem pasta pertencente a outra conta, subpasta direta e arquivos compartilhados. Validar o arquivo real pela aplicação na Vercel; a captura não comprova por si só que as duas janelas usam a mesma Conta Google.

Arquivos desta correção: `server/maintenance.cjs`, `maintenance.js`, `tests/maintenance.test.cjs`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md` e `AGENTS.md`. Referência: [pesquisa de arquivos no Drive](https://developers.google.com/workspace/drive/api/guides/search-files).


## Carga de Faltas do RCO — 17/11/2026

A Manutenção do Sistema apresenta, abaixo do quadro de arquivos, o quadro **Carga de Faltas do RCO** com as quatro orientações solicitadas por Marcos: gerar relatórios por período e semana no RCO, renomear como `AAAA_MM_DDMM_DDMM_Periodo.PDF` (AAAA: ano; MM: mês; DD: dia; Periodo: Manha/Tarde), copiar para FarolGE/FaltasSemanais no Drive do Colégio e executar a captura no FAROL. As orientações permanecem visíveis sem conexão.

A relação **Arquivos disponíveis para captura** mostra os nomes com extensão `.pdf` (sem distinguir maiúsculas/minúsculas) entre os arquivos carregados da mesma consulta Geral. Ambos os quadros compartilham atualização, paginação e invalidação ao trocar/desconectar a conta. Se houver páginas restantes, informa que é preciso Carregar mais; falhas não declaram ausência de PDFs. Não valida o conteúdo nem o formato dos nomes nesta etapa.

Esta entrega exibe orientações e disponibilidade; a captura/importação de dados dos relatórios ainda não foi implementada, e a tela informa isso. Não abre PDFs nem grava dados de estudantes; sem novo escopo, SQL ou variável. Política revisão 15 permanece aplicável à consulta de nomes. Validação visual na Vercel pendente. Arquivos alterados: `maintenance.js`, `styles.css`, `tests/maintenance.test.cjs`, `README.md` e `AGENTS.md`.


## Inspetores/Monitores e Carga de Alunos — 17/11/2026

O menu mostra Inspetores/Monitores antes de Radar. A tela consulta os alunos da identidade **Geral**, em ordem alfabética em português, com série/turma/turno à direita; permite buscar por nome, CGM ou turma. Cada nome abre um diálogo para digitar a ocorrência. Escola, CGM e Nome derivam do vínculo selecionado, nunca de dados livres enviados pelo navegador. Data e Hora usam o instante do servidor no fuso America/Sao_Paulo. Cada envio tem um UUID para evitar duplicação se a resposta for perdida; não há repetição automática de POST. Não envia avisos nem faz avaliação automática do aluno. A consulta de ocorrências está na Visão GERAL, conforme a seção ao final; edição do histórico ainda não está implementada.

Na manutenção, **Carga de Alunos** lista os arquivos diretamente em **FarolGE/ListaAlunos**, próprios ou compartilhados com a Geral, em páginas de 10. Mostra nome, geração identificada no PDF e criação no Drive (identificadas separadamente). A data de geração é buscada em `/CreationDate` nos últimos 64 KB do PDF, com concorrência 2; formatos que não a exponham nessa faixa aparecem como não identificados, sem usar a criação do Drive como substituta. Ao carregar, PDF.js confirma a geração pelo metadado completo. Arquivos incompatíveis ficam sem ação de carga.

O botão **Carregar** lê o PDF escolhido no backend e importa **Escola, CGM, Nome, Serie, Turma e Turno**. Usa o modelo Relação de Alunos por Turma do Sistema Escola fornecido por Marcos: cabeçalho escolar inicial, contexto de série/turma/turno por página e colunas CGM/Nome por coordenadas. O modelo tem uma linha sem número de ordem, reconhecida pelo CGM na coluna correta. Relatórios digitalizados, protegidos, incompletos ou com outro leiaute são recusados; não há OCR nem IA externa. Campos como RG, CPF, telefone, nascimento, idade, sexo e situação não são importados. Nomes/corpo do relatório não são registrados em logs nem persistidos no navegador.

Uma linha representa um vínculo Escola/CGM/Serie/Turma/Turno. O relatório tem alunos em programas e turmas simultâneos; esses vínculos são preservados, sem precedência inferida por situação de matrícula ou curso. Linhas repetidas do mesmo vínculo/nome são reunidas; nomes conflitantes no mesmo vínculo impedem a carga completa. Registros de transferidos e outros estados também constam no relatório e são importados, pois não foi definida filtragem por situação. Não restringir silenciosamente aos matriculados. Novos arquivos inserem/atualizam os vínculos presentes, sem remover os ausentes ou apagar ocorrências. A chave técnica é HMAC com a chave já usada no FAROL e com a identidade proprietária; não mistura dados de contas distintas.

### Ativação

1. No Supabase **exclusivo FAROL GE**, executar `database/students.sql`, após `database/google-sessions.sql`. Cria as tabelas **Alunos** e **Ocorrencias** com os nomes/campos solicitados e colunas técnicas de proprietário, chave/ID e atualização. Escola/CGM/Nome/Serie/Turma/Turno e o texto da ocorrência são cifrados com AES-GCM antes de gravar; portanto o Table Editor mostra os campos cifrados. RLS sem policies/acesso de anon/authenticated; somente o backend/service_role tem acesso. Uma RPC faz a carga inteira em uma transação. Não alterar tabelas de outro projeto.
2. No Data Access do Google Auth Platform do FAROL, incluir `https://www.googleapis.com/auth/drive.readonly` e manter os escopos anteriores. A permissão permite leitura ampla dos arquivos acessíveis à Geral; o código limita a consulta/carga às pastas fixas e aos PDFs escolhidos. A Pessoal continua sem esse novo escopo. Publicar código e política **revisão 16** e usar **Geral → Revisar autorização**. Sem nova variável Vercel.
3. Copiar o PDF para FarolGE/ListaAlunos. Na manutenção, Atualizar arquivos e Carregar. Em Inspetores/Monitores, Atualizar alunos, abrir o nome e salvar uma ocorrência. Testar contas distintas, permissão recusada, SQL ausente, arquivo alterado/movido, duplo clique, falha de rede e troca/desconexão durante consulta/salvamento.

GET `/api/google/students` e POST `/api/google/occurrence` exigem sessão Geral própria, mesmo sem permissão Gmail/Drive para acessar o cadastro já importado. GET `/api/google/student-files` exige consulta de metadados; consulta limitada da geração exige leitura. POST `/api/google/student-import` exige leitura de Drive e verifica novamente o caminho fixo, a pasta pai, o MIME PDF, o tamanho e a versão do arquivo antes da carga. Não aceita pasta arbitrária nem escola/identificação do aluno informadas pelo cliente. POST exige Origin/X-Farol-Request. Limites: 10 MB por arquivo, 100 páginas e 10.000 linhas; lista até 10.000 vínculos, sem truncar silenciosamente. Troca/desconexão ou saída da tela invalida respostas e limpa estado; requisições de escrita já aceitas pelo servidor podem terminar na conta de origem.

A conta Geral é a fronteira de acesso desta etapa. Não há novo cadastro de escola, vínculo de monitores por conta Pessoal ou perfis individuais; não inferir vínculo escolar pelo e-mail. Escola é o nome presente no relatório, usado como dado do registro, sem conceder acesso. Desconectar preserva alunos/ocorrências para reconectar a mesma identidade. Exclusão administrativa da identidade remove esses registros em cascata. Política detalha retenção e atendimento de correção/exclusão.

PDF.js foi acrescentado como dependência de produção. `vercel.json` inclui a biblioteca/worker no pacote da Function e define até 60 segundos. Os testes usam dados fictícios. A leitura local do modelo fornecido reconheceu 18 páginas, 374 linhas, 341 vínculos e 323 CGMs distintos, com geração em 17/11/2026 às 08:53:56 (Brasília), sem gravar dados reais no Supabase. O PDF e extrações reais não foram versionados. Não houve execução de SQL remoto, publicação ou validação visual na Vercel.

Arquivos: `database/students.sql`, `server/student-store.cjs`, `server/students.cjs`, `server/student-pdf.cjs`, `server/student-import.cjs`, `server/maintenance.cjs`, `server/google.cjs`, `students.js`, `student-import.js`, `maintenance.js`, `app.js`, `index.html`, `styles.css`, `package.json`, `package-lock.json`, `vercel.json`, `privacidade.html`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `README.md` e testes `tests/students.test.cjs`, `tests/students-frontend.test.cjs`, `tests/google.test.cjs`, `tests/frontend.test.cjs`.

Referências: [download e leitura parcial Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [PDF.js](https://mozilla.github.io/pdf.js/examples/) e [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).


## Falha genérica na carga de alunos — 17/11/2026

Após conceder leitura, Marcos mostrou a geração do PDF identificada e o botão habilitado, mas o POST de carga terminou com mensagem genérica. Confirmou que `database/students.sql` executou sem erro. A captura não identifica a etapa remota e o diagnóstico do POST não pôde ser lido pelas ferramentas de navegador desta sessão; não afirmar que os alunos foram ou não gravados, nem atribuir automaticamente a falha ao Google/Supabase.

Foi reproduzida, em pacote isolado com os arquivos PDF.js explicitamente incluídos anteriormente e sem sua dependência nativa, uma falha de importação `ReferenceError: DOMMatrix`. Ao incluir a dependência, o mesmo teste iniciou corretamente. `@napi-rs/canvas` agora é dependência direta, carregada explicitamente antes de PDF.js; `vercel.json` inclui PDF.js e `@napi-rs`/binários nativos. O worker usa caminho resolvido no servidor, sem depender da localização do bundle. A reprodução confirma essa condição de empacotamento, mas não confirma que ela causou o POST da captura na Vercel.

A inicialização do leitor agora fica protegida e retorna `pdf_runtime_unavailable`, sem confundir com leiaute incompatível. A carga identifica as etapas pasta, metadados, download, leitura e gravação. O armazenamento distingue SQL ausente/incompleto, acesso recusado, estrutura incompatível e indisponibilidade; respostas brutas, tokens, caminhos internos e dados pessoais não são devolvidos nem registrados. O frontend explica essas falhas e também sinaliza resposta inválida/timeout. Se a falha for de comunicação com Supabase ou resposta incerta, orienta conferir os alunos; não afirma rollback sem confirmação. Nenhum POST é repetido automaticamente, e a lista de arquivos é preservada.

Sem SQL, variável, escopo ou finalidade nova. Publicar a correção na Vercel e repetir a carga escolhida pelo usuário. Como o SQL já foi executado, não é necessário executá-lo novamente por esta correção. Se persistir, a mensagem específica permite prosseguir com evidência da etapa. Testes: 166 aprovados, incluindo inicialização/worker indisponíveis, erros seguros de armazenamento, ausência de repetição automática e preservação da lista. Verificação estática e diff sem erros. Não houve publicação, nova carga real ou confirmação do erro remoto.

Arquivos alterados nesta correção: `server/student-pdf.cjs`, `server/student-import.cjs`, `server/student-store.cjs`, `server/google.cjs`, `student-import.js`, `students.js`, `package.json`, `package-lock.json`, `vercel.json`, `tests/students.test.cjs`, `tests/students-frontend.test.cjs`, `tests/google.test.cjs`, `README.md` e `AGENTS.md`.


## Ocorrências na Visão GERAL — 17/11/2026

Ao lado de E-mails PESSOAIS em telas amplas, o quadro **Ocorrências dos alunos** mostra **Data, Hora, Aluno, Turma e Ocorrência**, em ordem decrescente de Data/Hora, com ID como desempate estável. Em telas menores, o quadro passa para a linha seguinte; a tabela permite rolagem horizontal. Textos de ocorrência preservam as quebras de linha e são escapados, sem interpretar HTML.

A consulta usa somente a identidade **Geral**, independentemente das permissões Gmail/Drive ou da conexão Pessoal. GET `/api/google/occurrences?mailbox=...` valida a caixa esperada antes de consultar. A tabela Ocorrencias é filtrada por owner_id da sessão; a turma (série/turma/turno) vem da relação existente com Alunos, pela chave composta de proprietário e vínculo, sem acrescentar colunas. Nome e texto da ocorrência são decifrados usando a chave da ocorrência; série/turma/turno usando a chave do vínculo. CGM, escola e campos pessoais adicionais não são enviados nesse endpoint.

Consulta em páginas de 20, com Atualizar ocorrências e Carregar mais. A paginação usa cursor validado por Data/Hora/ID, sem offset e sem aceitar proprietário do cliente. Novas ocorrências mais recentes aparecem ao atualizar. A atualização com falha mantém a lista anterior com aviso; conta desconectada/trocada, saída da tela e respostas de autenticação inválida limpam o estado e invalidam respostas antigas. Sem conexão, mantém o quadro com explicação. Ausência confirmada é diferente de falha de consulta. O quadro não altera as contagens de e-mail.

Sem novo SQL, variável ou escopo; usa as tabelas já criadas por students.sql. Política de Privacidade revisão 17 descreve a consulta. Testes automatizados verificam isolamento Geral/Pessoal, consulta sem Gmail/Drive, descriptografia, ordem, paginação, texto seguro, estados vazios/falha e troca de conta. Não houve publicação nem verificação visual na Vercel nesta entrega.

Arquivos alterados: `overview.js`, `styles.css`, `server/student-store.cjs`, `server/students.cjs`, `server/google.cjs`, `tests/overview.test.cjs`, `tests/students.test.cjs`, `tests/google.test.cjs`, `privacidade.html`, `README.md` e `AGENTS.md`.


## Atualização automática da Visão GERAL — 17/11/2026

A opção **Atualizar automaticamente a cada 1 minuto** permite deixar o painel aberto para acompanhamento da Diretora. Começa marcada por padrão, conforme solicitado por Marcos. Ao abrir a tela ou reativar a opção, consulta imediatamente os totais autorizados da Geral/Pessoal e as ocorrências da Geral; depois repete a cada 60 segundos enquanto a Visão GERAL estiver montada e a aba visível. Cada consulta já em andamento é respeitada, sem sobreposição no mesmo quadro. Não recarrega a página nem executa POST.

Abas ocultas pausam o temporizador. Ao voltar, consulta novamente e reinicia o intervalo; o navegador/computador suspenso pode atrasar atualizações. Sair do módulo cancela o temporizador e o listener. A escolha fica só em memória durante a página e é retomada ao retornar ao módulo; recarregar a página começa com a opção marcada, sem preferência ou dados gravados no navegador. Desmarcar interrompe os próximos ciclos; leituras já iniciadas podem concluir.

Os ciclos de ocorrências retornam à primeira página dos registros mais recentes (20); Carregar mais continua disponível. As contagens anteriores permanecem durante a atualização e em falhas transitórias, com aviso de dados anteriores, assim como as ocorrências. Falhas de identidade/autorização e troca/desconexão continuam removendo os dados correspondentes e invalidando respostas. Os controles manuais permanecem disponíveis.

Sem novo SQL, escopo ou variável. Política revisão 17 descreve a consulta automática como opção da mesma finalidade. Testes com temporizador simulado conferem os 60 segundos, consulta dos três quadros, bloqueio de sobreposição, pausa/retomada, interrupção ao desmarcar/sair, desconexão e preservação de dados em falha. 174 testes aprovados. Sem publicação nem validação visual na Vercel nesta entrega. Arquivos alterados: `overview.js`, `styles.css`, `tests/overview.test.cjs`, `privacidade.html`, `README.md` e `AGENTS.md`.


## Controle de acesso — EmailsAutorizados (17/11/2026)

Esta seção substitui a entrada aberta descrita nas seções anteriores. Somente e-mails na tabela **EmailsAutorizados**, com campos **Escola**, **Nome** e **email**, podem conectar ou continuar usando os dados/operações autenticadas do FAROL GE. Aplica-se a ambas as conexões Geral/Pessoal e a todos os domínios de Contas Google, inclusive Gmail e institucional. O endereço vem do ID token Google verificado (assinatura, audiência, nonce e email_verified), nunca de parâmetros ou campos do navegador. A verificação ocorre antes de criar usuário/sessão Supabase, consultar Gmail/Drive ou preparar marcadores da nova conta.

O backend também consulta a lista em cada requisição autenticada. Remover um e-mail bloqueia seus próximos acessos, inclusive por sessão existente; requisições já autorizadas em andamento podem concluir. Falha ou ausência da tabela bloqueia a operação com erro próprio, sem tratar indisponibilidade como “não cadastrado” nem liberar acesso por padrão. Sair/desconectar continua permitido. Nenhuma conta é automaticamente inserida na lista. A Escola é informação administrativa e não implementa vínculos de pessoas, compartilhamento de dados por escola ou transferência dos registros entre contas. O isolamento atual por identidade Geral/Pessoal permanece.

Após uma tentativa negada, a tela mostra: “Desculpe mas, esse E-mail não está autorizado a acessar o aplicativo FarolGE. Entre em contato com o suporte para pedir a liberação.” O botão **entrar em contato com o suporte** abre `https://wa.me/5543999525060` com o texto “Gostaria de solicitar acesso ao FarolGE para o E-mail ” seguido do endereço Google validado. A mensagem fica preenchida para confirmação de envio no WhatsApp; nenhum envio automático ocorre. **cancelar** apenas fecha o diálogo. Não há solicitação automática ao suporte nem liberação pelo botão.

O e-mail negado não vai na URL de retorno OAuth. Um ticket aleatório em cookie Secure/HttpOnly/SameSite=Lax referencia um payload cifrado temporário com expiração de 10 minutos. GET `/api/google/access-denied` consome esse ticket uma única vez e retorna somente o e-mail daquela tentativa ao próprio navegador; sem cookie ou após expiração retorna 404. Parâmetros `email` fornecidos pelo cliente não são usados. Tentativa negada de trocar uma conta preserva conexões anteriormente autorizadas. Se uma conta existente for retirada da lista, a interface limpa apenas seus dados quando recebe a negativa; a outra conexão autorizada continua disponível. Não há consulta pública da lista. A administração autenticada pela Geral está descrita na seção abaixo.

### Ativação

1. No Supabase **exclusivo FAROL GE**, executar `database/authorized-emails.sql`. A tabela tem RLS, sem policies para anon/authenticated; o backend/service_role recebe SELECT, INSERT e DELETE; somente rotas autenticadas da Geral administram a lista. E-mails são normalizados por trim/minúsculas por trigger, sem remover pontos ou sufixos `+`. Há uma linha por e-mail. O Table Editor mostra Escola/Nome/email como texto para administração. Nome identifica a pessoa do e-mail e é obrigatório, assim como Escola; a autorização verifica email; Nome também identifica a autoria das novas ocorrências.
2. **Antes de publicar**, cadastrar na tabela os e-mails que devem continuar usando Geral e Pessoal, inclusive os seus. A tabela nasce vazia: publicar sem cadastrar impedirá essas contas de acessar os dados, sem apagá-los. Usar o Table Editor para inserir Escola, Nome e email. Não copiar uma lista presumida de usuários anteriores nem migrar autorizações automaticamente.
3. Publicar código e Política de Privacidade revisão **18**. Não há novo escopo Google ou variável Vercel. Validar na Vercel: e-mail cadastrado, não cadastrado, institucional/Gmail, ambas as conexões, lista indisponível, retirada de autorização durante sessão, tentativa de troca negada preservando a outra conexão e botões Suporte/Cancelar. As telas estáticas e a política pública permanecem acessíveis; dados e ações exigem autorização.

Não foi executado SQL remoto nem cadastrada/liberada qualquer conta real. A criação automática da identidade Supabase continua para e-mails já liberados, sem cadastro Auth manual. A lista não faz diagnóstico, não determina vínculo escolar a partir do endereço e não dá acesso aos dados de outras identidades. A política descreve os dados administrativos, a negativa temporária e o compartilhamento opcional com WhatsApp.

Arquivos alterados: `database/authorized-emails.sql`, `server/google.cjs`, `app.js`, `index.html`, `styles.css`, `demands.js`, `institutional.js`, `overview.js`, `students.js`, `maintenance.js`, `student-import.js`, `tests/google.test.cjs`, `tests/frontend.test.cjs`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md` e `AGENTS.md`. 182 testes aprovados, incluindo bloqueio de callbacks, revogação de sessões existentes, ticket de uso único/expirado, falha fechada da tabela e suporte sem envio automático. Verificações de sintaxe e diff sem erros. Testes usam e-mails fictícios; sem servidor local ou validação visual na Vercel.

Referências oficiais: [validação OpenID Connect Google](https://developers.google.com/identity/openid-connect/openid-connect), [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) e [link de conversa WhatsApp](https://faq.whatsapp.com/5913398998672934).


Marcos confirmou que ainda não executou o SQL nem enviou o controle de acesso pelo Git. O arquivo `database/authorized-emails.sql` está consolidado para a primeira criação da tabela, já incluindo Nome obrigatório; não é necessário executar um ALTER separado. Após executar o arquivo inteiro, preencher Escola, Nome e email para cada conta permitida antes de publicar.


## Exceção fixa de acesso — marcos.rubo@gmail.com

Por pedido explícito de Marcos, `server/google.cjs` mantém a constante `FIXED_AUTHORIZED_EMAIL` com `marcos.rubo@gmail.com`. Depois de validar a identidade Google, esse endereço é autorizado independentemente de estar em EmailsAutorizados ou de a consulta à lista estar disponível. A mesma regra vale no callback e nas sessões existentes, nas conexões Geral e Pessoal. Os demais endereços continuam sujeitos à lista e ao bloqueio em falhas.

A exceção compara o e-mail completo normalizado em minúsculas; não aceita aliases com `+`, alteração de pontos, domínio semelhante ou endereço vindo do navegador. Não dispensa assinatura/nonce/identidade Google, sessão Supabase ou permissões de cada serviço; não concede acesso a dados de outras contas. Não cria uma linha na tabela. Sem novo SQL, variável ou escopo. Política revisão 19 informa a conta de manutenção liberada no código.


## Cadastro de usuários e autoria das ocorrências — 17/11/2026

Configurações apresenta **Cadastro de E-mails usuários do aplicativo**, com Escola, Nome, E-mail, INCLUIR e EXCLUIR. Conforme confirmado por Marcos, qualquer conta **Geral autorizada** pode consultar e administrar a lista inteira, independentemente das permissões Gmail/Drive. Não há novo perfil de administrador nem filtro por Escola: esse campo continua administrativo, sem alterar o isolamento dos dados por identidade. A lista pagina 50 registros por vez. Inclusão duplicada é recusada; exclusão exige confirmação. Não há repetição automática de POST. Retirar o próprio e-mail encerra seu acesso nas próximas requisições. A exceção fixa de Marcos permanece mesmo se sua linha for excluída.

Para registrar uma ocorrência, são necessárias a Geral, proprietária dos alunos e registros, e a **Pessoal**, que identifica quem registra. O servidor valida ambas as sessões e a autorização de cada e-mail; obtém o endereço da identidade Pessoal verificada e o Nome de EmailsAutorizados, sem aceitar nome livre de autoria do navegador. Para a exceção fixa, usa Marcos Rubo como nome quando não houver nome disponível no cadastro. Sem Pessoal ou sem Nome cadastrado, a lista de alunos continua consultável, mas o registro exige completar essa identificação. Mudança de Pessoal fecha o diálogo e invalida a resposta anterior.

Cada nova ocorrência guarda **EmailAutor** e **NomeAutor**, cifrados com AES-GCM, como cópia da autoria no momento do salvamento. Alterar/excluir o cadastro de acesso ou desconectar a Pessoal não altera essa cópia vinculada à Geral. Registros anteriores permanecem sem autoria, exibidos como **Não informado**. A Visão GERAL acrescenta **Registrado por** como última coluna e recebe somente o nome do autor, sem expor seu e-mail nessa consulta. Nenhum novo escopo Google ou variável de ambiente é necessário.

Para atualizar um banco existente, executar integralmente **database/access-management-authors.sql** no Supabase exclusivo FAROL GE, depois dos SQLs de alunos e e-mails já existentes. A migração concede INSERT/DELETE ao backend na lista administrativa e adiciona as duas colunas nullable de autoria, sem apagar dados nem atribuir autores a registros antigos. Os scripts de primeira instalação também foram atualizados. Publicar o código e a política revisão **20** após o SQL. Não foi executado SQL remoto, alterado cadastro real ou publicado na Vercel nesta entrega.

Verificação: 192 testes automatizados aprovados, incluindo controle pela Geral, CSRF, inclusão/exclusão, paginação, troca de contas, autoria verificada pela Pessoal, campos cifrados e registros antigos. Sintaxe e diff verificados. Validação visual e teste com contas reais ficam para a Vercel, sem servidor local.
