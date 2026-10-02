export const prerender = false;

import type { APIRoute } from 'astro';
import {
  readTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
} from '../../../lib/tasks';
import { isAuthenticatedCookie } from '../../../lib/admin';

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthenticatedCookie(cookies)) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tasks = await readTasks();
  return new Response(JSON.stringify({ tasks }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isAuthenticatedCookie(cookies)) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Accept both JSON (from fetch) and FormData (from HTML forms)
  const contentType = request.headers.get('content-type') || '';
  let body: Record<string, unknown> = {};

  if (contentType.includes('application/json')) {
    body = (await request.json().catch(() => ({}))) ?? {};
  } else {
    const formData = await request.formData();
    formData.forEach((val, key) => {
      body[key] = val;
    });
  }

  const { action, task, taskId, updates } = body as Record<string, any>;

  try {
    switch (action) {
      case 'create': {
        const newTask = await createTask(task);
        return new Response(JSON.stringify({ ok: true, task: newTask }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      case 'update': {
        const updated = await updateTask(taskId, updates);
        if (!updated) {
          return new Response(JSON.stringify({ error: 'Tarefa não encontrada' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true, task: updated }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      case 'delete': {
        const deleted = await deleteTask(taskId);
        if (!deleted) {
          return new Response(JSON.stringify({ error: 'Tarefa não encontrada' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
