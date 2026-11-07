# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Frontend em HTML, CSS e JavaScript, organizado por módulos, com backend de conexão Google em Vercel Functions. A biblioteca oficial Google é instalada pelo package.json; o frontend não tem etapa de compilação.

## Estrutura atual para apresentação

- Logos da plataforma e do colégio, com o nome da instituição em três linhas.
- Menu: Visão GERAL, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; um divisor separa Configurações.
- As opções mostram “Meu espaço / nome da opção”. Radar também apresenta o fluxo solicitado: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos convergem para ANÁLISES, com saídas DOSSIÊ individual e Relação diária de FALTAS.
- Visão GERAL, Demandas INSTITUCIONAIS, Demandas PESSOAIS, BI SEED e Configurações exibem “em Desenvolvimento” e os textos definidos por Marcos em 06/11/2026. A Visão GERAL lista os quatro grupos de indicadores previstos. BI SEED apresenta o texto sobre os indicadores/resumos previstos para uma visão simplificada da situação da escola.
- O menu destaca a opção ativa e o título da aba acompanha a seleção.
- Abaixo do breadcrumb, todos os módulos mostram o quadro “conexões ativas / e-mails institucionais”, com Geral e Pessoal em “NÃO conectado” e botões Conectar independentes. Cada botão abre uma explicação específica. Quando as variáveis do servidor e o armazenamento exclusivo do FAROL GE estiverem configurados, o fluxo OAuth conecta e confirma a conta, com opções de troca e desconexão. Sem configuração, o botão de autorização fica indisponível. A configuração está em [CONEXOES_GOOGLE.md](CONEXOES_GOOGLE.md).
- Foram retirados cartões, tabelas, exemplos, gráficos, filtros, datas, avisos, ajuda, roteiro de apresentação, formulários, rodapé e textos inferiores da barra lateral.

A simplificação foi solicitada por Marcos em 05/11/2026 para construir o conteúdo em conjunto com a equipe. Posteriormente, Marcos solicitou o fluxograma de Radar e os textos de desenvolvimento nas demais telas descritas acima. Os quadros são uma estrutura visual, sem abertura de registros ou análises implementadas e sem integração aos sistemas citados. Em telas estreitas, o fluxo pode ser percorrido horizontalmente. Os endereços de e-mail nos textos são ilustrativos. Não preencher novamente as telas com exemplos ou sugestões de funcionalidades sem pedido. Não há dados de estudantes ou mensagens. O backend OAuth foi implementado, mas depende de configuração externa e não foi validado com contas reais. As sessões de conexão são individuais por navegador, sem compartilhamento entre usuários ou escolas.

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

Não há login do portal, análise de e-mails, notificações nem integração com Drive, Google Planilhas ou sistemas de acompanhamento. Há fluxo OAuth para conexão de duas caixas Gmail, condicionado à configuração descrita em CONEXOES_GOOGLE.md. Ele consulta apenas o perfil da caixa para confirmar o endereço e guarda as autorizações criptografadas no Supabase exclusivo do FAROL GE. A arquitetura para compartilhar conexões por escola ainda não está implementada. A identidade visual da escola continua definida em config.js.

Antes da ativação real, configurar o cliente Google OAuth, a tabela e as variáveis do backend e validar as autorizações na Vercel. Antes de compartilhar acesso entre pessoas, definir login do portal, permissões e separação entre escolas. Também faltam origem dos registros e critérios de frequência e acompanhamento. O uso de Google Planilhas/Drive para pequenos volumes foi discutido, mas a arquitetura ainda precisa ser validada. Os e-mails permanecerão no Gmail. O login do portal e as conexões com caixas distintas terão autorizações independentes.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.
