/**
 * VulnTrack Centralized API Client Module
 * 
 * Handles all HTTP communication with the Express backend.
 * Provides unified request configuration, cookie session management,
 * response envelope validation, error normalization, and seamless offline/mock fallback.
 */

const API = (function() {
  let isMockActive = false;

  /**
   * Helper to perform real fetch calls with standard error envelope handling
   */
  async function request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      credentials: 'include' // Attaches vulntrack_sid session cookie automatically
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorObj = (data && data.error) ? data.error : {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown server error.'
        };
        const err = new Error(errorObj.message);
        err.code = errorObj.code;
        err.details = errorObj.details || [];
        err.status = response.status;
        throw err;
      }

      isMockActive = false;
      return data; // Standard Success Envelope { success: true, data: ... }
    } catch (networkError) {
      // If network fails (e.g. backend server not started) and MOCK_MODE is enabled or 'auto'
      if (CONFIG.MOCK_MODE === true || CONFIG.MOCK_MODE === 'auto') {
        isMockActive = true;
        return routeMockRequest(endpoint, options);
      }
      throw networkError;
    }
  }

  /**
   * Routes simulated API calls to MockDatabase when offline or testing
   */
  async function routeMockRequest(endpoint, options = {}) {
    // Artificial 60ms latency to simulate realistic async behavior
    await new Promise(r => setTimeout(r, 60));

    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

    // 1. Auth routes
    if (endpoint === '/auth/me') {
      const u = MockDatabase.getCurrentUser();
      return { success: true, data: { user: u } };
    }
    if (endpoint === '/auth/login' && method === 'POST') {
      const users = MockDatabase.getUsers();
      const found = users.find(u => u.username === body.usernameOrEmail || u.email === body.usernameOrEmail);
      if (!found) {
        const err = new Error('Invalid username or password.');
        err.code = 'INVALID_CREDENTIALS';
        err.status = 401;
        throw err;
      }
      MockDatabase.setCurrentUser(found);
      return { success: true, data: { user: found }, message: 'Login successful.' };
    }
    if (endpoint === '/auth/logout' && method === 'POST') {
      return { success: true, data: null, message: 'Logged out successfully.' };
    }

    // 2. Asset routes
    if (endpoint.startsWith('/assets')) {
      const idMatch = endpoint.match(/^\/assets\/(\d+)$/);
      const archiveMatch = endpoint.match(/^\/assets\/(\d+)\/archive$/);

      if (archiveMatch && method === 'PATCH') {
        const archived = MockDatabase.archiveAsset(archiveMatch[1], body.isArchived !== false);
        return { success: true, data: archived, message: 'Asset archive status updated.' };
      }
      if (idMatch) {
        const id = idMatch[1];
        if (method === 'GET') {
          const item = MockDatabase.getAssetById(id);
          if (!item) throw { code: 'NOT_FOUND', status: 404, message: 'Asset not found.' };
          return { success: true, data: item };
        }
        if (method === 'PUT') {
          const updated = MockDatabase.updateAsset(id, body);
          return { success: true, data: updated, message: 'Asset updated successfully.' };
        }
        if (method === 'DELETE') {
          MockDatabase.deleteAsset(id);
          return { success: true, data: null, message: 'Asset deleted.' };
        }
      }
      if (endpoint.startsWith('/assets') && method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const filters = {
          environment: urlParams.get('environment'),
          criticality: urlParams.get('criticality'),
          search: urlParams.get('search'),
          includeArchived: urlParams.get('includeArchived') === 'true'
        };
        const list = MockDatabase.getAssets(filters);
        return { success: true, data: list };
      }
      if (endpoint === '/assets' && method === 'POST') {
        const created = MockDatabase.createAsset(body);
        return { success: true, data: created, message: 'Asset created successfully.' };
      }
    }

    // 3. Catalog routes
    if (endpoint.startsWith('/catalog')) {
      const idMatch = endpoint.match(/^\/catalog\/(\d+)$/);
      if (idMatch && method === 'GET') {
        const item = MockDatabase.getCatalogById(idMatch[1]);
        if (!item) throw { code: 'NOT_FOUND', status: 404, message: 'Catalog definition not found.' };
        return { success: true, data: item };
      }
      if (method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const list = MockDatabase.getCatalog({
          severity: urlParams.get('severity'),
          search: urlParams.get('search')
        });
        return { success: true, data: list };
      }
      if (method === 'POST') {
        const created = MockDatabase.createCatalogItem(body);
        return { success: true, data: created, message: 'Catalog definition created successfully.' };
      }
    }

    // 4. Findings routes
    if (endpoint.startsWith('/findings')) {
      const statusMatch = endpoint.match(/^\/findings\/(\d+)\/status$/);
      const commentsMatch = endpoint.match(/^\/findings\/(\d+)\/comments$/);
      const historyMatch = endpoint.match(/^\/findings\/(\d+)\/history$/);
      const idMatch = endpoint.match(/^\/findings\/(\d+)$/);

      if (statusMatch && method === 'PATCH') {
        try {
          const res = MockDatabase.transitionFindingStatus(statusMatch[1], body.newStatus, body.reason);
          return { success: true, data: res, message: 'Status transitioned successfully.' };
        } catch (err) {
          const e = new Error(err.message);
          e.code = err.message.includes('Permission') ? 'FORBIDDEN' : 'INVALID_STATE_TRANSITION';
          e.status = err.message.includes('Permission') ? 403 : 422;
          throw e;
        }
      }
      if (commentsMatch) {
        if (method === 'GET') {
          const f = MockDatabase.getFindingById(commentsMatch[1]);
          return { success: true, data: f ? f.comments : [] };
        }
        if (method === 'POST') {
          const c = MockDatabase.addComment(commentsMatch[1], body.commentText);
          return { success: true, data: c, message: 'Comment added.' };
        }
      }
      if (historyMatch && method === 'GET') {
        const f = MockDatabase.getFindingById(historyMatch[1]);
        return { success: true, data: f ? f.history : [] };
      }
      if (idMatch && method === 'GET') {
        const f = MockDatabase.getFindingById(idMatch[1]);
        if (!f) throw { code: 'NOT_FOUND', status: 404, message: 'Finding not found.' };
        return { success: true, data: f };
      }
      if (method === 'GET') {
        const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
        const filters = {
          status: urlParams.get('status'),
          severity: urlParams.get('severity'),
          priority: urlParams.get('priority'),
          assetId: urlParams.get('assetId'),
          assigneeId: urlParams.get('assigneeId'),
          isOverdue: urlParams.get('isOverdue') === 'true',
          search: urlParams.get('search')
        };
        const list = MockDatabase.getFindings(filters);
        return { success: true, data: list };
      }
      if (method === 'POST') {
        const created = MockDatabase.createFinding(body);
        return { success: true, data: created, message: 'Finding created successfully.' };
      }
    }

    // 5. Dashboard routes
    if (endpoint === '/dashboard/stats') {
      return { success: true, data: MockDatabase.getDashboardStats() };
    }
    if (endpoint === '/dashboard/by-severity') {
      return { success: true, data: MockDatabase.getSeverityBreakdown() };
    }
    if (endpoint === '/dashboard/by-status') {
      return { success: true, data: MockDatabase.getStatusBreakdown() };
    }
    if (endpoint.startsWith('/dashboard/top-assets')) {
      const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
      const limit = parseInt(urlParams.get('limit') || '5', 10);
      return { success: true, data: MockDatabase.getTopAssets(limit) };
    }
    if (endpoint === '/dashboard/overdue') {
      return { success: true, data: MockDatabase.getOverdueFindings() };
    }

    // 6. Users route
    if (endpoint === '/users' && method === 'GET') {
      return { success: true, data: MockDatabase.getUsers() };
    }

    throw { code: 'NOT_IMPLEMENTED', status: 501, message: `Mock endpoint not implemented for ${method} ${endpoint}` };
  }

  // Public Interface
  return {
    isMock: () => isMockActive,

    auth: {
      login: (usernameOrEmail, password) => request('/auth/login', { method: 'POST', body: { usernameOrEmail, password } }),
      logout: () => request('/auth/logout', { method: 'POST' }),
      me: () => request('/auth/me', { method: 'GET' })
    },

    users: {
      list: (role) => request(`/users${role ? `?role=${encodeURIComponent(role)}` : ''}`)
    },

    assets: {
      list: (filters = {}) => {
        const p = new URLSearchParams();
        if (filters.environment) p.set('environment', filters.environment);
        if (filters.criticality) p.set('criticality', filters.criticality);
        if (filters.search) p.set('search', filters.search);
        if (filters.includeArchived) p.set('includeArchived', 'true');
        const qs = p.toString() ? `?${p.toString()}` : '';
        return request(`/assets${qs}`);
      },
      get: (id) => request(`/assets/${id}`),
      create: (data) => request('/assets', { method: 'POST', body: data }),
      update: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: data }),
      archive: (id, isArchived = true) => request(`/assets/${id}/archive`, { method: 'PATCH', body: { isArchived } }),
      delete: (id) => request(`/assets/${id}`, { method: 'DELETE' })
    },

    catalog: {
      list: (filters = {}) => {
        const p = new URLSearchParams();
        if (filters.severity) p.set('severity', filters.severity);
        if (filters.search) p.set('search', filters.search);
        const qs = p.toString() ? `?${p.toString()}` : '';
        return request(`/catalog${qs}`);
      },
      get: (id) => request(`/catalog/${id}`),
      create: (data) => request('/catalog', { method: 'POST', body: data }),
      update: (id, data) => request(`/catalog/${id}`, { method: 'PUT', body: data })
    },

    findings: {
      list: (filters = {}) => {
        const p = new URLSearchParams();
        if (filters.status) p.set('status', filters.status);
        if (filters.severity) p.set('severity', filters.severity);
        if (filters.priority) p.set('priority', filters.priority);
        if (filters.assetId) p.set('assetId', filters.assetId);
        if (filters.assigneeId) p.set('assigneeId', filters.assigneeId);
        if (filters.isOverdue) p.set('isOverdue', 'true');
        if (filters.search) p.set('search', filters.search);
        const qs = p.toString() ? `?${p.toString()}` : '';
        return request(`/findings${qs}`);
      },
      get: (id) => request(`/findings/${id}`),
      create: (data) => request('/findings', { method: 'POST', body: data }),
      update: (id, data) => request(`/findings/${id}`, { method: 'PUT', body: data }),
      transitionStatus: (id, newStatus, reason) => request(`/findings/${id}/status`, { method: 'PATCH', body: { newStatus, reason } }),
      getComments: (id) => request(`/findings/${id}/comments`),
      addComment: (id, commentText) => request(`/findings/${id}/comments`, { method: 'POST', body: { commentText } }),
      getHistory: (id) => request(`/findings/${id}/history`)
    },

    dashboard: {
      getStats: () => request('/dashboard/stats'),
      getBySeverity: () => request('/dashboard/by-severity'),
      getByStatus: () => request('/dashboard/by-status'),
      getTopAssets: (limit = 5) => request(`/dashboard/top-assets?limit=${limit}`),
      getOverdue: () => request('/dashboard/overdue')
    }
  };
})();
