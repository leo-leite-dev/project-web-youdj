import { Link } from 'react-router-dom'

const contact = 'leokerpassos.leite@gmail.com'

export function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <Link to="/" className="inline-flex min-h-11 items-center text-sm text-accent-300 underline underline-offset-4">
        Voltar ao YouDJ
      </Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Política de Privacidade</h1>
      <p className="mt-3 text-sm text-zinc-400">Versão 2026-11-04 · Rascunho sujeito à revisão de Leonardo dos Passos Leite antes de qualquer publicação.</p>

      <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
        <strong>Revisão pendente:</strong> as bases legais, o mecanismo aplicável a eventuais transferências internacionais, o procedimento de atendimento, a retenção de contas e logs de terceiros, a necessidade de indicar encarregado e se o serviço é direcionado a crianças precisam ser confirmados pelo controlador e, quando apropriado, por profissional jurídico.
      </div>

      <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Responsável pelo tratamento</h2>
          <p className="mt-2">O serviço é operado por Leonardo dos Passos Leite, pessoa física, que se identifica neste rascunho como responsável pelas decisões sobre o tratamento de dados do YouDJ. CypherSoft é a marca usada na operação; conforme informado pelo responsável, ainda não possui CNPJ e não é apresentada como pessoa jurídica constituída.</p>
          <p className="mt-2">Canal de contato para privacidade: <a className="text-accent-300 underline underline-offset-4" href={`mailto:${contact}`}>{contact}</a>. Este canal não significa, por si só, que um encarregado formal tenha sido designado. A necessidade e a forma de eventual indicação ainda precisam ser avaliadas.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Dados e operações efetivamente presentes</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong className="text-zinc-200">Conta de DJ:</strong> autenticação por e-mail e senha ou por Google via Supabase Auth; identificador da conta e e-mail retornados pelo provedor; nome de exibição informado no cadastro ou derivado dos metadados de autenticação. O perfil do DJ no banco guarda o nome de exibição; a conta e o e-mail são tratados pelo serviço de autenticação.</li>
            <li><strong className="text-zinc-200">Salas:</strong> nome, código, estado, preferências da sala, identificador do DJ proprietário e datas de criação/atualização. O link ou QR Code identifica a sala, não autoriza administração.</li>
            <li><strong className="text-zinc-200">Busca de convidado:</strong> código da sala e termo digitado são enviados à Pages Function, que consulta somente o catálogo MusicBrainz local do YouDJ. O termo não é encaminhado à API pública MusicBrainz nem à YouTube Data API. O limite por IP é aplicado no backend; o termo não é persistido como histórico de busca.</li>
            <li><strong className="text-zinc-200">Pedido musical:</strong> código da sala e metadados selecionados do catálogo (título, artista e MBID), ou título/artista e eventual link HTTPS do YouTube fornecidos manualmente. O pedido registra a origem, fica associado à sala e ao DJ e mantém estado inicial pendente, data/hora de criação, versões dos documentos aceitos e horário do aceite. Nenhum arquivo de áudio é armazenado.</li>
            <li><strong className="text-zinc-200">Proteção contra abuso:</strong> as funções recebem o IP encaminhado pelo Cloudflare para aplicar limites. A aplicação persiste no PostgreSQL seu hash SHA-256, o tipo de operação e horário; esse hash é pseudonimizado, não anônimo. Cloudflare e outros provedores podem tratar dados técnicos de conexão ou manter logs segundo seus serviços e configurações; os detalhes específicos de retenção desses logs não foram verificados.</li>
          </ul>
          <p className="mt-2">Para cada pedido novo, o sistema gera um código aleatório privado e exibe o valor bruto na resposta de sucesso; somente o hash SHA-256 é salvo. O código é para ajudar a localizar o pedido em contato posterior, não é uma autenticação de identidade. O banco não permite consulta pública do pedido pelo código. A caixa de aceite é exigida antes da busca e do envio; somente o envio do pedido persiste versões e horário do aceite. Registros anteriores à mudança do schema não recebem aceite retroativo.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Finalidades e bases legais — avaliação pendente</h2>
          <p className="mt-2">As operações observáveis no código são autenticar DJs, manter perfis e salas, pesquisar resultados quando solicitado, receber pedidos, aplicar limites de uso e registrar o aceite enviado com um pedido. A seleção da hipótese legal para cada finalidade cabe ao controlador e não está concluída. As referências abaixo são possibilidades para avaliação, não uma declaração de que já foram adotadas:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Execução de contrato ou procedimentos preliminares a pedido do titular (LGPD, art. 7º, V) pode ser analisada para conta, sala e encaminhamento de pedido, depois de esclarecer quem contrata o serviço e a relação entre YouDJ, DJ e convidado.</li>
            <li>Legítimo interesse (art. 7º, IX, observado o art. 10) pode ser analisado para prevenção de abuso, limites de busca/envio e segurança. Sua adoção exige avaliar necessidade, expectativas e direitos dos titulares; não é presumida por este texto.</li>
            <li>A caixa “li e aceito” registra uma manifestação de aceite dos Termos e da Política no envio do pedido. Isso não define automaticamente consentimento como base legal para todas as operações de dados, nem resolve se o aceite dos documentos deve ser separado de eventual consentimento LGPD.</li>
            <li>Outras hipóteses, inclusive obrigação legal/regulatória ou exercício regular de direitos, só devem ser indicadas para finalidades e dados concretos após análise do controlador.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Cache e prazos de retenção</h2>
          <p className="mt-2">As migrations de privacidade foram aplicadas ao banco remoto do YouDJ. A rotina configurada elimina pedidos com mais de 30 dias, registros de limite com mais de 48 horas, cache já expirado e contadores de cota com mais de 31 dias. O cache de resultados deixa de ser utilizável após até 6 horas; sua remoção física ocorre na rotina de expurgo. Um job do pg_cron está configurado para tentar executar a rotina de hora em hora.</p>
          <p className="mt-2">Os prazos não são garantia de exclusão exata: o banco, o agendador e o job precisam estar disponíveis e podem falhar ou atrasar. Esses prazos descrevem as tabelas da aplicação, não backups, telemetria ou logs dos provedores, cujas configurações não foram confirmadas. A rotina não apaga contas de autenticação, perfis de DJs ou salas. O código atual não define prazo automático de retenção para contas e salas, nem oferece exclusão de conta no produto; isso precisa de decisão do controlador e procedimento próprio.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Provedores e possível tratamento internacional</h2>
          <p className="mt-2">A autenticação, o banco PostgreSQL e os dados de conta usam Supabase; a hospedagem e as Pages Functions usam Cloudflare. A busca de músicas usa um catálogo próprio abastecido manualmente com metadados do MusicBrainz Core, licenciados em CC0; consultas dos convidados não são encaminhadas à MusicBrainz. O Google OAuth para DJs continua separado. Links do YouTube podem ser fornecidos pelo convidado como referência, mas a interface não carrega vídeo, miniaturas ou player nesta etapa.</p>
          <p className="mt-2">A YouTube Data API não é chamada pela busca principal do catálogo. A atualização do catálogo é uma tarefa administrativa manual, limitada a artistas selecionados e sujeita ao intervalo de requisições recomendado pelo MusicBrainz; essa tarefa não envia termos de pesquisa ou dados de convidados. O cliente web não configura armazenamento personalizado para a sessão do Supabase; o fluxo OAuth também usa temporariamente o armazenamento de sessão do navegador para retornar à rota solicitada. Não foi realizada auditoria de cookies ou de logs próprios dos provedores.</p>
          <p className="mt-2">Os fornecedores podem tratar dados em mais de uma jurisdição. A documentação do Supabase informa que a região selecionada determina onde ficam os dados primários do projeto; a região deste projeto não foi confirmada aqui. Cloudflare e Google também publicam documentos sobre tratamento, subprocessadores e transferências, mas esses documentos gerais não comprovam a localização nem o mecanismo contratual aplicável à configuração específica do YouDJ. Portanto, não afirmamos que dados permaneçam no Brasil ou que uma transferência internacional específica esteja regularizada.</p>
          <p className="mt-2">Se houver transferência internacional de dados pessoais, o controlador deve identificar fluxo, destinatários, países e mecanismo válido segundo a LGPD, art. 33, e o Regulamento de Transferência Internacional da ANPD (Resolução CD/ANPD nº 19/2024). A verificação contratual, das regiões e das salvaguardas continua pendente.</p>
          <p className="mt-2">Consulte os documentos dos fornecedores: <a className="text-accent-300 underline underline-offset-4" href="https://supabase.com/legal/dpa" target="_blank" rel="noreferrer">DPA do Supabase</a>, <a className="text-accent-300 underline underline-offset-4" href="https://supabase.com/docs/guides/platform/regions" target="_blank" rel="noreferrer">regiões do Supabase</a>, <a className="text-accent-300 underline underline-offset-4" href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noreferrer">DPA da Cloudflare</a>, <a className="text-accent-300 underline underline-offset-4" href="https://www.cloudflare.com/gdpr/subprocessors/" target="_blank" rel="noreferrer">subprocessadores da Cloudflare</a> e <a className="text-accent-300 underline underline-offset-4" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidade do Google</a>.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Direitos e como enviar uma solicitação</h2>
          <p className="mt-2">A LGPD prevê direitos como confirmação de tratamento, acesso, correção, bloqueio ou eliminação nos casos legais, informação sobre compartilhamento e revogação de consentimento quando essa for a base aplicável (art. 18). Para solicitar atendimento, escreva para <a className="text-accent-300 underline underline-offset-4" href={`mailto:${contact}?subject=${encodeURIComponent('Solicitação de privacidade — YouDJ')}`}>{contact}</a>, descreva o direito desejado e informe somente os dados necessários para localizar o registro.</p>
          <p className="mt-2">Não é necessário ter conta para enviar solicitação sobre um pedido de convidado. O código privado exibido após o pedido ajuda a localizá-lo; se não estiver disponível, informe o código da sala e detalhes mínimos que permitam procurar o registro. Para assuntos de DJ, indique o e-mail da conta e o perfil ou sala relacionados. O código privado não comprova identidade por si só, e a forma de verificar legitimidade sem coletar dados excessivos ainda precisa ser definida.</p>
          <p className="mt-2">O envio é por e-mail e o produto não oferece, atualmente, painel ou automação para exportar, corrigir ou excluir dados a pedido. O link de exclusão exibido ao convidado apenas abre uma mensagem de e-mail pré-preenchida; não executa a exclusão. O controlador precisa localizar e avaliar o pedido manualmente, responder conforme os prazos e exceções legais aplicáveis e evitar revelar dados de terceiros. O procedimento operacional, o registro dos atendimentos e o responsável pela execução permanecem pendentes. O art. 19 da LGPD prevê confirmação/acesso em formato simplificado de imediato ou declaração completa em até 15 dias, nos termos da lei; a aplicação ao caso concreto deve ser confirmada profissionalmente.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Catálogo e links do YouTube</h2>
          <p className="mt-2">A busca principal consulta metadados MusicBrainz Core (título, artista e identificador) armazenados no catálogo do YouDJ. Esses campos Core são licenciados em CC0. O YouDJ não armazena áudio nem reproduz gravações. Um link do YouTube opcional é uma referência fornecida pelo convidado e pode ser aberto pelo DJ; não é baixado nem incorporado nesta versão.</p>
          <p className="mt-2">A caixa de aceite precisa ser marcada antes de buscar ou enviar. Esta Política fica ligada no rodapé e no fluxo do convidado. O fluxo atual não verifica idade nem obtém autorização de responsável; é necessário decidir se o YouDJ é direcionado a crianças e avaliar a LGPD, art. 14, e os requisitos dos provedores caso um player oficial seja implementado no futuro. Consulte os <a className="text-accent-300 underline underline-offset-4" href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer">Requisitos de Política para clientes da YouTube API</a>, os <a className="text-accent-300 underline underline-offset-4" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Termos do YouTube</a> e a <a className="text-accent-300 underline underline-offset-4" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidade do Google</a> quando o serviço tratar links do YouTube. O controlador deve revisar os documentos antes de publicar mudanças.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Referências e estado deste documento</h2>
          <p className="mt-2">Referências legais: <a className="text-accent-300 underline underline-offset-4" href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noreferrer">Lei nº 13.709/2018 (LGPD)</a> e <a className="text-accent-300 underline underline-offset-4" href="https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados" target="_blank" rel="noreferrer">orientações da ANPD sobre transferência internacional</a>, incluindo a Resolução CD/ANPD nº 19/2024. Este rascunho descreve funcionalidades e configurações identificadas no repositório e não substitui análise jurídica nem comprova configurações dos fornecedores.</p>
        </section>
      </div>
    </article>
  )
}
