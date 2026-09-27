import { Injectable, signal } from '@angular/core';

export type Language = 'pt' | 'en';

const translations: Record<string, string> = {
  Dashboard: 'Dashboard',
  Alocações: 'Allocations',
  Projetos: 'Projects',
  Developers: 'Developers',
  Configurações: 'Settings',
  'Primary navigation': 'Primary navigation',
  'Sign out': 'Sign out',
  'Sign in': 'Sign in',
  Portfolio: 'Portfolio',
  Capacity: 'Capacity',
  'Capacity planning': 'Capacity planning',
  Administração: 'Administration',
  'Calendário de alocação por projeto': 'Allocation calendar by project',
  'Janela operacional com 2 semanas anteriores e 6 semanas futuras. Projetos ordenados por data de início.': 'Operational window with 2 previous and 6 future weeks. Projects ordered by start date.',
  'Cria e consulta iniciativas que podem receber alocação semanal de developers.': 'Create and review initiatives that can receive weekly developer allocations.',
  'Gere developers planeáveis, disciplina, função e capacidade semanal base.': 'Manage plannable developers, discipline, role and base weekly capacity.',
  'Distribui developers por projeto e semana ISO, com limite transacional de 150% no backend.': 'Assign developers to projects and ISO weeks, with a 150% transactional backend limit.',
  'Operações de preparação da aplicação e comandos administrativos seguros.': 'Application setup operations and safe administrative commands.',
  'Atualizar': 'Refresh',
  'Projetos registados': 'Registered projects',
  'Developers registados': 'Registered developers',
  'Alocações registadas': 'Registered allocations',
  'Novo projeto': 'New project',
  'Novo developer': 'New developer',
  'Key people': 'Key people',
  'Gestão de parceiros': 'Partner management',
  'Semanas ISO': 'ISO weeks',
  'Dependências dos projetos': 'Project dependencies',
  'Gerir dependências': 'Manage dependencies',
  'Project health': 'Project health',
  Total: 'Total',
  Ativas: 'Active',
  Bloqueantes: 'Blocking',
  Resolvidas: 'Resolved',
  'Editar intervalos consecutivos': 'Edit consecutive ranges',
  'Nova alocação': 'New allocation',
  'Código': 'Code',
  Nome: 'Name',
  Empresa: 'Company',
  'Projects associados': 'Associated projects',
  'Developers associados': 'Associated developers',
  Tipo: 'Type',
  Estado: 'Status',
  Delivery: 'Delivery',
  Disciplina: 'Discipline',
  Role: 'Role',
  'Projetos associados': 'Associated projects',
  'Importação em massa': 'Bulk import',
  'Adiciona o portfolio a partir de CSV': 'Add the portfolio from CSV',
  'Adiciona a equipa a partir de CSV': 'Add the team from CSV',
  'Descarregar template': 'Download template',
  'Escolher CSV': 'Choose CSV',
  'Validar ficheiro': 'Validate file',
  'Criar projeto': 'Create project',
  'Criar developer': 'Create developer',
  'Pesquisar por código ou nome': 'Search by code or name',
  'Pesquisar developer': 'Search developer',
  'Ações': 'Actions',
  Apagar: 'Delete',
  Área: 'Area',
  Prioridade: 'Priority',
  Início: 'Start',
  Target: 'Target',
  'Descrição do projeto': 'Project description',
  'Ainda não existem projetos.': 'There are no projects yet.',
  'Ainda não existem developers.': 'There are no developers yet.',
  'Ainda não existem alocações.': 'There are no allocations yet.',
  'Tentar novamente': 'Try again',
  Backend: 'Backend',
  'A verificar': 'Checking',
  Operacional: 'Operational',
  Indisponível: 'Unavailable',
  'Resumo operacional': 'Operational summary',
  'Riscos >100%': 'Risks >100%',
  'Guardar alterações': 'Save changes',
  Cancelar: 'Cancel',
  Fechar: 'Close',
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly language = signal<Language>(localStorage.getItem('dcm-language') === 'en' ? 'en' : 'pt');

  setLanguage(language: Language): void {
    this.language.set(language);
    localStorage.setItem('dcm-language', language);
    document.documentElement.lang = language;
  }

  toggle(): void { this.setLanguage(this.language() === 'pt' ? 'en' : 'pt'); }

  translate(text: string): string {
    return this.language() === 'en' ? translations[text] ?? text : text;
  }
}
