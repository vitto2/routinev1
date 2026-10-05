import type { ScheduleInput } from "@/lib/validation/habit";

export interface HabitTemplate {
  key: string;
  name: string;
  habit_type: "build" | "avoid";
  tracking_type: "checkbox" | "quantity" | "time";
  target_value?: number;
  schedule: ScheduleInput;
  hint: string;
}

export interface LifeArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  habits: HabitTemplate[];
}

const daily: ScheduleInput = { schedule_type: "daily" };
const weekdays = (days: number[]): ScheduleInput => ({
  schedule_type: "weekdays",
  weekdays: days,
});
const timesPerWeek = (n: number): ScheduleInput => ({
  schedule_type: "x_per_week",
  frequency_target: n,
});

export const LIFE_AREAS: LifeArea[] = [
  {
    id: "saude",
    name: "Saúde",
    icon: "Heart",
    color: "#10b981",
    tagline: "Corpo, sono e alimentação",
    habits: [
      { key: "agua", name: "Beber água", habit_type: "build", tracking_type: "quantity", target_value: 3000, schedule: daily, hint: "3000 ml por dia" },
      { key: "treino", name: "Treinar", habit_type: "build", tracking_type: "checkbox", schedule: weekdays([1, 3, 5]), hint: "Seg, qua e sex" },
      { key: "skincare", name: "Skincare", habit_type: "build", tracking_type: "checkbox", schedule: daily, hint: "Todos os dias" },
      { key: "dieta", name: "Seguir a dieta", habit_type: "build", tracking_type: "checkbox", schedule: daily, hint: "Todos os dias" },
    ],
  },
  {
    id: "estudos",
    name: "Estudos",
    icon: "BookOpen",
    color: "#6366f1",
    tagline: "Aprender algo novo sempre",
    habits: [
      { key: "ingles", name: "Estudar inglês", habit_type: "build", tracking_type: "time", target_value: 60, schedule: daily, hint: "60 min por dia" },
      { key: "ciberseguranca", name: "Estudar cibersegurança", habit_type: "build", tracking_type: "time", target_value: 60, schedule: weekdays([1, 2, 3, 4, 5]), hint: "60 min em dias úteis" },
      { key: "edicao", name: "Editar vídeo", habit_type: "build", tracking_type: "time", target_value: 60, schedule: timesPerWeek(3), hint: "60 min, 3x por semana" },
      { key: "leitura", name: "Ler", habit_type: "build", tracking_type: "time", target_value: 30, schedule: daily, hint: "30 min por dia" },
    ],
  },
  {
    id: "disciplina",
    name: "Disciplina",
    icon: "ShieldCheck",
    color: "#8b5cf6",
    tagline: "Dizer não ao que te atrasa",
    habits: [
      { key: "sem-feed", name: "Não rolar o feed", habit_type: "avoid", tracking_type: "checkbox", schedule: daily, hint: "Evitar, todos os dias" },
      { key: "sem-18", name: "Não consumir conteúdo +18", habit_type: "avoid", tracking_type: "checkbox", schedule: daily, hint: "Evitar, todos os dias" },
      { key: "acordar-cedo", name: "Acordar cedo", habit_type: "build", tracking_type: "checkbox", schedule: daily, hint: "Todos os dias" },
    ],
  },
  {
    id: "carreira",
    name: "Carreira",
    icon: "Briefcase",
    color: "#f59e0b",
    tagline: "Evoluir profissionalmente",
    habits: [
      { key: "estudo-carreira", name: "Estudar sua área", habit_type: "build", tracking_type: "time", target_value: 45, schedule: weekdays([1, 2, 3, 4, 5]), hint: "45 min em dias úteis" },
      { key: "networking", name: "Fazer networking", habit_type: "build", tracking_type: "checkbox", schedule: timesPerWeek(1), hint: "1x por semana" },
      { key: "metas-semana", name: "Revisar metas da semana", habit_type: "build", tracking_type: "checkbox", schedule: weekdays([0]), hint: "Domingos" },
    ],
  },
  {
    id: "financas",
    name: "Finanças",
    icon: "Wallet",
    color: "#06b6d4",
    tagline: "Controle e clareza",
    habits: [
      { key: "gastos", name: "Registrar gastos do dia", habit_type: "build", tracking_type: "checkbox", schedule: daily, hint: "Todos os dias" },
      { key: "sem-impulso", name: "Sem compras por impulso", habit_type: "avoid", tracking_type: "checkbox", schedule: daily, hint: "Evitar, todos os dias" },
      { key: "orcamento", name: "Revisar orçamento", habit_type: "build", tracking_type: "checkbox", schedule: weekdays([0]), hint: "Domingos" },
    ],
  },
  {
    id: "bem-estar",
    name: "Bem-estar",
    icon: "Sparkles",
    color: "#ec4899",
    tagline: "Mente leve e equilíbrio",
    habits: [
      { key: "meditar", name: "Meditar", habit_type: "build", tracking_type: "time", target_value: 10, schedule: daily, hint: "10 min por dia" },
      { key: "ar-livre", name: "Tempo ao ar livre", habit_type: "build", tracking_type: "time", target_value: 20, schedule: daily, hint: "20 min por dia" },
      { key: "gratidao", name: "Diário de gratidão", habit_type: "build", tracking_type: "checkbox", schedule: daily, hint: "Todos os dias" },
      { key: "desconectar", name: "Telas desligadas à noite", habit_type: "avoid", tracking_type: "checkbox", schedule: daily, hint: "Evitar, todos os dias" },
    ],
  },
];

export const HABIT_TEMPLATES_BY_KEY: Record<
  string,
  { area: LifeArea; template: HabitTemplate }
> = Object.fromEntries(
  LIFE_AREAS.flatMap((area) =>
    area.habits.map((template) => [template.key, { area, template }]),
  ),
);
