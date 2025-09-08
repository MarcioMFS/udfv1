# 🎯 Sistema Dashboard Ignição UDF

> **Dashboard web para gerenciamento educacional e acompanhamento de turmas**

Um sistema moderno de gestão educacional que permite a instrutores acompanhar o desempenho de suas turmas, criar eventos gamificados e gerenciar o progresso dos alunos através de métricas detalhadas e relatórios visuais.

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Usar](#-como-usar)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [API e Integração](#-api-e-integração)
- [Screenshots](#-screenshots)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **Sistema Dashboard Ignição UDF** é uma plataforma web desenvolvida para revolucionar o acompanhamento educacional. Ele oferece uma interface intuitiva onde instrutores podem:

- **Gerenciar turmas** e acompanhar o progresso individual dos alunos
- **Criar eventos gamificados** com rankings e competições
- **Visualizar métricas detalhadas** através de gráficos e relatórios
- **Promover engajamento** através de sistemas de badges e conquistas
- **Exportar dados** para análises externas

### 🎯 Público-Alvo
- **Instrutores/Professores**: Usuários principais que gerenciam suas turmas
- **Coordenadores Acadêmicos**: Supervisão geral das atividades
- **Alunos**: Visualização do próprio progresso (funcionalidade futura)

---

## ✨ Funcionalidades

### 🏠 **Dashboard Principal**
- Visão geral de todas as turmas do instrutor
- Estatísticas resumidas (alunos, eventos, badges conquistados)
- Acesso rápido às principais funcionalidades

### 👥 **Gerenciamento de Turmas**
- Lista completa de turmas do instrutor
- Detalhes individuais com estatísticas avançadas
- Sistema de códigos únicos para identificação
- Cronograma de eventos programados

### 📊 **Análise de Desempenho**
- **Rankings**: Classificação por lucro, satisfação e participação
- **Indicadores Visuais**: Performance individual de cada aluno
- **Gráficos de Crescimento**: Evolução temporal dos resultados
- **Alertas Automáticos**: Identificação de alunos em risco

### 🎮 **Sistema de Eventos**
- Criação de eventos tipo "Training" ou "Group"
- Gerenciamento de participantes
- Cálculo automático de resultados
- Dashboard dedicado por evento

### 🏆 **Gamificação**
- Sistema de badges e conquistas
- Rankings competitivos entre alunos
- Métricas de engajamento
- Progressão visual de metas

### 📈 **Relatórios e Exportação**
- Relatórios detalhados em PDF
- Exportação de dados em CSV
- Gráficos interativos com Recharts
- Análises comparativas

---

## 🛠 Tecnologias

### **Frontend**
- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Vite** - Build tool moderna e rápida
- **Tailwind CSS** - Framework CSS utilitário
- **React Router DOM** - Roteamento do lado do cliente

### **Backend & Dados**
- **Supabase** - Backend como serviço (BaaS)
- **PostgreSQL** - Banco de dados relacional
- **Edge Functions** - Processamento server-side

### **Bibliotecas Principais**
- **Recharts** - Gráficos e visualizações
- **React Hook Form** - Gerenciamento de formulários
- **Date-fns** - Manipulação de datas
- **Lucide React** - Ícones modernos
- **React Hot Toast** - Notificações elegantes


---

## 📋 Pré-requisitos

- **Node.js** 16+
- **npm** 
- Conta no **Supabase**

---

## 🚀 Instalação


### 1. **Instale as Dependências**
```bash
npm install
```

### 2. **Configure as Variáveis de Ambiente**
Crie um arquivo `.env.local` na raiz do projeto:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 3. **Execute o Projeto em Desenvolvimento**
```bash
npm run dev
```

O projeto estará disponível em: `http://localhost:5173`

---

## ⚙️ Configuração

### **Supabase Setup**

1. **Crie um projeto no Supabase**
2. **Vincule ao projeto remoto:**
   ```bash
   supabase login
   supabase link --project-ref SEU_PROJECT_REF
   ```
3. **As migrations já estão sincronizadas** com o banco de produção
4. **Configure as Edge Functions** em `supabase/functions/`
5. **As políticas RLS já estão definidas** no banco remoto

### **Importante - Migrations:**
> ⚠️ **As migrations foram sincronizadas com o banco de produção.** Não execute `supabase db push` ou `supabase db reset` sem necessidade, pois o banco já está configurado corretamente.

### **Estrutura de Banco de Dados Principais:**
```sql
-- Tabelas principais
classes          -- Turmas
instructors      -- Instrutores
students/players -- Alunos
events          -- Eventos gamificados
matches         -- Partidas individuais
match_results   -- Resultados das partidas
badges          -- Sistema de conquistas
```

### **Build para Produção**
```bash
npm run build    # Gera build otimizado
npm run preview  # Visualiza o build local
```

---

## 🎮 Como Usar

- **Dashboard**: Visão geral das turmas e estatísticas
- **Turmas**: Gerenciar alunos e acompanhar progresso
- **Eventos**: Criar competições e rankings
- **Relatórios**: Exportar dados e gerar análises

---

## 📁 Estrutura do Projeto

```
sistema-ignicao-dashboard/
├── 📁 public/              # Arquivos estáticos
├── 📁 src/
│   ├── 📁 components/      # Componentes reutilizáveis
│   │   ├── 📁 ClassDetails/    # Componentes de turma
│   │   ├── 📁 EventDetails/    # Componentes de eventos
│   │   ├── 📁 modal/           # Modais e popups
│   │   └── 📁 ui/              # Componentes de interface
│   ├── 📁 contexts/        # Context API (autenticação, etc)
│   ├── 📁 hooks/           # Custom hooks
│   ├── 📁 lib/             # Configurações (Supabase, etc)
│   ├── 📁 pages/           # Páginas da aplicação
│   ├── 📁 types/           # Definições TypeScript
│   └── 📁 utils/           # Funções utilitárias
├── 📁 supabase/            # Configurações do backend
│   ├── 📁 functions/       # Edge Functions
│   └── 📁 migrations/      # Migrações de banco
├── 📄 package.json         # Dependências e scripts
├── 📄 tailwind.config.js   # Configuração do Tailwind
└── 📄 vite.config.ts       # Configuração do Vite
```


---

## 🔌 API e Integração

### **Webhooks (Edge Functions)**

#### **1. webhook-classes** - Criação de turmas
```json
POST /webhook-classes
{
  "event-type": "training|group",
  "event-code": "CLASS123",
  "event-name": "Treinamento Liderança",
  "schedule": [{"initial-time": "2025-01-15T10:00:00", "end-time": "2025-01-15T12:00:00"}],
  "instructor-email": "instrutor@email.com",
  "influencer": "influencer@email.com"
}
```

#### **2. webhook-instructors** - Gestão de instrutores
```json
POST /webhook-instructors
{
  "name": "João Silva",
  "email": "joao@email.com",
  "cpf": "12345678900",
  "udf-id": "UDF123"
}
```

#### **3. webhook-players** - Registro de jogadores
```json
POST /webhook-players
{
  "nome": "Maria Santos",
  "email": "maria@email.com",
  "class-code": "CLASS123",
  "udf-id": "UDF456"
}
```

#### **4. webhook-create-match** - Criação de partidas
```json
POST /webhook-create-match
{
  "player-email": "player@email.com",
  "class-code": "CLASS123",
  "app-serial": "SERIAL123",
  "match-number": 1
}
```

#### **5. webhook-match-results** - Resultados automáticos
```json
POST /webhook-match-results
{
  "player-id": "123",
  "lucro": 1500,
  "satisfacao": 85,
  "bonus": 200
}
```

### **Triggers Automáticos**
- **Estatísticas de Instrutores**: Recalcula métricas automaticamente
- **Cálculo de Resultados**: Processa partidas em tempo real  
- **Contadores**: Atualiza totais de partidas e jogadores
- **Rankings**: Gera classificações automáticas

---

## 📱 Responsividade

Sistema totalmente responsivo para mobile, tablet e desktop.

---

## 📊 Métricas

- **Lucro e Satisfação** dos alunos
- **Rankings e comparativos** entre turmas  
- **Taxa de participação** e engajamento
- **Evolução temporal** dos resultados

---

## 🔐 Segurança

- **Autenticação** via Supabase Auth
- **RLS** - Instrutores só veem suas turmas
- **HTTPS** em produção

---

## 🚀 Deploy

**Build local:**
```bash
npm run build
```

---

## 👨‍💻 Desenvolvimento

Este projeto foi desenvolvido pela **[Somos Tecnologia Brasil](https://somostecnologia.com.br)**, empresa especializada em soluções tecnológicas inovadoras para educação e gestão empresarial.

---

<div align="center">

### 🎯 **Sistema Dashboard Ignição UDF**
*Transformando educação através da tecnologia*

</div>