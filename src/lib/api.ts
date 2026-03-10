import urls from '../../backend/func2url.json';

const TOKEN_KEY = 'vf_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(base: string, path: string, options: RequestInit = {}) {
  const token = getToken();
  const [routePath, queryString] = path.split('?');
  let url = `${base}?route=${encodeURIComponent(routePath)}`;
  if (queryString) url += `&${queryString}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        ...(options.headers || {}),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'нет соединения';
    console.error('[API] Network error:', url, msg);
    throw { status: 0, error: `Ошибка сети: ${msg}` };
  }
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    console.error('[API] Invalid JSON, status:', res.status);
    throw { status: res.status, error: `Ошибка сервера (${res.status})` };
  }
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const auth = {
  register: (email: string, password: string, name: string) =>
    request(urls.auth, '/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  login: (email: string, password: string) =>
    request(urls.auth, '/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  profile: () => request(urls.auth, '/profile'),
  updateProfile: (data: { name?: string; avatar_url?: string }) =>
    request(urls.auth, '/profile', { method: 'PUT', body: JSON.stringify(data) }),
  logout: () => request(urls.auth, '/logout', { method: 'POST' }),
};

export const wallet = {
  balance: () => request(urls.wallet, '/balance'),
  topup: (amount: number) =>
    request(urls.wallet, '/topup', { method: 'POST', body: JSON.stringify({ amount }) }),
  purchase: (item: { item_type: string; item_id: string; item_name: string; price: number }) =>
    request(urls.wallet, '/purchase', { method: 'POST', body: JSON.stringify(item) }),
  transactions: (limit = 20, offset = 0) =>
    request(urls.wallet, `/transactions?limit=${limit}&offset=${offset}`),
  purchases: () => request(urls.wallet, '/purchases'),
};

export const projects = {
  list: () => request(urls.projects, '/list'),
  create: (name: string, description = '', project_data = {}) =>
    request(urls.projects, '/create', { method: 'POST', body: JSON.stringify({ name, description, project_data }) }),
  get: (id: number) => request(urls.projects, `/get?id=${id}`),
  save: (data: { id: number; name?: string; description?: string; project_data?: object }) =>
    request(urls.projects, '/save', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    request(urls.projects, '/delete', { method: 'POST', body: JSON.stringify({ id }) }),
};

export const admin = {
  stats: () => request(urls.admin, '/stats'),
  users: (limit = 20, offset = 0, search = '') =>
    request(urls.admin, `/users?limit=${limit}&offset=${offset}&search=${search}`),
  updateUser: (data: { user_id: number; role?: string; is_active?: boolean; name?: string }) =>
    request(urls.admin, '/users/update', { method: 'PUT', body: JSON.stringify(data) }),
  adjustBalance: (user_id: number, amount: number, reason: string) =>
    request(urls.admin, '/users/adjust-balance', { method: 'POST', body: JSON.stringify({ user_id, amount, reason }) }),
  transactions: (limit = 50, offset = 0) =>
    request(urls.admin, `/transactions?limit=${limit}&offset=${offset}`),
};

export const shop = {
  catalog: (category = '') =>
    request(urls.shop, `/catalog${category ? `?category=${category}` : ''}`),
  checkPromo: (code: string, slug = '') =>
    request(urls.shop, '/check-promo', { method: 'POST', body: JSON.stringify({ code, slug }) }),
  buy: (slug: string, promo_code = '') =>
    request(urls.shop, '/buy', { method: 'POST', body: JSON.stringify({ slug, promo_code }) }),
  myItems: () => request(urls.shop, '/my-items'),
  promos: () => request(urls.shop, '/promos'),
  createPromo: (data: { code: string; discount_type: string; discount_value: number; max_uses?: number; applies_to?: string; expires_at?: string }) =>
    request(urls.shop, '/promos', { method: 'POST', body: JSON.stringify(data) }),
  togglePromo: (id: number) =>
    request(urls.shop, '/promos/toggle', { method: 'POST', body: JSON.stringify({ id }) }),
  deletePromo: (id: number) =>
    request(urls.shop, '/promos/delete', { method: 'POST', body: JSON.stringify({ id }) }),
  updatePromo: (data: { id: number; code?: string; discount_type?: string; discount_value?: number; max_uses?: number | null; applies_to?: string; expires_at?: string | null; min_purchase?: number }) =>
    request(urls.shop, '/promos/update', { method: 'POST', body: JSON.stringify(data) }),
};

export const media = {
  upload: (data: { file_data: string; file_name: string; mime_type: string; duration?: number; width?: number; height?: number; project_id?: number }) =>
    request(urls.media, '/upload', { method: 'POST', body: JSON.stringify(data) }),
  chunkedInit: (data: { file_name: string; mime_type: string; file_size: number; total_chunks: number }) =>
    request(urls.media, '/chunked/init', { method: 'POST', body: JSON.stringify(data) }),
  chunkedPart: (data: { upload_id: string; chunk_index: number; chunk_data: string }) =>
    request(urls.media, '/chunked/part', { method: 'POST', body: JSON.stringify(data) }),
  chunkedComplete: (data: { upload_id: string; duration?: number; width?: number; height?: number; project_id?: number }) =>
    request(urls.media, '/chunked/complete', { method: 'POST', body: JSON.stringify(data) }),
  list: (project_id?: number) =>
    request(urls.media, `/list${project_id ? `?project_id=${project_id}` : ''}`),
  remove: (id: number) =>
    request(urls.media, '/delete', { method: 'POST', body: JSON.stringify({ id }) }),
  proxyUrl: (id: number) => {
    const token = getToken();
    return `${urls.media}?route=${encodeURIComponent('/proxy')}&id=${id}&token=${token}`;
  },
  proxyInfoUrl: (id: number) => {
    const token = getToken();
    return `${urls.media}?route=${encodeURIComponent('/proxy')}&id=${id}&token=${token}&info=1`;
  },
  proxyRangeUrl: (id: number, start: number, end: number) => {
    const token = getToken();
    return `${urls.media}?route=${encodeURIComponent('/proxy')}&id=${id}&token=${token}&start=${start}&end=${end}`;
  },
  presign: (id: number) =>
    request(urls.media, `/presign?id=${id}`),
};

export default { auth, wallet, projects, admin, shop, media };