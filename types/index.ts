export interface Idea {
  id: string;
  raw_text: string;
  category: string;
  title: string;
  summary: string;
  action_items: string[];
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}
