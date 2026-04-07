export interface ActionItem {
  text: string;
  dueDate: string; // YYYY-MM-DD
  pushed: boolean;
  taskId?: string;
}

export interface Idea {
  id: string;
  submittedBy: string;
  rawText: string;
  category: string;
  title: string;
  summary: string;
  actionItems: ActionItem[];
  createdAt: string;
}

export interface Category {
  name: string;
  createdAt: string;
}

// What Claude returns before user review
export interface ProcessedIdea {
  title: string;
  summary: string;
  category: string;
  actionItems: { text: string; dueDate: string }[];
}

// What the review panel works with (adds local IDs + checked state)
export interface ReviewActionItem {
  localId: string;
  text: string;
  dueDate: string;
  checked: boolean;
}
