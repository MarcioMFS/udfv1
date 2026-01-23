import { FileText } from 'lucide-react'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 sm:px-8">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-white" />
              <h1 className="text-3xl font-bold text-white">
                Termos de Uso e Política de Privacidade
              </h1>
            </div>
            <p className="mt-2 text-blue-100">
              Válido a partir de 31 de dezembro de 2024
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-8 sm:px-8 prose prose-blue max-w-none" style={{ color: '#333' }}>
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Visão Geral
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Este site é operado por <strong>I X DE A COSTA AXIES JOGOS EMPRESARIAS ME</strong>.
                Em todo o site, os termos "nós", "nos" e "nosso" se referem à empresa.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Ao acessar ou utilizar a plataforma AXIÉS, seus aplicativos e serviços,
                você concorda integralmente com estes Termos de Serviço.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.1 O Produto
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                A AXIÉS fornece uma plataforma web com dashboard de desempenho e aplicativos
                mobile com conteúdos criados exclusivamente pelo cliente.
              </p>
              <p className="text-gray-700 leading-relaxed">
                A AXIÉS não se responsabiliza pelo conteúdo das perguntas e respostas
                inseridas pelos clientes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.2 Termos dos Serviços
              </h2>
              <p className="text-gray-700 leading-relaxed">
                O uso da plataforma está sujeito exclusivamente a estes termos e condições.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.3 Condições Gerais
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Reservamo-nos o direito de recusar o serviço a qualquer pessoa, por qualquer
                motivo, a qualquer momento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.4 Precisão das Informações
              </h2>
              <p className="text-gray-700 leading-relaxed">
                As informações fornecidas são apenas para fins informativos e podem não estar
                sempre atualizadas.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.5 Modificações ao Serviço e Preços
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Os preços e funcionalidades podem ser alterados ou descontinuados sem aviso prévio.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.6 Produtos ou Serviços
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Produtos e serviços podem estar disponíveis apenas online e sujeitos a alterações.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.7 Informações de Faturamento
              </h2>
              <p className="text-gray-700 leading-relaxed">
                O usuário compromete-se a fornecer informações corretas e atualizadas para faturamento.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.8 Ferramentas Opcionais
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Ferramentas de terceiros são fornecidas "como estão", sem garantias.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1.9 Links de Terceiros
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Não nos responsabilizamos por conteúdos ou serviços de terceiros.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Comentários e Submissões
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Os comentários enviados podem ser utilizados pela AXIÉS sem restrições.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2.2 Usos Proibidos
              </h2>
              <p className="text-gray-700 leading-relaxed">
                É proibido utilizar a plataforma para fins ilegais, abusivos ou que violem
                direitos de terceiros.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2.3 Isenção de Garantias
              </h2>
              <p className="text-gray-700 leading-relaxed">
                O uso do serviço é de responsabilidade exclusiva do usuário.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Rescisão
              </h2>
              <p className="text-gray-700 leading-relaxed">
                O contrato pode ser rescindido a qualquer momento, conforme descrito nestes termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3.3 Cancelamento
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Cancelamentos devem ser solicitados pelo e-mail <strong>contato@axies.com.br</strong>,
                respeitando os prazos estabelecidos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3.4 Legislação Aplicável
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Estes termos são regidos pelas leis de Brasília, DF, Brasil.
              </p>
            </section>

            {/* Política de Privacidade */}
            <section className="mb-8 mt-12 pt-8 border-t-2 border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Política de Privacidade e Dados
              </h1>
              <p className="text-gray-700 leading-relaxed mb-6">
                Válido a partir de 1º de janeiro de 2025
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Coleta de Informações
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Coletamos informações pessoais como e-mail para fornecer e melhorar nossos serviços.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Uso das Informações
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                As informações são utilizadas para operação da plataforma, cobrança, comunicação
                e melhoria dos serviços.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Cookies e Remarketing
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Utilizamos cookies e ferramentas de remarketing, podendo o usuário optar por
                não participar.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Segurança (PCI-DSS)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Seguimos padrões de segurança da indústria para proteção dos dados.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Alterações na Política
              </h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Esta política pode ser alterada a qualquer momento, sendo recomendado revisá-la
                periodicamente.
              </p>

              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Contato
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Dúvidas podem ser enviadas para <strong>contato@axies.com.br</strong>.
              </p>
            </section>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:px-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Última atualização: 31 de dezembro de 2024
            </p>
            <p className="text-sm text-gray-600 text-center mt-2">
              © {new Date().getFullYear()} I X DE A COSTA AXIES JOGOS EMPRESARIAS ME. Todos os direitos reservados.
            </p>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Voltar para o Login
          </a>
        </div>
      </div>
    </div>
  )
}
