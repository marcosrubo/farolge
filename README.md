# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Frontend em HTML, CSS e JavaScript, organizado por módulos, com backend de login e autorização Google em Vercel Functions. A biblioteca oficial Google é instalada pelo package.json; o frontend não tem etapa de compilação.

## Estrutura atual para apresentação

- Logos da plataforma e do colégio, com o nome da instituição em três linhas.
- Menu: Visão GERAL, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; um divisor separa Configurações.
- As opções mostram “Meu espaço / nome da opção”. Radar também apresenta o fluxo solicitado: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos convergem para ANÁLISES, com saídas DOSSIÊ individual e Relação diária de FALTAS.
- Visão GERAL, Demandas INSTITUCIONAIS, Demandas PESSOAIS, BI SEED e Configurações exibem “em Desenvolvimento” e os textos definidos por Marcos em 06/11/2026. A Visão GERAL lista os quatro grupos de indicadores previstos. BI SEED apresenta o texto sobre os indicadores/resumos previstos para uma visão simplificada da situação da escola.
- O menu destaca a opção ativa e o título da aba acompanha a seleção.
- Abaixo do breadcrumb, o quadro apresenta duas conexões independentes, Geral e Pessoal, cada uma com Conectar/Desconectar. Não há etapa separada de entrada no FAROL GE: qualquer conexão pode ser feita primeiro. Cada conta é validada no Google e no Supabase Auth na mesma jornada de autorização de Gmail somente leitura e Drive com escopo drive.file. As permissões concedidas são indicadas separadamente. Geral exige a própria conta exata configurada em FAROL_GENERAL_EMAIL; Pessoal aceita qualquer Conta Google. Configuração em [CONEXOES_GOOGLE.md](CONEXOES_GOOGLE.md).
- Foram retirados cartões, tabelas, exemplos, gráficos, filtros, datas, avisos, ajuda, roteiro de apresentação, formulários, rodapé e textos inferiores da barra lateral.

A simplificação foi solicitada por Marcos em 05/11/2026 para construir o conteúdo em conjunto com a equipe. Posteriormente, Marcos solicitou o fluxograma de Radar e os textos de desenvolvimento nas demais telas descritas acima. Os quadros são uma estrutura visual, sem abertura de registros ou análises implementadas e sem integração aos sistemas citados. Em telas estreitas, o fluxo pode ser percorrido horizontalmente. Os endereços de e-mail nos textos são ilustrativos. Não preencher novamente as telas com exemplos ou sugestões de funcionalidades sem pedido. Não há dados de estudantes ou mensagens. O backend OAuth foi implementado, mas depende de configuração externa e não foi validado com contas reais. Cada conexão tem sessão própria verificada e autorização vinculada ao ID Supabase da própria conta Google. A conta Pessoal não herda a conexão Geral em outro navegador. Sem conexão verificada, os conteúdos dos módulos ficam ocultos. Demandas INSTITUCIONAIS depende da Geral e Demandas PESSOAIS depende da Pessoal. Para os demais módulos, preserva-se o conteúdo de desenvolvimento/fluxograma com qualquer conexão verificada; as diferenças entre somente Geral, somente Pessoal e ambas aguardam definição de Marcos.

## Publicação na nuvem

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

## Personalização

Editar `config.js` para definir o nome público, as iniciais, a descrição e o caminho do emblema da escola (`schoolLogo`). Sem descrição, a linha secundária fica oculta. Sem emblema, aparecem as iniciais como alternativa.

A identificação do colégio usa o emblema à esquerda e apenas “COLÉGIO ESTADUAL CÍVICO MILITAR THIAGO TERRA” ao lado. O arquivo `arte/thiago-terra-identidade-original.png` preserva o cabeçalho original enviado por Marcos; o CSS mostra somente o emblema da faixa esquerda, sem redesenhar a arte. O símbolo do farol continua sendo a marca da plataforma. As artes originais foram preservadas. A fonte DM Sans é carregada do Google Fonts; há alternativa com fontes do sistema.

Os marcadores do Gmail definidos para a implementação futura são:

| Marcador | Destino |
| --- | --- |
| `Demandas_que_me_devem` | DEVEM PARA MIM |
| `Demandas_minhas` | MINHAS PRÓPRIAS PENDÊNCIAS |
| `Demandas_que_eu_devo` | DEVO PARA ALGUÉM |
| `Demandas_arquivadas` | Fora das três colunas, como interpretação inicial a validar |

Os marcadores acima permanecem como referência para a implementação futura. A data de um e-mail não deve ser convertida automaticamente em prazo.

## Limites e próximos passos

Há login Google integrado à solicitação de Gmail e Drive, condicionado à configuração de Google Cloud, Supabase Auth, tabelas e variáveis Vercel. Supabase Auth gerencia auth.users e cria usuários automaticamente; a aplicação não pede cadastro manual nem senha própria. Credenciais ficam criptografadas no backend. A interface mostra somente endereço e permissões confirmadas.

Esta entrega não implementa lista/editor de arquivos, criação de documentos, edição de planilhas, leitura de mensagens, notificações ou indicadores reais nos módulos. A autorização drive.file prepara essas operações nos arquivos criados ou explicitamente autorizados para o aplicativo. O modelo de várias escolas e o compartilhamento de dados institucionais continuam pendentes. Ver detalhes e migração em CONEXOES_GOOGLE.md.

Antes da ativação real, habilitar o provedor Google no Supabase exclusivo do FAROL GE, executar database/google-sessions.sql, configurar variáveis e validar o fluxo na Vercel. O modo Testing do Google continua exigindo contas de teste, mesmo com entrada aberta no código; uso amplo depende da configuração Production e das regras de verificação aplicáveis.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.
