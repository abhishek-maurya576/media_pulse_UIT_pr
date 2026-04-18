/**
 * API Client — Axios instance with auth token injection.
 * All types and API methods for the Media Pulse backend.
 */

import axios from 'axios';
import { CONFIG } from '../config';

// ─── Axios Instance ───
const api = axios.create({
  baseURL: CONFIG.api.baseUrl,
  timeout: CONFIG.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mp_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle 401 → clear auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mp_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// ─── Types ───
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar: string | null;
  bio: string;
  phone?: string;
  date_joined: string;
  follower_count?: number;
  following_count?: number;
  blog_count?: number;
}

export interface Edition {
  id: string;
  name: string;
  newspaper_name: string;
  edition_number: number;
  publication_date: string;
  page_size: string;
  layout_mode: string;
  style_preset: string;
  status: string;
  generated_pdf: string | null;
  article_count: number;
  created_by: string | null;
  created_by_name: string;
  is_owner: boolean;
  created_at: string;
}

export interface EditionCreate {
  name: string;
  newspaper_name: string;
  edition_number: number;
  publication_date: string;
  page_size: string;
  layout_mode: string;
  style_preset: string;
}

export interface Article {
  id: string;
  edition: string;
  author: string | null;
  author_name: string;
  headline: string;
  subheadline: string;
  byline: string;
  content_raw: string;
  content_parsed: string;
  content_format: string;
  category: number | null;
  category_name?: string;
  priority: string;
  highlights: string[];
  highlights_mode: string;
  image: string | null;
  image_caption: string;
  order: number;
  edit_remark: string;
  created_at: string;
}

export type ArticleListItem = Pick<
  Article,
  'id' | 'edition' | 'headline' | 'subheadline' | 'byline' | 'priority' |
  'category_name' | 'content_format' | 'order' | 'author' | 'author_name' | 'edit_remark'
>;

export interface ArticleCreate {
  edition: string;
  headline: string;
  subheadline: string;
  byline: string;
  content_raw: string;
  content_format: string;
  category: number | null;
  priority: string;
  highlights: string[];
  highlights_mode: string;
  image: string | null;
  image_caption: string;
  order: number;
}

export interface Category {
  id: number;
  name: string;
  display_order: number;
}

export interface Template {
  id: number;
  name: string;
  description: string;
  layout_definition: any;
  is_active: boolean;
}

export interface BlogPost {
  id: string;
  author: string;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image: string | null;
  status: string;
  tags: string[];
  views_count: number;
  published_at: string | null;
  edit_remark: string;
  created_at: string;
  updated_at: string;
}

export interface BlogPostCreate {
  title: string;
  content: string;
  excerpt?: string;
  status: string;
  tags: string[];
}

export interface PublicProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar: string | null;
  bio: string;
  date_joined: string;
  follower_count: number;
  following_count: number;
  blog_count: number;
  article_count: number;
  is_following: boolean;
}

export interface PublicCategory {
  id: number;
  name: string;
  display_order: number;
  article_count: number;
}

export interface Journalist {
  id: string;
  username: string;
  full_name: string;
  avatar: string | null;
  bio: string;
  role: string;
  article_count: number;
}

// ─── Auth API ───
export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post<{ user: AuthUser; token: string }>('/auth/login/', data).then(r => r.data),
  register: (data: {
    username: string; email: string; password: string; password_confirm: string;
    first_name?: string; last_name?: string;
  }) =>
    api.post<{ user: AuthUser; token: string }>('/auth/register/', data).then(r => r.data),
  logout: () => api.post('/auth/logout/'),
  profile: () => api.get<AuthUser>('/auth/profile/').then(r => r.data),
  updateProfile: (data: Partial<AuthUser>) =>
    api.patch<AuthUser>('/auth/profile/', data).then(r => r.data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password/', data),
};

// ─── Edition API ───
export const editionApi = {
  list: () => api.get<PaginatedResponse<Edition>>('/editions/').then(r => r.data),
  get: (id: string) => api.get<Edition>(`/editions/${id}/`).then(r => r.data),
  create: (data: EditionCreate) => api.post<Edition>('/editions/', data).then(r => r.data),
  update: (id: string, data: Partial<EditionCreate>) => api.patch<Edition>(`/editions/${id}/`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/editions/${id}/`),
  generatePdf: (id: string) => api.post(`/editions/${id}/generate-pdf/`).then(r => r.data),
  getArticles: (editionId: string) =>
    api.get<ArticleListItem[]>(`/editions/${editionId}/articles/`).then(r => r.data),
};

// ─── Article API ───
export const articleApi = {
  list: () => api.get<PaginatedResponse<Article>>('/articles/').then(r => r.data),
  get: (id: string) => api.get<Article>(`/articles/${id}/`).then(r => r.data),
  create: (data: ArticleCreate) => api.post<Article>('/articles/', data).then(r => r.data),
  update: (id: string, data: Partial<ArticleCreate>) => api.patch<Article>(`/articles/${id}/`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/articles/${id}/`),
  generateHighlights: (id: string) =>
    api.post<{ highlights: string[]; mode: string; count: number }>(`/articles/${id}/generate-highlights/`).then(r => r.data),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<Article>(`/articles/${id}/upload-image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  removeImage: (id: string) =>
    api.delete(`/articles/${id}/remove-image/`).then(r => r.data),
};

// ─── Category API ───
export const categoryApi = {
  list: () => api.get<PaginatedResponse<Category>>('/categories/').then(r => r.data),
  get: (id: number) => api.get<Category>(`/categories/${id}/`).then(r => r.data),
  create: (data: { name: string; display_order?: number }) => api.post<Category>('/categories/', data).then(r => r.data),
  update: (id: number, data: Partial<Category>) => api.patch<Category>(`/categories/${id}/`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/categories/${id}/`),
};

// ─── Template API ───
export const templateApi = {
  list: () => api.get<PaginatedResponse<Template>>('/templates/').then(r => r.data),
  get: (id: number) => api.get<Template>(`/templates/${id}/`).then(r => r.data),
};

// ─── Blog API ───
export const blogApi = {
  // Public
  publicList: () => api.get<PaginatedResponse<BlogPost>>('/blog/posts/').then(r => r.data),
  publicDetail: (slug: string) => api.get<BlogPost>(`/blog/posts/${slug}/`).then(r => r.data),
  // Authenticated management
  myPosts: () => api.get<PaginatedResponse<BlogPost>>('/blog/manage/my-posts/').then(r => r.data),
  list: () => api.get<PaginatedResponse<BlogPost>>('/blog/manage/').then(r => r.data),
  get: (id: string) => api.get<BlogPost>(`/blog/manage/${id}/`).then(r => r.data),
  create: (data: BlogPostCreate) => api.post<BlogPost>('/blog/manage/', data).then(r => r.data),
  update: (id: string, data: Partial<BlogPostCreate>) => api.patch<BlogPost>(`/blog/manage/${id}/`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/blog/manage/${id}/`),
};

// ─── Profile API ───
export const profileApi = {
  get: (username: string) => api.get<PublicProfile>(`/auth/users/${username}/`).then(r => r.data),
  follow: (username: string) => api.post(`/auth/users/${username}/follow/`).then(r => r.data),
  unfollow: (username: string) => api.delete(`/auth/users/${username}/unfollow/`).then(r => r.data),
  followers: (username: string) => api.get(`/auth/users/${username}/followers/`).then(r => r.data),
  following: (username: string) => api.get(`/auth/users/${username}/following/`).then(r => r.data),
};

// ─── Public API (no auth) ───
export const publicApi = {
  featured: () => api.get<Article[]>('/public/featured/').then(r => r.data),
  trending: () => api.get<Article[]>('/public/trending/').then(r => r.data),
  latest: (page?: number) => api.get<PaginatedResponse<Article>>('/public/latest/', { params: { page } }).then(r => r.data),
  categories: () => api.get<PublicCategory[]>('/public/categories/').then(r => r.data),
  categoryArticles: (name: string, page?: number) =>
    api.get<PaginatedResponse<Article>>(`/public/category/${name}/`, { params: { page } }).then(r => r.data),
  search: (q: string, page?: number) =>
    api.get<PaginatedResponse<Article>>('/public/search/', { params: { q, page } }).then(r => r.data),
  journalists: () => api.get<Journalist[]>('/public/journalists/').then(r => r.data),
};

// ─── Admin API ───
export const adminApi = {
  listUsers: () => api.get<AuthUser[]>('/auth/admin/users/').then(r => r.data),
  changeRole: (userId: string, role: string) =>
    api.patch(`/auth/admin/users/${userId}/role/`, { role }).then(r => r.data),
};
