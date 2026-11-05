import { Link } from 'react-router-dom'

export function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <Link to="/" className="inline-flex min-h-11 items-center text-sm text-accent-300 underline underline-offset-4">
        Voltar ao YouDJ
      </Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Termos de Uso</h1>
      <p className="mt-3 text-sm text-zinc-400">Versão 2026-11-05 · Rascunho sujeito à aprovação de Leonardo dos Passos Leite antes de qualquer publicação.</p>

      <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
        <strong>Revisão pendente:</strong> este texto não é a versão jurídica final. Confirme o escopo do serviço, a relação com DJs e convidados e as condições comerciais antes de publicá-lo.
      </div>

      <div className="mt-8 space-y-8 text-sm leading-7 text-zinc-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. O serviço descrito nesta versão</h2>
          <p className="mt-2">O YouDJ é uma plataforma em desenvolvimento para DJs criarem perfis e salas e, na Etapa 4A, receberem sugestões musicais de convidados por link ou QR Code. O convidado pode pesquisar vídeos públicos pelo YouTube Data API, quando a busca estiver disponível, ou preencher uma sugestão manual. O pedido é encaminhado ao DJ responsável pela sala.</p>
          <p className="mt-2">O comprovante confirma somente o recebimento técnico do pedido. Não confirma que o DJ o leu, aprovou, colocou em uma fila ou reproduziu a música. Aprovação, gestão de fila, pagamentos e reprodução musical não fazem parte do fluxo de pedidos descrito aqui.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Uso da plataforma</h2>
          <p className="mt-2">Use a plataforma de forma lícita e não tente contornar seus limites, prejudicar sua disponibilidade ou enviar conteúdo que viole direitos de terceiros. Ao fazer uma sugestão manual, informe título e artista e, se fornecer um link, use um endereço HTTPS de domínio YouTube aceito pelo formulário. O DJ decide se atende à sugestão.</p>
          <p className="mt-2">Ao entrar na sala, informe um nome ou apelido para o DJ reconhecer seus pedidos e para a sala estimar quem está online. Não é necessário criar conta, informar e-mail ou senha. O apelido não é verificado e não comprova identidade; não inclua outros dados pessoais seus ou de terceiros no título, artista, busca ou link.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Recursos e conteúdo do YouTube</h2>
          <p className="mt-2">A pesquisa usa a YouTube Data API para solicitar e exibir resultados públicos, como título, canal, identificador de vídeo e miniatura. O convidado inicia a busca; os resultados são apresentados como resultados do YouTube e não são combinados com resultados de outros catálogos. O YouDJ não hospeda nem fornece o áudio dos vídeos e, nesta versão, não incorpora um player do YouTube.</p>
          <p className="mt-2">Ao utilizar os recursos do YouTube, você também se sujeita aos <a className="text-accent-300 underline underline-offset-4" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Termos de Serviço do YouTube</a> e às <a className="text-accent-300 underline underline-offset-4" href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer">Políticas para Desenvolvedores do YouTube</a>. O YouDJ não é afiliado, patrocinado ou endossado pelo Google ou YouTube.</p>
          <p className="mt-2">Não use a plataforma para baixar, extrair, copiar, armazenar ou redistribuir áudio ou vídeo do YouTube, nem para contornar anúncios, controles ou restrições do provedor. Títulos, canais, identificadores e miniaturas são fornecidos pelo YouTube e podem mudar ou deixar de estar disponíveis.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Limites, cache e comprovante</h2>
          <p className="mt-2">O apelido e um identificador aleatório são reutilizados pelo mesmo navegador. O apelido é associado ao pedido e à sala, não é verificado e não deve ser tratado como identidade real. A presença usa atualizações periódicas e deixa de contar após 90 segundos sem atividade; registros de presença são removidos após 24 horas. Pedidos e apelidos associados são retidos por até 30 dias conforme a rotina de limpeza configurada. O ID e o apelido locais permanecem no navegador até que seus dados do site sejam limpos.</p>
          <p className="mt-2">A busca é enviada somente quando o convidado aciona a lupa; digitar não chama a YouTube Data API. O cache dura até 6 horas e pedidos são limitados a 5 por IP em 10 minutos; não há bloqueio diário local nem limite individual de pesquisas por IP/usuário. O contador exibido registra chamadas `search.list` iniciadas pelo YouDJ, usa a quota configurada (inicialmente 100) como referência e reinicia à meia-noite do Pacífico. Cache hits e envio de pedidos não aumentam o total. É uma estimativa interna, não medição oficial do Google, que controla a quota real; a quota efetiva do projeto deve ser confirmada no Google Cloud.</p>
          <p className="mt-2">Após o envio confirmado, é gerado um código privado aleatório, mostrado uma única vez. O banco guarda somente seu hash SHA-256. O código ajuda o responsável a localizar o pedido se você solicitar exclusão por e-mail, mas não é um recurso de consulta ou exclusão automática, nem uma comprovação de identidade. Ele não poderá ser recuperado depois que você sair ou atualizar a tela; perder o código pode dificultar a localização do pedido.</p>
          <p className="mt-2">Se a quota do YouTube se esgotar ou o serviço ficar indisponível, a interface informa o erro e mantém o pedido manual e por link disponíveis. A solicitação e a resposta do servidor ainda podem falhar ou sofrer atraso. O pedido recebido não garante análise em prazo específico por parte do DJ.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Responsável e contato</h2>
          <p className="mt-2">O YouDJ é operado por Leonardo dos Passos Leite, pessoa física. CypherSoft é a marca utilizada na operação e, conforme informado pelo responsável, ainda não possui CNPJ e não é apresentada nestes termos como pessoa jurídica constituída.</p>
          <p className="mt-2">Dúvidas sobre estes termos podem ser enviadas a <a className="text-accent-300 underline underline-offset-4" href="mailto:leokerpassos.leite@gmail.com">leokerpassos.leite@gmail.com</a>. O canal e o procedimento para solicitações de titulares ainda precisam ser confirmados pelo responsável; consulte a <Link className="text-accent-300 underline underline-offset-4" to="/privacidade">Política de Privacidade (rascunho)</Link>.</p>
        </section>
      </div>
    </article>
  )
}
