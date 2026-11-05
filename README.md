# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Uma aplicação estática em HTML, CSS e JavaScript, organizada por módulos e pronta para publicação no GitHub e na Vercel. Não há dependências de instalação ou etapa de compilação.

## O que pode ser demonstrado

- Menu: Visão GERAL, Demandas INSTITUCIONAIS, Demandas PESSOAIS, Radar e BI SEED; um divisor separa Configurações.
- Demandas INSTITUCIONAIS abre a caixa geral e Demandas PESSOAIS abre a caixa individual institucional, ambas com três colunas, busca e prioridade. São espaços fictícios, sem contas conectadas.
- BI SEED é uma tela de apresentação em preparação, sem conteúdo ou integração real.
- Agenda institucional com busca, filtro e detalhes de compromissos, acessível pela visão geral.
- Frequência com estudantes fictícios, faltas e próximos passos, acessível pela visão geral.
- Radar com referências ilustrativas a Busca Ativa, SERP e SINAN, sem integração com esses sistemas.
- Configurações com nome, iniciais e descrição da escola, alteráveis somente na memória da página.
- Layout responsivo, navegação por teclado, diálogos de detalhes e roteiro de apresentação em “Como apresentar”.

Todos os registros e indicadores são inventados. A data de referência da apresentação é 04/11/2026; não é uma indicação de atualização em tempo real. Os números apresentados não são estatísticas da escola nem critérios oficiais de acompanhamento. Nenhum formulário envia ou persiste informações.

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

As categorias e prioridades dos cartões são ilustrativas. A data de um e-mail não deve ser convertida automaticamente em prazo.

## Limites e próximos passos

Não há autenticação, autorização, persistência, análise de e-mails, notificações nem integração com Gmail, Drive, Google Planilhas ou sistemas de acompanhamento. Este protótipo não deve receber dados reais de estudantes. Alterações na identidade desaparecem ao recarregar a página.

Antes da implementação real, definir contas e permissões, autorizações oficiais do Google, armazenamento seguro das sessões, origem dos registros, critérios de frequência e acompanhamento e separação entre escolas. O uso de Google Planilhas/Drive para pequenos volumes foi discutido, mas a arquitetura ainda precisa ser validada. Os e-mails permanecerão no Gmail. O login do portal e as conexões com caixas distintas terão autorizações independentes.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.
